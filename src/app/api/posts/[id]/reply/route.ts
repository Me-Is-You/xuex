import { db } from '@/db';
import { posts, replies } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ok, fail, currentUserId, currentUserName } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const userName = currentUserName(req);
  const { id } = await params;
  let body: { content: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.content?.trim()) return fail('content required');
  const [row] = await db
    .insert(replies)
    .values({ postId: Number(id), userId, userName, content: body.content.trim() })
    .returning();
  await db.update(posts).set({ replyCount: sql`reply_count + 1` }).where(eq(posts.id, Number(id)));
  return ok(row);
}
