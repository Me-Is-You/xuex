import { db } from '@/db';
import { users, orgs } from '@/db/schema';
import { ok } from '@/lib/api';
import { maskPhone } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** 用户与角色管理（多角色：学生/教师/管理员/家长） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get('role');
  const orgId = url.searchParams.get('orgId');
  let rows = await db.select().from(users);
  if (role) rows = rows.filter((u) => u.role === role);
  if (orgId) rows = rows.filter((u) => u.orgId === Number(orgId));
  const orgMap = new Map((await db.select().from(orgs)).map((o) => [o.id, o.name]));
  return ok(rows.map((u) => ({ ...u, orgName: u.orgId ? orgMap.get(u.orgId) ?? null : null, phone: maskPhone(u.phone) })));
}
