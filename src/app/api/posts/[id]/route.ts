import { db } from '@/db';
import { posts, replies } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 单帖详情（含回帖） */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, Number(id)));
  if (!post) return fail('post not found', 404);
  const postReplies = await db.select().from(replies).where(eq(replies.postId, Number(id))).orderBy(desc(replies.createdAt));
  return ok({ ...post, replies: postReplies });
}
