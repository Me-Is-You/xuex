import { db } from '@/db';
import { grades } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 成绩统计：平均分 / 最高最低 / 排名 / 分数段分布（成绩单依据）
 * GET ?subject=&orgId=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');
  const orgId = url.searchParams.get('orgId');
  let rows = await db.select().from(grades);
  if (orgId) rows = rows.filter((g) => g.orgId === Number(orgId));
  if (subject) rows = rows.filter((g) => g.subject === subject);

  const byStudent = new Map<string, { name: string; orgId: number | null; scores: number[] }>();
  for (const g of rows) {
    const e = byStudent.get(g.studentId) ?? { name: g.studentName, orgId: g.orgId, scores: [] };
    e.scores.push(g.score);
    byStudent.set(g.studentId, e);
  }
  const ranking = [...byStudent.entries()]
    .map(([sid, e]) => ({
      studentId: sid,
      studentName: e.name,
      orgId: e.orgId,
      avg: Math.round(e.scores.reduce((s, x) => s + x, 0) / e.scores.length),
      total: e.scores.reduce((s, x) => s + x, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const allScores = rows.map((g) => g.score);
  const dist: Record<string, number> = { '90+': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
  for (const s of allScores) {
    if (s >= 90) dist['90+'] += 1;
    else if (s >= 80) dist['80-89'] += 1;
    else if (s >= 70) dist['70-79'] += 1;
    else if (s >= 60) dist['60-69'] += 1;
    else dist['<60'] += 1;
  }

  return ok({
    count: rows.length,
    avg: allScores.length ? Math.round((allScores.reduce((s, x) => s + x, 0) / allScores.length) * 10) / 10 : 0,
    max: allScores.length ? Math.max(...allScores) : 0,
    min: allScores.length ? Math.min(...allScores) : 0,
    ranking,
    distribution: dist,
  });
}
