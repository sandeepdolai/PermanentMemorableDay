/**
 * POST /api/md/moments/[id]/love — recipient love reaction tracking.
 * Increments loves and files a "loved" notification for the creator
 * (coalesced: repeat loves of the same moment summarize into one row
 * with a ×N counter instead of duplicate entries).
 */
import { db } from "@/lib/db";
import { coalesceNotification, fail, getUser, ok, serializeMoment } from "@/lib/md-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    const existing = await db.moment.findFirst({ where: { id, userId: user.id } });
    if (!existing) return ok({ tracked: false, reason: "not-found" });
    if (existing.status === "draft" || existing.status === "scheduled" || existing.status === "archived") {
      return ok({ tracked: false, reason: "not-sent" });
    }

    const moment = await db.moment.update({
      where: { id },
      data: { loves: { increment: 1 } },
    });

    await coalesceNotification({
      userId: user.id,
      kind: "loved",
      title: `${moment.recipient || "Someone"} loved “${moment.title}”`,
      body: "Your moment received a new love reaction",
      bodyMulti: (n) => `Your moment received ${n} love reactions`,
      momentId: moment.id,
    });

    return ok({ tracked: true, moment: serializeMoment(moment) });
  } catch (e) {
    console.error("[md/moments/love]", e);
    return fail("Failed to track love", 500);
  }
}
