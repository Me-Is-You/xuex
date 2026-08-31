import { ok, fail, currentUserId } from '@/lib/api';
import { runSelfHeal, getHealHistory, MODULES } from '@/lib/selfheal';

export const dynamic = 'force-dynamic';

/** GET 自愈历史 + 模块清单（管理台「自愈中心」） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 50));
  const history = await getHealHistory(limit);
  return ok({ modules: MODULES, history });
}

/** POST 执行自愈 { module?: string } —— module 为空 = 全模块巡检 */
export async function POST(req: Request) {
  const userId = currentUserId(req);
  if (!userId) return fail('login required', 401);
  let body: { module?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body 可选 */
  }
  try {
    const events = await runSelfHeal(body.module);
    return ok({ events, totalDetected: events.reduce((s, e) => s + e.detected, 0), totalRepaired: events.reduce((s, e) => s + e.repaired, 0) });
  } catch (e) {
    return fail(`自愈执行失败：${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
