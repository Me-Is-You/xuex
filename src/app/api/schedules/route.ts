import { db } from '@/db';
import { scheduleItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * 排课系统：手动排课 + 时间冲突检测（同教师/同教室同时段）
 * GET ?teacher=&day=  查询课表
 * POST  新增课程（冲突时返回 409 + 冲突明细）
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const teacher = url.searchParams.get('teacher');
  const day = url.searchParams.get('day');
  let rows = await db.select().from(scheduleItems);
  if (teacher) rows = rows.filter((s) => s.teacherName === teacher);
  if (day) rows = rows.filter((s) => s.dayOfWeek === Number(day));
  return ok(rows.sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMin(a.startTime) - toMin(b.startTime)));
}

export async function POST(req: Request) {
  let body: { courseTitle: string; subject: string; teacherName: string; dayOfWeek: number; startTime: string; endTime: string; room: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const required = ['courseTitle', 'subject', 'teacherName', 'dayOfWeek', 'startTime', 'endTime', 'room'] as const;
  for (const f of required) if (body[f] == null || body[f] === '') return fail(`${f} required`);
  if (toMin(body.endTime) <= toMin(body.startTime)) return fail('结束时间必须晚于开始时间');

  // 冲突检测
  const all = await db.select().from(scheduleItems).where(eq(scheduleItems.dayOfWeek, body.dayOfWeek));
  const overlaps = all.filter(
    (s) =>
      toMin(s.startTime) < toMin(body.endTime) &&
      toMin(body.startTime) < toMin(s.endTime) &&
      (s.teacherName === body.teacherName || s.room === body.room),
  );
  if (overlaps.length) {
    return fail(
      `时间冲突：与「${overlaps[0].courseTitle}」（${overlaps[0].startTime}-${overlaps[0].endTime}，${overlaps[0].teacherName === body.teacherName ? '教师冲突' : '教室冲突'}）重叠`,
      409,
    );
  }
  const [row] = await db.insert(scheduleItems).values({ ...body, status: 'confirmed' }).returning();
  return ok(row);
}

/** DELETE ?id= 取消课程 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return fail('id required');
  const [row] = await db.delete(scheduleItems).where(eq(scheduleItems.id, id)).returning();
  return ok(row ? { deleted: id } : { error: 'not found' });
}

// 自动排课见 ./auto/route.ts（POST /api/schedules/auto）
