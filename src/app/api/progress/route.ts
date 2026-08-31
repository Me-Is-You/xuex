import { db } from '@/db';
import { questions, wrongBook, userProgress, userProfiles, dailyGoals } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ok, fail, currentUserId, track } from '@/lib/api';
import { getMastery } from '@/lib/mastery';

export const dynamic = 'force-dynamic';

/**
 * POST 提交答题结果
 * - 写入答题记录（含知识点冗余）
 * - 答错自动归集错题本
 * - 更新每日目标进度
 * - 更新用户画像薄弱点（掌握度 < 50% 的知识点进入 weakPoints）
 */
export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { questionId: number; isCorrect: boolean; duration?: number };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.questionId) return fail('questionId required');

  const [q] = await db.select().from(questions).where(eq(questions.id, body.questionId));
  if (!q) return fail('question not found', 404);

  await db.insert(userProgress).values({
    userId,
    questionId: q.id,
    kpId: q.kpId,
    isCorrect: body.isCorrect,
    duration: body.duration ?? 0,
  });

  if (!body.isCorrect) {
    // 错题本：已有则 +1，否则新建
    const existing = await db
      .select()
      .from(wrongBook)
      .where(and(eq(wrongBook.userId, userId), eq(wrongBook.questionId, q.id)))
      .limit(1);
    if (existing.length) {
      await db
        .update(wrongBook)
        .set({ wrongCount: sql`${wrongBook.wrongCount} + 1`, lastWrongAt: new Date(), updatedAt: new Date(), mastered: false })
        .where(eq(wrongBook.id, existing[0].id));
    } else {
      await db.insert(wrongBook).values({
        userId,
        questionId: q.id,
        kpId: q.kpId,
        wrongCount: 1,
        mastered: false,
        lastWrongAt: new Date(),
      });
    }
  }

  // 每日目标进度
  const today = new Date().toISOString().slice(0, 10);
  const goal = (await db.select().from(dailyGoals).where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, today))).limit(1))[0];
  if (goal) {
    const field = q.subject === 'Math' ? 'mathCompleted' : 'englishCompleted';
    await db.update(dailyGoals).set({ [field]: sql`"${field}" + 1` } as any).where(eq(dailyGoals.id, goal.id));
  }

  // 画像薄弱点同步
  const mastery = await getMastery(userId);
  const weakIds = mastery.filter((m) => m.status === 'weak').map((m) => m.kpId);
  await db
    .insert(userProfiles)
    .values({ userId, weakPoints: weakIds, name: userId === 'jiang2027' ? '江同学' : userId })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { weakPoints: weakIds } });

  await track(userId, 'answer_question', { entityId: String(q.id), meta: { subject: q.subject, isCorrect: body.isCorrect }, duration: body.duration ?? 0 });

  const updatedMastery = q.kpId != null ? mastery.find((m) => m.kpId === q.kpId) : null;
  return ok({ ok: true, updatedMastery, weakPoints: weakIds });
}
