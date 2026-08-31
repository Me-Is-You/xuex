import { db } from '@/db';
import { grades } from '@/db/schema';
import { ok, currentUserId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 班级对比（数据仪表盘）：各学生平均成绩 + 我的排名
 * GET ?subject=&orgId=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');
  const orgId = url.searchParams.get('orgId');
  const userId = currentUserId(req);

  let rows = await db.select().from(grades);
  if (orgId) rows = rows.filter((g) => g.orgId === Number(orgId));
  if (subject) rows = rows.filter((g) => g.subject === subject);

  const byStudent = new Map<string, { name: string; total: number; count: number }>();
  for (const g of rows) {
    const e = byStudent.get(g.studentId) ?? { name: g.studentName, total: 0, count: 0 };
    e.total += g.score;
    e.count += 1;
    byStudent.set(g.studentId, e);
  }
  const students = [...byStudent.entries()]
    .map(([sid, e]) => ({ studentId: sid, name: e.name, avg: Math.round((e.total / e.count) * 10) / 10 }))
    .sort((a, b) => b.avg - a.avg);
  const classAvg = students.length ? Math.round((students.reduce((s, x) => s + x.avg, 0) / students.length) * 10) / 10 : 0;
  const myRank = students.findIndex((s) => s.studentId === userId) + 1;
  return ok({ students, classAvg, myRank, total: students.length });
}
