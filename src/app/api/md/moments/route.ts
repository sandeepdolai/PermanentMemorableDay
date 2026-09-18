/**
 * /api/md/moments
 *   GET  — list all moments for the demo user (newest first)
 *   POST — upsert a moment (client-supplied id wins: builder drafts,
 *          Undo restores and duplicates all reuse this one endpoint)
 */
import { db } from "@/lib/db";
import { fail, getUser, ok, serializeMoment } from "@/lib/md-server";

interface MomentInput {
  id?: string;
  title?: string;
  recipient?: string;
  status?: string;
  cover?: number;
  scenes?: number;
  blocks?: number;
  progress?: number | null;
  tags?: string[];
  dateLabel?: string;
}

const STATUSES = new Set(["draft", "scheduled", "sent", "viewed", "archived"]);

export async function GET() {
  try {
    const user = await getUser();
    const moments = await db.moment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return ok({ moments: moments.map(serializeMoment) });
  } catch (e) {
    console.error("[md/moments GET]", e);
    return fail("Failed to list moments", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    const body = (await req.json()) as MomentInput;
    if (!body.id) return fail("Missing moment id");
    if (body.status && !STATUSES.has(body.status)) return fail(`Invalid status: ${body.status}`);

    const data = {
      title: body.title?.trim() || "Untitled Experience",
      ...(body.recipient !== undefined ? { recipient: body.recipient } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.cover !== undefined ? { cover: Math.max(0, Math.min(9, body.cover)) } : {}),
      ...(body.scenes !== undefined ? { scenes: Math.max(1, body.scenes) } : {}),
      ...(body.blocks !== undefined ? { blocks: body.blocks } : {}),
      ...(body.progress !== undefined ? { progress: body.progress } : {}),
      ...(body.tags ? { tags: JSON.stringify(body.tags) } : {}),
      ...(body.dateLabel !== undefined ? { dateLabel: body.dateLabel } : {}),
    };

    const moment = await db.moment.upsert({
      where: { id: body.id },
      create: { id: body.id, userId: user.id, source: "user", status: "draft", ...data },
      update: data,
    });
    return ok({ moment: serializeMoment(moment) }, { status: 201 });
  } catch (e) {
    console.error("[md/moments POST]", e);
    return fail("Failed to save moment", 500);
  }
}
