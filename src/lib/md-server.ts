/**
 * MemorableDay — server-side data helpers.
 * Owns the demo user, first-run seeding and DB → client serialization.
 * All API routes go through here so the wire format stays consistent.
 */
import { db } from "@/lib/db";
import { MOMENTS, NOTIFICATIONS, USER } from "@/lib/mock-data";
import type { AppNotification } from "@/lib/mock-data";
import type { ClientMoment } from "@/lib/md-types";
import { parseScenes, parseSong, type BlockData, type BlockDoc, type SceneDoc } from "@/lib/md-blocks";

/** The demo account every record is scoped to (auth lands in a later phase). */
export const DEMO_EMAIL = USER.email;

export type { ClientMoment } from "@/lib/md-types";

export function serializeMoment(m: {
  id: string;
  title: string;
  recipient: string;
  status: string;
  cover: number;
  scenes: number;
  views: number;
  loves: number;
  blocks: number;
  completion: number | null;
  progress: number | null;
  tags: string;
  dateLabel: string;
  source: string;
  shareSlug: string | null;
  sceneData: string | null;
  trackData: string | null;
}): ClientMoment {
  return {
    id: m.id,
    title: m.title,
    recipient: m.recipient,
    status: m.status as ClientMoment["status"],
    date: m.dateLabel,
    cover: m.cover,
    scenes: m.scenes,
    views: m.views,
    completion: m.completion == null ? null : `${m.completion}%`,
    progress: m.progress,
    tags: safeTags(m.tags),
    loves: m.loves,
    blocks: m.blocks,
    source: m.source === "seed" ? "seed" : "user",
    shareSlug: m.shareSlug,
    sceneData: parseScenes(m.sceneData),
    track: parseSong(m.trackData),
  };
}

export function serializeNotification(n: {
  id: string;
  kind: string;
  title: string;
  body: string;
  timeLabel: string;
  group: string;
  unread: boolean;
  moment: {
    id: string;
    title: string;
    recipient: string;
    cover: number;
  } | null;
}): AppNotification {
  return {
    id: n.id,
    kind: n.kind as AppNotification["kind"],
    title: n.title,
    body: n.body,
    time: n.timeLabel,
    group: n.group === "earlier" ? "earlier" : "today",
    unread: n.unread,
    ...(n.moment
      ? {
          moment: {
            id: n.moment.id,
            title: n.moment.title,
            cover: n.moment.cover,
            dedication: n.moment.recipient ? `For ${n.moment.recipient}` : "",
          },
        }
      : {}),
  };
}

function safeTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Authored seed scene documents                                       */
/* ------------------------------------------------------------------ */

/** Deterministic id hash → picks copy + block layouts so seeds look authored. */
function hashId(id: string): number {
  return [...id].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 100003, 11);
}

const OPENERS = [
  "Some moments deserve more than a text message.",
  "This one is interactive — keep going.",
  "A few words that land.",
  "Made for you, and only you.",
];
const QUIZ_QUESTIONS = [
  { q: "Who is this moment for?", options: ["You", "Not you", "Someone else"], answer: 0 },
  { q: "Ready for what's next?", options: ["Born ready", "Almost", "No"], answer: 0 },
  { q: "How's your day going?", options: ["Better now", "Fine", "Don't ask"], answer: 0 },
];
const GIFT_NOTES = [
  "Open it — it's yours.",
  "A small thing, made just for you.",
  "You earned this.",
];
const CAPTIONS = ["golden hour, somewhere quiet", "the exact color of that evening", "saved this one for you"];
const CTA_ROWS = [
  { label: "Keep going", action: "Reply", url: "" },
  { label: "Say it back", action: "Reply", url: "" },
  { label: "Continue", action: "Open link", url: "https://memorableday.in" },
];

/** Builds a real authored SceneDoc[] for a seeded moment (deterministic per id). */
export function seedSceneDoc(id: string, title: string): SceneDoc[] {
  const h = hashId(id);
  const opener = OPENERS[h % OPENERS.length];
  const quiz = QUIZ_QUESTIONS[h % QUIZ_QUESTIONS.length];
  const giftNote = GIFT_NOTES[h % GIFT_NOTES.length];
  const caption = CAPTIONS[h % CAPTIONS.length];
  const cta = CTA_ROWS[h % CTA_ROWS.length];
  const b = (i: number, type: string, data?: BlockData): BlockDoc => ({
    id: `sb-${id}-${i}`,
    type,
    ...(data ? { data } : {}),
  });

  return [
    { id: `ss-${id}-1`, blocks: [b(1, "text", { body: `${title} — ${opener}` })] },
    {
      id: `ss-${id}-2`,
      blocks: [
        b(2, "photo", { caption, ...(h % 2 ? { filter: "Warm" } : {}) }),
        b(3, "countdown", { minutes: [1, 10, 60][h % 3] }),
      ],
    },
    {
      id: `ss-${id}-3`,
      blocks: [
        b(4, "quiz", { question: quiz.q, options: quiz.options, answer: quiz.answer }),
        b(5, "gift", { message: giftNote, wrap: ["#5E5CE6", "#FF375F", "#007AFF"][h % 3] }),
        b(6, "confetti", { style: ["Burst", "Rain", "Hearts"][h % 3] }),
      ],
    },
    { id: `ss-${id}-4`, blocks: [b(7, "cta", { label: cta.label, action: cta.action, ...(cta.url ? { url: cta.url } : {}) })] },
  ];
}

/** Ensures the demo user exists; seeds moments + notifications on first run. */
export async function getUser() {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await db.user.create({
      data: { email: DEMO_EMAIL, name: USER.name },
    });
    await seedContent(user.id);
  }
  await backfillSeedDocs();
  return user;
}

/** Seeds the shipped preview moments + activity feed (idempotent per user). */
async function seedContent(userId: string) {
  const existing = await db.moment.count({ where: { userId } });
  if (existing > 0) return;

  const now = Date.now();
  await db.moment.createMany({
    data: MOMENTS.map((m, i) => ({
      id: m.id,
      userId,
      title: m.title,
      recipient: m.recipient,
      status: m.status === "archived" ? "archived" : m.status,
      ...(m.status === "archived" ? { prevStatus: "sent" as string } : {}),
      source: "seed",
      cover: m.cover,
      scenes: m.scenes,
      blocks: 0,
      sceneData: JSON.stringify(seedSceneDoc(m.id, m.title)),
      views: m.views ?? 0,
      // Deterministic preview loves (~38% of views) so seeded analytics look lived-in
      loves: m.views ? Math.round(m.views * 0.38) : 0,
      completion: m.completion ? Number.parseInt(m.completion, 10) : null,
      progress: m.progress ?? null,
      tags: JSON.stringify(m.tags),
      dateLabel: m.date,
      createdAt: new Date(now - (i + 1) * 36e5),
      updatedAt: new Date(now - (i + 1) * 36e5),
    })),
  });

  await db.notification.createMany({
    data: NOTIFICATIONS.map((n, i) => ({
      id: n.id,
      userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      timeLabel: n.time,
      group: n.group,
      unread: n.unread,
      momentId: n.moment?.id ?? null,
      createdAt: new Date(now - (i + 1) * 18e5),
    })),
  });
}

/** One-time upgrade for DBs seeded before authored scene docs existed
 *  (or before CTA blocks carried links). Seed docs are deterministic, so
 *  refreshing them is always safe — user-created moments are never touched. */
async function backfillSeedDocs() {
  const missing = await db.moment.findMany({
    where: {
      source: "seed",
      OR: [{ sceneData: null }, { sceneData: { not: { contains: '"url":' } } }],
    },
    select: { id: true, title: true },
  });
  for (const m of missing) {
    await db.moment.update({
      where: { id: m.id },
      data: { sceneData: JSON.stringify(seedSceneDoc(m.id, m.title)) },
    });
  }
}

/** Generates the deterministic recipient link slug (8 chars). */
export function makeShareSlug(id: string): string {
  const seed = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7);
  return seed.toString(36).padStart(4, "0").slice(0, 4) + "K" + seed.toString(36).slice(-3);
}

/** Uniform 200 response helper. */
export function ok(data: unknown, init?: ResponseInit) {
  return Response.json({ ok: true, ...data }, init);
}

/** Uniform error response helper. */
export function fail(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
