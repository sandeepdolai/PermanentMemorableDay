/**
 * POST /api/md/moments/[id]/view — recipient open tracking.
 * Increments views, promotes sent → viewed, and files an "opened"
 * notification into the activity feed (coalesced: repeat opens of the same
 * moment bump a ×N counter on one row instead of spamming duplicates).
 * Drafts/scheduled are ignored (no analytics before a moment is out there).
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
      data: {
        views: { increment: 1 },
        ...(existing.status === "sent" ? { status: "viewed", dateLabel: "Opened just now" } : {}),
      },
    });

    await coalesceNotification({
      userId: user.id,
      kind: "opened",
      title: `${moment.recipient || "Someone"} opened your moment`,
      body: `“${moment.title}” was just opened`,
      bodyMulti: (n) => `“${moment.title}” was opened ${n} times today`,
      momentId: moment.id,
    });

    return ok({ tracked: true, moment: serializeMoment(moment) });
  } catch (e) {
    console.error("[md/moments/view]", e);
    return fail("Failed to track view", 500);
  }
}
