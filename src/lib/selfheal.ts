import { db } from '@/db';
import {
  users, userProfiles, userProgress, questions, examResults, resources,
  kpEdges, knowledgePoints, alerts, scheduleItems, courseProgress,
  replies, postReports, posts, wrongBook, actionLogs, notifications, selfHealEvents,
} from '@/db/schema';
import { eq, isNull, isNotNull, and, desc, sql, lt } from 'drizzle-orm';
import { fnv1a, normalize } from './sync/text';
import { generateCandidates } from './sync/corpus';

/**
 * 自研自愈引擎（Self-Healing Engine）
 * =====================================================================
 * 设计原则：检测（detect）→ 修复（repair，仅安全操作）→ 留痕（audit）
 * 每个模块一套独立自愈算法；全部操作幂等、可重复执行、不产生副作用扩散；
 * 每次执行写入 self_heal_events（检测数/修复数/动作/明细）→ 可解释、可审计。
 * 触发方式：① 每日 0 点资源同步后自动执行 ② 管理台「自愈中心」手动执行
 */

export type HealResult = {
  module: string;
  name: string;
  level: 'info' | 'warn';
  detected: number;
  repaired: number;
  action: string;
  detail: Record<string, unknown>;
};

type Checker = {
  module: string;
  name: string;
  level: 'info' | 'warn';
  action: string;
  run: () => Promise<{ detected: number; repaired: number; detail: Record<string, unknown> }>;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

const CHECKERS: Checker[] = [
  /* 1. 智能学习体验 —— 用户画像完整性自愈 */
  {
    module: '智能学习体验',
    name: '用户画像完整性',
    level: 'info',
    action: '有学习记录但缺失画像的学生 → 按行为数据补建默认画像（学科偏好取答题最多的学科）',
    run: async () => {
      const userIds = (await db
        .select({ userId: userProgress.userId })
        .from(userProgress)
        .groupBy(userProgress.userId)).map((r) => r.userId);
      const existing = new Set((await db.select({ userId: userProfiles.userId }).from(userProfiles)).map((r) => r.userId));
      const missing = userIds.filter((u) => !existing.has(u));
      let repaired = 0;
      for (const u of missing) {
        const rows = await db.select({ subject: questions.subject }).from(userProgress).innerJoin(questions, eq(userProgress.questionId, questions.id)).where(eq(userProgress.userId, u)).limit(200);
                await db.insert(userProfiles).values({
          userId: u,
          level: rows.length > 60 ? 'intermediate' : 'beginner',
          style: 'visual',
          targetUniversity: '陕西专升本（大数据技术方向）',
          weakPoints: [],
          dailyMinutes: 120,
          notifyReminder: true,
        }).onConflictDoNothing();
        repaired++;
      }
      return { detected: missing.length, repaired, detail: { missingUsers: missing.slice(0, 10) } };
    },
  },
  /* 2. 智能诊断与评估 —— 掌握度聚合依赖自愈（kpId 冗余回填） */
  {
    module: '智能诊断与评估',
    name: '答题记录知识点回填',
    level: 'warn',
    action: 'user_progress.kpId 为空但题目已挂知识点 → 回填（薄弱点定位/雷达图依赖此字段，缺失即诊断失明）',
    run: async () => {
      const rows = await db
        .select({ id: userProgress.id, kpId: questions.kpId })
        .from(userProgress)
        .innerJoin(questions, eq(userProgress.questionId, questions.id))
        .where(and(isNull(userProgress.kpId), isNotNull(questions.kpId)))
        .limit(500);
      let repaired = 0;
      for (const r of rows) {
        if (r.kpId == null) continue;
        await db.update(userProgress).set({ kpId: r.kpId }).where(eq(userProgress.id, r.id));
        repaired++;
      }
      return { detected: rows.length, repaired, detail: { backfilledKpIds: [...new Set(rows.map((r) => r.kpId))] } };
    },
  },
  /* 3. 智能辅导与答疑 —— 考试答卷学习痕迹补全 */
  {
    module: '智能辅导与答疑',
    name: '考试答卷痕迹补全',
    level: 'warn',
    action: '考试交卷记录（exam_results.details）中缺失的逐题学习记录 → 补写 user_progress（保证掌握度/画像不丢样本）',
    run: async () => {
      const results = await db.select().from(examResults).orderBy(desc(examResults.id)).limit(200);
      const existing = new Set(
        (await db.select({ userId: userProgress.userId, questionId: userProgress.questionId }).from(userProgress).limit(20000))
          .map((r) => `${r.userId}:${r.questionId}`),
      );
      let detected = 0, repaired = 0;
      const kpOf = new Map((await db.select({ id: questions.id, kpId: questions.kpId }).from(questions)).map((q) => [q.id, q.kpId]));
      for (const res of results) {
        const details = (res.details as Array<{ questionId?: number; isCorrect?: boolean }> ?? []).filter((d) => d.questionId != null);
        for (const d of details) {
          const key = `${res.userId}:${d.questionId}`;
          if (existing.has(key)) continue;
          detected++;
          await db.insert(userProgress).values({ userId: res.userId, questionId: d.questionId, kpId: kpOf.get(d.questionId!) ?? null, isCorrect: !!d.isCorrect, duration: 60 });
          existing.add(key);
          repaired++;
        }
      }
      return { detected, repaired, detail: { scannedResults: results.length } };
    },
  },
  /* 4. 内容生态 —— 题库库存 + 资源标签自愈 */
  {
    module: '内容生态',
    name: '题库库存与标签补全',
    level: 'info',
    action: '① 知识点库存低于 4 题 → 用参数化生成器按日期种子补题；② 资源 tags 为空 → 按标题关键词补标注',
    run: async () => {
      const kps = await db.select({ id: knowledgePoints.id }).from(knowledgePoints);
      const counts = new Map(
        (await db.select({ kpId: questions.kpId, c: sql<number>`count(*)` }).from(questions).where(and(isNotNull(questions.kpId), eq(questions.status, 'active'))).groupBy(questions.kpId)).map((r) => [r.kpId!, r.c]),
      );
      const existing = new Set((await db.select({ content: questions.content }).from(questions).where(eq(questions.status, 'active'))).map((q) => fnv1a(normalize(q.content))));
      const cands = generateCandidates(8);
      let qRepaired = 0;
      const thinKps: number[] = [];
      for (const kp of kps) {
        const have = counts.get(kp.id) ?? 0;
        if (have >= 4) continue;
        thinKps.push(kp.id);
        const need = 4 - have;
        let added = 0;
        for (const c of cands) {
          if (added >= need || c.kpId !== kp.id) continue;
          const h = fnv1a(normalize(c.content));
          if (existing.has(h)) continue;
          existing.add(h);
          await db.insert(questions).values({ subject: c.subject, category: c.category, content: c.content, options: c.options, answer: c.answer, explanation: c.explanation, difficulty: c.difficulty, kpId: kp.id, source: 'sync', status: 'active' });
          added++;
        }
        qRepaired += added;
      }
      // 资源标签补全
      const noTags = (await db.select().from(resources)).filter((r) => !Array.isArray(r.tags) || (r.tags as unknown[]).length === 0);
      let tagRepaired = 0;
      for (const r of noTags) {
        const tags = [...new Set([SUBJ_CN(r.subject), r.title.slice(0, 8), `难度${r.difficulty}`])];
        await db.update(resources).set({ tags }).where(eq(resources.id, r.id));
        tagRepaired++;
      }
      return { detected: thinKps.length + noTags.length, repaired: qRepaired + tagRepaired, detail: { thinKps, newQuestions: qRepaired, retaggedResources: tagRepaired } };
    },
  },
  /* 5. 知识图谱 —— 图结构一致性自愈 */
  {
    module: '知识图谱',
    name: '图谱悬空边与重边清理',
    level: 'warn',
    action: '① 端点知识点已删除的悬空边 → 清除；② 重复边（同端点同关系）→ 去重，保证学习路径导航正确',
    run: async () => {
      const kpIds = new Set((await db.select({ id: knowledgePoints.id }).from(knowledgePoints)).map((k) => k.id));
      const edges = await db.select().from(kpEdges);
      let dangling = 0;
      for (const e of edges) {
        if (!kpIds.has(e.sourceId) || !kpIds.has(e.targetId)) {
          await db.delete(kpEdges).where(eq(kpEdges.id, e.id));
          dangling++;
        }
      }
      const seen = new Set<string>();
      let dupes = 0;
      const remaining = await db.select().from(kpEdges);
      for (const e of remaining) {
        const key = `${e.sourceId}->${e.targetId}:${e.relation}`;
        if (seen.has(key)) {
          await db.delete(kpEdges).where(eq(kpEdges.id, e.id));
          dupes++;
        } else seen.add(key);
      }
      return { detected: dangling + dupes, repaired: dangling + dupes, detail: { danglingEdges: dangling, duplicateEdges: dupes } };
    },
  },
  /* 6. 学情数据分析 —— 预警对账自愈 */
  {
    module: '学情数据分析',
    name: '孤儿预警与陈旧预警对账',
    level: 'info',
    action: '① 预警指向的用户已不存在 → 自动关闭（handled）；② 超过 30 天仍 pending 的预警 → 降级关闭并留痕',
    run: async () => {
      const userIds = new Set((await db.select({ id: users.id }).from(users)).map((u) => u.id));
      const pending = await db.select().from(alerts).where(eq(alerts.status, 'pending'));
      let orphan = 0, stale = 0;
      for (const a of pending) {
        if (!userIds.has(a.userId)) {
          await db.update(alerts).set({ status: 'handled', handledAt: new Date() }).where(eq(alerts.id, a.id));
          orphan++;
        } else if (a.createdAt && a.createdAt.getTime() < daysAgo(30).getTime()) {
          await db.update(alerts).set({ status: 'handled', handledAt: new Date() }).where(eq(alerts.id, a.id));
          stale++;
        }
      }
      return { detected: orphan + stale, repaired: orphan + stale, detail: { orphanedAlerts: orphan, staleAlerts: stale } };
    },
  },
  /* 7. 教学管理 —— 课表冲突自愈（复用自动排课的时段搜索） */
  {
    module: '教学管理',
    name: '课表冲突自动消解',
    level: 'warn',
    action: '检出同教师/同教室时间重叠（历史脏数据）→ 将后开始的课程平移至最近无冲突时段；无可用时段则标记待人工',
    run: async () => {
      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
      const fmt = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      const rows = await db.select().from(scheduleItems);
      let conflicts = 0, moved = 0;
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i], b = rows[j];
          if (a.dayOfWeek !== b.dayOfWeek) continue;
          const overlap = toMin(a.startTime) < toMin(b.endTime) && toMin(b.startTime) < toMin(a.endTime);
          if (!overlap) continue;
          const same = a.teacherName === b.teacherName || a.room === b.room;
          if (!same) continue;
          conflicts++;
          const later = toMin(a.startTime) <= toMin(b.startTime) ? b : a;
          const duration = toMin(later.endTime) - toMin(later.startTime);
          const slots: Array<{ day: number; start: string; end: string }> = [];
          for (let day = 1; day <= 6; day++) {
            for (const sh of [8, 10, 14, 19]) {
              const s = sh * 60, e = s + duration;
              if (e > 22 * 60) continue;
              slots.push({ day, start: fmt(s), end: fmt(e) });
            }
          }
          const free = slots.find((sl) => !rows.some((x) => x.id !== later.id && x.dayOfWeek === sl.day && toMin(x.startTime) < toMin(sl.end) && toMin(sl.start) < toMin(x.endTime) && (x.teacherName === later.teacherName || x.room === later.room)));
          if (free) {
            await db.update(scheduleItems).set({ dayOfWeek: free.day, startTime: free.start, endTime: free.end }).where(eq(scheduleItems.id, later.id));
            moved++;
            rows[j] = { ...later, dayOfWeek: free.day, startTime: free.start, endTime: free.end };
            if (a.id === later.id) rows[i] = rows[j];
          }
        }
      }
      return { detected: conflicts, repaired: moved, detail: { conflictsFound: conflicts, movedToFreeSlot: moved, needManual: conflicts - moved } };
    },
  },
  /* 8. 多端协同 —— 学习进度数据自愈 */
  {
    module: '多端协同',
    name: '断点续学进度校准',
    level: 'info',
    action: '① lastPositionSec > totalSec（脏进度）→ 截断为总时长；② totalSec=0 且有播放位置 → 回填总时长（播放器元数据丢失场景）',
    run: async () => {
      const rows = await db.select().from(courseProgress);
      let clamped = 0, backfilled = 0;
      for (const r of rows) {
        if (r.totalSec > 0 && r.lastPositionSec > r.totalSec) {
          await db.update(courseProgress).set({ lastPositionSec: r.totalSec }).where(eq(courseProgress.id, r.id));
          clamped++;
        } else if (r.totalSec === 0 && r.lastPositionSec > 0) {
          await db.update(courseProgress).set({ totalSec: Math.ceil(r.lastPositionSec / 10) * 10 }).where(eq(courseProgress.id, r.id));
          backfilled++;
        }
      }
      return { detected: clamped + backfilled, repaired: clamped + backfilled, detail: { clampedPositions: clamped, backfilledTotals: backfilled } };
    },
  },
  /* 9. 互动与协作 —— 内容安全自愈 */
  {
    module: '互动与协作',
    name: '举报去重与孤儿回帖清理',
    level: 'info',
    action: '① 同用户对同帖的重复 pending 举报 → 保留一条，其余自动 resolve（防止刷举报干扰审核）；② 帖子已删但回帖残留 → 清除',
    run: async () => {
      const reports = await db.select().from(postReports).where(eq(postReports.status, 'pending'));
      const seen = new Set<string>();
      let dup = 0;
      for (const r of reports) {
        const key = `${r.postId}:${r.userId}`;
        if (seen.has(key)) {
          await db.update(postReports).set({ status: 'resolved' }).where(eq(postReports.id, r.id));
          dup++;
        } else seen.add(key);
      }
      const postIds = new Set((await db.select({ id: posts.id }).from(posts)).map((p) => p.id));
      const orphans = await db.select().from(replies);
      let orphanReplies = 0;
      for (const r of orphans) {
        if (!postIds.has(r.postId)) {
          await db.delete(replies).where(eq(replies.id, r.id));
          orphanReplies++;
        }
      }
      return { detected: dup + orphanReplies, repaired: dup + orphanReplies, detail: { duplicateReports: dup, orphanReplies } };
    },
  },
  /* 10. 用户权限 —— 数据归属自愈 */
  {
    module: '用户权限',
    name: '机构归属与角色合法性',
    level: 'warn',
    action: '① orgId 缺失的用户 → 挂回主校区（数据级权限依赖 orgId，缺失即越权风险）；② role 非法值 → 回退 student 最低权限',
    run: async () => {
      const usersRows = await db.select().from(users);
      let fixedOrg = 0, fixedRole = 0;
      const VALID = new Set(['student', 'teacher', 'admin', 'parent']);
      for (const u of usersRows) {
        if (u.orgId == null) {
          await db.update(users).set({ orgId: 1 }).where(eq(users.id, u.id));
          fixedOrg++;
        }
        if (!VALID.has(u.role)) {
          await db.update(users).set({ role: 'student' }).where(eq(users.id, u.id));
          fixedRole++;
        }
      }
      return { detected: fixedOrg + fixedRole, repaired: fixedOrg + fixedRole, detail: { reassignedOrg: fixedOrg, resetRole: fixedRole } };
    },
  },
  /* 11. 系统能力 —— 数据完整性与保留策略 */
  {
    module: '系统能力',
    name: '孤儿数据清理与日志保留',
    level: 'info',
    action: '① 错题本指向已删题目的孤儿行 → 清理；② 90 天前已读通知 / 180 天前行为日志 → 按保留策略归档清理（控制数据膨胀）',
    run: async () => {
      const qIds = new Set((await db.select({ id: questions.id }).from(questions)).map((q) => q.id));
      const wb = await db.select().from(wrongBook);
      let orphanWb = 0;
      for (const r of wb) {
        if (!qIds.has(r.questionId)) {
          await db.delete(wrongBook).where(eq(wrongBook.id, r.id));
          orphanWb++;
        }
      }
      const readOld = await db.delete(notifications).where(and(eq(notifications.isRead, true), lt(notifications.createdAt, daysAgo(90)))).returning();
      const oldLogs = await db.delete(actionLogs).where(lt(actionLogs.createdAt, daysAgo(180))).returning();
      return {
        detected: orphanWb + readOld.length + oldLogs.length,
        repaired: orphanWb + readOld.length + oldLogs.length,
        detail: { orphanWrongBook: orphanWb, prunedReadNotifications: readOld.length, prunedActionLogs: oldLogs.length },
      };
    },
  },
];

function SUBJ_CN(subject: string): string {
  return subject === 'Math' ? '数学' : subject === 'English' ? '英语' : '专业方向';
}

/** 执行自愈（module 为空 = 全模块巡检）；返回事件列表并落审计表 */
export async function runSelfHeal(module?: string): Promise<HealResult[]> {
  const targets = module ? CHECKERS.filter((c) => c.module === module) : CHECKERS;
  const out: HealResult[] = [];
  for (const c of targets) {
    try {
      const r = await c.run();
      out.push({ module: c.module, name: c.name, level: c.level, detected: r.detected, repaired: r.repaired, action: c.action, detail: r.detail });
    } catch (e) {
      // 单个检查器异常不中断整体巡检（鲁棒）
      out.push({ module: c.module, name: c.name, level: 'warn', detected: 0, repaired: 0, action: c.action, detail: { error: e instanceof Error ? e.message : String(e) } });
    }
  }
  if (out.length) {
    await db.insert(selfHealEvents).values(
      out.map((r) => ({ module: r.module, name: r.name, level: r.level, detected: r.detected, repaired: r.repaired, action: r.action, detail: r.detail })),
    );
  }
  return out;
}

export const MODULES = [...new Set(CHECKERS.map((c) => c.module))];

export async function getHealHistory(limit = 50) {
  return db.select().from(selfHealEvents).orderBy(desc(selfHealEvents.id)).limit(limit);
}
