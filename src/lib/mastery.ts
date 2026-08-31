import { db } from '@/db';
import { knowledgePoints, userProgress, questions } from '@/db/schema';
import { eq, and, gte, sql, desc, isNotNull } from 'drizzle-orm';

export type KpMastery = {
  kpId: number;
  name: string;
  subject: string;
  importance: number;
  examFreq: number;
  total: number;
  correct: number;
  mastery: number; // 0-100
  lastCorrectRate: number; // 最近 10 题正确率
  status: 'mastered' | 'learning' | 'weak' | 'untouched';
};

const since = (days: number) => new Date(Date.now() - days * 86400000);

/** 计算某用户每个知识点的掌握度（薄弱点定位 / 雷达图 / 图谱着色共用） */
export async function getMastery(userId: string): Promise<KpMastery[]> {
  const allKps = await db.select().from(knowledgePoints);
  const rows = await db
    .select({
      kpId: userProgress.kpId,
      isCorrect: userProgress.isCorrect,
      answeredAt: userProgress.answeredAt,
    })
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), isNotNull(userProgress.kpId)))
    .orderBy(desc(userProgress.answeredAt));

  const byKp = new Map<number, Array<{ isCorrect: boolean; answeredAt: Date }>>();
  for (const r of rows) {
    if (r.kpId == null) continue;
    if (!byKp.has(r.kpId)) byKp.set(r.kpId, []);
    byKp.get(r.kpId)!.push({ isCorrect: r.isCorrect, answeredAt: r.answeredAt ?? new Date(0) });
  }

  return allKps.map((kp) => {
    const recs = byKp.get(kp.id) ?? [];
    const total = recs.length;
    const correct = recs.filter((r) => r.isCorrect).length;
    const mastery = total ? Math.round((correct / total) * 100) : 0;
    const recent = recs.slice(0, 10);
    const lastCorrectRate = recent.length
      ? Math.round((recent.filter((r) => r.isCorrect).length / recent.length) * 100)
      : 0;
    const status: KpMastery['status'] =
      total === 0 ? 'untouched' : mastery >= 75 ? 'mastered' : mastery >= 50 ? 'learning' : 'weak';
    return {
      kpId: kp.id,
      name: kp.name,
      subject: kp.subject,
      importance: kp.importance,
      examFreq: kp.examFreq,
      total,
      correct,
      mastery,
      lastCorrectRate,
      status,
    };
  });
}

/** 薄弱点诊断：掌握度 < 60% 且重要度/考频加权排序 */
export async function getWeakPoints(userId: string) {
  const mastery = await getMastery(userId);
  return mastery
    .filter((m) => m.status !== 'mastered' && m.total > 0)
    .map((m) => ({
      ...m,
      weight: (m.mastery === 0 ? 60 - 10 : 60 - m.mastery) * (m.importance / 3 + m.examFreq / 100),
    }))
    .sort((a, b) => b.weight - a.weight);
}

/** 近 N 天正确率序列（趋势图） */
export async function getAccuracyTrend(userId: string, days = 30) {
  const start = since(days);
  const rows = await db
    .select({ isCorrect: userProgress.isCorrect, answeredAt: userProgress.answeredAt })
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), gte(userProgress.answeredAt, start)))
    .orderBy(userProgress.answeredAt);

  const buckets: Array<{ label: string; total: number; correct: number; rate: number | null }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(Date.now() - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const recs = rows.filter((r) => (r.answeredAt ?? new Date(0)) >= dayStart && (r.answeredAt ?? new Date(0)) < dayEnd);
    const total = recs.length;
    const correct = recs.filter((r) => r.isCorrect).length;
    buckets.push({
      label: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
      total,
      correct,
      rate: total ? Math.round((correct / total) * 100) : null,
    });
  }
  return buckets;
}

/** 本周按学科统计（仪表盘） */
export async function getWeeklyStats(userId: string) {
  const start = since(7);
  const rows = await db
    .select({
      subject: questions.subject,
      isCorrect: userProgress.isCorrect,
      duration: userProgress.duration,
      answeredAt: userProgress.answeredAt,
    })
    .from(userProgress)
    .innerJoin(questions, eq(userProgress.questionId, questions.id))
    .where(and(eq(userProgress.userId, userId), gte(userProgress.answeredAt, start)));

  const bySubject: Record<string, { total: number; correct: number; minutes: number }> = {};
  let totalMinutes = 0;
  for (const r of rows) {
    const s = (bySubject[r.subject] ??= { total: 0, correct: 0, minutes: 0 });
    s.total += 1;
    if (r.isCorrect) s.correct += 1;
    const m = Math.round((r.duration ?? 0) / 60);
    s.minutes += m;
    totalMinutes += m;
  }
  return { bySubject, totalMinutes };
}

/** 学习连胜天数（基于 action_logs 登录记录） */
export async function getStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ day: sql<string>`to_char(${userProgress.answeredAt}, 'YYYY-MM-DD')` })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .groupBy(sql`to_char(${userProgress.answeredAt}, 'YYYY-MM-DD')`);
  const days = new Set(rows.map((r) => r.day));
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
    if (streak > 3650) break;
  }
  return streak;
}
