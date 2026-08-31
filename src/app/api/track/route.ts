import { ok, currentUserId, track } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 前端行为埋点上报：{ actionType, entityId?, meta?, duration? } */
export async function POST(req: Request) {
  const userId = currentUserId(req);
  let body: { actionType: string; entityId?: string; meta?: unknown; duration?: number };
  try {
    body = await req.json();
  } catch {
    return new Response('invalid body', { status: 400 });
  }
  if (!body.actionType) return new Response('actionType required', { status: 400 });
  await track(userId, body.actionType, { entityId: body.entityId, meta: body.meta, duration: body.duration });
  return ok({ ok: true });
}
