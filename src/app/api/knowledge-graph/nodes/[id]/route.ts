import { db } from '@/db';
import { knowledgePoints } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PUT 更新知识点 / DELETE 删除（级联删边） */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { name?: string; description?: string; importance?: number; examFreq?: number; parentId?: number | null };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (v !== undefined) set[k] = v;
  const [row] = await db.update(knowledgePoints).set(set as any).where(eq(knowledgePoints.id, Number(id))).returning();
  return ok(row ?? null);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { kpEdges } = await import('@/db/schema');
  const { and } = await import('drizzle-orm');
  await db.delete(kpEdges).where(and(eq(kpEdges.sourceId, Number(id)), eq(kpEdges.targetId, Number(id))));
  await db.delete(kpEdges).where(eq(kpEdges.sourceId, Number(id)));
  await db.delete(kpEdges).where(eq(kpEdges.targetId, Number(id)));
  const [row] = await db.delete(knowledgePoints).where(eq(knowledgePoints.id, Number(id))).returning();
  return ok(row ? { deleted: row.id } : { error: 'not found' });
}
