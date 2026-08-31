import { db } from '@/db';
import { questions, userProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok } from '@/lib/api';

/** 每日训练：优先取用户尚未答过的题（保持兼容原 practice 页） */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id') || 'jiang2027';
  const rows = await db.select().from(questions).where(eq(questions.status, 'active'));
  const answered = await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  const answeredSet = new Set(answered.map((a) => a.questionId));
  const fresh = rows.filter((q) => !answeredSet.has(q.id));
  const pool = fresh.length >= 5 ? fresh : rows;
  const picked = pool.sort(() => 0.5 - Math.random()).slice(0, 5);
  return ok(picked);
}
