import { db } from '@/db';
import { knowledgePoints, kpEdges } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';
import { getMastery } from '@/lib/mastery';

export const dynamic = 'force-dynamic';

/**
 * 知识图谱：节点 + 关系 + 掌握状态（可视化树形/网状、路径导航共用）
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');

  let nodes = await db.select().from(knowledgePoints);
  if (subject) nodes = nodes.filter((n) => n.subject === subject);
  const edges = await db.select().from(kpEdges);
  const mastery = await getMastery(userId);
  const masteryMap = new Map(mastery.map((m) => [m.kpId, m]));

  const nodeIds = new Set(nodes.map((n) => n.id));
  return ok({
    nodes: nodes.map((n) => {
      const m = masteryMap.get(n.id);
      return { ...n, mastery: m?.mastery ?? 0, status: m?.status ?? 'untouched', total: m?.total ?? 0 };
    }),
    edges: edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)),
  });
}

/** POST 新增知识点（编辑器） */
export async function POST(req: Request) {
  let body: { subject: string; name: string; description?: string; parentId?: number | null };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.subject || !body.name) return fail('subject & name required');
  const [row] = await db.insert(knowledgePoints).values({
    subject: body.subject,
    name: body.name,
    description: body.description ?? null,
    parentId: body.parentId ?? null,
  }).returning();
  return ok(row);
}
