import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { ok, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 通知中心：GET 列表 / POST { markAllRead: true } */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
  const unread = rows.filter((n) => !n.isRead).length;
  return ok({ notifications: rows, unread });
}

export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { markAllRead?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no-op
  }
  if (body.markAllRead) {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }
  return ok({ ok: true });
}
