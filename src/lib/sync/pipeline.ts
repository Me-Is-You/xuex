import { db } from '@/db';
import { questions, resources, knowledgePoints, syncRuns } from '@/db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { generateCandidates, Candidate } from './corpus';
import { collectWebResources, WebResource, WebSourceStatus } from './web';

/**
 * 智能资源同步管线（每日 0 点自动执行 + 手动触发）
 * =====================================================================
 *  发现      → 数据源注册表（本地参数化生成器 × 12 家族 + 2 个 web 公开源）
 *  抓取/生成 → 生成器按「日期种子」确定性产出候选题（可复现）；web 源超时/失败自动降级
 *  转换      → 归一化为平台 schema（学科/知识点/难度/选项/解析）
 *  去重      → 精确：FNV-1a 内容哈希；近似：字符 6-gram 集合 Jaccard ≥ 0.85
 *  质检      → 可答性/解析完备性/知识点挂载/难度合法 四维评分，< 70 拒收
 *  入库      → 题目 source='sync' 直接生效；资源卡 status='pending' 走管理员审核流
 *  留痕      → sync_runs 记录每次运行的来源状态与各项计数（可解释、可审计）
 */

/* 文本指纹工具见 ./text.ts */
import { fnv1a, normalize, shingles, jaccard } from './text';

/* ---------------- 质检门 ---------------- */

function scoreQuestion(c: Candidate): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (c.answer && c.options.length >= 2 && c.options.includes(c.answer)) {
    score += 50;
  } else {
    reasons.push('答案缺失或不在选项中');
  }
  if (c.explanation && c.explanation.length >= 10) score += 20;
  else reasons.push('解析不完备');
  if (c.kpId) score += 15;
  else reasons.push('未挂载知识点');
  if (c.difficulty >= 1 && c.difficulty <= 5 && c.content.length >= 10) score += 15;
  else reasons.push('题干/难度不合法');
  return { score, reasons };
}

/* ---------------- 主流程 ---------------- */

export type SyncReport = {
  runAt: string;
  trigger: string;
  durationMs: number;
  sources: Array<WebSourceStatus & { generated?: number }>;
  generated: number;
  deduped: number;
  rejected: number;
  rejectReasons: Record<string, number>;
  ingestedQuestions: number;
  ingestedResources: number;
  skipped?: boolean;
  skipReason?: string;
};

const DEDUP_JACCARD = 0.85; // 近似重复阈值
const MIN_QUESTION_SCORE = 70; // 质检门槛
const RECENT_SAMPLE = 300; // 近似去重只比对最近 N 题（高效：数据量翻倍成本不敏感）

export async function runResourceSync(opts: { trigger: 'cron' | 'manual'; force?: boolean }): Promise<SyncReport> {
  const t0 = Date.now();
  const trigger = opts.trigger;

  // 幂等：当天已有成功运行且非手动强制 → 跳过（防止重复入库）
  if (!opts.force) {
    const last = (await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1))[0];
    if (last && !last.error && last.runAt) {
      const hours = (Date.now() - last.runAt.getTime()) / 3600000;
      if (hours < 20) {
        return {
          runAt: last.runAt.toISOString(), trigger, durationMs: 0,
          sources: (last.sources as any[]) ?? [], generated: last.generated ?? 0, deduped: last.deduped ?? 0,
          rejected: last.rejected ?? 0, rejectReasons: {}, ingestedQuestions: last.ingestedQuestions ?? 0,
          ingestedResources: last.ingestedResources ?? 0, skipped: true, skipReason: `距上次成功运行仅 ${hours.toFixed(1)}h（<20h），幂等跳过`,
        };
      }
    }
  }

  const kpIds = new Set((await db.select({ id: knowledgePoints.id }).from(knowledgePoints)).map((k) => k.id));

  /* ---------- 1. 候选生成 ---------- */
  const candidates = generateCandidates(2); // 12 家族 × 2 变体
  const generated = candidates.length;

  /* ---------- 2. 指纹库（精确 + 近似） ---------- */
  const existing = (await db
    .select({ content: questions.content })
    .from(questions)
    .where(eq(questions.status, 'active'))
    .orderBy(desc(questions.id))
    .limit(RECENT_SAMPLE))
    .map((q) => ({ hash: fnv1a(normalize(q.content)), sh: shingles(normalize(q.content)) }));
  const exact = new Set(existing.map((x) => x.hash));

  /* ---------- 3. 题目：转换 → 去重 → 质检 → 入库 ---------- */
  const deduped: number[] = [];
  const rejectReasons: Record<string, number> = {};
  const toInsert: Array<{
    subject: string; category: string; content: string; options: string[]; answer: string;
    explanation: string | null; difficulty: number; kpId: number | null; source: string;
  }> = [];

  for (const c of candidates) {
    const h = fnv1a(normalize(c.content));
    if (exact.has(h)) { deduped.push(c.kpId); continue; }
    const norm = normalize(c.content);
    if (existing.some((x) => jaccard(x.sh, shingles(norm)) >= DEDUP_JACCARD)) { deduped.push(c.kpId); continue; }
    const { score, reasons } = scoreQuestion(c);
    if (score < MIN_QUESTION_SCORE) {
      for (const rr of reasons) rejectReasons[rr] = (rejectReasons[rr] ?? 0) + 1;
      continue;
    }
    toInsert.push({
      subject: c.subject, category: c.category, content: c.content, options: c.options,
      answer: c.answer, explanation: c.explanation, difficulty: c.difficulty,
      kpId: c.kpId && kpIds.has(c.kpId) ? c.kpId : null,
      source: 'sync',
    });
    exact.add(h);
    existing.push({ hash: h, sh: shingles(norm) }); // 批内去重
  }

  let ingestedQuestions = 0;
  if (toInsert.length) {
    await db.insert(questions).values(toInsert);
    ingestedQuestions = toInsert.length;
  }

  /* ---------- 4. Web 资源：抓取 → 转换 → 去重 → 入库（待审核） ---------- */
  let web: Awaited<ReturnType<typeof collectWebResources>>;
  try {
    web = await collectWebResources();
  } catch (e) {
    web = { items: [], statuses: [{ id: 'web', name: 'Web 采集', kind: 'http', status: 'failed', fetched: 0, error: e instanceof Error ? e.message : String(e) }] };
  }

  const resExisting = await db.select({ title: resources.title }).from(resources);
  const resHashes = new Set(resExisting.map((x) => fnv1a(normalize(x.title))));
  let ingestedResources = 0;
  if (web.items.length) {
    const cards = web.items.filter((w) => {
      const h = fnv1a(normalize(w.title));
      if (resHashes.has(h)) return false;
      resHashes.add(h);
      return w.description.length >= 8 && w.tags.length >= 2; // 资源质检
    });
    if (cards.length) {
      await db.insert(resources).values(
        cards.map((w: WebResource) => ({
          title: w.title, type: w.type, subject: w.subject,
          difficulty: w.difficulty, tags: w.tags, description: w.description,
          url: w.url, instructor: w.instructor,
          coverColor: 'from-leaf-500 to-leaf-800',
          status: 'pending', version: 1,
        })),
      );
      ingestedResources = cards.length;
    }
  }

  /* ---------- 5. 留痕 ---------- */
  const sources: Array<WebSourceStatus & { generated?: number }> = web.statuses.map((s) => ({ ...s }));
  sources.unshift({ id: 'parametric-corpus', name: '本地参数化题库生成器（12 家族）', kind: 'generator', status: 'ok', fetched: generated, generated });

  const [run] = await db.insert(syncRuns).values({
    trigger,
    durationMs: Date.now() - t0,
    sources,
    generated,
    deduped: deduped.length,
    rejected: generated - deduped.length - toInsert.length,
    ingestedQuestions,
    ingestedResources,
  }).returning();

  return {
    runAt: run.runAt?.toISOString() ?? new Date().toISOString(), trigger, durationMs: run.durationMs ?? 0,
    sources, generated, deduped: run.deduped ?? 0, rejected: run.rejected ?? 0,
    rejectReasons, ingestedQuestions, ingestedResources,
  };
}

/** 最近一次运行（管理台展示） */
export async function getLastSyncRun() {
  return (await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1))[0] ?? null;
}
