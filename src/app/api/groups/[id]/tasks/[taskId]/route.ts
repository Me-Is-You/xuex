import { db } from '@/db';
import { groupTasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH 协作任务状态流转 todo → doing → done */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params;
  let body: { status: 'todo' | 'doing' | 'done' };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!['todo', 'doing', 'done'].includes(body.status)) return fail('invalid status');
  const [row] = await db
    .update(groupTasks)
    .set({ status: body.status })
    .where(eq(groupTasks.id, Number(taskId)))
    .returning();
  return ok(row ?? null);
}
