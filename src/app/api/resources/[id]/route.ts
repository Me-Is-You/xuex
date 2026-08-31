import { db } from '@/db';
import { resources, courseProgress, resourceNotes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/resources/:id  资源详情 + 当前用户进度（断点续学） + 个人笔记 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  const [res] = await db.select().from(resources).where(eq(resources.id, Number(id)));
  if (!res) return fail('resource not found', 404);
  const [prog] = await db
    .select()
    .from(courseProgress)
    .where(and(eq(courseProgress.userId, userId), eq(courseProgress.courseId, res.id)))
    .limit(1);
  const notes = await db
    .select()
    .from(resourceNotes)
    .where(and(eq(resourceNotes.userId, userId), eq(resourceNotes.resourceId, res.id)))
    .orderBy(desc(resourceNotes.createdAt));
  return ok({ resource: res, progress: prog ?? null, notes });
}

/** POST /api/resources/:id/notes  播放器截图笔记 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  let body: { title?: string; content: string; positionSec?: number };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.content?.trim()) return fail('content required');
  const [row] = await db
    .insert(resourceNotes)
    .values({ userId, resourceId: Number(id), title: body.title ?? '课堂笔记', content: body.content, positionSec: body.positionSec ?? 0 })
    .returning();
  return ok(row);
}
