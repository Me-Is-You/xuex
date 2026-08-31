import { db } from '@/db';
import { resources } from '@/db/schema';
import { sql, eq, asc } from 'drizzle-orm';
import { ok, fail, currentUserId, track } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 资源中心：多维度检索（标题/标签/知识点/学科/类型/难度/年级）
 * GET /api/resources?keyword=&subject=&type=&tag=&grade=&status=
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const keyword = url.searchParams.get('keyword');
  const subject = url.searchParams.get('subject');
  const type = url.searchParams.get('type');
  const tag = url.searchParams.get('tag');
  const grade = url.searchParams.get('grade');
  const status = url.searchParams.get('status'); // 默认 published
  const difficulty = url.searchParams.get('difficulty');

  let rows = await db.select().from(resources).orderBy(asc(resources.createdAt));
  const tagsOf = (r: (typeof rows)[number]) => (r.tags as string[] | null) ?? [];
  rows = rows.filter((r) => (status ? r.status === status : r.status === 'published' || r.status === 'pending' || r.status === 'offline'));
  if (subject) rows = rows.filter((r) => r.subject === subject);
  if (type) rows = rows.filter((r) => r.type === type);
  if (grade) rows = rows.filter((r) => r.grade === grade);
  if (difficulty) rows = rows.filter((r) => r.difficulty === Number(difficulty));
  if (tag) rows = rows.filter((r) => tagsOf(r).includes(tag));
  if (keyword) {
    const kw = keyword.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(kw) ||
        (r.description ?? '').toLowerCase().includes(kw) ||
        tagsOf(r).some((t) => t.toLowerCase().includes(kw)),
    );
  }
  if (userId) void track(userId, 'search_resource', { entityId: keyword ?? undefined, meta: { subject, type } });
  return ok(rows);
}

/** POST 上传新资源（教学资源库）：tags 可由 AI 智能标注自动生成 */
export async function POST(req: Request) {
  let body: Partial<typeof resources.$inferInsert>;
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.title || !body.type || !body.subject) return fail('title/type/subject required');
  // 资源智能标注：根据学科/标题/描述自动生成标签
  const tags = new Set<string>((body.tags as string[] | undefined) ?? []);
  const subMap: Record<string, string> = { Math: '高等数学', English: '英语' };
  if (subMap[body.subject]) tags.add(subMap[body.subject]);
  tags.add(`难度${body.difficulty ?? 3}`);
  if (body.grade) tags.add(body.grade);
  const titleWords = ['极限', '导数', '积分', '矩阵', '行列式', '特征值', '方程组', '向量', '词汇', '语法', '阅读', '写作', '虚拟仿真'];
  for (const w of titleWords) if ((body.title ?? '').includes(w)) tags.add(w);
  const [row] = await db
    .insert(resources)
    .values({
      title: body.title!,
      type: body.type!,
      subject: body.subject!,
      tags: [...tags],
      grade: body.grade ?? null,
      difficulty: body.difficulty ?? 3,
      kpId: body.kpId ?? null,
      description: body.description ?? null,
      url: body.url ?? null,
      coverColor: body.coverColor ?? 'from-leaf-500 to-leaf-800',
      durationSec: body.durationSec ?? 0,
      instructor: body.instructor ?? null,
      studentCount: body.studentCount ?? 0,
      status: (body.status as any) ?? 'pending',
      version: body.version ?? 1,
    })
    .returning();
  return ok(row);
}
