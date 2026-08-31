/**
 * Next.js instrumentation：服务进程启动钩子
 * 在这里注册每日 0 点资源同步调度器（nodejs 运行时 + 非测试环境）
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV !== 'test') {
    const { startDailyScheduler } = await import('@/lib/sync/scheduler');
    startDailyScheduler();
  }
}
