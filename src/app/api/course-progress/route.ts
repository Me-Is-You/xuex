import { db } from '@/db';
import { courseProgress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 播放器进度（断点续学 + 多端同步）
 * GET ?resourceId=  取最近播放位置
 * POST { resourceId, positionSec, totalSec }  保存进度（离线缓存联网后自动同步）
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const resourceId = Number(url.searchParams.get('resourceId'));
  if (!resourceId) return fail('resourceId required');
  const [row] = await db
    .select()
    .from(courseProgress)
    .where(and(eq(courseProgress.userId, userId), eq(courseProgress.courseId, resourceId)))
    .limit(1);
  return ok(row ?? null);
}

export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { resourceId: number; positionSec: number; totalSec: number; completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const existing = await db
    .select()
    .from(courseProgress)
    .where(and(eq(courseProgress.userId, userId), eq(courseProgress.courseId, body.resourceId)))
    .limit(1);
  if (existing.length) {
    const [row] = await db
      .update(courseProgress)
      .set({
        lastPositionSec: body.positionSec,
        totalSec: body.totalSec,
        completed: body.completed ?? existing[0].completed,
        synced: true,
        updatedAt: new Date(),
      })
      .where(eq(courseProgress.id, existing[0].id))
      .returning();
    return ok(row);
  }
  const [row] = await db
    .insert(courseProgress)
    .values({
      userId,
      courseId: body.resourceId,
      lastPositionSec: body.positionSec,
      totalSec: body.totalSec,
      completed: body.completed ?? false,
      synced: true,
    })
    .returning();
  return ok(row);
}
