import { db } from '@/db';
import { syncRuns } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';
import { runResourceSync, getLastSyncRun } from '@/lib/sync/pipeline';

export const dynamic = 'force-dynamic';

/** GET 最近运行 + 各数据源健康状态（管理台「资源同步」Tab） */
export async function GET() {
  const last = await getLastSyncRun();
  const recent = await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(7);
  return ok({ last, recent });
}

/**
 * POST 手动触发同步 { force?: boolean }
 * force=true 跳过 20h 幂等窗口（管理台「立即执行」）
 */
export async function POST(req: Request) {
  const userId = currentUserId(req);
  if (!userId) return fail('login required', 401);
  let body: { force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* body 可选 */
  }
  try {
    const report = await runResourceSync({ trigger: 'manual', force: body.force ?? true });
    return ok(report);
  } catch (e) {
    return fail(`同步失败：${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
