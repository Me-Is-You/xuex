import { db } from '@/db';
import { wrongBook } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH { mastered } 标记掌握 / 重新归集 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  let body: { mastered: boolean };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const updated = await db
    .update(wrongBook)
    .set({ mastered: body.mastered, updatedAt: new Date() })
    .where(and(eq(wrongBook.id, Number(id)), eq(wrongBook.userId, userId)))
    .returning();
  return ok(updated[0] ?? null);
}
