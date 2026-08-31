import { ok, fail, currentUserId } from '@/lib/api';
import { fetchAdaptiveQuestion } from '@/lib/recommend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { difficulty: number; excludeIds?: number[]; subject?: string; kpId?: number };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  const q = await fetchAdaptiveQuestion({
    userId,
    difficulty: body.difficulty,
    excludeIds: body.excludeIds,
    subject: body.subject,
    kpId: body.kpId,
  });
  return ok(q);
}
