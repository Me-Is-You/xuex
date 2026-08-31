import { NextResponse } from 'next/server';
import { db } from '@/db';
import { actionLogs } from '@/db/schema';

export const DEFAULT_USER = 'jiang2027';

/** 从请求头解析当前用户（演示环境：客户端通过 X-User-Id 切换角色） */
export function currentUserId(req: Request): string {
  return req.headers.get('x-user-id') || DEFAULT_USER;
}

export function currentUserName(req?: Request): string {
  return req?.headers.get('x-user-name') || '江同学';
}

export function ok(data: unknown) {
  return NextResponse.json(data);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** 行为埋点（模块三：行为数据采集） */
export async function track(
  userId: string,
  actionType: string,
  opts: { entityId?: string | null; meta?: unknown; duration?: number | null } = {},
) {
  try {
    await db.insert(actionLogs).values({
      userId,
      actionType,
      entityId: opts.entityId ?? null,
      meta: opts.meta ?? null,
      duration: opts.duration ?? null,
    });
  } catch {
    // 埋点失败不阻塞主流程
  }
}
