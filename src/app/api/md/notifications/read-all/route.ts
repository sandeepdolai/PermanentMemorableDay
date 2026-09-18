/**
 * POST /api/md/notifications/read-all — mark the whole feed read.
 */
import { db } from "@/lib/db";
import { fail, getUser, ok } from "@/lib/md-server";

export async function POST() {
  try {
    const user = await getUser();
    const { count } = await db.notification.updateMany({
      where: { userId: user.id, unread: true },
      data: { unread: false },
    });
    return ok({ marked: count });
  } catch (e) {
    console.error("[md/notifications/read-all]", e);
    return fail("Failed to mark all read", 500);
  }
}
