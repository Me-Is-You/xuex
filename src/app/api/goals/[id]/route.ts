import { db } from '@/db';
import { userGoals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH 目标状态流转：active ↔ paused（完成可手动标记 completed） */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  let body: { status?: 'active' | 'paused' | 'completed' };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const existing = await db.select().from(userGoals).where(eq(userGoals.id, Number(id)));
  if (!existing.length || existing[0].userId !== userId) return fail('goal not found', 404);
  if (body.status && !['active', 'paused', 'completed'].includes(body.status)) return fail('bad status');
  const [row] = await db
    .update(userGoals)
    .set({ status: body.status ?? undefined } as any)
    .where(eq(userGoals.id, Number(id)))
    .returning();
  return ok(row);
}
