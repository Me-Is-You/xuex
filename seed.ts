/* 全量演示数据种子：覆盖五大模块 */
import { sql, eq } from 'drizzle-orm';
import { db } from './src/db/index';
import {
  questions,
  knowledgePoints,
  kpEdges,
  userProgress,
  dailyGoals,
  wrongBook,
  courseProgress,
  userGoals,
  userProfiles,
  aiChats,
  actionLogs,
  resources,
  resourceNotes,
  scheduleItems,
  exams,
  examResults,
  grades,
  alerts,
  interventionRules,
  posts,
  replies,
  postLikes,
  postReports,
  messages,
  groups,
  groupNotes,
  groupTasks,
  orgs,
  users,
  notifications,
} from './src/db/schema';

// 确定性随机数
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20270831);
const daysAgo = (d: number, h = 9) => new Date(Date.now() - d * 86400000 - (23 - h) * 3600000);
const pct = (p: number) => rnd() < p;

async function seed() {
  console.log('Seeding database...');
  // 清空（演示库）
  await db.delete(postLikes);
  await db.delete(postReports);
  await db.delete(replies);
  await db.delete(posts);
  await db.delete(messages);
  await db.delete(groupNotes);
  await db.delete(groupTasks);
  await db.delete(groups);
  await db.delete(notifications);
  await db.delete(alerts);
  await db.delete(interventionRules);
  await db.delete(grades);
  await db.delete(examResults);
  await db.delete(exams);
  await db.delete(scheduleItems);
  await db.delete(resourceNotes);
  await db.delete(courseProgress);
  await db.delete(resources);
  await db.delete(actionLogs);
  await db.delete(aiChats);
  await db.delete(userProfiles);
  await db.delete(userGoals);
  await db.delete(dailyGoals);
  await db.delete(wrongBook);
  await db.delete(userProgress);
  await db.delete(kpEdges);
  await db.delete(knowledgePoints);
  await db.delete(questions);
  await db.delete(users);
  await db.delete(orgs);

  /* ============ 模块五：机构 / 用户 / 角色 ============ */
  const [orgMain] = await db.insert(orgs).values({ name: '主校区', type: 'main' }).returning();
  const [orgNorth] = await db.insert(orgs).values({ name: '北校区', parentId: orgMain.id }).returning();
  const [orgSouth] = await db.insert(orgs).values({ name: '南校区', parentId: orgMain.id }).returning();

  await db.insert(users).values([
    { id: 'jiang2027', name: '江同学', phone: '13800001111', role: 'student', orgId: orgMain.id, major: '大数据技术' },
    { id: 'wang5', name: '王小羽', phone: '13900002222', role: 'student', orgId: orgMain.id, major: '大数据技术' },
    { id: 'li3', name: '李明', phone: '13700003333', role: 'student', orgId: orgMain.id, major: '计算机应用' },
    { id: 'zhaoliu', name: '赵磊', phone: '13600004444', role: 'student', orgId: orgNorth.id, major: '大数据技术' },
    { id: 'chenqi', name: '陈倩', phone: '13500005555', role: 'student', orgId: orgSouth.id, major: '计算机网络' },
    { id: 'sun7', name: '孙丽', phone: '13400006666', role: 'student', orgId: orgNorth.id, major: '计算机应用' },
    { id: 'zhao8', name: '赵刚', phone: '13300007777', role: 'student', orgId: orgMain.id, major: '大数据技术' },
    { id: 'qiu9', name: '邱悦', phone: '13200008888', role: 'student', orgId: orgSouth.id, major: '计算机网络' },
    { id: 'ma10', name: '马宁', phone: '13100009999', role: 'student', orgId: orgNorth.id, major: '大数据技术' },
    { id: 'teacher-zhang', name: '张剑峰', phone: '15000001234', role: 'teacher', orgId: orgMain.id, major: '高等数学' },
    { id: 'teacher-wang', name: '王琳', phone: '15100005678', role: 'teacher', orgId: orgMain.id, major: '英语' },
    { id: 'admin-li', name: '李志明', phone: '15200009999', role: 'admin', orgId: orgMain.id },
    { id: 'parent-jiang', name: '江妈妈', phone: '15300000001', role: 'parent', orgId: orgMain.id },
  ]);

  /* ============ 模块一/二：知识点（图谱节点） ============ */
  const kpData = [
    { subject: 'Math', name: '极限理论', importance: 5, examFreq: 85, parentId: null, description: '数列与函数极限、两个重要极限、洛必达法则' },
    { subject: 'Math', name: '导数与微分', importance: 5, examFreq: 80, parentId: 1, description: '导数定义、求导法则、微分' },
    { subject: 'Math', name: '中值定理', importance: 3, examFreq: 40, parentId: 2, description: '罗尔、拉格朗日中值定理' },
    { subject: 'Math', name: '不定积分', importance: 4, examFreq: 70, parentId: 2, description: '换元法、分部积分' },
    { subject: 'Math', name: '定积分与应用', importance: 5, examFreq: 75, parentId: 4, description: '牛顿-莱布尼茨公式、面积与体积' },
    { subject: 'Math', name: '二重积分', importance: 4, examFreq: 55, parentId: 5, description: '直角坐标下的二重积分计算' },
    { subject: 'Math', name: '多元函数微分', importance: 4, examFreq: 60, parentId: 2, description: '偏导数、全微分、方向导数' },
    { subject: 'Math', name: '矩阵与行列式', importance: 4, examFreq: 65, parentId: null, description: '矩阵运算、逆矩阵、行列式性质' },
    { subject: 'Math', name: '线性方程组', importance: 3, examFreq: 50, parentId: 8, description: '高斯消元、解的判定' },
    { subject: 'Math', name: '特征值与特征向量', importance: 3, examFreq: 45, parentId: 8, description: '特征值求解、相似对角化' },
    { subject: 'Math', name: '空间解析几何', importance: 2, examFreq: 30, parentId: null, description: '向量夹角、平面与直线方程' },
    { subject: 'English', name: '核心词汇', importance: 5, examFreq: 90, parentId: null, description: '考纲高频词汇 4500 词' },
    { subject: 'English', name: '语法结构', importance: 4, examFreq: 70, parentId: 12, description: '时态语态、从句、非谓语、虚拟语气' },
    { subject: 'English', name: '阅读理解', importance: 5, examFreq: 85, parentId: 13, description: '细节题、主旨题、推断题' },
    { subject: 'English', name: '应用文写作', importance: 4, examFreq: 75, parentId: 12, description: '应用文与短文写作' },
  ];
  const kps: Record<number, number> = {};
  for (const [i, kp] of kpData.entries()) {
    const [row] = await db.insert(knowledgePoints).values(kp).returning();
    kps[i + 1] = row.id;
  }
  // 边：source 是 target 的前置知识
  const edgeData: Array<[number, number, 'prerequisite' | 'related']> = [
    [1, 2, 'prerequisite'], [2, 3, 'prerequisite'], [2, 4, 'prerequisite'],
    [4, 5, 'prerequisite'], [5, 6, 'prerequisite'], [2, 7, 'prerequisite'],
    [8, 9, 'prerequisite'], [8, 10, 'prerequisite'],
    [12, 13, 'prerequisite'], [13, 14, 'prerequisite'], [12, 15, 'prerequisite'],
    [6, 7, 'related'], [9, 10, 'related'], [14, 15, 'related'], [3, 4, 'related'],
  ];
  await db.insert(kpEdges).values(
    edgeData.map(([s, t, relation]) => ({ sourceId: kps[s], targetId: kps[t], relation })),
  );

  /* ============ 题库（40 题，关联知识点） ============ */
  const qData: Array<[string, string, string, string[], string, string, number, number]> = [
    // [subject, category, content, options, answer, explanation, difficulty, kpNo]
    ['Math', 'Calculus', '求极限 lim(x→0) sin x / x 的值。', ['0', '1', '∞', '不存在'], '1', '第一个重要极限：lim(x→0) sin x / x = 1。', 1, 1],
    ['Math', 'Calculus', '求极限 lim(x→∞) (1 + 1/x)^x。', ['e', '1', '0', '∞'], 'e', '第二个重要极限：lim(x→∞)(1+1/x)^x = e。', 2, 1],
    ['Math', 'Calculus', '求极限 lim(x→0) (1 − cos x) / x²。', ['0', '1/2', '1', '∞'], '1/2', '利用等价无穷小 1 − cos x ~ x²/2，故极限为 1/2。', 2, 1],
    ['Math', 'Calculus', '设 f(x) = x²，则 f′(1) = ？', ['1', '2', '3', '0'], '2', 'f′(x) = 2x，所以 f′(1) = 2。', 1, 2],
    ['Math', 'Calculus', '设 y = sin x · e^x，则 y′ = ？', ['e^x·sin x', 'e^x·cos x', 'e^x(sin x + cos x)', 'e^x(sin x − cos x)'], 'e^x(sin x + cos x)', '乘积求导法则：(uv)′ = u′v + uv′。', 2, 2],
    ['Math', 'Calculus', '曲线 y = ln x 在 x = 1 处切线的斜率为？', ['0', '1/2', '1', '2'], '1', 'y′ = 1/x，x=1 时斜率为 1。', 3, 2],
    ['Math', 'Calculus', '若 f(x) 在 [a,b] 连续，(a,b) 可导，且 f(a)=f(b)，则存在 ξ∈(a,b) 使得？', ['f′(ξ)=0', 'f(ξ)=0', 'f″(ξ)=0', 'f(ξ)=ξ'], 'f′(ξ)=0', '罗尔定理（Rolle）的结论。', 3, 3],
    ['Math', 'Calculus', '不定积分 ∫x dx = ？', ['x²/2 + C', 'x² + C', '2x + C', 'x + C'], 'x²/2 + C', '幂函数积分公式 ∫xdx = xⁿ⁺¹/(n+1) + C。', 2, 4],
    ['Math', 'Calculus', '不定积分 ∫1/(1+x²) dx = ？', ['ln|1+x²| + C', 'arctan x + C', 'tan x + C', 'ln(1+x²) + C'], 'arctan x + C', '基本积分表：∫1/(1+x²)dx = arctan x + C。', 3, 4],
    ['Math', 'Calculus', '定积分 ∫₀^π sin x dx = ？', ['0', '1', '2', 'π'], '2', '[-cos x]₀^π = −cos π + cos 0 = 1 + 1 = 2。', 2, 5],
    ['Math', 'Calculus', '由 y = x² 与 y = x 所围成图形的面积为？', ['1/12', '1/6', '1/3', '1'], '1/6', '交点 x=0,1；面积 = ∫₀¹(x − x²)dx = 1/2 − 1/3 = 1/6。', 3, 5],
    ['Math', 'Calculus', '当 n→∞ 时，Σᵢ₌₁ⁿ (1/n)·f(ξᵢ)（ξᵢ∈[0,1]）的极限是？', ['∫₀¹ f(x) dx', 'f(1) − f(0)', 'f(0)', '∫₀ⁿ f(x) dx'], '∫₀¹ f(x) dx', '定积分的黎曼和定义。', 3, 5],
    ['Math', 'Calculus', '设 D 为 x² + y² ≤ 1，则 ∬_D dA = ？', ['1', '2', 'π', 'π²'], 'π', '二重积分等于区域 D 的面积，即单位圆面积 π。', 4, 6],
    ['Math', 'Calculus', '设 D 由 y = x、y = 0、x = 1 围成，则 ∬_D x dA = ？', ['1/8', '1/3', '1/2', '1'], '1/3', '化为累次积分 ∫₀¹₀ˣ x dy dx = ∫₀¹ x² dx = 1/3。', 4, 6],
    ['Math', 'Calculus', '设 f(x,y) = x² + y²，则 f 在点 (1,1) 处的全微分 df = ？', ['2dx + 2dy', 'dx + dy', '2dx − 2dy', 'dx − dy'], '2dx + 2dy', '∂f/∂x = 2x，∂f/∂y = 2y，在 (1,1) 处均为 2。', 3, 7],
    ['Math', 'Calculus', '设 f(x,y) = x³y，则 ∂f/∂x = ？', ['3x²y', 'x³', '3xy²', 'x²y'], '3x²y', '对 x 求偏导时 y 视为常数。', 4, 7],
    ['Math', 'Linear Algebra', '若 A 为 n 阶实对称矩阵，则 A 的特征值必为？', ['虚数', '实数', '零', '1'], '实数', '实对称矩阵的特征值全部为实数（基本定理）。', 2, 8],
    ['Math', 'Linear Algebra', '若 3 阶方阵 A 满足 |A| = 2，则 |2A| = ？', ['4', '8', '16', '6'], '16', '|kA| = kⁿ|A| = 2³·2 = 16。', 3, 8],
    ['Math', 'Linear Algebra', '齐次线性方程组 Ax = 0 有非零解的充要条件是？', ['r(A) < n', 'r(A) = n', '|A| ≠ 0', 'r(A) ≤ n'], 'r(A) < n', '齐次方程组有非零解 ⟺ 系数矩阵秩小于未知数个数。', 3, 9],
    ['Math', 'Linear Algebra', '若 λ 是矩阵 A 的特征值，则 2λ + 1 是下列哪个矩阵的特征值？', ['2A + I', 'A² + I', '2A − I', 'A + I'], '2A + I', '若 Av = λv，则 (2A+I)v = 2λv + v = (2λ+1)v。', 4, 10],
    ['Math', 'Analytic Geometry', '向量 a=(1,0,0) 与 b=(1,1,0) 的夹角为？', ['90°', '60°', '45°', '30°'], '60°', 'cosθ = a·b/(|a||b|) = 1/√2 = √2/2，θ = 60°。', 3, 11],
    ['Math', 'Linear Algebra', '矩阵的秩等于？', ['最高阶非零子式的阶数', '矩阵的阶数', '矩阵的行数', '矩阵的列数'], '最高阶非零子式的阶数', '秩的定义：矩阵中最高阶非零子式的阶数。', 3, 8],
    ['English', 'Vocabulary', 'What is the synonym of "Obdurate"?', ['Flexible', 'Stubborn', 'Yielding', 'Soft'], 'Stubborn', 'Obdurate 意为"顽固的"，Stubborn 是其同义词。', 1, 12],
    ['English', 'Vocabulary', 'What is the antonym of "abundant"?', ['plentiful', 'scarce', 'rich', 'ample'], 'scarce', 'abundant 意为"丰富的"，反义词为 scarce"稀缺的"。', 2, 12],
    ['English', 'Vocabulary', 'The ______ of the project depends heavily on the budget.', ['outcome', 'outline', 'output', 'outlook'], 'outcome', 'outcome"结果"符合句意；output 侧重"产量"。', 2, 12],
    ['English', 'Grammar', 'I suggest that he ______ the meeting.', ['attends', 'attend', 'attended', 'would attend'], 'attend', 'suggest 后的宾语从句用虚拟语气 (should) + 动词原形。', 1, 13],
    ['English', 'Grammar', 'He ______ his homework before his mother came back.', ['has finished', 'finished', 'had finished', 'was finishing'], 'had finished', '"过去的过去"用过去完成时。', 2, 13],
    ['English', 'Grammar', '______ from the hill, the city looks like a garden.', ['Seen', 'Seeing', 'To see', 'Having seen'], 'Seen', '非谓语作状语，city 与 see 为被动关系用过去分词。', 3, 13],
    ['English', 'Grammar', 'Not only ______ hard, but he is also very honest.', ['he works', 'does he work', 'he worked', 'did he work'], 'does he work', 'Not only 置于句首，主句部分倒装；时态与 is 一致用一般现在时。', 3, 13],
    ['English', 'Grammar', 'The news ______ that the conference has been postponed.', ['is', 'are', 'were', 'be'], 'is', 'news 是不可数名词，谓语用单数。', 2, 13],
    ['English', 'Reading', "Passage: Many students believe taking notes helps memory, but a recent study shows the real benefit comes from reorganizing information. When students rewrite notes in their own words, they understand the material better.\nQuestion: According to the passage, the main benefit of taking notes is ___.", ['reorganizing information', 'using a pen', 'writing fast', 'staying awake'], 'reorganizing information', '细节题：文中明确指出真正的好处在于 reorganizing information。', 3, 14],
    ['English', 'Reading', "Passage: The library extends its opening hours during the exam period. Students are asked to return all borrowed books by May 30.\nQuestion: What must students do by May 30?", ['Return borrowed books', 'Borrow more books', 'Visit the library', 'Buy new books'], 'Return borrowed books', '细节题：文中要求学生在 5 月 30 日前归还所借图书。', 3, 14],
    ['English', 'Reading', "Passage: Despite the rise of online courses, many learners still prefer face-to-face interaction because it provides immediate feedback. However, cost and distance remain barriers for rural students.\nQuestion: It can be inferred that rural students ___.", ['may find face-to-face courses difficult to access', 'dislike online courses', 'have no cost problems', 'prefer distance learning'], 'may find face-to-face courses difficult to access', '推断题：成本与距离是农村学生的障碍，可推断面对面课程对其不易获取。', 4, 14],
    ['English', 'Writing', 'Which of the following is an appropriate formal expression for a business email?', ['I would like to inform you that...', 'Hey, guess what!', 'U should come', 'Wanna meet?'], 'I would like to inform you that...', '正式邮件应使用完整句式与礼貌措辞，排除口语化表达。', 4, 15],
    ['English', 'Writing', 'Which closing is correct for a formal letter?', ['Yours sincerely', 'Cheers', 'Later', 'Love'], 'Yours sincerely', '正式信函结尾常用 Yours sincerely / Yours faithfully。', 3, 15],
    ['English', 'Writing', 'Which sentence contains a grammatical error?', ['Each of the students have finished.', 'All of the students have finished.', 'The students have all finished.', 'Every student has finished.'], 'Each of the students have finished.', 'Each of + 复数名词 作主语时谓语用单数 has。', 4, 15],
    ['English', 'Vocabulary', 'She showed great ______ in facing the difficulties.', ['courage', 'careful', 'careless', 'courteous'], 'courage', 'show great courage"表现出极大的勇气"；其余词性或语义不符。', 3, 12],
    ['English', 'Grammar', 'Hardly ______ when the phone rang.', ['I had fallen asleep', 'had I fallen asleep', 'I fell asleep', 'I did fall asleep'], 'had I fallen asleep', 'Hardly 置于句首，主句用过去完成时并部分倒装。', 4, 13],
    ['English', 'Reading', "Passage: Cost and distance remain barriers for rural students.\nQuestion: The word \"barriers\" is closest in meaning to ___.", ['obstacles', 'bridges', 'benefits', 'methods'], 'obstacles', '词义题：barriers"障碍"，与 obstacles 同义。', 2, 14],
    ['English', 'Grammar', 'The team ______ working hard on the project this month.', ['is', 'are', 'were', 'has been doing'], 'is', 'team 视为整体（正式用法）用单数；this month 配现在进行时。', 2, 13],
  ];
  const qIds: number[] = [];
  for (const [subject, category, content, options, answer, explanation, difficulty, kpNo] of qData) {
    const [row] = await db.insert(questions).values({
      subject, category, content, options, answer, explanation, difficulty, kpId: kps[kpNo],
    }).returning();
    qIds.push(row.id);
  }
  const qByKp = (kpNo: number) => qData
    .map((q, i) => ({ kpNo: q[7], id: qIds[i] }))
    .filter((x) => x.kpNo === kpNo).map((x) => x.id);

  /* ============ 模块一：学习记录 / 错题本 / 画像 / 目标 ============ */
  const masteryRate: Record<number, number> = {
    1: 0.9, 2: 0.85, 3: 0.6, 4: 0.75, 5: 0.7, 6: 0.35, 7: 0.45,
    8: 0.4, 9: 0.55, 10: 0.3, 11: 0.5,
    12: 0.8, 13: 0.65, 14: 0.45, 15: 0.55,
  };
  const progressRows: Array<{
    userId: string; questionId: number; kpId: number; isCorrect: boolean; duration: number; answeredAt: Date;
  }> = [];
  // 明确薄弱点（确定性：最近记录偏错，体现"正在下降"）
  const forceWeak: Record<number, number> = { 6: 7, 7: 6, 8: 8, 10: 7, 14: 6 }; // kpNo → 错题数
  for (const [kpNo, rate] of Object.entries(masteryRate)) {
    const ids = qByKp(Number(kpNo));
    if (!ids.length) continue;
    const recs: Array<{ questionId: number; kpId: number; isCorrect: boolean; duration: number; answeredAt: Date }> = [];
    for (let i = 0; i < 10; i++) {
      recs.push({
        questionId: ids[Math.floor(rnd() * ids.length)],
        kpId: kps[Number(kpNo)],
        isCorrect: pct(rate),
        duration: 40 + Math.floor(rnd() * 120),
        answeredAt: daysAgo(Math.floor(rnd() * 30), 8 + Math.floor(rnd() * 12)),
      });
    }
    const forced = forceWeak[Number(kpNo)];
    if (forced) {
      recs.sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : -1)); // 新→旧
      recs.forEach((r, i) => (r.isCorrect = i >= forced)); // 最近的 forced 题答错
    }
    for (const r of recs) progressRows.push({ userId: 'jiang2027', ...r });
  }
  // 其他同学少量记录（供协同过滤与班级对比）
  for (const [uid, rates] of [
    ['wang5', { 6: 0.8, 7: 0.75, 14: 0.6 }],
    ['li3', { 6: 0.5, 7: 0.6, 10: 0.7 }],
    ['zhaoliu', { 8: 0.35, 14: 0.35, 15: 0.5 }],
  ] as Array<[string, Record<number, number>]>) {
    for (const [kpNo, rate] of Object.entries(rates)) {
      const ids = qByKp(Number(kpNo));
      for (let i = 0; i < 6; i++) {
        progressRows.push({
          userId: uid,
          questionId: ids[Math.floor(rnd() * ids.length)],
          kpId: kps[Number(kpNo)],
          isCorrect: pct(rate),
          duration: 50 + Math.floor(rnd() * 100),
          answeredAt: daysAgo(Math.floor(rnd() * 14)),
        });
      }
    }
  }
  await db.insert(userProgress).values(progressRows);

  // 错题本：由答错记录归集
  const wrongMap = new Map<number, { count: number; last: Date; kpId: number }>();
  for (const r of progressRows) {
    if (r.userId !== 'jiang2027' || r.isCorrect) continue;
    const cur = wrongMap.get(r.questionId);
    if (cur) {
      cur.count += 1;
      if (r.answeredAt > cur.last) cur.last = r.answeredAt;
    } else {
      wrongMap.set(r.questionId, { count: 1, last: r.answeredAt, kpId: r.kpId });
    }
  }
  const wrongRows = [...wrongMap.entries()].map(([qid, v], i) => ({
    userId: 'jiang2027', questionId: qid, kpId: v.kpId, wrongCount: v.count,
    mastered: i % 4 === 3, lastWrongAt: v.last, updatedAt: v.last,
  }));
  await db.insert(wrongBook).values(wrongRows);

  const weakKpNos = [6, 7, 8, 10, 14];
  await db.insert(userProfiles).values([
    {
      userId: 'jiang2027', name: '江同学', level: 'intermediate', style: 'visual',
      targetUniversity: '西安邮电大学', weakPoints: weakKpNos.map((n) => kps[n]), dailyMinutes: 120,
    },
    { userId: 'wang5', name: '王小羽', level: 'advanced', style: 'auditory', weakPoints: [kps[14]] },
    { userId: 'li3', name: '李明', level: 'intermediate', style: 'kinesthetic', weakPoints: [kps[6], kps[7]] },
    { userId: 'zhaoliu', name: '赵磊', level: 'beginner', style: 'visual', weakPoints: [kps[8], kps[14], kps[15]] },
  ]);

  await db.insert(dailyGoals).values([
    { userId: 'jiang2027', date: new Date().toISOString().slice(0, 10), mathTarget: 15, englishTarget: 20, mathCompleted: 8, englishCompleted: 12 },
    { userId: 'wang5', date: new Date().toISOString().slice(0, 10), mathTarget: 10, englishTarget: 15, mathCompleted: 10, englishCompleted: 6 },
  ]);

  await db.insert(userGoals).values([
    {
      userId: 'jiang2027', title: '2027 数学目标 120 分', targetScore: 120, deadline: '2027-03-20', status: 'active', progress: 35,
      breakdown: [
        { phase: '基础阶段', range: '2026-09 ~ 2026-10', tasks: ['完成极限与导数全部知识点复习', '每日 5 道错题重练', '每周 1 套基础卷'] },
        { phase: '强化阶段', range: '2026-11 ~ 2026-12', tasks: ['二重积分/多元微分专题突破', '每周 2 套专项卷', '每月 1 套全真模考'] },
        { phase: '冲刺阶段', range: '2027-01 ~ 2027-03', tasks: ['每周 2 套历年真题', '错题本清零重练', '每 10 天 1 次全真模拟'] },
      ],
    },
    {
      userId: 'jiang2027', title: '英语阅读正确率提升到 80%', targetScore: 80, deadline: '2026-12-31', status: 'active', progress: 20,
      breakdown: [
        { phase: '基础阶段', range: '2026-09 ~ 2026-10', tasks: ['每日 2 篇阅读理解精读', '每日 20 个高频词汇'] },
        { phase: '强化阶段', range: '2026-11 ~ 2026-12', tasks: ['限时训练（每题 2 分钟内）', '错题归因分析'] },
      ],
    },
    {
      userId: 'wang5', title: '数学目标 130 分', targetScore: 130, deadline: '2027-03-20', status: 'active', progress: 60,
      breakdown: [{ phase: '强化阶段', range: '2026-11 ~ 2026-12', tasks: ['每周 2 套真题', '错题重练'] }],
    },
  ]);

  await db.insert(aiChats).values([
    { userId: 'jiang2027', role: 'user', content: '二重积分老是算错怎么办？', intent: 'diagnosis' },
    { userId: 'jiang2027', role: 'assistant', content: '你的二重积分正确率目前为 35%，主要问题集中在积分区域的确定。建议先复习"画区域→定顺序"三步法，我为你推送了 2 道相关练习。', intent: 'diagnosis' },
  ]);

  // 行为埋点（近 7 天）
  const logRows: Array<{ userId: string; actionType: string; entityId: string | null; meta: any; duration: number | null; createdAt: Date }> = [];
  for (let d = 0; d < 7; d++) {
    logRows.push({ userId: 'jiang2027', actionType: 'login', entityId: null, meta: { device: d % 2 ? 'mobile' : 'web' }, duration: null, createdAt: daysAgo(d, 8) });
    for (let i = 0; i < 4; i++) {
      logRows.push({ userId: 'jiang2027', actionType: 'answer_question', entityId: String(qIds[Math.floor(rnd() * qIds.length)]), meta: null, duration: 60 + Math.floor(rnd() * 120), createdAt: daysAgo(d, 9 + i) });
    }
    logRows.push({ userId: 'jiang2027', actionType: 'view_video', entityId: '1', meta: { position: Math.floor(rnd() * 1800) }, duration: 300 + Math.floor(rnd() * 600), createdAt: daysAgo(d, 14) });
    if (d % 3 === 0) logRows.push({ userId: 'jiang2027', actionType: 'note_add', entityId: '1', meta: null, duration: null, createdAt: daysAgo(d, 15) });
  }
  for (let d = 0; d < 7; d++) {
    logRows.push({ userId: 'wang5', actionType: 'login', entityId: null, meta: null, duration: null, createdAt: daysAgo(d, 10) });
    logRows.push({ userId: 'wang5', actionType: 'answer_question', entityId: String(qIds[Math.floor(rnd() * qIds.length)]), meta: null, duration: 90, createdAt: daysAgo(d, 11) });
  }
  await db.insert(actionLogs).values(logRows);

  /* ============ 模块二：资源库 / 笔记 / 断点续学 ============ */
  const resData: Array<{
    title: string; type: string; subject: string; grade: string | null; difficulty: number;
    tags: string[]; kpId: number | null; description: string; coverColor: string;
    durationSec: number; instructor: string; studentCount: number;
    status: 'draft' | 'pending' | 'published' | 'offline';
  }> = [
    { title: '极限理论精讲：两个重要极限', type: 'video', subject: 'Math', grade: '专升本', difficulty: 2, tags: ['高等数学', '极限', '难度2', '2027考纲'], kpId: kps[1], description: '从数列极限到函数极限，系统讲解两个重要极限及其变形应用。', coverColor: 'from-leaf-500 to-leaf-700', durationSec: 1800, instructor: '张剑峰', studentCount: 1284, status: 'published' },
    { title: '导数与微分：求导法则全梳理', type: 'video', subject: 'Math', grade: '专升本', difficulty: 2, tags: ['高等数学', '导数', '难度2'], kpId: kps[2], description: '基本求导公式、和差积商、复合函数与隐函数求导。', coverColor: 'from-blue-500 to-indigo-600', durationSec: 2100, instructor: '张剑峰', studentCount: 1152, status: 'published' },
    { title: '二重积分三步法（互动课件）', type: 'slide', subject: 'Math', grade: '专升本', difficulty: 4, tags: ['高等数学', '二重积分', '难度4', '专题突破'], kpId: kps[6], description: '画区域、定顺序、算积分——互动课件含 8 道随堂练习。', coverColor: 'from-orange-500 to-amber-600', durationSec: 1500, instructor: '张剑峰', studentCount: 632, status: 'published' },
    { title: '多元函数微分学（虚拟仿真实验）', type: 'lab', subject: 'Math', grade: '专升本', difficulty: 4, tags: ['高等数学', '多元函数', '虚拟仿真'], kpId: kps[7], description: '三维曲面可视化实验：观察偏导数与全微分的几何意义。', coverColor: 'from-violet-500 to-purple-600', durationSec: 2400, instructor: '张剑峰', studentCount: 310, status: 'published' },
    { title: '矩阵与行列式速算技巧', type: 'video', subject: 'Math', grade: '专升本', difficulty: 3, tags: ['线性代数', '矩阵', '难度3'], kpId: kps[8], description: '行列式性质与矩阵运算的高分技巧，含 12 道真题精讲。', coverColor: 'from-cyan-500 to-sky-600', durationSec: 1650, instructor: '张剑峰', studentCount: 876, status: 'published' },
    { title: '高等数学电子教材（2027 版）', type: 'ebook', subject: 'Math', grade: '专升本', difficulty: 3, tags: ['电子教材', '高等数学', '2027考纲'], kpId: null, description: '覆盖 2027 考纲全部高等数学考点的配套电子教材。', coverColor: 'from-slate-600 to-slate-800', durationSec: 0, instructor: '教研组', studentCount: 2100, status: 'published' },
    { title: '核心词汇 List 12-15（300 词）', type: 'video', subject: 'English', grade: '专升本', difficulty: 2, tags: ['英语', '词汇', '难度2'], kpId: kps[12], description: '考纲高频词汇 300 词精讲，含词根词缀记忆法。', coverColor: 'from-rose-500 to-pink-600', durationSec: 1350, instructor: '王琳', studentCount: 1420, status: 'published' },
    { title: '语法专题：虚拟语气全解', type: 'slide', subject: 'English', grade: '专升本', difficulty: 3, tags: ['英语', '语法', '虚拟语气'], kpId: kps[13], description: 'suggest/insist/order 等动词后的虚拟语气，含 20 道辨析题。', coverColor: 'from-fuchsia-500 to-pink-600', durationSec: 1500, instructor: '王琳', studentCount: 980, status: 'published' },
    { title: '阅读理解：主旨题与推断题', type: 'video', subject: 'English', grade: '专升本', difficulty: 3, tags: ['英语', '阅读', '难度3'], kpId: kps[14], description: '四类题型解题策略 + 10 篇真题精析。', coverColor: 'from-leaf-400 to-leaf-600', durationSec: 2000, instructor: '王琳', studentCount: 1105, status: 'published' },
    { title: '应用文写作：邮件模板库', type: 'ebook', subject: 'English', grade: '专升本', difficulty: 4, tags: ['英语', '写作', '模板'], kpId: kps[15], description: '5 类高频应用文模板 + 高级替换句式 60 句。', coverColor: 'from-amber-500 to-orange-600', durationSec: 0, instructor: '王琳', studentCount: 760, status: 'published' },
    { title: '线性方程组与秩（新课·待审）', type: 'video', subject: 'Math', grade: '专升本', difficulty: 3, tags: ['线性代数', '方程组'], kpId: kps[9], description: '高斯消元法与方程组解的判定，待教研组审核后上架。', coverColor: 'from-indigo-500 to-blue-600', durationSec: 1600, instructor: '张剑峰', studentCount: 0, status: 'pending' },
    { title: '空间解析几何入门（草稿）', type: 'video', subject: 'Math', grade: '专升本', difficulty: 2, tags: ['解析几何'], kpId: kps[11], description: '向量运算与平面方程，剪辑中。', coverColor: 'from-gray-500 to-slate-600', durationSec: 1200, instructor: '张剑峰', studentCount: 0, status: 'draft' },
  ];
  const resIds: number[] = [];
  for (const r of resData) {
    const [row] = await db.insert(resources).values({ ...r, coverColor: r.coverColor, reviewedAt: r.status === 'published' ? daysAgo(10) : null, reviewer: r.status === 'published' ? '李志明' : null }).returning();
    resIds.push(row.id);
  }

  await db.insert(resourceNotes).values([
    { userId: 'jiang2027', resourceId: resIds[0], title: '第二个重要极限的变形', content: '(1+1/x)^x → e；(1+a/x)^(bx) → e^(ab)。截图：04:32', positionSec: 272, createdAt: daysAgo(3) },
    { userId: 'jiang2027', resourceId: resIds[0], title: '洛必达适用条件', content: '必须 0/0 或 ∞/∞ 型；求导后极限存在。截图：11:05', positionSec: 665, createdAt: daysAgo(3) },
    { userId: 'jiang2027', resourceId: resIds[2], title: '二重积分易错点', content: '区域画错 → 顺序必错；先画图再定限。截图：08:40', positionSec: 520, createdAt: daysAgo(1) },
  ]);

  await db.insert(courseProgress).values([
    { userId: 'jiang2027', courseId: resIds[0], lastPositionSec: 754, totalSec: 1800, completed: false, synced: false, updatedAt: daysAgo(0, 7) },
    { userId: 'jiang2027', courseId: resIds[6], lastPositionSec: 1350, totalSec: 1350, completed: true, synced: true, updatedAt: daysAgo(2) },
    { userId: 'jiang2027', courseId: resIds[8], lastPositionSec: 980, totalSec: 2000, completed: false, synced: true, updatedAt: daysAgo(1) },
    { userId: 'wang5', courseId: resIds[0], lastPositionSec: 1500, totalSec: 1800, completed: false, synced: true, updatedAt: daysAgo(1) },
  ]);

  /* ============ 模块三：排课 / 考试 / 成绩 / 预警 / 干预 ============ */
  await db.insert(scheduleItems).values([
    { courseTitle: '高等数学·极限与导数', subject: 'Math', teacherName: '张剑峰', dayOfWeek: 1, startTime: '08:00', endTime: '10:00', room: 'A-101', status: 'confirmed' },
    { courseTitle: '英语·核心词汇', subject: 'English', teacherName: '王琳', dayOfWeek: 1, startTime: '14:00', endTime: '16:00', room: 'B-203', status: 'confirmed' },
    { courseTitle: '高等数学·积分学专题', subject: 'Math', teacherName: '张剑峰', dayOfWeek: 3, startTime: '10:00', endTime: '12:00', room: 'A-101', status: 'confirmed' },
    { courseTitle: '英语·阅读理解', subject: 'English', teacherName: '王琳', dayOfWeek: 3, startTime: '14:00', endTime: '16:00', room: 'B-203', status: 'confirmed' },
    { courseTitle: '线性代数冲刺', subject: 'Math', teacherName: '张剑峰', dayOfWeek: 5, startTime: '19:00', endTime: '21:00', room: 'A-102', status: 'pending' },
    { courseTitle: '英语·应用文写作', subject: 'English', teacherName: '王琳', dayOfWeek: 6, startTime: '09:00', endTime: '11:00', room: 'B-105', status: 'confirmed' },
  ]);

  const [exam1] = await db.insert(exams).values({
    title: '2027 届第一次全真模拟·数学', subject: 'Math', durationMin: 120, mode: 'random',
    config: { count: 10, difficulty: 3, subject: 'Math' }, status: 'archived',
    antiCheat: { shuffle: true, fullscreen: true, timerLock: true, antiCopy: true },
    createdAt: daysAgo(25),
  }).returning();
  const [exam2] = await db.insert(exams).values({
    title: '2027 届第二次全真模拟·数学', subject: 'Math', durationMin: 120, mode: 'random',
    config: { count: 10, difficulty: 3, subject: 'Math' }, status: 'published',
    antiCheat: { shuffle: true, fullscreen: true, timerLock: true, antiCopy: false },
    createdAt: daysAgo(6),
  }).returning();
  const [exam3] = await db.insert(exams).values({
    title: '英语综合模拟卷', subject: 'English', durationMin: 100, mode: 'random',
    config: { count: 10, difficulty: 2, subject: 'English' }, status: 'published',
    antiCheat: { shuffle: true, fullscreen: false, timerLock: true, antiCopy: true },
    createdAt: daysAgo(4),
  }).returning();
  await db.insert(exams).values({
    title: '二重积分专项测试', subject: 'Math', durationMin: 30, mode: 'fixed',
    config: { count: 2, difficulty: 4, subject: 'Math' }, questionIds: [qIds[12], qIds[13]], status: 'draft',
    antiCheat: { shuffle: false, fullscreen: false, timerLock: false, antiCopy: false },
    createdAt: daysAgo(2),
  });

  await db.insert(examResults).values([
    { examId: exam1.id, userId: 'jiang2027', studentName: '江同学', score: 85, maxScore: 100, durationSec: 5400, details: null, submittedAt: daysAgo(22) },
    { examId: exam2.id, userId: 'jiang2027', studentName: '江同学', score: 68, maxScore: 100, durationSec: 5900, details: null, submittedAt: daysAgo(3) },
    { examId: exam3.id, userId: 'jiang2027', studentName: '江同学', score: 72, maxScore: 100, durationSec: 4800, details: null, submittedAt: daysAgo(2) },
    { examId: exam1.id, userId: 'wang5', studentName: '王小羽', score: 92, maxScore: 100, durationSec: 4200, details: null, submittedAt: daysAgo(22) },
    { examId: exam2.id, userId: 'wang5', studentName: '王小羽', score: 88, maxScore: 100, durationSec: 4500, details: null, submittedAt: daysAgo(3) },
    { examId: exam1.id, userId: 'li3', studentName: '李明', score: 78, maxScore: 100, durationSec: 6200, details: null, submittedAt: daysAgo(22) },
    { examId: exam2.id, userId: 'li3', studentName: '李明', score: 70, maxScore: 100, durationSec: 6500, details: null, submittedAt: daysAgo(3) },
    { examId: exam2.id, userId: 'zhaoliu', studentName: '赵磊', score: 45, maxScore: 100, durationSec: 7000, details: null, submittedAt: daysAgo(3) },
  ]);

  const gradeStudents = [
    ['jiang2027', '江同学', 86, 78], ['wang5', '王小羽', 92, 88], ['li3', '李明', 80, 74],
    ['zhaoliu', '赵磊', 52, 61], ['sun7', '孙丽', 75, 82], ['zhao8', '赵刚', 68, 70],
    ['qiu9', '邱悦', 88, 79], ['ma10', '马宁', 60, 55],
  ] as const;
  const allUsers = await db.select().from(users);
  const gradeRows: Array<{ studentId: string; studentName: string; orgId: number; subject: string; examName: string; score: number; maxScore: number; term: string }> = [];
  for (const [sid, name, math, eng] of gradeStudents) {
    const u = allUsers.find((x: any) => x.id === sid);
    gradeRows.push(
      { studentId: sid, studentName: name, orgId: (u as any)?.orgId ?? orgMain.id, subject: 'Math', examName: '第二次全真模拟', score: math, maxScore: 150, term: '2026 秋' },
      { studentId: sid, studentName: name, orgId: (u as any)?.orgId ?? orgMain.id, subject: 'English', examName: '英语综合模拟', score: eng, maxScore: 150, term: '2026 秋' },
    );
  }
  await db.insert(grades).values(gradeRows);

  await db.insert(interventionRules).values([
    { type: 'inactive', name: '长期未登录预警', enabled: true, config: { days: 7 }, action: { remind: true, notifyTeacher: true, pushContent: '推送「极限理论」回看微课' } },
    { type: 'score_drop', name: '成绩骤降预警', enabled: true, config: { minDrop: 15 }, action: { remind: false, notifyTeacher: true, pushContent: '推送诊断测试与薄弱点报告' } },
    { type: 'low_accuracy', name: '正确率过低预警', enabled: true, config: { threshold: 50, window: '7d' }, action: { remind: true, notifyTeacher: false, pushContent: '推送错题重练计划' } },
    { type: 'missed_exam', name: '考试缺考预警', enabled: true, config: {}, action: { remind: true, notifyTeacher: true, pushContent: '推送补考安排说明' } },
  ]);

  await db.insert(alerts).values([
    { userId: 'jiang2027', studentName: '江同学', type: 'score_drop', level: 'high', message: '数学模考成绩由 85 分降至 68 分（降幅 17 分）', status: 'pending', actions: [], createdAt: daysAgo(3) },
    { userId: 'zhaoliu', studentName: '赵磊', type: 'low_accuracy', level: 'medium', message: '近 7 天答题正确率仅 45%，低于预警阈值 50%', status: 'pending', actions: [], createdAt: daysAgo(1) },
    { userId: 'chenqi', studentName: '陈倩', type: 'inactive', level: 'high', message: '已连续 7 天未登录平台', status: 'pending', actions: [], createdAt: daysAgo(1) },
    { userId: 'wang5', studentName: '王小羽', type: 'missed_exam', level: 'low', message: '未参加「英语综合模拟卷」考试', status: 'handled', actions: ['消息提醒', '教师已通知'], createdAt: daysAgo(5), handledAt: daysAgo(4) },
  ]);

  /* ============ 模块四：讨论区 / 消息 / 学习小组 ============ */
  const [p1] = await db.insert(posts).values({
    userId: 'jiang2027', userName: '江同学', title: '二重积分的积分区域老是画错，有什么好方法吗？',
    content: '每次换序积分就容易把上下限搞混，大家有什么画区域的技巧？求分享！',
    category: 'math', createdAt: daysAgo(2),
  }).returning();
  const [p2] = await db.insert(posts).values({
    userId: 'wang5', userName: '王小羽', title: '我的 30 天冲刺计划，需要的自取',
    content: '按知识点拆成了 6 个模块，每天 4h：上午高数专题 + 下午英语阅读 + 晚上错题重练。模板已整理好，评论区自取。',
    category: 'study', createdAt: daysAgo(4),
  }).returning();
  const [p3] = await db.insert(posts).values({
    userId: 'zhaoliu', userName: '赵磊', title: 'suggest 从句的虚拟语气到底怎么看？',
    content: 'suggest 表示"建议"用虚拟语气，表示"暗示"用陈述语气，做题时怎么快速判断？',
    category: 'english', createdAt: daysAgo(1),
  }).returning();
  const [p4] = await db.insert(posts).values({
    userId: 'chenqi', userName: '陈倩', title: '高频词汇记忆：我用词根词缀法一周背了 300 词',
    content: '分享我的记忆方法：先拆词根（如 spect=看），再挂词缀，最后造一个生活化的句子。附上我的词根表。',
    category: 'share', createdAt: daysAgo(5),
  }).returning();

  await db.insert(replies).values([
    { postId: p1.id, userId: 'wang5', userName: '王小羽', content: '同问！我之前也是靠硬算，后来老师教了"先画区域、再定顺序"三步法，好很多。', createdAt: daysAgo(2) },
    { postId: p1.id, userId: 'teacher-zhang', userName: '张剑峰', content: '@江同学 记住口诀：先画边界曲线，标出交点，然后用水平/竖直试探线确定积分限。本周三 10:00 的积分专题课会专门讲这个，记得来。', createdAt: daysAgo(1) },
    { postId: p3.id, userId: 'teacher-wang', userName: '王琳', content: '看主句时态和动词的"建议/暗示"语义。suggest 表建议 → 从句 (should) + 原形；表暗示 → 正常时态。周六写作课有 20 道辨析题。', createdAt: hoursAgo(20) },
    { postId: p4.id, userId: 'jiang2027', userName: '江同学', content: '词根表能发我一份吗？', createdAt: daysAgo(4) },
    { postId: p2.id, userId: 'li3', userName: '李明', content: '已取！第 4 周的安排和我撞车了，我调整了一下。', createdAt: daysAgo(3) },
  ]);

  await db.insert(postLikes).values([
    { postId: p1.id, userId: 'wang5' }, { postId: p1.id, userId: 'li3' }, { postId: p1.id, userId: 'zhaoliu' },
    { postId: p2.id, userId: 'jiang2027' }, { postId: p2.id, userId: 'li3' }, { postId: p2.id, userId: 'sun7' },
    { postId: p4.id, userId: 'jiang2027' }, { postId: p4.id, userId: 'wang5' },
  ]);
  // 更新点赞/回帖计数
  for (const p of [p1, p2, p3, p4]) {
    const [likeCount] = await db.select({ c: sql`count(*)` }).from(postLikes).where(eq(postLikes.postId, p.id));
    const [replyCount] = await db.select({ c: sql`count(*)` }).from(replies).where(eq(replies.postId, p.id));
    await db.update(posts).set({ likeCount: Number(likeCount.c), replyCount: Number(replyCount.c) }).where(eq(posts.id, p.id));
  }

  await db.insert(postReports).values([
    { postId: p3.id, userId: 'zhao8', reason: '疑似课程广告引流', status: 'pending', createdAt: hoursAgo(6) },
  ]);

  await db.insert(messages).values([
    { senderId: 'jiang2027', receiverId: 'teacher-zhang', content: '张教授您好，二重积分的换序我还有点迷糊，能帮我看看吗？', isRead: true, createdAt: daysAgo(2, 10) },
    { senderId: 'teacher-zhang', receiverId: 'jiang2027', content: '好的，你把区域图画一下发我。记住先标交点，再判断哪条是上界。', isRead: true, createdAt: daysAgo(2, 11) },
    { senderId: 'jiang2027', receiverId: 'teacher-zhang', content: '好的，我画了，周三课上再向您请教。', isRead: true, createdAt: daysAgo(2, 12) },
    { senderId: 'teacher-zhang', receiverId: 'jiang2027', content: '收到。另外模考数学降分明显，我已给你推送了二重积分专项测试，记得完成。', isRead: false, createdAt: hoursAgo(5) },
    { senderId: 'jiang2027', receiverId: 'teacher-wang', content: '王老师好，应用文模板库的邮件开头可以换更正式的表达吗？', isRead: true, createdAt: daysAgo(1, 16) },
    { senderId: 'teacher-wang', receiverId: 'jiang2027', content: '可以，把 "I am writing to tell you" 换成 "I am writing to inform you"，语气更正式。', isRead: false, createdAt: hoursAgo(30) },
  ]);

  const [g1] = await db.insert(groups).values({
    name: '专升本2027·数学冲刺群', description: '高数 & 线代互助，每日打卡', ownerName: '江同学', memberCount: 12,
    notice: '每晚 21:00 打卡：今日完成题数 + 一个知识点小结。', createdAt: daysAgo(30),
  }).returning();
  const [g2] = await db.insert(groups).values({
    name: '英语作文互改小组', description: '每周两篇作文互评', ownerName: '赵磊', memberCount: 8,
    notice: '周五前提交作文，周一互评反馈。', createdAt: daysAgo(20),
  }).returning();

  await db.insert(groupNotes).values([
    { groupId: g1.id, title: '二重积分公式汇总', content: '1) ∬_D f(x,y)dA 直角坐标下先 y 后 x：∫dx∫f dy\n2) 交换积分次序先画图\n3) 常用：∬_D dA = 区域面积', authorName: '王小羽', createdAt: daysAgo(3) },
    { groupId: g1.id, title: '矩阵常见错误清单', content: '· AB ≠ BA\n· (AB)′ = B′A′\n· |kA| = kⁿ|A|（n 阶）\n· A⁻¹ 存在 ⇔ |A|≠0', authorName: '江同学', createdAt: daysAgo(6) },
    { groupId: g2.id, title: '应用文邮件模板合集', content: '开头：I am writing to inform you that...\n结尾：Yours sincerely, [Name]\n高级替换：tell→inform, get→obtain, want→desire', authorName: '赵磊', createdAt: daysAgo(4) },
  ]);

  await db.insert(groupTasks).values([
    { groupId: g1.id, title: '整理近五年二重积分真题', assignee: '王小羽', dueDate: '2026-09-05', status: 'doing', createdAt: daysAgo(4) },
    { groupId: g1.id, title: '制作极限速查卡片', assignee: '江同学', dueDate: '2026-09-01', status: 'done', createdAt: daysAgo(8) },
    { groupId: g1.id, title: '线性代数章节思维导图', assignee: '李明', dueDate: '2026-09-10', status: 'todo', createdAt: daysAgo(2) },
    { groupId: g2.id, title: '本周作文互改（第 3 周）', assignee: '全员', dueDate: '2026-09-04', status: 'todo', createdAt: daysAgo(1) },
  ]);

  /* ============ 模块五：通知 ============ */
  await db.insert(notifications).values([
    { userId: 'jiang2027', type: 'alert', title: '学情预警：成绩骤降', content: '数学模考成绩由 85 分降至 68 分，建议完成二重积分专项测试。', isRead: false, createdAt: daysAgo(3) },
    { userId: 'jiang2027', type: 'course', title: '排课提醒', content: '本周三 10:00-12:00「高等数学·积分学专题」A-101（张剑峰）。', isRead: false, createdAt: hoursAgo(26) },
    { userId: 'jiang2027', type: 'system', title: '平台公告', content: '2027 考纲更新：二重积分与多元微分权重上调，已同步到你的学习路径。', isRead: true, createdAt: daysAgo(6) },
    { userId: 'jiang2027', type: 'message', title: '张剑峰 给你发来新消息', content: '收到。另外模考数学降分明显，我已给你推送了二重积分专项测试，记得完成。', isRead: false, createdAt: hoursAgo(5) },
  ]);

  console.log('Seeding finished.');
}

// 辅助：小时前
function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600000);
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
