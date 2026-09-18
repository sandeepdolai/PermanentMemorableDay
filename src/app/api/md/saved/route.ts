/**
 * /api/md/saved — the user's saved explore templates.
 *   GET — list template ids
 *   PUT — replace the whole set (simple toggle semantics from the client)
 */
import { db } from "@/lib/db";
import { fail, getUser, ok } from "@/lib/md-server";

export async function GET() {
  try {
    const user = await getUser();
    const saved = await db.savedTemplate.findMany({ where: { userId: user.id } });
    return ok({ savedIds: saved.map((s) => s.templateId) });
  } catch (e) {
    console.error("[md/saved GET]", e);
    return fail("Failed to list saved templates", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUser();
    const body = (await req.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 200) : [];
    await db.savedTemplate.deleteMany({ where: { userId: user.id } });
    if (ids.length) {
      await db.savedTemplate.createMany({
        data: ids.map((templateId) => ({ userId: user.id, templateId })),
      });
    }
    return ok({ savedIds: ids });
  } catch (e) {
    console.error("[md/saved PUT]", e);
    return fail("Failed to save templates", 500);
  }
}
