import { db } from '@/db';
import { aiChats } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ok, fail, currentUserId } from '@/lib/api';
import { buildAiReply, getRecentIntent } from '@/lib/ai';

export const dynamic = 'force-dynamic';

/**
 * AI 助教对话：NLU 意图识别（含多轮上下文）+ 数据增强回复
 * POST { message }
 */
export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { message: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid body');
  }
  if (!body.message?.trim()) return fail('message required');

  const prevIntent = await getRecentIntent(userId);
  const result = await buildAiReply(userId, body.message.trim(), prevIntent);

  await db.insert(aiChats).values([
    { userId, role: 'user', content: body.message.trim(), intent: result.intent },
    { userId, role: 'assistant', content: result.reply, intent: result.intent },
  ]);

  return ok(result);
}

/** GET 历史对话（恢复上下文） */
export async function GET(req: Request) {
  const userId = currentUserId(req);
  const rows = await db
    .select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId))
    .orderBy(desc(aiChats.id))
    .limit(50);
  return ok(rows.reverse());
}
