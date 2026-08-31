import { db } from '@/db';
import { actionLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 操作日志审计：GET ?days=7&limit=100 （默认当前用户） */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days') ?? 7);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const all = await db.select().from(actionLogs).where(eq(actionLogs.userId, userId));
  const since = new Date(Date.now() - days * 86400000);
  return ok(all.filter((l) => (l.createdAt ?? new Date(0)) >= since).slice(0, limit).reverse());
}
