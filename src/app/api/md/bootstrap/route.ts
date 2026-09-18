/**
 * GET/POST /api/md/bootstrap — one-shot app state hydrator.
 * Ensures the demo user + seed content, optionally ingests a one-time
 * localStorage migration (drafts / saved templates / archived ids) and
 * returns the full client state: moments, notifications, saved ids, user.
 */
import { db } from "@/lib/db";
import { fail, getUser, ok, serializeMoment, serializeNotification } from "@/lib/md-server";

interface MigrateDraft {
  id: string;
  title: string;
  cover: number;
  scenes: number;
  blocks: number;
  editedAt: string;
}

interface BootstrapBody {
  migrate?: {
    drafts?: MigrateDraft[];
    savedIds?: string[];
    archivedIds?: string[];
  };
}

async function buildState(userId: string) {
  const [moments, notifications, saved] = await Promise.all([
    db.moment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.notification.findMany({
      where: { userId },
      include: { moment: true },
      orderBy: { createdAt: "desc" },
    }),
    db.savedTemplate.findMany({ where: { userId } }),
  ]);
  return {
    moments: moments.map(serializeMoment),
    notifications: notifications.map(serializeNotification),
    savedIds: saved.map((s) => s.templateId),
  };
}

export async function GET() {
  try {
    const user = await getUser();
    return ok({ ...(await buildState(user.id)), user: { name: user.name, email: user.email, plan: user.plan, credits: user.credits } });
  } catch (e) {
    console.error("[md/bootstrap]", e);
    return fail("Failed to load app state", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    const body = (await req.json().catch(() => ({}))) as BootstrapBody;
    const migrate = body.migrate;

    // One-time localStorage → server import (only while not yet migrated).
    if (migrate && !user.migratedAt) {
      if (migrate.drafts?.length) {
        for (const d of migrate.drafts) {
          await db.moment.upsert({
            where: { id: d.id },
            create: {
              id: d.id,
              userId: user.id,
              title: d.title || "Untitled Experience",
              status: "draft",
              source: "user",
              cover: d.cover ?? 0,
              scenes: Math.max(1, d.scenes ?? 1),
              blocks: d.blocks ?? 0,
              dateLabel: d.editedAt || "Just now",
            },
            update: {},
          });
        }
      }
      if (migrate.savedIds?.length) {
        for (const tid of migrate.savedIds) {
          await db.savedTemplate.upsert({
            where: { userId_templateId: { userId: user.id, templateId: tid } },
            create: { userId: user.id, templateId: tid },
            update: {},
          });
        }
      }
      if (migrate.archivedIds?.length) {
        await db.moment.updateMany({
          where: { userId: user.id, id: { in: migrate.archivedIds }, status: { not: "archived" } },
          data: { status: "archived", prevStatus: "sent" },
        });
      }
      await db.user.update({ where: { id: user.id }, data: { migratedAt: new Date() } });
    }

    return ok({ ...(await buildState(user.id)), migrated: true, user: { name: user.name, email: user.email, plan: user.plan, credits: user.credits } });
  } catch (e) {
    console.error("[md/bootstrap]", e);
    return fail("Failed to load app state", 500);
  }
}
