import { db } from '@/db';
import { posts, postLikes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ok, fail, currentUserId, currentUserName, track } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 讨论区：课程级/班级级讨论，发帖 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  let rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
  if (category) rows = rows.filter((p) => p.category === category);
  const liked = await db.select({ postId: postLikes.postId }).from(postLikes).where(eq(postLikes.userId, userId));
  const likedSet = new Set(liked.map((l) => l.postId));
  return ok(rows.map((p) => ({ ...p, liked: likedSet.has(p.id) })));
}

export async function POST(req: Request) {
  const userId = currentUserId(req);
  const userName = currentUserName(req);
  let body: { title: string; content: string; category?: string; courseId?: number };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.title?.trim() || !body.content?.trim()) return fail('title & content required');
  const [row] = await db
    .insert(posts)
    .values({
      userId,
      userName,
      title: body.title.trim(),
      content: body.content.trim(),
      category: body.category ?? 'general',
      courseId: body.courseId ?? null,
    })
    .returning();
  await track(userId, 'post_create', { entityId: String(row.id) });
  return ok(row);
}
