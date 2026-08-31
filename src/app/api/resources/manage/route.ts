import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 资源审核与版本管理（教学管理）
 * PATCH { id, status: 'published'|'offline'|'pending', version?: number, reviewer?: string }
 */
export async function PATCH(req: Request) {
  const userId = currentUserId(req);
  let body: { id: number; status?: string; version?: number; reviewer?: string; tags?: string[]; difficulty?: number; grade?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const id = body.id;
  if (!id) return fail('id required');
  const set: Record<string, unknown> = {};
  if (body.status && ['draft', 'pending', 'published', 'offline'].includes(body.status)) {
    set.status = body.status;
    if (body.status === 'published') {
      set.reviewer = body.reviewer ?? userId;
      set.reviewedAt = new Date();
    }
  }
  if (body.version) set.version = body.version;
  if (body.tags) set.tags = body.tags as string[];
  if (body.difficulty) set.difficulty = body.difficulty;
  if (body.grade) set.grade = body.grade;
  if (!Object.keys(set).length) return fail('nothing to update');
  const [row] = await db.update(resources).set(set as any).where(eq(resources.id, Number(id))).returning();
  return ok(row ?? null);
}
