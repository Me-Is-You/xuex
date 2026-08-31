import { db } from '@/db';
import { kpEdges } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST 新增关系边（编辑器）：{ sourceId, targetId, relation } */
export async function POST(req: Request) {
  let body: { sourceId: number; targetId: number; relation: 'prerequisite' | 'related' };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.sourceId || !body.targetId) return fail('sourceId & targetId required');
  const [row] = await db
    .insert(kpEdges)
    .values({ sourceId: body.sourceId, targetId: body.targetId, relation: body.relation ?? 'prerequisite' })
    .returning();
  return ok(row);
}

/** DELETE ?edgeId= 删除边 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const edgeId = Number(url.searchParams.get('edgeId'));
  if (!edgeId) return fail('edgeId required');
  const [row] = await db.delete(kpEdges).where(eq(kpEdges.id, edgeId)).returning();
  return ok(row ? { deleted: edgeId } : { error: 'not found' });
}
