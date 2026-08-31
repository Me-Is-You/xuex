import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');
  const category = url.searchParams.get('category');
  const kpId = url.searchParams.get('kpId');
  const difficulty = url.searchParams.get('difficulty');
  const limit = Number(url.searchParams.get('limit') ?? 50);

  let rows = await db.select().from(questions).where(eq(questions.status, 'active'));
  if (subject) rows = rows.filter((q) => q.subject === subject);
  if (category) rows = rows.filter((q) => q.category === category);
  if (kpId) rows = rows.filter((q) => q.kpId === Number(kpId));
  if (difficulty) rows = rows.filter((q) => q.difficulty === Number(difficulty));
  return ok(rows.slice(0, limit));
}
