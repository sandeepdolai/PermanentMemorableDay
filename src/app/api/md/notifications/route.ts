/**
 * /api/md/notifications
 *   GET  — the activity feed (newest first, moment reference included)
 *   POST — upsert one notification (Undo restore re-inserts by id)
 */
import { db } from "@/lib/db";
import { fail, getUser, ok, serializeNotification } from "@/lib/md-server";

interface NotificationInput {
  id?: string;
  kind?: string;
  title?: string;
  body?: string;
  timeLabel?: string;
  group?: string;
  unread?: boolean;
  momentId?: string | null;
}

export async function GET() {
  try {
    const user = await getUser();
    // Age groups stay honest: anything older than 24h slides from "Today"
    // into "Earlier this week" on the next read.
    await db.notification.updateMany({
      where: { userId: user.id, group: "today", createdAt: { lt: new Date(Date.now() - 86_400_000) } },
      data: { group: "earlier" },
    });
    const rows = await db.notification.findMany({
      where: { userId: user.id },
      include: { moment: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ notifications: rows.map(serializeNotification) });
  } catch (e) {
    console.error("[md/notifications GET]", e);
    return fail("Failed to list notifications", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    const body = (await req.json()) as NotificationInput;
    if (!body.id) return fail("Missing notification id");

    const row = await db.notification.upsert({
      where: { id: body.id },
      create: {
        id: body.id,
        userId: user.id,
        kind: body.kind || "milestone",
        title: body.title || "Notification",
        body: body.body || "",
        timeLabel: body.timeLabel || "now",
        group: body.group === "earlier" ? "earlier" : "today",
        unread: body.unread ?? true,
        momentId: body.momentId ?? null,
      },
      update: {},
      include: { moment: true },
    });
    return ok({ notification: serializeNotification(row) }, { status: 201 });
  } catch (e) {
    console.error("[md/notifications POST]", e);
    return fail("Failed to restore notification", 500);
  }
}
