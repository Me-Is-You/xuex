import { db } from '@/db';
import { alerts, interventionRules, userProgress, examResults, exams, users, notifications } from '@/db/schema';
import { eq, and, or, gte, lt, desc } from 'drizzle-orm';

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

/**
 * 学习预警引擎：按启用的干预规则扫描，幂等生成预警
 * 规则类型：inactive 长期未登录 / score_drop 成绩骤降 / low_accuracy 正确率过低 / missed_exam 缺考
 */
export async function runAlertEngine() {
  const rules = await db.select().from(interventionRules).where(eq(interventionRules.enabled, true));
  const ruleMap = new Map(rules.map((r) => [r.type, r]));
  const students = await db.select().from(users).where(eq(users.role, 'student'));

  const created: Array<{ userId: string; type: string }> = [];

  for (const student of students) {
    // 1) 长期未登录 / 无学习行为
    const cfg = (ruleMap.get('inactive')?.config ?? { days: 7 }) as { days: number };
    const recentProgress = await db
      .select({ id: userProgress.id })
      .from(userProgress)
      .where(and(eq(userProgress.userId, student.id), gte(userProgress.answeredAt, daysAgo(Number(cfg.days)))))
      .limit(1);
    if (ruleMap.has('inactive') && recentProgress.length === 0) {
      const dup = await db
        .select({ id: alerts.id })
        .from(alerts)
        .where(and(eq(alerts.userId, student.id), eq(alerts.type, 'inactive'), eq(alerts.status, 'pending')))
        .limit(1);
      if (dup.length === 0) {
        await db.insert(alerts).values({
          userId: student.id,
          studentName: student.name,
          type: 'inactive',
          level: Number(cfg.days) >= 7 ? 'high' : 'medium',
          message: `已连续 ${Number(cfg.days)} 天无学习行为`,
          actions: [],
        });
        created.push({ userId: student.id, type: 'inactive' });
      }
    }

    // 2) 成绩骤降
    const dropCfg = (ruleMap.get('score_drop')?.config ?? { minDrop: 15 }) as { minDrop: number };
    const results = await db.select().from(examResults).orderBy(desc(examResults.submittedAt)).where(eq(examResults.userId, student.id));
    if (ruleMap.has('score_drop') && results.length >= 2) {
      const [latest, prev] = results;
      const drop = prev.score - latest.score;
      if (drop >= Number(dropCfg.minDrop) && latest.examId != null) {
        const dup = await db
          .select({ id: alerts.id })
          .from(alerts)
          .where(and(eq(alerts.userId, student.id), eq(alerts.type, 'score_drop'), eq(alerts.status, 'pending')))
          .limit(1);
        if (dup.length === 0) {
          const [exam] = await db.select().from(exams).where(eq(exams.id, latest.examId));
          await db.insert(alerts).values({
            userId: student.id,
            studentName: student.name,
            type: 'score_drop',
            level: drop >= Number(dropCfg.minDrop) * 1.5 ? 'high' : 'medium',
            message: `「${exam?.title ?? '考试'}」成绩由 ${prev.score} 分降至 ${latest.score} 分（降幅 ${drop} 分）`,
            actions: [],
          });
          created.push({ userId: student.id, type: 'score_drop' });
        }
      }
    }

    // 3) 近 7 天正确率过低
    const accCfg = (ruleMap.get('low_accuracy')?.config ?? { threshold: 50 }) as { threshold: number };
    const weekRows = await db
      .select({ isCorrect: userProgress.isCorrect })
      .from(userProgress)
      .where(and(eq(userProgress.userId, student.id), gte(userProgress.answeredAt, daysAgo(7))));
    if (ruleMap.has('low_accuracy') && weekRows.length >= 5) {
      const rate = Math.round((weekRows.filter((r) => r.isCorrect).length / weekRows.length) * 100);
      if (rate < Number(accCfg.threshold)) {
        const dup = await db
          .select({ id: alerts.id })
          .from(alerts)
          .where(and(eq(alerts.userId, student.id), eq(alerts.type, 'low_accuracy'), eq(alerts.status, 'pending')))
          .limit(1);
        if (dup.length === 0) {
          await db.insert(alerts).values({
            userId: student.id,
            studentName: student.name,
            type: 'low_accuracy',
            level: 'medium',
            message: `近 7 天答题正确率 ${rate}%，低于阈值 ${Number(accCfg.threshold)}%`,
            actions: [],
          });
          created.push({ userId: student.id, type: 'low_accuracy' });
        }
      }
    }

    // 4) 缺考
    if (ruleMap.has('missed_exam')) {
      const published = await db.select().from(exams).where(eq(exams.status, 'published'));
      for (const exam of published) {
        const took = await db.select({ id: examResults.id }).from(examResults).where(and(eq(examResults.examId, exam.id), eq(examResults.userId, student.id))).limit(1);
        if (took.length === 0) {
          const dup = await db
            .select({ id: alerts.id })
            .from(alerts)
            .where(and(eq(alerts.userId, student.id), eq(alerts.type, 'missed_exam'), eq(alerts.status, 'pending')))
            .limit(1);
          if (dup.length === 0) {
            await db.insert(alerts).values({
              userId: student.id,
              studentName: student.name,
              type: 'missed_exam',
              level: 'low',
              message: `未参加「${exam.title}」考试`,
              actions: [],
            });
            created.push({ userId: student.id, type: 'missed_exam' });
          }
        }
      }
    }
  }

  // 为新建预警发送通知
  for (const c of created) {
    await db.insert(notifications).values({
      userId: c.userId,
      type: 'alert',
      title: `学情预警：${c.type === 'inactive' ? '长期未登录' : c.type === 'score_drop' ? '成绩骤降' : c.type === 'low_accuracy' ? '正确率过低' : '考试缺考'}`,
      content: '请前往「成绩分析」查看诊断建议，或联系你的辅导教师。',
      isRead: false,
    });
  }

  return created.length;
}

/** 执行干预动作（消息提醒 / 教师通知 / 推送补救内容） */
export async function applyIntervention(alertId: number, actions: string[]) {
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, alertId));
  if (!alert) return null;
  const rule = (await db.select().from(interventionRules).where(eq(interventionRules.type, alert.type)))[0];
  const action = ((rule?.action ?? {}) as { remind?: boolean; notifyTeacher?: boolean; pushContent?: string });
  const applied: string[] = [];
  for (const a of actions) {
    if (a === '消息提醒' && action.remind) {
      await db.insert(notifications).values({
        userId: alert.userId,
        type: 'alert',
        title: '学习干预提醒',
        content: action.pushContent ?? '建议今天完成一组专项练习，状态不佳时先休息 15 分钟再回来。',
        isRead: false,
      });
      applied.push('消息提醒');
    }
    if (a === '通知教师' && action.notifyTeacher) {
      const teachers = await db.select().from(users).where(eq(users.role, 'teacher'));
      if (teachers[0]) {
        await db.insert(notifications).values({
          userId: teachers[0].id,
          type: 'alert',
          title: `学生预警待处理：${alert.studentName}`,
          content: alert.message,
          isRead: false,
        });
      }
      applied.push('教师通知');
    }
    if (a.includes('推送')) {
      await db.insert(notifications).values({
        userId: alert.userId,
        type: 'course',
        title: '补救学习资源',
        content: action.pushContent ?? '已推送对应知识点的微课与专项练习。',
        isRead: false,
      });
      applied.push('推送补救内容');
    }
  }
  await db
    .update(alerts)
    .set({ status: 'handled', handledAt: new Date(), actions: applied })
    .where(eq(alerts.id, alertId));
  return applied;
}
