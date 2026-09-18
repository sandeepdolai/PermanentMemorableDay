/**
 * GET/PATCH /api/md/user — the demo account profile.
 * PATCH accepts { creditsDelta } to spend/refill AI credits (clamped 0–999).
 */
import { db } from "@/lib/db";
import { fail, getUser, ok } from "@/lib/md-server";

function serializeUser(u: { name: string; email: string; plan: string; credits: number }) {
  return { name: u.name, email: u.email, plan: u.plan, credits: u.credits };
}

export async function GET() {
  try {
    const user = await getUser();
    return ok({ user: serializeUser(user) });
  } catch (e) {
    console.error("[md/user GET]", e);
    return fail("Failed to load user", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUser();
    const body = (await req.json().catch(() => ({}))) as { creditsDelta?: number };
    const delta = Number(body.creditsDelta ?? 0);
    if (!Number.isFinite(delta) || delta === 0) return fail("Invalid creditsDelta");
    const credits = Math.max(0, Math.min(999, user.credits + Math.round(delta)));
    const updated = await db.user.update({ where: { id: user.id }, data: { credits } });
    return ok({ user: serializeUser(updated) });
  } catch (e) {
    console.error("[md/user PATCH]", e);
    return fail("Failed to update user", 500);
  }
}
