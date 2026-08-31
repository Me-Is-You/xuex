import { db } from '@/db';
import { postReports } from '@/db/schema';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  let body: { reason: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.reason?.trim()) return fail('reason required');
  const [row] = await db.insert(postReports).values({ postId: Number(id), userId, reason: body.reason }).returning();
  return ok(row);
}
