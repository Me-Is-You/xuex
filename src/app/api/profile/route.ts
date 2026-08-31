import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = currentUserId(req);
  const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return ok(row ?? { userId, level: 'beginner', style: 'visual', dailyMinutes: 120, weakPoints: [] });
}

export async function PUT(req: Request) {
  const userId = currentUserId(req);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const allowed = {
    level: body.level,
    style: body.style,
    targetUniversity: body.targetUniversity,
    dailyMinutes: body.dailyMinutes,
    notifyReminder: body.notifyReminder,
  };
  const [row] = await db
    .insert(userProfiles)
    .values({ userId, ...Object.fromEntries(Object.entries(allowed).filter(([, v]) => v != null)) })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: Object.fromEntries(Object.entries(allowed).filter(([, v]) => v != null)),
    })
    .returning();
  return ok(row);
}
