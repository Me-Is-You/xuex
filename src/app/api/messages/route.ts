import { db } from '@/db';
import { messages, users } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { ok, fail, currentUserId, track } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 实时消息（站内信 / 即时通讯）
 * GET ?other=  与某人的会话 + 未读数；不传 other 返回会话列表
 * POST { receiverId, content }  发送
 * POST ?other=&markRead=true    标记已读
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const other = url.searchParams.get('other');

  if (!other) {
    // 会话列表：按最近一条消息排序
    const rows = await db.select().from(messages).orderBy(desc(messages.createdAt));
    const byPeer = new Map<string, { peerId: string; last: typeof rows[number]; unread: number }>();
    for (const m of rows) {
      const peerId = m.senderId === userId ? m.receiverId : m.senderId;
      if (!peerId || peerId === userId) continue;
      const entry = byPeer.get(peerId) ?? { peerId, last: m, unread: 0 };
      if (!entry.last || (m.createdAt ?? new Date(0)) > (entry.last.createdAt ?? new Date(0))) entry.last = m;
      if (m.receiverId === userId && !m.isRead) entry.unread += 1;
      byPeer.set(peerId, entry);
    }
    const allUsers = await db.select().from(users);
    const nameMap = new Map(allUsers.map((u) => [u.id, u.name]));
    return ok(
      [...byPeer.values()].map((e) => ({
        peerId: e.peerId,
        peerName: nameMap.get(e.peerId) ?? e.peerId,
        lastMessage: e.last.content,
        lastAt: e.last.createdAt,
        unread: e.unread,
      })),
    );
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(or(and(eq(messages.senderId, userId), eq(messages.receiverId, other)), and(eq(messages.senderId, other), eq(messages.receiverId, userId)))))
    .orderBy(desc(messages.createdAt))
    .limit(100);
  return ok(rows.reverse());
}

export async function POST(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  if (url.searchParams.get('markRead') === 'true') {
    const other = url.searchParams.get('other');
    if (!other) return fail('other required');
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.senderId, other), eq(messages.receiverId, userId), eq(messages.isRead, false)));
    return ok({ ok: true });
  }
  let body: { receiverId: string; content: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.receiverId || !body.content?.trim()) return fail('receiverId & content required');
  const [row] = await db
    .insert(messages)
    .values({ senderId: userId, receiverId: body.receiverId, content: body.content.trim(), isRead: false })
    .returning();
  await track(userId, 'message_send', { entityId: body.receiverId });
  return ok(row);
}
