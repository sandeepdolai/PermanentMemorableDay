/**
 * POST /api/md/moments/[id]/send — the real send pipeline.
 * Body: { recipient?: string, scheduledFor?: string (ISO), label?: string }
 *   · with scheduledFor → status "scheduled" + reminder notification
 *   · otherwise         → status "sent" + share slug + "sent" notification
 * Also upserts the moment first, so the builder can send an unsaved draft
 * in a single call (create-on-send).
 */
import { db } from "@/lib/db";
import { fail, getUser, makeShareSlug, ok, serializeMoment } from "@/lib/md-server";
import type { SceneDoc, SongPick } from "@/lib/md-blocks";

interface SendBody {
  title?: string;
  recipient?: string;
  cover?: number;
  scenes?: number;
  blocks?: number;
  scheduledFor?: string;
  label?: string;
  sceneData?: SceneDoc[] | null;
  track?: SongPick | null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    const body = (await req.json()) as SendBody;
    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    const scheduled = !!scheduledFor && !Number.isNaN(scheduledFor.getTime());
    const recipient = (body.recipient || "").trim() || "someone special";

    // Create-on-send for builder drafts that were never saved.
    const existing = await db.moment.findFirst({ where: { id, userId: user.id } });
    const moment = await db.moment.upsert({
      where: { id },
      create: {
        id,
        userId: user.id,
        source: "user",
        title: body.title?.trim() || "Untitled Experience",
        recipient,
        status: scheduled ? "scheduled" : "sent",
        cover: Math.max(0, Math.min(9, body.cover ?? 0)),
        scenes: Math.max(1, body.scenes ?? 1),
        blocks: body.blocks ?? 0,
        ...(body.sceneData ? { sceneData: JSON.stringify(body.sceneData) } : {}),
        ...(body.track ? { trackData: JSON.stringify(body.track) } : {}),
        dateLabel: scheduled ? body.label || "Scheduled" : "Sent just now",
        ...(scheduled ? { scheduledFor: scheduledFor! } : {}),
        ...(!scheduled ? { shareSlug: makeShareSlug(id) } : {}),
      },
      update: {
        recipient,
        status: scheduled ? "scheduled" : "sent",
        prevStatus: null,
        ...(body.title !== undefined ? { title: body.title.trim() || "Untitled Experience" } : {}),
        ...(body.cover !== undefined ? { cover: Math.max(0, Math.min(9, body.cover)) } : {}),
        ...(body.scenes !== undefined ? { scenes: Math.max(1, body.scenes) } : {}),
        ...(body.blocks !== undefined ? { blocks: body.blocks } : {}),
        ...(body.sceneData !== undefined
          ? { sceneData: body.sceneData ? JSON.stringify(body.sceneData) : null }
          : {}),
        ...(body.track !== undefined ? { trackData: body.track ? JSON.stringify(body.track) : null } : {}),
        dateLabel: scheduled ? body.label || "Scheduled" : "Sent just now",
        ...(scheduled ? { scheduledFor: scheduledFor! } : { scheduledFor: null, shareSlug: makeShareSlug(id) }),
      },
    });

    // Server-side activity: the send/schedule itself lands in the feed.
    await db.notification.create({
      data: {
        id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        kind: scheduled ? "reminder" : "sent",
        title: scheduled
          ? `“${moment.title}” is scheduled`
          : `You sent “${moment.title}”`,
        body: scheduled
          ? `On its way to ${recipient}${body.label ? ` — ${body.label}` : ""}`
          : `Delivered to ${recipient} — the link is live`,
        timeLabel: "now",
        group: "today",
        unread: true,
        momentId: moment.id,
      },
    });

    return ok({ moment: serializeMoment(moment) }, { status: 201 });
  } catch (e) {
    console.error("[md/moments/send]", e);
    return fail("Failed to send moment", 500);
  }
}
