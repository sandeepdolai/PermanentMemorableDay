/**
 * /api/md/moments/[id]
 *   PATCH  — partial update: rename, edit fields, archive/unarchive
 *            (archive remembers prevStatus so unarchive restores it)
 *   DELETE — remove (draft deletion; Undo re-POSTs the full payload)
 */
import { db } from "@/lib/db";
import { fail, getUser, ok, serializeMoment } from "@/lib/md-server";
import type { SceneDoc, SongPick } from "@/lib/md-blocks";

interface PatchBody {
  title?: string;
  recipient?: string;
  cover?: number;
  scenes?: number;
  blocks?: number;
  progress?: number | null;
  dateLabel?: string;
  archived?: boolean;
  sceneData?: SceneDoc[] | null;
  track?: SongPick | null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    const existing = await db.moment.findFirst({ where: { id, userId: user.id } });
    if (!existing) return fail("Moment not found", 404);

    const body = (await req.json()) as PatchBody;
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim() || "Untitled Experience";
    if (body.recipient !== undefined) data.recipient = body.recipient;
    if (body.cover !== undefined) data.cover = Math.max(0, Math.min(9, body.cover));
    if (body.scenes !== undefined) data.scenes = Math.max(1, body.scenes);
    if (body.blocks !== undefined) data.blocks = body.blocks;
    if (body.progress !== undefined) data.progress = body.progress;
    if (body.dateLabel !== undefined) data.dateLabel = body.dateLabel;
    if (body.sceneData !== undefined)
      data.sceneData = body.sceneData ? JSON.stringify(body.sceneData) : null;
    if (body.track !== undefined) data.trackData = body.track ? JSON.stringify(body.track) : null;

    if (body.archived !== undefined) {
      if (body.archived && existing.status !== "archived") {
        data.status = "archived";
        data.prevStatus = existing.status;
      } else if (!body.archived && existing.status === "archived") {
        data.status = existing.prevStatus ?? "draft";
        data.prevStatus = null;
      }
    }

    const moment = await db.moment.update({ where: { id }, data });
    return ok({ moment: serializeMoment(moment) });
  } catch (e) {
    console.error("[md/moments PATCH]", e);
    return fail("Failed to update moment", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    const existing = await db.moment.findFirst({ where: { id, userId: user.id } });
    if (!existing) return ok({ deleted: id }); // idempotent — already gone
    await db.moment.delete({ where: { id } });
    return ok({ deleted: id });
  } catch (e) {
    console.error("[md/moments DELETE]", e);
    return fail("Failed to delete moment", 500);
  }
}
