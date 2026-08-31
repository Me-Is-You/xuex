import { db } from '@/db';
import { orgs, users } from '@/db/schema';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 机构管理：多校区层级树 + 各机构人数 */
export async function GET() {
  const rows = await db.select().from(orgs);
  const userCount = new Map<string, number>();
  for (const u of await db.select().from(users)) {
    if (u.orgId) userCount.set(String(u.orgId), (userCount.get(String(u.orgId)) ?? 0) + 1);
  }
  const toNode = (id: number | null): any[] =>
    rows
      .filter((o) => (o.parentId ?? null) === id)
      .map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        headcount: userCount.get(String(o.id)) ?? 0,
        children: toNode(o.id),
      }));
  return ok(toNode(null));
}
