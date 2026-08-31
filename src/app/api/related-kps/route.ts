import { ok, fail } from '@/lib/api';
import { relatedKps } from '@/lib/ai';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** 关联推荐：GET ?kpId= 前置/后续/相关知识点 + 每个知识点的代表资源 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kpId = Number(url.searchParams.get('kpId'));
  if (!kpId) return fail('kpId required');
  const rel = await relatedKps(kpId);
  const allRes = await db.select().from(resources).where(eq(resources.status, 'published'));
  const pickRes = (id: number) => allRes.find((r) => r.kpId === id) ?? null;
  return ok({
    prereq: rel.prereq.map((k) => ({ ...k, resource: pickRes(k.id) })),
    next: rel.next.map((k) => ({ ...k, resource: pickRes(k.id) })),
    related: rel.related.map((k) => ({ ...k, resource: pickRes(k.id) })),
  });
}
