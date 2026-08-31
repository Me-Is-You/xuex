import { runResourceSync } from './pipeline';

/**
 * 每日 0 点资源同步调度器
 * - 进程启动时计算到下一个本地 0:00 的延迟，setTimeout 对齐触发
 * - 触发后自滚动：完成一轮立即重新 arm（跨天自动持续）
 * - 幂等由 runResourceSync 内部保证（20h 内已成功 → 跳过）
 * - 生产部署亦可改用系统 cron：`0 0 * * * npm run sync:daily`（同一管线）
 */
let timer: NodeJS.Timeout | null = null;
let running = false;

export function startDailyScheduler() {
  if (timer || process.env.SKIP_SCHEDULER) return;
  const arm = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0); // 下一个本地 0:00
    const ms = next.getTime() - now.getTime();
    timer = setTimeout(async () => {
      timer = null;
      if (running) {
        arm();
        return;
      }
      running = true;
      console.log(`[sync] 每日 0 点资源同步开始 @ ${new Date().toISOString()}`);
      try {
        const r = await runResourceSync({ trigger: 'cron' });
        console.log(
          `[sync] 完成：生成 ${r.generated} / 去重 ${r.deduped} / 质检拒收 ${r.rejected} / 入库题目 ${r.ingestedQuestions} / 入库资源 ${r.ingestedResources} / 耗时 ${r.durationMs}ms${r.skipped ? '（幂等跳过）' : ''}`,
        );
        // 同步完成后自动巡检 11 模块自愈算法（资源入库 → 数据完整性对账，同事务窗口内闭环）
        try {
          const { runSelfHeal } = await import('@/lib/selfheal');
          const ev = await runSelfHeal();
          const d = ev.reduce((s, x) => s + x.detected, 0);
          const p = ev.reduce((s, x) => s + x.repaired, 0);
          console.log(`[selfheal] 每日巡检完成：检测 ${d} 处异常 / 自动修复 ${p} 处（11 模块）`);
        } catch (e2) {
          console.error('[selfheal] 每日巡检失败（不影响服务）:', e2 instanceof Error ? e2.message : e2);
        }
      } catch (e) {
        console.error('[sync] 每日同步失败（不影响服务，次日重试）:', e instanceof Error ? e.message : e);
      } finally {
        running = false;
        arm();
      }
    }, ms);
    console.log(`[sync] 每日资源同步已排程 → ${next.toLocaleString('zh-CN', { hour12: false })}（${Math.round(ms / 60000)} 分钟后）`);
  };
  arm();
}
