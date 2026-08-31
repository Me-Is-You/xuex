import { ok, currentUserId } from '@/lib/api';
import { recommendQuestions, fetchAdaptiveQuestion } from '@/lib/recommend';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recommend?count=5&subject=&kpId=&difficulty=  智能推题（混合推荐）
 * POST /api/recommend/adaptive  { userId, difficulty, excludeIds, subject }  自适应取题
 */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const url = new URL(req.url);
  const count = Number(url.searchParams.get('count') ?? 5);
  const recs = await recommendQuestions(userId, count, {
    subject: url.searchParams.get('subject') ?? undefined,
    kpId: url.searchParams.get('kpId') ? Number(url.searchParams.get('kpId')) : undefined,
    difficulty: url.searchParams.get('difficulty') ? Number(url.searchParams.get('difficulty')) : undefined,
  });
  return ok(recs.map((r) => ({ ...r.question, reasons: r.reasons, score: r.score })));
}
