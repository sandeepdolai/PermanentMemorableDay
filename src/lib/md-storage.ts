import { mkdir, writeFile, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Persistent media storage for user uploads.
 *
 * Files live in <project>/storage/uploads with opaque uuid names — they
 * survive dev-server restarts and are served back through /api/md/files/[name]
 * (never from /public, so nothing can be executed as static source).
 */
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

/** Hard cap per upload (matches the builder's client-side limit messaging). */
export const UPLOAD_LIMIT_BYTES = 16 * 1024 * 1024;

export type UploadKind = "photo" | "video" | "audio";

export interface StoredFile {
  /** Relative URL that the client can use directly in <img>/<video>/Audio src */
  url: string;
  kind: UploadKind;
  bytes: number;
  /** Opaque stored filename: <uuid>.<ext> */
  storedName: string;
  /** The user's original filename (display only) */
  originalName: string;
}

/** Extension → serving content-type (lowercase keys). */
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
};

/** Allowed extensions per kind. */
const KIND_EXTS: Record<UploadKind, Set<string>> = {
  photo: new Set(["jpg", "jpeg", "png", "webp", "gif"]),
  video: new Set(["mp4", "webm", "mov", "m4v"]),
  audio: new Set(["mp3", "m4a", "wav", "ogg", "aac", "flac"]),
};

/** MIME → canonical extension (client-declared type is only a hint). */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "application/ogg": "ogg",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

/**
 * Sniffs the real format from magic bytes so a renamed .txt can never pass
 * as an image/video/audio. Returns the canonical extension or null.
 */
function sniffExt(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // GIF: GIF8
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return "gif";
  // RIFF containers: WEBP (image) / WAVE (audio)
  if (buf.subarray(0, 4).toString("ascii") === "RIFF") {
    const riff = buf.subarray(8, 12).toString("ascii");
    if (riff === "WEBP") return "webp";
    if (riff === "WAVE") return "wav";
    return null;
  }
  // ISO-BMFF (ftyp): mp4 / m4a / mov
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand.startsWith("qt")) return "mov";
    if (brand.startsWith("M4A")) return "m4a";
    return "mp4";
  }
  // EBML: webm
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  // Ogg
  if (buf.subarray(0, 4).toString("ascii") === "OggS") return "ogg";
  // FLAC
  if (buf.subarray(0, 4).toString("ascii") === "fLaC") return "flac";
  // MP3: ID3v2 or raw MPEG frame sync
  if (buf.subarray(0, 3).toString("ascii") === "ID3") return "mp3";
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    // ADTS AAC also starts with FF Ex/Fx — distinguish by MPEG layer bits.
    // ADTS: sync 12 bits + layer '00' at bits 14-15 of byte 1..2 (0xF0 mask → 0x00 layer)
    const layer = (buf[1] >> 1) & 0x03;
    if (layer === 0) return "aac";
    return "mp3";
  }
  return null;
}

function extKind(ext: string): UploadKind | null {
  for (const [kind, exts] of Object.entries(KIND_EXTS) as [UploadKind, Set<string>][]) {
    if (exts.has(ext)) return kind;
  }
  return null;
}

/** Sanitized storage name for a stored upload. */
export function storedNamePattern(): RegExp {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|m4v|mp3|m4a|wav|ogg|aac|flac)$/i;
}

/** Content-type for a stored filename (null when unknown). */
export function contentTypeFor(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? null;
}

/** Absolute path for a validated stored filename (traversal-safe). */
export function absPathFor(name: string): string {
  return path.join(UPLOAD_DIR, path.basename(name));
}

/** Stats a stored file (null when missing). */
export async function statStored(name: string): Promise<{ size: number; mtime: Date } | null> {
  try {
    const s = await stat(absPathFor(name));
    return { size: s.size, mtime: s.mtime };
  } catch {
    return null;
  }
}

export class UploadError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Validates + persists an uploaded file. Throws UploadError on any rejection:
 *  · empty file / over the size cap        → 400/413
 *  · type not in the photo/video/audio set → 415
 *  · content sniff disagrees with claim    → 415 (renamed file)
 */
export async function storeUpload(
  file: File,
  opts: { expect?: UploadKind | "any" } = {}
): Promise<StoredFile> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw new UploadError("That file appears to be empty", 400);
  }
  if (file.size > UPLOAD_LIMIT_BYTES) {
    throw new UploadError(`Too large — keep it under 16 MB`, 413);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0) throw new UploadError("That file appears to be empty", 400);

  // 1) Sniff the REAL format from bytes (never trust the name/MIME alone).
  const sniffed = sniffExt(buf);
  if (!sniffed) {
    throw new UploadError("Unsupported file type — use a photo, video or audio file", 415);
  }
  // 2) Determine the CLAIMED type: declared MIME when the browser sent one,
  //    otherwise the filename extension. A claim that disagrees with the
  //    sniffed bytes (renamed file) is rejected outright.
  const claimedExt = (file.type ? MIME_TO_EXT[file.type.toLowerCase()] : undefined)
    ?? (file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : undefined);
  if (claimedExt && claimedExt !== sniffed) {
    // Allow jpg/jpeg spelling + container-family overlaps, reject the rest.
    const family = (e: string) =>
      e === "jpeg" ? "jpg" : e === "m4v" ? "mp4" : e === "x-m4a" ? "m4a" : e;
    if (family(claimedExt) !== family(sniffed)) {
      throw new UploadError("That file's contents don't match its type", 415);
    }
  }
  const kind = extKind(sniffed);
  if (!kind) throw new UploadError("Unsupported file type", 415);
  if (opts.expect && opts.expect !== "any" && kind !== opts.expect) {
    throw new UploadError(`That file isn't a ${opts.expect}`, 415);
  }

  // 3) Persist with an opaque uuid name under storage/uploads.
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${crypto.randomUUID()}.${sniffed}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), buf);

  return {
    url: `/api/md/files/${storedName}`,
    kind,
    bytes: buf.byteLength,
    storedName,
    originalName: file.name || storedName,
  };
}
