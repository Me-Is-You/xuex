import { db } from '@/db';
import { grades, users } from '@/db/schema';
import { csvResponse, maskPhone } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** 成绩单导出（CSV，手机号脱敏） GET ?subject=&orgId= */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');
  const orgId = url.searchParams.get('orgId');
  let rows = await db.select().from(grades);
  if (orgId) rows = rows.filter((g) => g.orgId === Number(orgId));
  if (subject) rows = rows.filter((g) => g.subject === subject);
  const phoneMap = new Map((await db.select().from(users)).map((u) => [u.id, u.phone]));
  return csvResponse(
    `成绩单_${subject ?? '全部'}_${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '手机号(脱敏)', '机构', '科目', '考试', '分数', '满分'],
    rows.map((g) => [g.studentId, g.studentName, maskPhone(phoneMap.get(g.studentId)), g.orgId ? `org-${g.orgId}` : '-', g.subject, g.examName, g.score, g.maxScore]),
  );
}
