import { db } from '@/db';
import { exams, questions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PUT 发布 / 归档 / 修改防作弊设置 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { status?: 'draft' | 'published' | 'archived'; antiCheat?: Record<string, boolean> };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const set: Record<string, unknown> = {};
  if (body.status) set.status = body.status;
  if (body.antiCheat) set.antiCheat = body.antiCheat;
  if (!Object.keys(set).length) return fail('nothing to update');
  const [row] = await db.update(exams).set(set as any).where(eq(exams.id, Number(id))).returning();
  return ok(row ?? null);
}

/** GET 试卷题目（已发布才可取题；固定卷按序，随机卷每次打乱呈现） */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = currentUserId(req);
  const { id } = await params;
  const [exam] = await db.select().from(exams).where(eq(exams.id, Number(id)));
  if (!exam) return fail('exam not found', 404);
  if (exam.status !== 'published') return fail('试卷未发布', 403);
  const all = await db.select().from(questions).where(eq(questions.status, 'active'));
  const byId = new Map(all.map((q) => [q.id, q]));
  const cfg = (exam.config ?? {}) as { count?: number };
  let qs = ((exam.questionIds as number[]) ?? []).map((qid) => byId.get(qid)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];
  // 随机卷未预组题时按 config.count 从同学科题库即时抽题（组卷）
  if (qs.length === 0) {
    const pool = all.filter((q) => q.subject === exam.subject);
    const arr = [...pool].sort(() => 0.5 - Math.random());
    qs = arr.slice(0, cfg.count ?? 10);
  }
  const antiCheat = (exam.antiCheat ?? {}) as Record<string, boolean>;
  if (exam.mode === 'random' || antiCheat.shuffle) {
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]];
    }
  }
  return ok({
    exam: { id: exam.id, title: exam.title, subject: exam.subject, durationMin: exam.durationMin, antiCheat: exam.antiCheat },
    questions: qs.map((q) => ({
      id: q.id,
      subject: q.subject,
      category: q.category,
      content: q.content,
      options: q.options,
      difficulty: q.difficulty,
      kpId: q.kpId,
    })),
  });
}
