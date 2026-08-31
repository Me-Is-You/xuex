import { db } from '@/db';
import { alerts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';
import { applyIntervention } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

/**
 * 预警处理 + 干预策略执行
 * POST { actions: ['消息提醒','教师通知','推送补救内容'], ignore?: boolean }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { actions?: string[]; ignore?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (body.ignore) {
    const [row] = await db.update(alerts).set({ status: 'ignored', handledAt: new Date() }).where(eq(alerts.id, Number(id))).returning();
    return ok(row ?? null);
  }
  const applied = await applyIntervention(Number(id), body.actions ?? ['消息提醒']);
  if (!applied) return fail('alert not found', 404);
  return ok({ applied });
}
