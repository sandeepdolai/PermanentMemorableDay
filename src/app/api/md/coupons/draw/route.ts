/**
 * /api/md/coupons/draw — the claw machine's server-backed coupon assignment.
 *
 *   POST { momentId, blockId } — PLAY. Returns the player's assigned coupon
 *        for this machine (moment + block). On the player's FIRST play the
 *        server randomly picks one coupon from the creator's eligible pool
 *        (enabled + in stock), persists the assignment and decrements stock —
 *        all inside one transaction. Every later play returns the SAME row:
 *        the random selection happens exactly once per player, enforced here.
 *
 *   GET ?momentId=&blockId= — peek. Does this player already have a coupon?
 *        (Used to label the button "PLAY AGAIN" — never re-rolls anything.)
 *
 * Player identity: an anonymous `md_player` cookie, generated server-side.
 * Recipients don't log in yet, so this is the per-player key the assignment
 * is scoped to (swap for the auth user id when auth lands). The cookie is
 * only the identity — every decision (eligibility, random pick, stock
 * decrement, persistence) happens on the server, so refreshes, replays and
 * devtools state tweaks can never change a player's coupon.
 */
import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { coalesceNotification, fail, getUser, ok } from "@/lib/md-server";
import { couponPool, eligibleCoupons, parseScenes, type CouponDef } from "@/lib/md-blocks";

const COOKIE = "md_player";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

interface AssignmentDTO {
  couponId: string;
  code: string;
  title: string;
  color: string;
}

interface DrawOutcome {
  assignment: AssignmentDTO | null;
  alreadyAssigned?: boolean;
  /** "no-eligible-coupons" | "moment-not-found" | "machine-missing" */
  reason?: string;
}

/** Reads (or mints + sets) the anonymous player identity. */
async function ensurePlayerId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;
  const playerId = `p${Date.now().toString(36)}${randomInt(0, 1_000_000).toString(36)}${randomInt(0, 4096).toString(36)}`;
  jar.set(COOKIE, playerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return playerId;
}

/** Clamps + trims a pool coming off the wire (authored JSON column). */
function sanitizePool(raw: unknown): CouponDef[] {
  const pool = couponPool(raw as { coupons?: CouponDef[]; code?: string } | undefined);
  return pool.map((c) => ({
    ...c,
    code: c.code.trim().slice(0, 24),
    title: (c.title ?? "").trim().slice(0, 60),
    description: c.description?.trim().slice(0, 120) || undefined,
    color: /^#[0-9a-fA-F]{6}$/.test(c.color ?? "") ? c.color : "#9B59B6",
    enabled: c.enabled !== false,
    stock: c.stock == null ? null : Math.max(0, Math.min(99999, Math.floor(c.stock))),
  }));
}

function serialize(a: { couponId: string; code: string; title: string; color: string }): AssignmentDTO {
  return { couponId: a.couponId, code: a.code, title: a.title, color: a.color };
}

/* In-process draw queue — first-play assignments are short write
 * transactions; serializing them in-process removes SQLite's single-writer
 * contention entirely (10 truly-simultaneous plays just line up for ~30ms
 * each). Cross-process safety is still guaranteed by the unique constraint
 * + the in-transaction stock re-check. */
let drawQueue: Promise<unknown> = Promise.resolve();
function serializeDraw<T>(fn: () => Promise<T>): Promise<T> {
  const next = drawQueue.then(fn, fn);
  drawQueue = next.catch(() => {});
  return next;
}

export async function POST(req: Request) {
  // Parse the body ONCE (request streams can't be re-read on retry).
  const body = (await req.json().catch(() => ({}))) as { momentId?: string; blockId?: string };
  // The whole draw is retried on transient SQLite contention — under truly
  // concurrent plays the fast-path (existing assignment) resolves instantly.
  for (let attempt = 0; ; attempt++) {
    try {
      return await handleDraw(body);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const retriable =
        attempt < 2 &&
        (/database is locked|socket timeout|write conflict|transaction failed/i.test(err?.message ?? "") ||
          err?.code === "P2034" ||
          err?.code === "P2024");
      if (!retriable) {
        console.error("[md/coupons/draw POST]", e);
        return fail("Failed to draw a coupon", 500);
      }
      await new Promise((r) => setTimeout(r, 25 + Math.random() * 60));
    }
  }
}

async function handleDraw(body: { momentId?: string; blockId?: string }): Promise<Response> {
  const user = await getUser();
  const momentId = body.momentId?.trim();
  const blockId = body.blockId?.trim();
  if (!momentId || !blockId) return fail("Missing momentId or blockId");

    const playerId = await ensurePlayerId();
    const uniqueKey = { momentId_blockId_playerId: { momentId, blockId, playerId } };

    // Fast path — an existing assignment is FINAL. No re-roll, no stock touch.
    const existing = await db.couponAssignment.findUnique({ where: uniqueKey });
    if (existing) {
      return ok({ assignment: serialize(existing), alreadyAssigned: true });
    }

    // The moment must exist and belong to this creator (the machine's pool
    // lives in its authored scene document).
    const moment = await db.moment.findFirst({ where: { id: momentId, userId: user.id } });
    if (!moment) {
      return ok({ assignment: null, reason: "moment-not-found" });
    }

    // First play → assign. Everything (re-check, pool read, random pick,
    // stock decrement, assignment create) runs inside one transaction so
    // concurrent plays can't double-assign or oversell — and the in-process
    // queue serializes first-plays so SQLite's single writer never contends.
    const outcome: DrawOutcome = await serializeDraw(() =>
      db
        .$transaction(
          async (tx) => {
            // Re-check inside the tx — a concurrent first play by the same
            // player may have won the race.
            const again = await tx.couponAssignment.findUnique({ where: uniqueKey });
            if (again) return { assignment: serialize(again), alreadyAssigned: true } as DrawOutcome;

            // Re-read the machine's authored document INSIDE the transaction —
            // the outer read is a stale snapshot (another player's draw may
            // already have decremented stock since).
            const momentRow = await tx.moment.findFirst({ where: { id: momentId, userId: user.id } });
            if (!momentRow) return { assignment: null, reason: "moment-not-found" } as DrawOutcome;
            const scenes = parseScenes(momentRow.sceneData) ?? [];
            const block = scenes.flatMap((s) => s.blocks).find((b) => b.id === blockId);
            if (!block) return { assignment: null, reason: "machine-missing" } as DrawOutcome;

            const pool = sanitizePool(block.data);
            const eligible = eligibleCoupons(pool);
            if (eligible.length === 0) return { assignment: null, reason: "no-eligible-coupons" } as DrawOutcome;

            // The one and only random selection for this player.
            const pick = eligible[randomInt(eligible.length)];

            let updatedSceneData: string | undefined;
            if (pick.stock != null && Array.isArray(block.data?.coupons)) {
              const next = block.data.coupons.map((c) =>
                c.id === pick.id ? { ...c, stock: Math.max(0, (c.stock ?? 0) - 1) } : c
              );
              block.data = { ...block.data, coupons: next };
              updatedSceneData = JSON.stringify(scenes);
            }

            let created;
            try {
              created = await tx.couponAssignment.create({
                data: {
                  momentId,
                  blockId,
                  playerId,
                  couponId: pick.id,
                  code: pick.code,
                  title: pick.title ?? "",
                  color: pick.color,
                },
              });
            } catch (e) {
              // Unique violation → concurrent play by the same player won.
              if ((e as { code?: string })?.code === "P2002") {
                const winner = await tx.couponAssignment.findUnique({ where: uniqueKey });
                if (winner) return { assignment: serialize(winner), alreadyAssigned: true } as DrawOutcome;
              }
              throw e;
            }

            // Stock decrement lands only once the assignment itself is safe.
            if (updatedSceneData !== undefined) {
              await tx.moment.update({ where: { id: moment.id }, data: { sceneData: updatedSceneData } });
            }

            return { assignment: serialize(created), alreadyAssigned: false } as DrawOutcome;
          },
          { timeout: 15000 }
        )
        .catch(async (e: { code?: string; message?: string }) => {
          // Contention from outside the queue (another route writing) —
          // resolve via the fast path if a concurrent winner committed.
          const retriable =
            e?.code === "P2034" ||
            e?.code === "P2024" ||
            /database is locked|socket timeout|write conflict|transaction failed/i.test(e?.message ?? "");
          if (retriable) {
            const winner = await db.couponAssignment.findUnique({ where: uniqueKey }).catch(() => null);
            if (winner) return { assignment: serialize(winner), alreadyAssigned: true } as DrawOutcome;
          }
          throw e;
        })
    );

    // Creator-facing claim analytics (first assignment only, coalesced).
    if (outcome.assignment && !outcome.alreadyAssigned) {
      await coalesceNotification({
        userId: user.id,
        kind: "milestone",
        title: "A coupon was claimed",
        body: `${outcome.assignment.code} won from “${moment.title}”`,
        bodyMulti: (n) => `${n} coupons won from “${moment.title}” today`,
        momentId: moment.id,
      }).catch(() => {});
    }

    return ok(outcome);
}

export async function GET(req: Request) {
  try {
    await getUser();
    const url = new URL(req.url);
    const momentId = url.searchParams.get("momentId")?.trim();
    const blockId = url.searchParams.get("blockId")?.trim();
    if (!momentId || !blockId) return fail("Missing momentId or blockId");

    const playerId = await ensurePlayerId();
    const existing = await db.couponAssignment.findUnique({
      where: { momentId_blockId_playerId: { momentId, blockId, playerId } },
    });
    return ok({
      assignment: existing ? serialize(existing) : null,
    });
  } catch (e) {
    console.error("[md/coupons/draw GET]", e);
    return fail("Failed to check coupon assignment", 500);
  }
}
