import { db } from '@/db';
import { posts, postLikes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ok, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 点赞 / 取消（一人一点） */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  const existing = await db.select().from(postLikes).where(and(eq(postLikes.postId, Number(id)), eq(postLikes.userId, userId))).limit(1);
  if (existing.length) {
    await db.delete(postLikes).where(eq(postLikes.id, existing[0].id));
    await db.update(posts).set({ likeCount: sql`GREATEST(like_count - 1, 0)` }).where(eq(posts.id, Number(id)));
    return ok({ liked: false });
  }
  await db.insert(postLikes).values({ postId: Number(id), userId });
  await db.update(posts).set({ likeCount: sql`like_count + 1` }).where(eq(posts.id, Number(id)));
  return ok({ liked: true });
}
