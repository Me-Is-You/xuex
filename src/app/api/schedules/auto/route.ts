import { db } from '@/db';
import { scheduleItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * 自动排课：把「待排课程」按贪心策略填入无冲突空档
 * 候选时段：周一至周六 08:00 / 10:00 / 14:00 / 19:00 起始，按课程时长延展
 * 冲突判定与手动排课一致（同教师或同教室同时段）
 */
export async function POST(req: Request) {
  const pending = await db.select().from(scheduleItems).where(eq(scheduleItems.status, 'pending'));
  const placed: Array<{ id: number; message: string }> = [];
  for (const item of pending) {
    const duration = toMin(item.endTime) - toMin(item.startTime);
    const slots: Array<{ day: number; start: string; end: string }> = [];
    for (let day = 1; day <= 6; day++) {
      for (const [sh, sm] of [[8, 0], [10, 0], [14, 0], [19, 0]] as Array<[number, number]>) {
        const startMin = sh * 60 + sm;
        const endMin = startMin + duration;
        if (endMin > 22 * 60) continue;
        const fmt = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
        slots.push({ day, start: fmt(startMin), end: fmt(endMin) });
      }
    }
    const existing = await db.select().from(scheduleItems);
    const free = slots.find((s) => {
      const clash = existing.some(
        (e) =>
          e.id !== item.id &&
          e.dayOfWeek === s.day &&
          toMin(e.startTime) < toMin(s.end) &&
          toMin(s.start) < toMin(e.endTime) &&
          (e.teacherName === item.teacherName || e.room === item.room),
      );
      return !clash;
    });
    if (free) {
      await db
        .update(scheduleItems)
        .set({ dayOfWeek: free.day, startTime: free.start, endTime: free.end, status: 'confirmed' })
        .where(eq(scheduleItems.id, item.id));
      placed.push({ id: item.id, message: `「${item.courseTitle}」已排入 周${free.day} ${free.start}-${free.end}` });
    } else {
      placed.push({ id: item.id, message: `「${item.courseTitle}」未找到可用时段，请手动调整` });
    }
  }
  return ok(placed);
}
