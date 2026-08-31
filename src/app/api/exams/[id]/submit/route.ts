import { db } from '@/db';
import { exams, questions, examResults, userProgress } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 交卷判分：自动批改客观题，写入 exam_results + 逐题答题记录（错题自动归集）
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  let body: { answers: Array<{ questionId: number; answer: string }>; durationSec?: number };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const [exam] = await db.select().from(exams).where(eq(exams.id, Number(id)));
  if (!exam) return fail('exam not found', 404);
  if (exam.status !== 'published') return fail('试卷未发布，无法交卷', 403);
  if (!body.answers?.length) return fail('answers required');

  const all = await db.select().from(questions).where(inArray(questions.id, body.answers.map((a) => a.questionId)));
  const byId = new Map(all.map((q) => [q.id, q]));
  let correct = 0;
  const details: Array<{ questionId: number; isCorrect: boolean }> = [];
  for (const a of body.answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const isCorrect = q.answer === a.answer;
    if (isCorrect) correct += 1;
    details.push({ questionId: a.questionId, isCorrect });
    await db.insert(userProgress).values({ userId, questionId: q.id, kpId: q.kpId, isCorrect, duration: Math.round((body.durationSec ?? 0) / details.length) });
  }

  const maxScore = 100;
  const score = Math.round((correct / Math.max(1, details.length)) * 100);
  const [row] = await db
    .insert(examResults)
    .values({
      examId: exam.id,
      userId,
      studentName: userId === 'jiang2027' ? '江同学' : userId,
      score,
      maxScore,
      durationSec: body.durationSec ?? null,
      details,
    })
    .returning();
  return ok({ result: row, correct, total: details.length, score });
}
