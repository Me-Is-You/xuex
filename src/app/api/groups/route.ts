import { db } from '@/db';
import { groups } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { ok, fail, currentUserName } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 学习小组 */
export async function GET() {
  const rows = await db.select().from(groups).orderBy(desc(groups.createdAt));
  return ok(rows);
}

export async function POST(req: Request) {
  let body: { name: string; description?: string; notice?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.name?.trim()) return fail('name required');
  const [row] = await db
    .insert(groups)
    .values({
      name: body.name.trim(),
      description: body.description ?? null,
      notice: body.notice ?? null,
      ownerName: currentUserName(),
      memberCount: 1,
    })
    .returning();
  return ok(row);
}
