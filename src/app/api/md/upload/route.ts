import { NextRequest, NextResponse } from "next/server";
import { storeUpload, UploadError } from "@/lib/md-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/md/upload — REAL file upload endpoint.
 *
 * multipart/form-data with a single "file" field. The file is:
 *  1. size-checked (16 MB cap),
 *  2. format-sniffed from its magic bytes (renamed files are rejected),
 *  3. written to persistent storage (storage/uploads/<uuid>.<ext>),
 *  4. returned with the URL the client can serve it from.
 *
 * No mocks, no fake success — a 200 means the bytes are on disk.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data with a file field" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "No file was attached" }, { status: 400 });
  }

  try {
    const stored = await storeUpload(file as File);
    return NextResponse.json({
      ok: true,
      url: stored.url,
      kind: stored.kind,
      bytes: stored.bytes,
      name: stored.originalName,
    });
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    console.error("[upload] unexpected failure:", e);
    return NextResponse.json(
      { ok: false, error: "Upload failed on the server — try again" },
      { status: 500 }
    );
  }
}
