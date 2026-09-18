import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * MemorableDay — media upload endpoint (photo / video / audio block content).
 * Stores files under public/uploads and returns the served URL.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 16 * 1024 * 1024; // 16 MB

/** Whitelisted mime → extension map (browser uploads only). */
const MIME_EXT: Record<string, string> = {
  // photos
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  // videos
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  // audio
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/vorbis": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

function kindLabel(mime: string): string {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const ext = MIME_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: `Unsupported ${kindLabel(file.type)} type — try a photo, video or audio file` },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Too large — keep it under 16 MB" }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    // Unique, unguessable name (uuid + short hash of the content)
    const name = `${randomUUID().slice(0, 8)}-${Buffer.from(bytes).toString("base64url").slice(0, 8)}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), bytes);

    return NextResponse.json({ ok: true, url: `/uploads/${name}`, kind: kindLabel(file.type) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
