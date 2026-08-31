import { db } from '@/db';
import { interventionRules } from '@/db/schema';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 干预策略管理：GET 列表 / PUT 更新（启用/参数/动作） */
export async function GET() {
  const rows = await db.select().from(interventionRules);
  return ok(rows);
}

export async function PUT(req: Request) {
  let body: { id: number; enabled?: boolean; config?: Record<string, unknown>; action?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response('invalid body', { status: 400 });
  }
  if (!body.id) return new Response('id required', { status: 400 });
  const set: Record<string, unknown> = {};
  if (typeof body.enabled === 'boolean') set.enabled = body.enabled;
  if (body.config) set.config = body.config;
  if (body.action) set.action = body.action;
  set.updatedAt = new Date();
  const { eq } = await import('drizzle-orm');
  const [row] = await db.update(interventionRules).set(set as any).where(eq(interventionRules.id, body.id)).returning();
  return ok(row ?? null);
}
