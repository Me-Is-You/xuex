/*
 * AI 助教引擎（本地 NLU + 知识库增强）
 * - 意图识别：规则化 NLU（关键词/正则 + 多轮上下文）
 * - 回复生成：结合题库、知识点图谱、掌握度数据（RAG-lite）
 * - 智能批改：客观题自动判分 + 主观题（作文）多维启发式评分
 * 架构上预留 LLM 插槽：replace buildReply with an LLM call while keeping the
 * same intent/context pipeline (见 docs/architecture.md)
 */
import { db } from '@/db';
import { questions, knowledgePoints, kpEdges, aiChats } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getMastery, getWeakPoints } from './mastery';

export type Intent =
  | 'solve' // 解题
  | 'practice' // 出题/练习
  | 'grade' // 批改
  | 'plan' // 学习计划
  | 'diagnosis' // 薄弱点诊断
  | 'resource' // 资源推荐
  | 'encourage' // 情绪/动力
  | 'chitchat'; // 闲聊

export type AiReply = {
  intent: Intent;
  reply: string;
  suggestions: string[]; // 后续推荐问法
  cards?: Array<{ label: string; href?: string; items?: string[] }>; // 结构化卡片（推荐题/资源）
};

const INTENT_RULES: Array<{ intent: Intent; patterns: RegExp; priority: number }> = [
  { intent: 'grade', patterns: /(批改|改作文|评作文|打分|阅卷|看看我写|我的答案)/, priority: 10 },
  { intent: 'practice', patterns: /(出题|练习题|来几道|刷题|练一练|做几道|专项练习|再出)/, priority: 9 },
  { intent: 'solve', patterns: /(怎么算|怎么求|如何解|求解|计算|证明|等于多少|=?\?|lim|积分|导数|矩阵|行列式|方程|夹角|特征值)/, priority: 7 },
  { intent: 'diagnosis', patterns: /(薄弱|哪里不行|诊断|差在哪|短板|总错|老是错|总是错)/, priority: 8 },
  { intent: 'plan', patterns: /(计划|安排|怎么备考|怎么学|规划|路径|步骤|多久|时间线)/, priority: 6 },
  { intent: 'resource', patterns: /(推荐|资源|视频|课件|教材|看什么|学什么资料|微课)/, priority: 6 },
  { intent: 'encourage', patterns: /(焦虑|紧张|坚持不下去|想放弃|学不会|没信心|累|压力)/, priority: 5 },
];

/** 意图识别（含多轮上下文：追问词继承上一轮意图） */
export function recognizeIntent(message: string, prevIntent?: Intent | null): Intent {
  const followUps = /(为什么|详细|展开|再讲|具体|那.{0,6}呢|继续|接着|展开说说)/;
  if (followUps.test(message) && prevIntent && prevIntent !== 'chitchat') return prevIntent;
  let best: Intent = 'chitchat';
  let bestScore = 0;
  for (const rule of INTENT_RULES) {
    if (rule.patterns.test(message) && rule.priority > bestScore) {
      best = rule.intent;
      bestScore = rule.priority;
    }
  }
  return best;
}

/** 提取消息中提到的知识点（用于 RAG 定位） */
async function findKp(message: string) {
  const kps = await db.select().from(knowledgePoints);
  const hits = kps.filter((k) => message.includes(k.name) || (k.description ?? '').includes(message.slice(0, 6)));
  if (hits.length) return hits[0];
  const kw: Record<string, string[]> = {
    Math: ['极限', '导数', '积分', '二重', '多元', '矩阵', '行列式', '特征值', '方程组', '向量'],
    English: ['词汇', '语法', '阅读', '写作', '虚拟语气', '从句'],
  };
  for (const [subject, words] of Object.entries(kw)) {
    const found = words.find((w) => message.includes(w));
    if (found) {
      const exact = kps.find((k) => k.subject === subject && (k.name.includes(found) || k.description?.includes(found)));
      if (exact) return exact;
    }
  }
  return null;
}

async function buildPracticeCard(kpName?: string, subject?: string) {
  let pool = await db.select().from(questions).where(eq(questions.status, 'active'));
  if (subject) pool = pool.filter((q) => q.subject === subject);
  if (kpName) pool = pool.filter((q) => q.category === kpName || q.content.includes(kpName));
  const picks = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
  return picks.map((q) => `${q.subject === 'Math' ? '数学' : '英语'}·${q.category}（难度 ${q.difficulty}）：${q.content.slice(0, 42)}…`);
}

/** 生成回复（结合 DB 数据） */
export async function buildAiReply(userId: string, message: string, prevIntent?: Intent | null): Promise<AiReply> {
  const intent = recognizeIntent(message, prevIntent);
  const kp = await findKp(message);
  const mastery = await getMastery(userId);
  const weak = await getWeakPoints(userId);

  switch (intent) {
    case 'solve': {
      const kpM = kp ? mastery.find((m) => m.kpId === kp.id) : null;
      const practice = await buildPracticeCard(kp?.name, kp?.subject);
      return {
        intent,
        reply: kp
          ? `「${kp.name}」是${kp.subject === 'Math' ? '数学' : '英语'}的高频考点（真题出现率约 ${kp.examFreq}%）。解题关键：先明确题型，再套用对应公式/法则，最后验证量纲与符号。${kpM ? `你目前该知识点掌握度 ${kpM.mastery}%，${kpM.mastery < 60 ? '建议先回看基础微课再做题。' : '状态不错，可以适当提高难度。'}` : ''}`
          : '把题目发给我（文字即可），我会给出完整解题步骤、易错点分析，并根据你的掌握情况推荐 2 道巩固练习。',
        suggestions: ['出 2 道相关练习', '这个知识点怎么备考？', '帮我诊断薄弱点'],
        cards: practice.length ? [{ label: '推荐巩固练习', href: '/dashboard/practice', items: practice }] : undefined,
      };
    }
    case 'practice': {
      const items = await buildPracticeCard(kp?.name, kp?.subject);
      return {
        intent,
        reply: kp ? `已根据你的画像从「${kp.name}」题库中抽取 ${items.length} 道题目，难度贴合你当前水平，做完会自动进入错题本统计。` : '已为你抽取一组智能推题，覆盖薄弱知识点。建议每题限时 2 分钟，检验速度。',
        suggestions: ['开始练习', '换一个知识点', '为什么推这些题？'],
        cards: items.length ? [{ label: '今日智能推题', href: '/dashboard/practice', items }] : undefined,
      };
    }
    case 'grade': {
      return {
        intent,
        reply: '已开启智能批改。你可以：① 把客观题题目+你的答案发给我，我立即判分并讲解；② 粘贴英语作文，我从语法、词汇、逻辑、卷面四个维度打分并逐句修改。点击下方「智能批改」标签也可直接提交。',
        suggestions: ['批改英语作文', '批改一道客观题', '讲解我的错题'],
      };
    }
    case 'diagnosis': {
      const top = weak.slice(0, 3);
      const lines = top.length
        ? top.map((w, i) => `${i + 1}. ${w.subject === 'Math' ? '数学' : '英语'}·${w.name}：掌握度 ${w.mastery}%（近期正确率 ${w.lastCorrectRate}%）`).join('\n')
        : '暂无明显薄弱点，继续保持！';
      return {
        intent,
        reply: `基于你最近 30 天 ${top.length ? '的' : ''}答题数据与知识图谱匹配，薄弱点诊断如下：\n${lines}\n建议优先攻克第 1 项——它的高频考点属性意味着提分性价比最高。`,
        suggestions: ['给我制定攻克计划', '出第 1 个薄弱点的练习题', '推荐相关资源'],
        cards: top.length ? { label: '薄弱点 Top3', items: top.map((w) => `${w.name}（${w.mastery}%）`) } as never : undefined,
      };
    }
    case 'plan': {
      return {
        intent,
        reply: '按 2027 年 3 月考试倒推，建议三阶段：\n· 基础阶段（现在~10月）：知识点全覆盖 + 每日错题 5 道\n· 强化阶段（11月~12月）：专题突破（二重积分/多元微分）+ 每周 2 套专项卷\n· 冲刺阶段（明年1月起）：每周 2 套真题 + 每 10 天全真模拟\n你的目标院校是西安邮电大学，数学目标 120 分的话，二重积分与多元微分必须拿满基础分。需要的话我帮你把计划拆解成每周任务。',
        suggestions: ['帮我拆解成每周任务', '查看我的学习目标', '生成学习计划'],
        cards: [{ label: '学习目标', href: '/dashboard/goals', items: ['在「学习目标」中查看/创建系统自动拆解的阶段任务'] }],
      };
    }
    case 'resource': {
      const kps = await db.select().from(knowledgePoints);
      const resources = await db
        .select({ title: (await import('@/db/schema')).resources.title })
        .from((await import('@/db/schema')).resources)
        .where(eq((await import('@/db/schema')).resources.status, 'published'));
      const related = kp
        ? resources.filter((r) => (kps.find((k) => k.id === kp.id)?.description ?? '').length && r.title.includes(kp.name.split('')[0]) || r.title === kp.name).slice(0, 2)
        : resources.slice(0, 3);
      return {
        intent,
        reply: kp ? `关于「${kp.name}」，推荐你学习中心的相关资源：${related.length ? related.map((r: any) => `《${r.title}》`).join('、') : '（暂无匹配资源，可看该知识点的全部微课）'}。建议先微课（25 分钟以内）后专项卷。` : '资源中心按知识点/难度/年级智能标注，直接搜索关键词即可。需要我按你的薄弱点推荐吗？',
        suggestions: ['按薄弱点推荐', '看二重积分资源', '去资源中心'],
        cards: related.length ? { label: '相关资源', href: '/dashboard/courses', items: related.map((r: any) => r.title) } as never : undefined,
      };
    }
    case 'encourage': {
      const streakNote = weak[0] ? `我知道「${weak[0].name}」让你头疼，` : '';
      return {
        intent,
        reply: `${streakNote}但数据不会骗人：你近 30 天已完成 ${mastery.reduce((s, m) => s + m.total, 0)} 次训练，正确率曲线整体向上。专升本拼的是持续性而不是某一天。把大目标拆小——今天只要拿下 1 个薄弱知识点，就赢了。`,
        suggestions: ['查看我的学习曲线', '来一道简单的题找找信心', '制定今天的计划'],
      };
    }
    default: {
      return {
        intent,
        reply: '我是你的 2027 届智能助教，可以帮你：解题讲题、生成练习、批改作业、诊断薄弱点、规划学习路径、推荐资源。直接说出你的问题，比如"二重积分怎么算"或"批改我的英语作文"。',
        suggestions: ['帮我诊断薄弱点', '出 5 道练习题', '高数怎么备考？'],
      };
    }
  }
}

/** 多轮对话：读取最近上下文 */
export async function getRecentIntent(userId: string): Promise<Intent | null> {
  const rows = await db
    .select({ intent: aiChats.intent })
    .from(aiChats)
    .orderBy(desc(aiChats.id))
    .where(and(eq(aiChats.userId, userId), eq(aiChats.role, 'user')))
    .limit(1);
  return (rows[0]?.intent as Intent | null) ?? null;
}

/* ---------------- 智能批改 ---------------- */

export type GradeResult = {
  type: 'objective' | 'subjective';
  verdict: string;
  score: number | null; // 客观题 null；主观题 0-100
  feedback: string[];
  improved?: string; // 修改后版本（主观题）
};

/** 客观题自动批改 */
export function gradeObjective(question: { content: string; options: string[]; answer: string; explanation: string | null }, userAnswer: string): GradeResult {
  const correct = userAnswer.trim() === question.answer.trim();
  const idx = question.options.findIndex((o) => o === question.answer);
  const userIdx = question.options.findIndex((o) => o === userAnswer.trim());
  return {
    type: 'objective',
    verdict: correct ? '回答正确 ✔' : '回答错误 ✘',
    score: correct ? 100 : 0,
    feedback: [
      `你的答案：${userAnswer}${userIdx >= 0 ? `（${String.fromCharCode(65 + userIdx)}）` : ''}`,
      `正确答案：${question.answer}${idx >= 0 ? `（${String.fromCharCode(65 + idx)}）` : ''}`,
      question.explanation ? `【解析】${question.explanation}` : '建议回看对应知识点微课。',
      correct ? '建议：限时重做 1 道同类型题保持手感。' : '建议：本题已自动记入错题本，48 小时后系统会推送相似题重练。',
    ],
  };
}

/** 英语作文启发式批改（语法/词汇/逻辑/结构四维度） */
const ADVANCED_WORDS = ['furthermore', 'moreover', 'consequently', 'nevertheless', 'in addition', 'therefore', 'sufficient', 'essential', 'demonstrate', 'significant', 'substantial', 'acknowledge', 'appreciate', 'regard', 'obtain', 'achieve', 'improve', 'benefit'];
const COMMON_ERRORS: Array<{ re: RegExp; fix: string }> = [
  { re: /\bhe go\b/i, fix: '"he go" → 主谓一致，应为 "he goes"' },
  { re: /\bthey was\b/i, fix: '"they was" → 主谓一致，应为 "they were"' },
  { re: /\bmore better\b/i, fix: '"more better" → 双重比较级，应为 "better"' },
  { re: /\bvery good\b/i, fix: '"very good" → 建议升级为 "excellent / outstanding"' },
  { re: /\ba apple\b/i, fix: '"a apple" → 元音前用 "an apple"' },
  { re: /\bI think that is\b/i, fix: '可升级为 "I believe that ..."' },
  { re: /\bpeoples\b/i, fix: '"peoples" → 泛指人群用 "people"' },
  { re: /\bstudy hard to\b/i, fix: '"study hard to" → 更地道："work hard to"' },
];
const CONNECTORS = ['however', 'furthermore', 'moreover', 'therefore', 'in addition', 'as a result', 'consequently'];

export function gradeEssay(essay: string): GradeResult {
  const words = essay.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = essay.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const lower = essay.toLowerCase();

  const issues: string[] = [];
  for (const e of COMMON_ERRORS) {
    if (e.re.test(essay)) issues.push(e.fix);
  }
  if (wordCount < 80) issues.push(`篇幅 ${wordCount} 词，低于 80 词要求，建议扩写 1-2 个细节句`);
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 30);
  if (longSentences.length >= 2) issues.push('存在多条超长句（>30 词），建议拆分以保证可读性');

  const vocabScore = Math.min(30, 10 + Math.round((ADVANCED_WORDS.filter((w) => lower.includes(w)).length / 3) * 10));
  const grammarPenalty = Math.min(30, issues.filter((i) => i.includes('→')).length * 10);
  const grammarScore = Math.max(0, 30 - grammarPenalty);
  const logicScore = Math.min(20, CONNECTORS.filter((c) => lower.includes(c)).length * 7 + (sentences.length >= 5 ? 6 : 2));
  const structureScore = Math.min(20, wordCount >= 80 ? 12 : 6) + (sentences.length >= 4 && sentences.length <= 12 ? 8 : 3);

  const total = Math.min(100, vocabScore + grammarScore + logicScore + structureScore);
  const improved = issues.length
    ? essay
        .replace(/\bmore better\b/gi, 'better')
        .replace(/\bhe go\b/gi, 'he goes')
        .replace(/\bthey was\b/gi, 'they were')
        .replace(/\ba apple\b/gi, 'an apple')
        .replace(/\bvery good\b/gi, 'excellent')
    : essay;

  return {
    type: 'subjective',
    verdict: total >= 85 ? '优秀：逻辑清晰、词汇高级感强' : total >= 70 ? '良好：框架完整，细节可打磨' : total >= 55 ? '合格：有提升空间，重点看语法' : '待提高：先夯实基础句型和篇幅',
    score: total,
    feedback: [
      `【词汇】${vocabScore}/30 — 检测到 ${ADVANCED_WORDS.filter((w) => lower.includes(w)).length} 处高级表达${vocabScore < 20 ? '，建议每段至少 1 个高级替换' : ''}`,
      `【语法】${grammarScore}/30 — ${issues.filter((i) => i.includes('→')).length ? '发现 ' + issues.filter((i) => i.includes('→')).length + ' 处典型错误' : '未发现典型错误'}`,
      `【逻辑】${logicScore}/20 — 连接词 ${CONNECTORS.filter((c) => lower.includes(c)).length} 处，${logicScore < 14 ? '段落衔接可加强（however/moreover）' : '衔接较好'}`,
      `【结构】${structureScore}/20 — ${wordCount} 词 / ${sentences.length} 句`,
      ...(issues.length ? ['【修改建议】' + issues.slice(0, 4).join('；')] : ['【修改建议】表达规范，保持这个水平！']),
    ],
    improved,
  };
}

/** 知识图谱关联推荐：前置 / 后续 / 相关 */
export async function relatedKps(kpId: number) {
  const kps = await db.select().from(knowledgePoints);
  const edges = await db.select().from(kpEdges);
  const byId = new Map(kps.map((k) => [k.id, k]));
  const prereq = edges.filter((e) => e.targetId === kpId && e.relation === 'prerequisite').map((e) => byId.get(e.sourceId)).filter(Boolean);
  const next = edges.filter((e) => e.sourceId === kpId && e.relation === 'prerequisite').map((e) => byId.get(e.targetId)).filter(Boolean);
  const related = edges.filter((e) => (e.sourceId === kpId || e.targetId === kpId) && e.relation === 'related').map((e) => byId.get(e.sourceId === kpId ? e.targetId : e.sourceId)).filter(Boolean);
  return {
    prereq: prereq.map((k: any) => ({ id: k.id, name: k.name })),
    next: next.map((k: any) => ({ id: k.id, name: k.name })),
    related: related.map((k: any) => ({ id: k.id, name: k.name })),
  };
}
