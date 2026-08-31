import { db } from '@/db';
import { dailyGoals, questions, userProgress } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { ok, currentUserId } from '@/lib/api';
import { getMastery, getStreak, getWeeklyStats } from '@/lib/mastery';

export const dynamic = 'force-dynamic';

/**
 * 控制台聚合数据：连胜 / 今日时长 / 正确率 / 掌握知识点 / 学科分布
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const mastery = await getMastery(userId);
  const streak = await getStreak(userId);
  const weekly = await getWeeklyStats(userId);

  // 近 30 天总体正确率
  const since = new Date(Date.now() - 30 * 86400000);
  const recent = await db
    .select({ isCorrect: userProgress.isCorrect })
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), gte(userProgress.answeredAt, since)));
  const accuracy = recent.length ? Math.round((recent.filter((r) => r.isCorrect).length / recent.length) * 100) : 0;

  // 今日目标
  const today = new Date().toISOString().slice(0, 10);
  const [goal] = await db.select().from(dailyGoals).where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, today))).limit(1);

  return ok({
    streak,
    accuracy,
    totalMinutes: weekly.totalMinutes,
    bySubject: weekly.bySubject,
    masteredCount: mastery.filter((m) => m.status === 'mastered').length,
    learningCount: mastery.filter((m) => m.status === 'learning').length,
    weakCount: mastery.filter((m) => m.status === 'weak').length,
    totalKnowledge: mastery.length,
    dailyGoal: goal ?? null,
    examDays: Math.max(0, Math.round((new Date('2027-03-19').getTime() - Date.now()) / 86400000)),
  });
}
