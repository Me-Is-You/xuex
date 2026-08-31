import { Rng, int, pick, shuffle, makeRng } from './rng';

/**
 * 参数化题库生成器（自研「每日新题」引擎核心）
 * ------------------------------------------------
 * 每个家族 = 一类可参数化的真题题型。给定 (日期种子, 家族, 序号) 生成
 * 题干/选项/答案/解析完全确定、可复现的新题；跨天种子变化 → 每日全新。
 * 全部数学题均可解析验证（干扰项规则构造，答案经闭式计算）。
 */

export type Candidate = {
  subject: 'Math' | 'English';
  category: string;
  kpId: number;
  difficulty: number;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
};

type Family = {
  id: string;
  subject: 'Math' | 'English';
  category: string;
  kpId: number;
  difficulty: number;
  /** 返回 null 表示本轮参数冲突，跳过（鲁棒：宁可少不可错） */
  make: (r: Rng) => Omit<Candidate, 'subject' | 'category' | 'kpId' | 'difficulty'> | null;
};

/** 构造 4 个互不相同的选项，正确项位置随机；干扰项函数可取随机数，冲突时重试 */
function buildOptions(r: Rng, correct: string, distractors: Array<(r: Rng) => string>): string[] | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const opts = [correct, ...distractors.map((f) => f(r))].filter((v, i, a) => v && a.indexOf(v) === i);
    if (opts.length === 4) return shuffle(r, opts);
  }
  return null;
}
const frac = (n: number, d: number) => (d === 1 ? String(n) : `${n}/${d}`);
/** 生成与 correct 不同的数值干扰项 */
const alt = (r: Rng, correct: string, pool: number[]) => {
  const p = pool.filter((v) => String(v) !== correct);
  return String(p.length ? pick(r, p) : Number(correct) + 1);
};

const FAMILIES: Family[] = [
  /* ================= 数学（陕西专升本·高等数学） ================= */
  {
    id: 'lim-seq', subject: 'Math', category: '极限', kpId: 31, difficulty: 2,
    make: (r) => {
      const a = int(r, 1, 6), c = int(r, 1, 6), b = int(r, -9, 9), d = int(r, 1, 9);
      const ans = frac(a, c);
      const opts = buildOptions(r, ans, [
        (rr) => frac(c, a),
        (rr) => frac(a + 1, c),
        (rr) => alt(rr, ans, [c + 1, a - 1, c - 1, a + 2]),
      ]);
      return opts ? {
        content: `求极限：lim_{n→∞} (${a}n + ${b}) / (${c}n + ${d}) = （  ）`,
        options: opts, answer: ans,
        explanation: `分子分母同除以 n，当 n→∞ 时低次项趋于 0，极限 = ${a}/${c}。这是专升本极限高频题型（∞/∞ 型有理式）。`,
      } : null;
    },
  },
  {
    id: 'two-limits', subject: 'Math', category: '极限', kpId: 31, difficulty: 2,
    make: (r) => {
      const k = int(r, 2, 6);
      if (r() < 0.5) {
        const opts = buildOptions(r, String(k), [
          (rr) => String(k * k),
          (rr) => String(k + 1),
          (rr) => alt(rr, String(k), [1, k * 2, k - 1]),
        ]);
        return opts ? {
          content: `利用重要极限求：lim_{x→0} sin(${k}x) / x = （  ）`,
          options: opts, answer: String(k),
          explanation: `令 t=${k}x，则原式 = ${k}·lim_{t→0} sin t / t = ${k}×1 = ${k}。重要极限 lim_{x→0} sin x / x = 1 的直接应用。`,
        } : null;
      }
      const opts = buildOptions(r, `e^${k}`, [() => 'e', () => `e^${k * 2}`, () => '1']);
      return opts ? {
        content: `利用重要极限求：lim_{x→0} (1 + x)^(${k}/x) = （  ）`,
        options: opts, answer: `e^${k}`,
        explanation: `原式 = [lim_{x→0} (1+x)^{1/x}]^${k} = e^${k}。第二个重要极限的标准变形。`,
      } : null;
    },
  },
  {
    id: 'poly-deriv', subject: 'Math', category: '导数', kpId: 32, difficulty: 2,
    make: (r) => {
      const n = int(r, 2, 6), a = int(r, -5, 5);
      const ans = String(n + a);
      const opts = buildOptions(r, ans, [
        (rr) => String(n),
        (rr) => String(n - a),
        (rr) => alt(rr, ans, [n * 2, a, n + 2, a - 1]),
      ]);
      return opts ? {
        content: `设 f(x) = x^${n} + ${a}x，则 f′(1) = （  ）`,
        options: opts, answer: ans,
        explanation: `f′(x) = ${n}x^${n - 1} + ${a}，代入 x=1 得 f′(1) = ${n} + ${a} = ${n + a}。幂函数求导法则的直接应用。`,
      } : null;
    },
  },
  {
    id: 'def-int', subject: 'Math', category: '定积分', kpId: 35, difficulty: 3,
    make: (r) => {
      const k = int(r, 1, 5);
      const ans = frac(1, k + 1);
      const opts = buildOptions(r, ans, [
        (rr) => frac(1, k + 2),
        (rr) => frac(k, k + 1),
        (rr) => frac(1, 2 * (k + 1)),
      ]);
      return opts ? {
        content: `计算定积分：∫₀¹ x^${k} dx = （  ）`,
        options: opts, answer: ans,
        explanation: `∫₀¹ x^${k} dx = [x^${k + 1}/${k + 1}]₀¹ = 1/${k + 1}。幂函数定积分公式。`,
      } : null;
    },
  },
  {
    id: 'dbl-int', subject: 'Math', category: '二重积分', kpId: 36, difficulty: 4,
    make: (r) => {
      const k = int(r, 1, 4);
      const ans = frac(1, k + 2); // ∫₀¹ x^(k+1) dx = 1/(k+2)
      const opts = buildOptions(r, ans, [
        (rr) => frac(1, k + 1),
        (rr) => frac(1, k + 3),
        (rr) => frac(1, 2 * (k + 2)),
      ]);
      return opts ? {
        content: `设 D = {(x,y) | 0 ≤ y ≤ x ≤ 1}，计算二重积分 ∬_D x^${k} dA = （  ）`,
        options: opts, answer: ans,
        explanation: `化为累次积分：∫₀¹₀ˣ x^${k} dy dx = ∫₀¹ x^${k}·x dx = ∫₀¹ x^${k + 1} dx = 1/${k + 2}。内层对 y 积分时 x 视为常数。`,
      } : null;
    },
  },
  {
    id: 'det', subject: 'Math', category: '行列式', kpId: 38, difficulty: 2,
    make: (r) => {
      const p = int(r, 2, 6), s = int(r, 2, 6), q = int(r, -3, 3), rr2 = int(r, -3, 3);
      const det = p * s - q * rr2;
      const opts = buildOptions(r, String(det), [
        (x) => String(p * s + q * rr2),
        (x) => String(p + s),
        (x) => alt(x, String(det), [det + 2, det - 1, p * s]),
      ]);
      return opts ? {
        content: `计算二阶行列式 | ${p}  ${q} ; ${rr2}  ${s} | = （  ）`,
        options: opts, answer: String(det),
        explanation: `二阶行列式 = 主对角线之积 − 副对角线之积 = ${p}×${s} − ${q}×${rr2} = ${det}。`,
      } : null;
    },
  },
  {
    id: 'lin-sys', subject: 'Math', category: '线性方程组', kpId: 39, difficulty: 3,
    make: (r) => {
      const p = int(r, 2, 6), s = int(r, 2, 6), q = int(r, -3, 3), rr2 = int(r, -3, 3);
      const det = p * s - q * rr2;
      if (det === 0) return null;
      const ans = 'r(A) = 2，方程组有唯一解';
      const opts = buildOptions(r, ans, [
        () => 'r(A) = 1，方程组有无穷多解',
        () => '方程组无解',
        () => 'r(A) = 0，A 为零矩阵',
      ]);
      return opts ? {
        content: `设线性方程组 Ax = b，其中 A = [${p} ${q}; ${rr2} ${s}]，且 det(A) ≠ 0。则下列结论正确的是（  ）`,
        options: opts, answer: ans,
        explanation: `det(A) = ${det} ≠ 0 ⇒ r(A) = 2 = 未知数个数 ⇒ 方程组有唯一解（克拉默法则）。这是判断方程组解的充要条件。`,
      } : null;
    },
  },
  {
    id: 'eigen', subject: 'Math', category: '特征值', kpId: 40, difficulty: 3,
    make: (r) => {
      const a = int(r, -4, 4) || 1, c = int(r, -4, 4) || 2, b = int(r, -3, 3);
      const ans = String(a * c);
      const opts = buildOptions(r, ans, [
        (x) => String(a + c),
        (x) => String(a * c + 1),
        (x) => alt(x, ans, [b, a, c, a * c - 1]),
      ]);
      return opts ? {
        content: `设 2 阶上三角矩阵 A = [${a}  ${b}; 0  ${c}]，则 |A| = （  ）`,
        options: opts, answer: ans,
        explanation: `上三角矩阵的特征值即主对角线元素 ${a}、${c}；行列式等于全部特征值之积 = ${a}×${c} = ${a * c}。`,
      } : null;
    },
  },
  {
    id: 'geo-series', subject: 'Math', category: '级数', kpId: 31, difficulty: 3,
    make: (r) => {
      const d = pick(r, [2, 3, 4] as const);
      const ans = frac(d, d - 1);
      const opts = buildOptions(r, ans, [
        () => frac(d, d + 1),
        () => frac(1, d - 1),
        () => String(d),
      ]);
      return opts ? {
        content: `求级数之和：Σ_{n=0}^∞ (1/${d})^n = （  ）`,
        options: opts, answer: ans,
        explanation: `公比 q = 1/${d}，|q| < 1，等比级数收敛，和 = 1/(1−q) = 1/(1−1/${d}) = ${d}/${d - 1}。`,
      } : null;
    },
  },
  /* ================= 英语（陕西专升本·应用英语） ================= */
  {
    id: 'read-passage', subject: 'English', category: '阅读理解', kpId: 44, difficulty: 3,
    make: (r) => {
      const t = pick(r, [
        {
          p: 'Many universities are redesigning their curricula to include data analytics. Students who can read and interpret data sets are more likely to find employment after graduation, according to a recent survey. However, critics warn that technical skills alone are not enough; communication and critical thinking remain equally important.',
          main: 'Universities are adding data courses, and both technical and soft skills matter',
          d: ['Data skills are the only requirement for jobs', 'Critics oppose all curriculum changes', 'The survey proved every student will be employed'],
        },
        {
          p: 'Remote work has become common in many companies. A study of 4,000 employees found that most were slightly less productive at home, but far happier with their work-life balance. Managers noted that trust-based management noticeably improved team performance.',
          main: 'Remote work trades some productivity for better balance, and trust-based management helps',
          d: ['Remote work always increases productivity', 'The study showed remote work is impossible', 'Managers distrust all remote employees'],
        },
        {
          p: 'The cost of college textbooks has risen sharply over the past decade. In response, several universities now require open educational resources that are free for students. Early results show no drop in learning outcomes, while student debt decreases.',
          main: 'Open educational resources cut textbook costs without hurting learning',
          d: ['Textbooks are becoming more expensive every year', 'All universities banned printed books', 'Open resources reduce learning quality'],
        },
        {
          p: 'Vocational students who combine professional training with general education perform better in job interviews, a new report shows. Employers value both practical skills and the ability to communicate clearly.',
          main: 'Employers value both practical skills and communication ability in vocational graduates',
          d: ['General education is useless for jobs', 'Only practical skills matter in interviews', 'The report surveyed only employers in one city'],
        },
      ]);
      const opts = buildOptions(r, t.main, t.d.map((s) => () => s));
      return opts ? {
        content: `Passage: ${t.p} What is the main idea of the passage?`,
        options: opts, answer: t.main,
        explanation: '主旨题：先读首尾段抓中心句，再比对选项。正确选项需概括全文而非局部细节，且不能过于绝对（always/only/every）。',
      } : null;
    },
  },
  {
    id: 'essay-closing', subject: 'English', category: '应用文写作', kpId: 45, difficulty: 2,
    make: (r) => {
      const t = pick(r, [
        { scene: 'a formal application letter to a university', correct: 'I am looking forward to your early reply.', wrong: ['Bye! See you next year.', 'Hope to catch up soon, mate!', 'That\'s all for my letter.'] },
        { scene: 'a letter of thanks to a teacher', correct: 'Thank you again for your generous help.', wrong: ['I owe you a lot, pay me back never.', 'No more thanks, it is enough.', 'You should help me more.'] },
        { scene: 'an invitation letter for a campus activity', correct: 'We would be honored if you could attend.', wrong: ['You must come, no excuses.', 'Come or never mind.', 'I forbid you to refuse.'] },
        { scene: 'a letter of apology to a friend', correct: 'I sincerely apologize for the inconvenience.', wrong: ['It was not really my fault.', 'You are too sensitive about it.', 'Apology accepted?'] },
      ]);
      const opts = buildOptions(r, t.correct, t.wrong.map((s) => () => s));
      return opts ? {
        content: `In ${t.scene}, which closing sentence is the MOST appropriate?`,
        options: opts, answer: t.correct,
        explanation: '应用文写作要求语气正式、礼貌得体。口语化或语气不当（命令、推卸责任）的选项不符合正式书信规范。',
      } : null;
    },
  },
  {
    id: 'vocab-form', subject: 'English', category: '词汇', kpId: 42, difficulty: 2,
    make: (r) => {
      const t = pick(r, [
        { word: 'benefit', ans: 'beneficial', blank: 'The new policy will have a ______ effect on the local economy.', exp: '修饰名词 effect 需形容词 beneficial（有益的）；benefit 是名词/动词。' },
        { word: 'decide', ans: 'decision', blank: 'After careful thought, she made the ______ to study abroad.', exp: 'make a decision 为固定搭配，需用名词 decision。' },
        { word: 'compete', ans: 'competition', blank: 'There is fierce ______ among graduates for limited job positions.', exp: 'fierce 为形容词修饰名词，compete 的名词形式是 competition。' },
        { word: 'succeed', ans: 'success', blank: 'His ______ in the exam surprised all his classmates.', exp: 'His 为形容词性物主代词，后接名词 success。' },
        { word: 'govern', ans: 'government', blank: 'The local ______ announced a new plan for road construction.', exp: 'The local 后接名词，govern 的名词是 government（政府）。' },
      ]);
      const opts = buildOptions(r, t.ans, [() => t.word, () => t.word + 's', () => t.word + 'ly']);
      return opts ? {
        content: `Fill in the blank with the correct form of the word in brackets. ${t.blank} ( ${t.word} )`,
        options: opts, answer: t.ans,
        explanation: t.exp,
      } : null;
    },
  },
  {
    id: 'grammar-tense', subject: 'English', category: '语法', kpId: 43, difficulty: 3,
    make: (r) => {
      const t = pick(r, [
        {
          stem: 'By the time the exam results are announced, we ______ the application form three days earlier.',
          ans: 'will have submitted',
          wrong: ['have submitted', 'would submit', 'had submitted'],
          exp: 'By the time + 将来时间点（用一般现在时表将来），主句用将来完成时 will have + 过去分词。',
        },
        {
          stem: 'When I arrived at the station, the train ______ already left.',
          ans: 'had',
          wrong: ['has', 'was', 'is'],
          exp: '过去某一动作（arrived）之前已完成的动作，用过去完成时 had + 过去分词。',
        },
        {
          stem: 'The report ______ by the time the meeting started, so we had to wait.',
          ans: 'had not been finished',
          wrong: ['has not been finished', 'is not finished', 'was not finishing'],
          exp: '会议开始（过去）之前报告"没有被完成"，用过去完成时的被动语态。',
        },
        {
          stem: 'By next June, the library ______ for exactly two years.',
          ans: 'will have been open',
          wrong: ['has been open', 'will be open', 'is open'],
          exp: 'By + 将来时间 + 持续性状态，用将来完成时；open 为形容词表状态，结构 will have been open。',
        },
      ]);
      const opts = buildOptions(r, t.ans, t.wrong.map((s) => () => s));
      return opts ? {
        content: t.stem,
        options: opts, answer: t.ans,
        explanation: t.exp,
      } : null;
    },
  },
];

export const KP_COUNT = FAMILIES.length;

/** 生成一轮候选题：每个家族取 `per` 个不同参数组合（同一天结果恒定，可复现） */
export function generateCandidates(per = 2, date = new Date()): Candidate[] {
  const out: Candidate[] = [];
  for (const f of FAMILIES) {
    for (let v = 0; v < per; v++) {
      const r = makeRng(f.id, v, date);
      const q = f.make(r);
      if (q) out.push({ subject: f.subject, category: f.category, kpId: f.kpId, difficulty: f.difficulty, ...q });
    }
  }
  return out;
}
