import { db } from '@/db';
import { alerts } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { ok } from '@/lib/api';
import { runAlertEngine } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

/**
 * 学习预警中心：GET 拉取时先执行预警引擎（规则扫描，幂等），再返回列表
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const created = await runAlertEngine();
  let rows = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  if (status) rows = rows.filter((a) => a.status === status);
  return ok({ alerts: rows, newlyCreated: created });
}
