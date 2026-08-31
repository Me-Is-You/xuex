import { db } from '@/db';
import { wrongBook, questions, knowledgePoints } from '@/db/schema';
import { eq, and, or, desc, ne } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';
import { similarQuestions } from '@/lib/recommend';

export const dynamic = 'force-dynamic';

/**
 * 错题本：自动归集 + 按知识点分类 + 重练 + 相似题推荐
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const kpId = url.searchParams.get('kpId');
  const showMastered = url.searchParams.get('show') === 'all';

  let rows = await db
    .select({
      id: wrongBook.id,
      wrongCount: wrongBook.wrongCount,
      mastered: wrongBook.mastered,
      lastWrongAt: wrongBook.lastWrongAt,
      question: questions,
      kpId: wrongBook.kpId,
    })
    .from(wrongBook)
    .innerJoin(questions, eq(wrongBook.questionId, questions.id))
    .where(eq(wrongBook.userId, userId))
    .orderBy(desc(wrongBook.lastWrongAt));
  if (!showMastered) rows = rows.filter((r) => !r.mastered);
  if (kpId) rows = rows.filter((r) => r.kpId === Number(kpId));

  const kps = await db.select({ id: knowledgePoints.id, name: knowledgePoints.name }).from(knowledgePoints);
  const kpName = new Map(kps.map((k) => [k.id, k.name]));

  return ok(rows.map((r) => ({
    ...r,
    kpName: r.kpId != null ? kpName.get(r.kpId) ?? null : null,
    question: {
      id: r.question.id,
      subject: r.question.subject,
      category: r.question.category,
      content: r.question.content,
      options: r.question.options,
      answer: r.question.answer,
      explanation: r.question.explanation,
      difficulty: r.question.difficulty,
      kpId: r.question.kpId,
    },
  })));
}

/** POST { questionId } → 相似题推荐 + 重练入口 */
export async function POST(req: Request) {
  let body: { questionId: number };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const similar = await similarQuestions(body.questionId, 3);
  return ok({ similar });
}
