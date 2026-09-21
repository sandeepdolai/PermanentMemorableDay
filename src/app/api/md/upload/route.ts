import { NextRequest, NextResponse } from "next/server";
import { storeUpload, UploadError, type UploadKind } from "@/lib/md-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/md/upload — persists a photo/video/audio upload.
 *
 * The builder's apiUploadFile() XHRs straight here (plain multipart, never a
 * server action, so upload progress works). Validation + storage live in
 * md-storage: magic-byte sniffing, 16 MB cap, uuid names under
 * storage/uploads, served back via /api/md/files/[name].
 *
 * Query:
 *  · ?expect=photo|video|audio — reject anything else (the client already
 *    filters, this is the server-side guard)
 *  · omitted — any kind (voice notes record as audio/webm, which sniffs as
 *    the "webm" container — the family is video, so strict audio-only would
 *    wrongly reject them)
 */
export async function POST(req: NextRequest) {
  const expectRaw = req.nextUrl.searchParams.get("expect");
  const expect: UploadKind | "any" | undefined =
    expectRaw === "photo" || expectRaw === "video" || expectRaw === "audio"
      ? expectRaw
      : expectRaw
        ? "any"
        : undefined;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
  }

  try {
    const stored = await storeUpload(file, { expect: expect ?? "any" });
    return NextResponse.json({
      ok: true,
      url: stored.url,
      kind: stored.kind,
      bytes: stored.bytes,
    });
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Upload failed — try again" }, { status: 500 });
  }
}
