import { db } from '@/db';
import { groups, groupNotes, groupTasks } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ok, fail, currentUserName } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET 小组详情：共享笔记 + 协作任务 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [group] = await db.select().from(groups).where(eq(groups.id, Number(id)));
  if (!group) return fail('group not found', 404);
  const notes = await db.select().from(groupNotes).where(eq(groupNotes.groupId, Number(id))).orderBy(desc(groupNotes.createdAt));
  const tasks = await db.select().from(groupTasks).where(eq(groupTasks.groupId, Number(id))).orderBy(desc(groupTasks.createdAt));
  return ok({ group, notes, tasks });
}

/** POST 新增共享笔记或协作任务：{ kind: 'note'|'task', ... } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { kind: 'note' | 'task'; title: string; content?: string; assignee?: string; dueDate?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.title?.trim()) return fail('title required');
  if (body.kind === 'note') {
    if (!body.content?.trim()) return fail('content required');
    const [row] = await db
      .insert(groupNotes)
      .values({ groupId: Number(id), title: body.title, content: body.content, authorName: currentUserName() })
      .returning();
    return ok(row);
  }
  const [row] = await db
    .insert(groupTasks)
    .values({ groupId: Number(id), title: body.title, assignee: body.assignee ?? '未分配', dueDate: body.dueDate ?? null })
    .returning();
  return ok(row);
}
