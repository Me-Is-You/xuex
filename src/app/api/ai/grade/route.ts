import { db } from '@/db';
import { questions, wrongBook } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';
import { gradeObjective, gradeEssay } from '@/lib/ai';

export const dynamic = 'force-dynamic';

/**
 * 智能批改
 * POST { type: 'objective', questionId, userAnswer }  客观题判分
 * POST { type: 'subjective', essay }                  作文多维评分
 */
export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { type: 'objective' | 'subjective'; questionId?: number; userAnswer?: string; essay?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }

  if (body.type === 'objective') {
    if (!body.questionId || !body.userAnswer) return fail('questionId & userAnswer required');
    const [q] = await db.select().from(questions).where(eq(questions.id, body.questionId));
    if (!q) return fail('question not found', 404);
    const result = gradeObjective({ ...q, options: q.options as string[] }, body.userAnswer);
    // 答错自动归集错题本
    if (result.score === 0) {
      const existing = await db.select().from(wrongBook).where(and(eq(wrongBook.userId, userId), eq(wrongBook.questionId, q.id))).limit(1);
      if (existing.length) {
        await db.update(wrongBook).set({ wrongCount: sql`${wrongBook.wrongCount} + 1`, lastWrongAt: new Date(), updatedAt: new Date() }).where(eq(wrongBook.id, existing[0].id));
      } else {
        await db.insert(wrongBook).values({ userId, questionId: q.id, kpId: q.kpId, wrongCount: 1, mastered: false });
      }
    }
    return ok(result);
  }

  if (body.type === 'subjective') {
    if (!body.essay?.trim()) return fail('essay required');
    return ok(gradeEssay(body.essay));
  }
  return fail('unknown type');
}
