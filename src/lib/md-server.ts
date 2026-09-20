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

/** Live relative label from createdAt — "now", "4m", "2h", "3d" (falls back
 *  to the stored label for anything older than a week, where precision stops
 *  mattering and curated copy reads better). */
function relativeLabel(createdAt: Date | string | null | undefined, fallback: string): string {
  if (!createdAt) return fallback;
  const t = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (!Number.isFinite(t)) return fallback;
  const diff = Math.max(0, Date.now() - t);
  if (diff < 60_000) return "now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return fallback;
}

/** Curated label ("2m" / "18m" / "1h" / "3h" / "1d" / "4d") → ms ago, so
 *  seeded rows get a createdAt that keeps reproducing their label live. */
function labelToMs(label: string): number {
  const m = /^(\d+)(m|h|d)$/.exec(label.trim());
  if (!m) return 0;
  const n = Number.parseInt(m[1], 10);
  if (m[2] === "m") return n * 60_000;
  if (m[2] === "h") return n * 3_600_000;
  return n * 86_400_000;
}

export function serializeNotification(n: {
  id: string;
  kind: string;
  title: string;
  body: string;
  timeLabel: string;
  group: string;
  unread: boolean;
  createdAt?: Date | string | null;
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
    time: relativeLabel(n.createdAt, n.timeLabel),
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

/* ------------------------------------------------------------------ */
/* Notification coalescing (feed stays clean — one row per event type   */
/* per moment per day, with a ×N counter instead of duplicate rows)     */
/* ------------------------------------------------------------------ */

/**
 * Files a feed event. If the same (kind, moment) row already exists in
 * "today", it is refreshed instead of duplicated: count grows, the body
 * becomes "… ×N today", the row jumps back to the top of the feed.
 */
export async function coalesceNotification(input: {
  userId: string;
  kind: string;
  title: string;
  /** Body copy for the FIRST occurrence */
  body: string;
  /** Body copy once the row summarizes N > 1 occurrences */
  bodyMulti: (n: number) => string;
  momentId: string | null;
}): Promise<void> {
  const existing = await db.notification.findFirst({
    where: {
      userId: input.userId,
      kind: input.kind,
      group: "today",
      ...(input.momentId ? { momentId: input.momentId } : { momentId: null }),
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const count = (existing.count ?? 1) + 1;
    await db.notification.update({
      where: { id: existing.id },
      data: {
        count,
        title: input.title,
        body: count > 1 ? input.bodyMulti(count) : input.body,
        timeLabel: "now",
        unread: true,
        createdAt: new Date(), // jump back to the top of the feed
      },
    });
    return;
  }

  await db.notification.create({
    data: {
      id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      timeLabel: "now",
      group: "today",
      unread: true,
      count: 1,
      momentId: input.momentId,
    },
  });
}

/** One-time-ish feed hygiene, safe to run on every bootstrap (no-ops when
 *  the feed is already clean): merges duplicate (kind, moment) "today" rows
 *  into their newest representative with a summed counter, then caps the
 *  feed at the 60 newest rows. */
async function dedupeNotifications(userId: string): Promise<void> {
  const rows = await db.notification.findMany({
    where: { userId, group: "today" },
    include: { moment: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Merge duplicates: keep the newest row per (kind, momentId)
  const seen = new Set<string>();
  const toDelete: { id: string; count: number }[] = [];
  for (const row of rows) {
    const key = `${row.kind}|${row.momentId ?? "-"}`;
    if (seen.has(key)) {
      toDelete.push({ id: row.id, count: row.count ?? 1 });
    } else {
      seen.add(key);
    }
  }
  if (toDelete.length > 0) {
    // Fold each duplicate's count into its surviving representative
    for (const dup of toDelete) {
      const dupRow = rows.find((r) => r.id === dup.id);
      if (!dupRow) continue;
      const keeper = rows.find(
        (r) => r.id !== dup.id && r.kind === dupRow.kind && (r.momentId ?? null) === (dupRow.momentId ?? null)
      );
      if (keeper) {
        const total = (keeper.count ?? 1) + (dupRow.count ?? 1);
        await db.notification
          .update({
            where: { id: keeper.id },
            data: {
              count: total,
              body:
                total > 1 && (dupRow.kind === "opened" || dupRow.kind === "loved")
                  ? dupRow.kind === "opened"
                    ? `“${dupRow.moment?.title ?? "Your moment"}” was opened ${total} times today`
                    : `Your moment received ${total} love reactions`
                  : keeper.body,
            },
          })
          .catch(() => {}); // title/body rewrites are best-effort
      }
      await db.notification.delete({ where: { id: dup.id } }).catch(() => {});
    }
  }

  // Cap the feed at 60 rows (oldest overflow goes first)
  const total = await db.notification.count({ where: { userId } });
  if (total > 60) {
    const oldest = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: total - 60,
      select: { id: true },
    });
    await db.notification
      .deleteMany({ where: { id: { in: oldest.map((r) => r.id) } } })
      .catch(() => {});
  }
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

/** Ensures the demo user exists; seeds moments + notifications on first run.
 * Feed hygiene (backfill + dedupe) is throttled — it's idempotent and only
 * needs to run occasionally, and skipping it under concurrent requests keeps
 * SQLite's single write lock free for real work. */
let lastMaintenanceAt = 0;
const MAINTENANCE_INTERVAL_MS = 30_000;

export async function getUser() {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await db.user.create({
      data: { email: DEMO_EMAIL, name: USER.name },
    });
    await seedContent(user.id);
  }
  if (Date.now() - lastMaintenanceAt > MAINTENANCE_INTERVAL_MS) {
    lastMaintenanceAt = Date.now();
    await backfillSeedDocs();
    await dedupeNotifications(user.id);
  }
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
    data: NOTIFICATIONS.map((n) => ({
      id: n.id,
      userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      timeLabel: n.time,
      group: n.group,
      unread: n.unread,
      momentId: n.moment?.id ?? null,
      // createdAt is scaled to the curated label ("2m" → 2 min ago) so the
      // live relative labels in the feed reproduce the seeded story exactly.
      createdAt: new Date(now - labelToMs(n.time)),
    })),
  });
}

/** One-time upgrade for DBs seeded before authored scene docs existed
 *  (or before CTA blocks carried links). Seed docs are deterministic, so
 *  refreshing them is always safe — user-created moments are never touched.
 *  Guarded: only one maintenance sweep runs at a time (idempotent hygiene
 *  doesn't need concurrent runs — and on SQLite they'd fight over the
 *  single write lock). */
let maintenanceInFlight = false;
async function backfillSeedDocs() {
  if (maintenanceInFlight) return;
  maintenanceInFlight = true;
  try {
    const missing = await db.moment.findMany({
      where: {
        source: "seed",
        OR: [{ sceneData: null }, { sceneData: { not: { contains: '"url":' } } }],
      },
      select: { id: true, title: true },
    });
    for (const m of missing) {
      await db.moment
        .update({
          where: { id: m.id },
          data: { sceneData: JSON.stringify(seedSceneDoc(m.id, m.title)) },
        })
        .catch(() => {}); // best-effort — another sweep will pick it up
    }
  } finally {
    maintenanceInFlight = false;
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
