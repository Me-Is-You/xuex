import { ok, currentUserId } from '@/lib/api';
import { getMastery, getWeakPoints, getAccuracyTrend } from '@/lib/mastery';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = currentUserId(req);
  const mastery = await getMastery(userId);
  const weak = await getWeakPoints(userId);
  const trend = await getAccuracyTrend(userId, 30);
  return ok({ mastery, weak, trend });
}
