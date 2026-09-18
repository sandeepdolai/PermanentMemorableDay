/**
 * /api/md/notifications/[id]
 *   PATCH  — mark one notification read ({ unread?: boolean })
 *   DELETE — dismiss it (Undo re-POSTs it to the collection route)
 */
import { db } from "@/lib/db";
import { fail, getUser, ok } from "@/lib/md-server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    const existing = await db.notification.findFirst({ where: { id, userId: user.id } });
    if (!existing) return ok({ updated: id }); // idempotent
    const body = (await req.json().catch(() => ({}))) as { unread?: boolean };
    await db.notification.update({
      where: { id },
      data: { unread: body.unread ?? false },
    });
    return ok({ updated: id });
  } catch (e) {
    console.error("[md/notifications PATCH]", e);
    return fail("Failed to update notification", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    const existing = await db.notification.findFirst({ where: { id, userId: user.id } });
    if (!existing) return ok({ deleted: id }); // idempotent
    await db.notification.delete({ where: { id } });
    return ok({ deleted: id });
  } catch (e) {
    console.error("[md/notifications DELETE]", e);
    return fail("Failed to dismiss notification", 500);
  }
}
