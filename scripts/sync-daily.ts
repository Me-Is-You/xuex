/**
 * 生产 cron 入口：`0 0 * * * npm run sync:daily`
 * 与进程内调度器共用同一管线（runResourceSync 幂等：20h 内已成功则跳过）
 */
import "dotenv/config";
import { runResourceSync } from '../src/lib/sync/pipeline';
import { runSelfHeal } from '../src/lib/selfheal';

(async () => {
  const r = await runResourceSync({ trigger: 'cron' });
  console.log(JSON.stringify({ ...r, sources: undefined }, null, 2));
  const ev = await runSelfHeal();
  console.log(`selfheal: detected=${ev.reduce((s, x) => s + x.detected, 0)} repaired=${ev.reduce((s, x) => s + x.repaired, 0)}`);
})().catch((e) => { console.error(e); process.exit(1); });
