import { db } from '@/db';
import { userGoals } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 学习目标设定：用户设定目标 → 系统按截止日期自动拆解为阶段任务
 */

type GoalInput = {
  title: string;
  targetScore?: number;
  deadline: string; // YYYY-MM-DD
  subject?: string;
};

/** 自动拆解：基础 → 强化 → 冲刺 三阶段（距考试 < 60 天则只剩冲刺） */
function buildBreakdown(g: { deadline: string; targetScore?: number; subject?: string }) {
  const now = new Date();
  const end = new Date(g.deadline);
  const days = Math.max(1, Math.round((end.getTime() - now.getTime()) / 86400000));
  const isMath = (g.subject ?? 'Math') === 'Math';
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  if (days <= 60) {
    return [
      { phase: '冲刺阶段', range: `${fmt(now)} ~ ${fmt(end)}`, tasks: ['每周 2 套历年真题限时训练', '错题本高频错点重练', '每 10 天 1 次全真模拟 + 复盘'] },
    ];
  }
  if (days <= 150) {
    const start = new Date(now.getTime() + 150 * 86400000 * 0.66);
    return [
      { phase: '强化阶段', range: `${fmt(now)} ~ ${fmt(start)}`, tasks: [isMath ? '二重积分 / 多元微分专题突破' : '阅读理解限时训练（每题≤2min）', '每周 2 套专项卷', '薄弱点每周清零 1 个'] },
      { phase: '冲刺阶段', range: `${fmt(start)} ~ ${fmt(end)}`, tasks: ['每周 2 套真题', '错题本重练清零', '每 10 天全真模拟'] },
    ];
  }
  const m1 = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const m2 = new Date(now.getFullYear(), now.getMonth() + 4, 1);
  return [
    { phase: '基础阶段', range: `${fmt(now)} ~ ${fmt(m1)}`, tasks: [isMath ? '完成全部知识点第一轮复习' : '核心词汇 4500 过两遍', '每日 5 道错题重练', '每周 1 套基础卷'] },
    { phase: '强化阶段', range: `${fmt(m1)} ~ ${fmt(m2)}`, tasks: [isMath ? '高频考点专题突破（二重积分/特征值）' : '语法专项 + 阅读精读', '每周 2 套专项卷', '每月 1 套全真模考'] },
    { phase: '冲刺阶段', range: `${fmt(m2)} ~ ${fmt(end)}`, tasks: ['每周 2 套历年真题', '错题本清零重练', '每 10 天 1 次全真模拟 + 目标分数对标'] },
  ];
}

export async function GET(req: Request) {
  const userId = currentUserId(req);
  const rows = await db.select().from(userGoals).where(eq(userGoals.userId, userId)).orderBy(desc(userGoals.createdAt));
  return ok({ goals: rows, now: Date.now() });
}

export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: GoalInput;
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.title || !body.deadline) return fail('title & deadline required');
  const [row] = await db
    .insert(userGoals)
    .values({
      userId,
      title: body.title,
      targetScore: body.targetScore ?? null,
      deadline: body.deadline,
      status: 'active',
      breakdown: buildBreakdown({ deadline: body.deadline, targetScore: body.targetScore, subject: body.subject }),
      progress: 0,
    })
    .returning();
  return ok(row);
}
