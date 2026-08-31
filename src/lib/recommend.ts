import { db } from '@/db';
import { questions, userProgress, userProfiles, knowledgePoints } from '@/db/schema';
import { and, eq, inArray, not } from 'drizzle-orm';
import { getMastery } from './mastery';

export type Recommendation = {
  question: {
    id: number;
    subject: string;
    category: string;
    content: string;
    options: string[];
    answer: string;
    explanation: string | null;
    difficulty: number;
    kpId: number | null;
  };
  score: number;
  reasons: string[];
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * AI 推荐引擎（混合策略）
 * 1) 内容过滤：难度与用户当前水平匹配（±1 档加权）
 * 2) 薄弱点定向：用户画像 weakPoints / 实时掌握度 < 60% 的知识点加权 3x
 * 3) 协同过滤：寻找薄弱画像相近的其他学习者，加权他们答对的题
 * 4) 新鲜度：近期未答过的题优先（避免重复）
 */
export async function recommendQuestions(
  userId: string,
  count = 5,
  opts: { subject?: string; kpId?: number; difficulty?: number } = {},
): Promise<Recommendation[]> {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const levelMap = { beginner: 2, intermediate: 3, advanced: 4 } as const;
  const baseLevel = opts.difficulty ?? levelMap[(profile?.level ?? 'beginner') as keyof typeof levelMap] ?? 3;

  const mastery = await getMastery(userId);
  const profileWeak = (profile?.weakPoints as number[] | null) ?? [];
  const weakKps = new Set<number>([...profileWeak, ...mastery.filter((m) => m.status === 'weak').map((m) => m.kpId)]);

  // 近期已答题目
  const recent = await db.select({ questionId: userProgress.questionId }).from(userProgress).where(eq(userProgress.userId, userId));
  const recentIds = new Set(recent.map((r) => r.questionId));

  let pool = await db.select().from(questions).where(eq(questions.status, 'active'));
  if (opts.subject) pool = pool.filter((q) => q.subject === opts.subject);
  if (opts.kpId) pool = pool.filter((q) => q.kpId === opts.kpId);

  // 协同过滤：薄弱点重合度 ≥ 2 的其他用户
  const otherProfiles = await db.select().from(userProfiles).where(not(eq(userProfiles.userId, userId)));
  const similarUsers = otherProfiles
    .filter((p) => {
      const otherWeak = new Set<number>((p.weakPoints as number[] | null) ?? []);
      const overlap = [...weakKps].filter((k) => otherWeak.has(k)).length;
      return overlap >= 2;
    })
    .map((p) => p.userId);

  let peerCorrect = new Set<number>();
  if (similarUsers.length) {
    const peerRows = await db
      .select({ questionId: userProgress.questionId, isCorrect: userProgress.isCorrect })
      .from(userProgress)
      .where(and(inArray(userProgress.userId, similarUsers), eq(userProgress.isCorrect, true)));
    peerCorrect = new Set(peerRows.filter((r) => r.questionId != null).map((r) => r.questionId as number));
  }

  const kpNames = new Map(
    (await db.select({ id: knowledgePoints.id, name: knowledgePoints.name }).from(knowledgePoints)).map((k) => [k.id, k.name]),
  );

  const scored: Recommendation[] = pool.map((q) => {
    let score = 10;
    const reasons: string[] = [];
    // 难度匹配（内容过滤）
    const diffGap = Math.abs(q.difficulty - baseLevel);
    score += diffGap === 0 ? 8 : diffGap === 1 ? 5 : -4;
    if (diffGap <= 1) reasons.push(`难度 ${q.difficulty} 匹配当前水平`);
    // 薄弱点定向
    if (q.kpId != null && weakKps.has(q.kpId)) {
      score += 12;
      reasons.push(`薄弱知识点「${kpNames.get(q.kpId) ?? '?'}」定向补强`);
    } else if (q.kpId != null) {
      const m = mastery.find((x) => x.kpId === q.kpId);
      if (m?.status === 'mastered') {
        score -= 5;
      } else if (m?.status === 'learning') {
        score += 4;
        reasons.push(`巩固「${m.name}」`);
      }
    }
    // 协同过滤
    if (peerCorrect.has(q.id)) {
      score += 6;
      reasons.push('薄弱画像相近的学员答对率高');
    }
    // 新鲜度
    if (recentIds.has(q.id)) score -= 8;
    else reasons.push('新题');
    return {
      question: {
        id: q.id,
        subject: q.subject,
        category: q.category,
        content: q.content,
        options: q.options as string[],
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        kpId: q.kpId,
      },
      score,
      reasons,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, count);
}

/** 相似题推荐：同知识点 + 相近难度，排除自身 */
export async function similarQuestions(questionId: number, count = 3) {
  const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!q) return [];
  const pool = await db.select().from(questions).where(eq(questions.status, 'active'));
  return pool
    .filter((x) => x.id !== q.id)
    .map((x) => ({
      q: x,
      s: (x.kpId === q.kpId && q.kpId != null ? 10 : 0) + (x.subject === q.subject ? 4 : 0) + (4 - Math.abs(x.difficulty - q.difficulty)) * 2,
    }))
    .filter((x) => x.q.kpId === q.kpId || x.q.subject === q.subject)
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.q);
}

/**
 * 自适应测评引擎：根据最近 5 题正确率动态调整下一题难度
 * rate ≥ 80% → +1；rate ≤ 40% → −1；否则保持
 */
export function nextDifficulty(recentAnswers: boolean[], current: number): { next: number; note: string } {
  const tail = recentAnswers.slice(-5);
  if (tail.length < 3) return { next: current, note: '样本不足，维持当前难度' };
  const rate = tail.filter(Boolean).length / tail.length;
  if (rate >= 0.8) {
    const next = clamp(current + 1, 1, 5);
    return { next: next === current ? current : next, note: next === current ? '已达最高难度' : `近 5 题正确率 ${Math.round(rate * 100)}%，难度上调至 ${next}` };
  }
  if (rate <= 0.4) {
    const next = clamp(current - 1, 1, 5);
    return { next, note: `近 5 题正确率 ${Math.round(rate * 100)}%，难度下调至 ${next} 帮助巩固` };
  }
  return { next: current, note: `正确率 ${Math.round(rate * 100)}%，维持难度 ${current}` };
}

/** 自适应取题：按目标难度取一题（优先薄弱知识点） */
export async function fetchAdaptiveQuestion(opts: {
  userId: string;
  difficulty: number;
  excludeIds?: number[];
  subject?: string;
  kpId?: number;
}) {
  const pool = await db.select().from(questions).where(eq(questions.status, 'active'));
  const exclude = new Set(opts.excludeIds ?? []);
  const candidates = pool
    .filter((q) => !exclude.has(q.id))
    .filter((q) => !opts.subject || q.subject === opts.subject)
    .filter((q) => !opts.kpId || q.kpId === opts.kpId)
    .sort((a, b) => Math.abs(a.difficulty - opts.difficulty) - Math.abs(b.difficulty - opts.difficulty));
  const q = candidates[0];
  return q ? {
    id: q.id,
    subject: q.subject,
    category: q.category,
    content: q.content,
    options: q.options as string[],
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    kpId: q.kpId,
  } : null;
}
