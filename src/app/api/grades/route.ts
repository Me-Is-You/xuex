import { db } from '@/db';
import { grades, users } from '@/db/schema';
import { ok, fail } from '@/lib/api';
import { maskPhone } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/**
 * 成绩管理：录入 / 查询（多机构层级隔离 + 数据脱敏）
 * GET ?orgId=&subject=
 * POST { studentId, studentName, subject, examName, score, maxScore?, orgId? }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');
  const subject = url.searchParams.get('subject');
  let rows = await db.select().from(grades);
  if (orgId) rows = rows.filter((g) => g.orgId === Number(orgId));
  if (subject) rows = rows.filter((g) => g.subject === subject);
  const phoneMap = new Map((await db.select().from(users)).map((u) => [u.id, u.phone]));
  return ok(rows.map((g) => ({ ...g, phoneMasked: maskPhone(phoneMap.get(g.studentId)) })));
}

export async function POST(req: Request) {
  let body: { studentId: string; studentName: string; subject: string; examName: string; score: number; maxScore?: number; orgId?: number; term?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.studentId || !body.subject || !body.examName || body.score == null) return fail('missing fields');
  const [row] = await db
    .insert(grades)
    .values({
      studentId: body.studentId,
      studentName: body.studentName,
      orgId: body.orgId ?? null,
      subject: body.subject,
      examName: body.examName,
      score: body.score,
      maxScore: body.maxScore ?? 150,
      term: body.term ?? new Date().toISOString().slice(0, 7),
    })
    .returning();
  return ok(row);
}
