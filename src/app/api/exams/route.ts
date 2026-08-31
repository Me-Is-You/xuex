import { db } from '@/db';
import { exams, questions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 考试管理：固定卷 / 随机组卷
 * GET  试卷列表
 * POST { title, subject, durationMin, mode, config: {count, difficulty} }
 *      random 模式从题库按学科+难度随机抽题（组卷）
 */
export async function GET(req: Request) {
  const rows = await db.select().from(exams).orderBy(desc(exams.createdAt));
  const results = await db.select().from((await import('@/db/schema')).examResults);
  const countMap = new Map<number, number>();
  for (const r of results) if (r.examId != null) countMap.set(r.examId, (countMap.get(r.examId) ?? 0) + 1);
  return ok(rows.map((e) => ({ ...e, submitCount: countMap.get(e.id) ?? 0 })));
}

export async function POST(req: Request) {
  let body: {
    title: string;
    subject: string;
    durationMin?: number;
    mode: 'fixed' | 'random';
    config?: { count?: number; difficulty?: number };
    questionIds?: number[];
    antiCheat?: { shuffle?: boolean; fullscreen?: boolean; timerLock?: boolean; antiCopy?: boolean };
  };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.title || !body.subject || !body.mode) return fail('title/subject/mode required');

  let questionIds: number[] | null = null;
  if (body.mode === 'fixed') {
    if (!body.questionIds?.length) return fail('fixed 卷需要 questionIds');
    questionIds = body.questionIds;
  } else {
    const count = body.config?.count ?? 10;
    const pool = (await db.select().from(questions).where(eq(questions.status, 'active'))).filter(
      (q) => q.subject === body.subject,
    );
    if (pool.length < count) return fail(`题库不足：${body.subject} 仅 ${pool.length} 题，需要 ${count} 题`);
    // Fisher-Yates 随机抽题（组卷）
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    questionIds = arr.slice(0, count).map((q) => q.id);
  }

  const [row] = await db
    .insert(exams)
    .values({
      title: body.title,
      subject: body.subject,
      durationMin: body.durationMin ?? 120,
      mode: body.mode,
      config: body.config ?? { count: questionIds.length },
      questionIds,
      status: 'draft',
      antiCheat: body.antiCheat ?? { shuffle: true, fullscreen: false, timerLock: true, antiCopy: false },
    })
    .returning();
  return ok(row);
}
