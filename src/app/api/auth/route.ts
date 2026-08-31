import { db } from '@/db';
import { users } from '@/db/schema';
import { ok } from '@/lib/api';
import { maskPhone } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/**
 * 演示环境角色切换：返回可切换用户（学生/教师/管理员/家长）
 * 客户端选中后通过 localStorage 持久化，请求携带 X-User-Id / X-User-Name
 */
export async function GET() {
  const rows = await db.select().from(users);
  return ok(rows.map((u) => ({ id: u.id, name: u.name, role: u.role, phone: maskPhone(u.phone), major: u.major })));
}
