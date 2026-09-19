import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { contentTypeFor, statStored, storedNamePattern, absPathFor } from "@/lib/md-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/md/files/[name] — serves a persisted upload.
 *
 * · Strict uuid.ext name validation (no path traversal),
 * · correct per-extension Content-Type,
 * · single-part Range support so <video> seeking works,
 * · immutable caching (uuid names never change content).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!storedNamePattern().test(name)) {
    return NextResponse.json({ ok: false, error: "Invalid file name" }, { status: 400 });
  }

  const info = await statStored(name);
  if (!info) {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }

  const type = contentTypeFor(name);
  if (!type) {
    return NextResponse.json({ ok: false, error: "Unsupported file type" }, { status: 415 });
  }

  const etag = `"${name}-${info.size}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const buf = await readFile(absPathFor(name));
  const baseHeaders: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Last-Modified": info.mtime.toUTCString(),
  };

  // Range: bytes=start-end (single part) — lets recipients scrub video/audio.
  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] !== "" || m[2] !== "")) {
      const size = buf.byteLength;
      let start = m[1] === "" ? 0 : parseInt(m[1], 10);
      let end = m[2] === "" ? size - 1 : parseInt(m[2], 10);
      if (m[1] === "" && m[2] !== "") {
        // suffix range: bytes=-N → last N bytes
        start = Math.max(0, size - parseInt(m[2], 10));
        end = size - 1;
      }
      if (start <= end && start < size) {
        end = Math.min(end, size - 1);
        const chunk = buf.subarray(start, end + 1);
        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Content-Length": String(chunk.byteLength),
          },
        });
      }
      return new NextResponse(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(buf.byteLength) },
  });
}
