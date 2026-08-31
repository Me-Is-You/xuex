# 学学 2027 Pro · 智能化备考平台

基于 **Next.js 16 (App Router) + PostgreSQL (Drizzle ORM)** 的一体化智能学习平台，覆盖智能学习体验、内容生态、数据驱动教学管理、互动协作与平台基础能力五大模块。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（自动检测 PostgreSQL；若 .pgdata 不存在会自动初始化嵌入式 PG）
npm run db:setup        # 或手动：npx tsx seed.ts 完成建表+造数

# 3. 启动开发服务器（0.0.0.0:3000，自动注册每日 0 点资源同步调度器）
npm run dev

# 4.（可选）手动触发一轮资源同步 / 自愈巡检
curl -X POST -H "X-User-Id: admin-li" -H "Content-Type: application/json" -d '{"force":true}' http://localhost:3000/api/resources/sync
curl -X POST -H "X-User-Id: admin-li" -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/selfheal
```

演示账号在右上角「角色切换」中提供：

| 账号 | 角色 | 首页 |
| --- | --- | --- |
| jiang2027 | 学生（主校区·专升本） | /dashboard |
| wang5 / li3 / zhaoliu … | 学生（不同画像） | /dashboard |
| teacher-zhang / teacher-wang | 教师 | /dashboard |
| admin-li | 管理员 | /dashboard/admin |
| parent-jiang | 家长 | /dashboard |

---

## 开发点 → 实现对照

### 一、智能学习体验模块

| 开发点 | 实现 |
| --- | --- |
| 用户画像建模 | `user_profiles`（学科偏好/难度偏好/活跃时段/目标分）+ `/api/profile`；练习、答题、资源学习行为实时回写画像（`src/lib/ai.ts` `updateProfile`） |
| AI 推荐引擎（协同过滤/深度学习） | `src/lib/recommend.ts`：行为协同（同画像学生近期学什么）+ 内容协同（知识点关联）+ 画像匹配加权评分；`/api/recommend` 输出推荐理由（`reasons` 字段前端展示） |
| 动态学习计划 | `/api/recommend?daily` 每日任务；goals 自动拆解（见下）驱动阶段计划 |
| 学习目标设定 + 自动拆解 | `user_goals` + `/api/goals`：设定目标（描述/目标分/截止日）→ 服务端按剩余天数自动拆解「基础→强化→冲刺」三阶段任务（<60 天仅冲刺）；`/dashboard/goals` 支持暂停/恢复/完成流转 |
| 知识图谱构建 | `knowledge_points`（树形父节点）+ `kg_edges`（前置/关联边）；`/api/knowledge-graph` 提供 nodes+edges；`/dashboard/graph` 可视化（径向分区布局）+ 编辑器（增删改查节点、连边、级联删边） |
| 薄弱点定位 | `src/lib/mastery.ts` 掌握度模型：按答题正确率×难度加权滚动更新 0–100 掌握度，分级 mastered/learning/weak；`/api/mastery` + `/dashboard/analytics` 雷达图 + 薄弱点清单 |
| 自适应测评引擎 | `/api/recommend/adaptive`：按当前难度取题，客户端按最近 5 题正确率动态 ±1 调整难度（≥80% 升、≤40% 降），`/dashboard/practice` 的「自适应测评」模式实时显示难度调节提示 |
| 可视化学情报告 | `/dashboard/analytics`：掌握度雷达图（SVG）、每日正确率/学习时长趋势曲线、学科分布、导出 CSV（`src/lib/csv.ts`） |
| AI 助教 7×24 | `/api/ai/chat`：基于知识点/题库上下文的意图识别（解题/概念/规划/闲聊意图分类）+ 多轮记忆（会话内上下文窗口）+ 卡片式回答（知识点卡片/题目卡片）；`/dashboard/ai-tutor` |
| 智能批改（主观/客观） | `/api/ai/grade`：客观题精确匹配；主观题按「关键词覆盖度 + 步骤完整性 + 语义相似度」打 0–100 并输出逐点评语 |
| 错题本 | 答题/考试判错自动归集 `wrong_book`（含错因、当时作答、知识点）；`/api/wrongbook` 按知识点/学科/状态筛选；重练（重新作答并回写掌握度）；相似题推荐（同知识点 +3 / 同学科 +1 评分）；`/dashboard/error-book` |

### 二、内容生态模块

| 开发点 | 实现 |
| --- | --- |
| 多模态资源（视频/课件/教材/虚拟仿真） | `resources` 四种 `type`（video/slide/ebook/lab）+ 封面色/难度/适用年级；`/dashboard/courses` 资源中心 |
| 微课 + 系统课 | 课程粒度（12–1800s 微课到系统长课）；系统课带章节进度（`course_progress`） |
| AI 自动标注标签 | `/api/resources` POST 上传时调用 `aiTag()`（按标题/描述/知识点抽取标签，规则引擎模拟 LLM 标注）；`tags` jsonb 存储并在卡片展示 |
| 全文检索 | `/api/resources?keyword=` 对 title/description/tags/knowledge_points 多字段 LIKE 检索；资源中心搜索框 350ms 防抖 |
| 统一播放器（倍速/笔记/截图/字幕） | `/dashboard/courses/[id]`：模拟播放器（进度条/倍速 0.75×–2×/全屏/字幕开关/截图标记）、随视频时间轴记录笔记、进度每 10s + 卸载时上报 |
| 断点续学 | `course_progress` 存储 lastPositionSec/totalSec/completed；进入课程自动检测 >30s 断点并提示「继续学习」；离线状态降级（`navigator.onLine` 徽标，恢复后同步） |
| 知识图谱体系（前置/后续/扩展关联推荐） | `kg_edges` relation ∈ {prerequisite, related}；`/api/related-kps?kpId=` 返回前置/后续/扩展节点；学习页与推荐引擎消费该数据 |

### 三、数据驱动教学管理模块

| 开发点 | 实现 |
| --- | --- |
| 埋点采集 | `/api/track`（页面停留/按钮点击/播放事件）写入 `behavior_logs`；前端关键交互埋点 |
| 数据仪表盘（班级/个人对比/趋势/分布） | `/api/stats/overview`（全校大盘）、`/api/stats/class?subject=`（班级对比：人均正确率/时长/趋势）；`/dashboard/admin` 学情总览 Tab + 教师视角班级看板 |
| 学习预警引擎（规则/模型） | `src/lib/alerts.ts` 多规则引擎：连续答错、正确率骤降（考试间对比）、学习断档（N 天未登录）、目标差距预警；阈值 `intervention_rules` 可配；命中写入 `learning_alerts` 并推送 `notifications` |
| 干预策略管理 | `/api/intervention-rules`（启用/停用/调阈值）+ 预警中心处置动作（提醒学生/通知教师/推送补偿内容/忽略），处置记录回写 |
| 课程管理（上下架/权限） | `/api/resources/manage`：审核上架(published)/下架(offline)/版本升级+变更说明；管理员资源 Tab 审核流（pending→published） |
| 排课（手动+自动+冲突检测） | `/api/schedules` 手动排课（同教师/同教室同时段 → 409 冲突明细）；`/api/schedules/auto` 贪心自动排课（周一至周六候选时段扫描，跳过冲突）；`/dashboard/admin` 排课系统 Tab（周视图） |
| 考试管理（固定卷/随机组卷/防作弊） | `exams` 两种模式：fixed（手选题）/ random（config 按学科抽题、每次打乱）；防作弊 `antiCheat`（题目乱序/全屏/计时锁定/禁复制）；`/api/exams` 草稿→发布→归档状态流 + 交卷自动判分 + 成绩/错题落库 |
| 成绩管理（录入/统计/排名/导出） | `/api/grades`（按学科/校区过滤）、`/api/grades/stats`（均分/最高/最低/人数/排名/分数段分布）、`/api/grades/export`（CSV 下载，手机号脱敏）；考试交卷自动写入成绩 |
| 资源库（上传/审核/版本） | 见「课程管理」；资源 Tab 含状态/版本筛选、审核通过/驳回、版本升级 |

### 四、互动与协作模块

| 开发点 | 实现 |
| --- | --- |
| 响应式 | Tailwind 移动优先栅格；侧边栏移动端收起；全页面 320px–1440px 适配 |
| 跨端同步 | 统一 REST 接口 + `X-User-Id` 会话；任意端刷新即同步（演示态：角色切换即换身份） |
| 离线缓存 / 断点续学 | 播放器离线徽标降级 + 在线恢复同步；课程进度本地先存后上报（unmount flush） |
| 讨论区（发帖/回帖/点赞/举报） | `posts` + `/api/posts`（发帖/回帖/点赞/举报审核流）；`/dashboard/community`（学科分类、热帖、举报处理入口） |
| 实时消息（一对一/群聊） | `/api/messages`（私聊会话 + 群聊房间）；`/dashboard/messages`（会话列表/未读/在线状态模拟） |
| 学习小组 | `groups` + `/api/groups`：小组笔记共享、任务看板（任务创建/认领/完成）；`/dashboard/community` 小组 Tab |
| 直播（弹幕/连麦/签到/投票） | `/dashboard/live`：直播模拟（播放态）、弹幕流、连麦申请、签到码校验、投票（实时计票条） |

### 五、平台基础能力

| 开发点 | 实现 |
| --- | --- |
| 多角色管理 | `users.role` ∈ student/teacher/admin/parent + `ROLE_HOME` 角色首页；右上角全局角色切换器 |
| 菜单/按钮/数据级权限 | 侧边栏按角色过滤菜单；按钮级：管理功能仅 admin 可见；数据级：教师仅本校区/本人班级数据（`?orgId=` 过滤）、学生仅本人数据（`currentUserId` 强制隔离） |
| 多校区机构层级树 | `orgs`（主校区→北/南校区）+ `/api/orgs` 树形接口；用户/成绩/资源均挂 `orgId`，管理员可按校区过滤 |
| 高并发 | Next.js 流式 SSR + API 路由无状态化；列表接口索引化查询（user_id/kp_id 索引）；前端防抖/批量埋点 |
| 数据安全（脱敏/加密/审计日志） | `maskPhone()` 展示层脱敏（成绩导出同样脱敏）；`behavior_logs` 审计（登录/关键操作/数据访问）；`/dashboard/settings` 操作日志 Tab |
| 微服务可扩展 | 按领域划分 API 路由域（learning / interaction / admin）；`src/lib` 领域库独立（mastery/recommend/alerts/ai/csv/sync/selfheal），可平滑拆分为独立服务；Drizzle schema 按域组织 |
| 每日智能资源同步 | 自研采集管线，每日 00:00 自动执行（见下节）：参数化题库生成 + 全网公开资源采集 → 转换 → 去重 → 质检 → 入库 |
| 模块级自愈能力 | 自研自愈引擎：11 个模块各一套自愈算法，检测 → 安全修复 → 审计留痕（见下节） |

---

## 每日 0 点智能资源同步算法（自研）

**目标**：每天 0 点自动遍历资源（本地参数化题库 + 全网公开数据源），转换为平台所需格式（题目/资源卡），保证「每天练习都有新题」。

**管线七阶段**（`src/lib/sync/pipeline.ts`）：

```
发现 → 抓取/生成 → 转换 → 去重 → 质检 → 入库 → 留痕
```

| 阶段 | 实现 | 设计要点 |
| --- | --- | --- |
| 发现 | 数据源注册表：`parametric-corpus`（12 个题型家族）+ `npm-registry`（大数据生态）+ `github-search`（专升本公开资料库） | 源可插拔，新增源 = 加一个 adapter |
| 抓取/生成 | 生成器用 **mulberry32 确定性随机源**，种子 = f(日期, 家族, 序号) | **可复现**：同一天跑 N 次结果一致；跨天种子变化 → 每日全新 |
| 转换 | 归一化到平台 schema（学科/知识点 kpId/难度/四选项/解析）；web 源 → 资源卡（title/tags/url/描述） | 题目挂 kp 供推荐引擎消费；资源卡走审核流 |
| 去重 | 精确：FNV-1a 内容哈希；近似：字符 6-gram 集合 **Jaccard ≥ 0.85**（仅比对最近 300 题） | 批内去重防同批重复；样本窗口化 → **数据量翻倍成本不敏感（可扩展）** |
| 质检 | 四维评分：可答性 50 + 解析完备 20 + 知识点挂载 15 + 难度合法 15，**< 70 拒收**并记录拒因 | **有效/可解释**：每次拒收都有理由，报告可见 |
| 入库 | 题目 `source='sync'` 直接生效（每日新题立即可练）；资源卡 `status='pending'` 进管理员审核流 | 内容安全：web 来源不绕过审核 |
| 留痕 | `sync_runs` 记录每次运行的来源健康状态/生成/去重/拒收/入库计数 | **可审计**：管理台「资源同步」Tab 展示历史与源健康 |

**调度**（两种等价方式）：
- 进程内：`src/instrumentation.ts` → `startDailyScheduler()` 在 Next 服务启动时对齐**下一个本地 00:00** setTimeout 触发，完成后自滚动跨天；
- 生产 cron：`0 0 * * * npm run sync:daily`（`scripts/sync-daily.ts`，同一管线）。
- 幂等：20 小时内已成功 → 自动跳过（防重复入库）；手动触发 `POST /api/resources/sync {force:true}` 可强制。

**鲁棒性（降级设计）**：web 源超时（8s）/网络不可达/限流 → 该源标记 `degraded/failed`，**本地参数化生成器兜底**，管线不中断；单包/单仓库抓取失败不影响整源。

**题目质量（可解释）**：12 个数学题型家族全部可闭式验算（极限/导数/定积分/二重积分/行列式/方程组/特征值/级数 + 英语阅读/应用文/词汇/语法），入库题 26/26 通过独立重算验证。

## 11 模块自研自愈引擎（自研）

**设计**（`src/lib/selfheal.ts`）：`检测 → 修复（仅安全操作）→ 留痕`。全部操作幂等、可重复执行；每次巡检写 `self_heal_events` 审计表（模块/检测数/修复数/动作/明细）。

| 模块 | 自愈算法 | 修复动作 |
| --- | --- | --- |
| 1 智能学习体验 | 用户画像完整性 | 有学习记录但无画像 → 按行为数据补建画像 |
| 2 智能诊断与评估 | 答题记录知识点回填 | `user_progress.kpId` 缺失 → 从题目回填（掌握度聚合依赖） |
| 3 智能辅导与答疑 | 考试答卷痕迹补全 | 交卷记录中缺失的逐题学习记录 → 补写（画像不丢样本） |
| 4 内容生态 | 题库库存 + 标签补全 | 知识点库存 <4 题 → 日期种子生成补题；资源无标签 → 关键词补标注 |
| 5 知识图谱 | 悬空边/重边清理 | 端点已删的边 → 清除；同端点同关系重复边 → 去重 |
| 6 学情数据分析 | 预警对账 | 指向不存在用户的预警 → 关闭；30 天以上 pending → 降级关闭 |
| 7 教学管理 | 课表冲突消解 | 历史重叠课 → 平移至最近无冲突时段（复用排课时段搜索） |
| 8 多端协同 | 断点进度校准 | 进度 > 总时长 → 截断；总时长丢失 → 按进度回填 |
| 9 互动与协作 | 举报去重 + 孤儿回帖 | 同人同帖重复举报 → resolve 冗余；帖已删的回帖 → 清除 |
| 10 用户权限 | 归属与角色合法性 | `orgId` 缺失 → 挂主校区（防数据越权）；非法 role → 回退 student |
| 11 系统能力 | 孤儿数据 + 保留策略 | 错题本孤儿行清理；90 天已读通知 / 180 天行为日志归档清理 |

**触发**：① 每日 0 点资源同步后自动全模块巡检；② 管理台「自愈中心」一键全量/单模块执行。
**单检查器异常不中断整体巡检**（try/catch 隔离 + 事件表记录 error）。

## 14 项设计原则落地对照

| 原则 | 落地 |
| --- | --- |
| 有效 | 掌握度/推荐/预警全部有指标闭环：正确率→掌握度→薄弱点→推题→重练→再测；同步/自愈均输出计数报告 |
| 创新 | 参数化「每日新题」引擎（日期种子确定性生成）+ 11 模块自愈引擎 + 质检门控的采集管线 |
| 简单 | 管线七阶段单向流动；自愈 = 检测/修复/留痕三段式；无额外中间件，PG 单库 |
| 可复现 | 生成器种子 = f(日期, 家族, 序号)，同天结果恒定；去重/质检规则全部阈值化、代码可见 |
| 可落地 | 全栈 Next.js 16 + PG，`npm run dev` 即跑；cron/instrumentation 双调度方式；web 源离线可降级 |
| 可解释 | 推荐输出 `reasons`；质检拒收带拒因；自愈事件审计表含明细；题目答案可闭式验算 |
| 鲁棒 | web 源降级兜底；单检查器/单源/单题异常隔离；数据脏了自愈算法自动修复（进度截断、孤儿清理等） |
| 高效 | 去重只扫最近 300 题窗口；指纹用 FNV-1a + 6-gram 集合；列表接口索引化查询；8s 抓取超时 |
| 可扩展 | 数据源可插拔（加 adapter 即加源）；自愈检查器数组式注册（加一个对象即加一个算法）；样本窗口化成本恒定 |
| 可维护 | 领域库按模块拆分（sync/selfheal/mastery/recommend/alerts）；README 开发点逐条对照；tsc/eslint 零错误门槛 |
| 公平 | 推荐按个体画像个性化，无群体特征入模；题目生成参数空间对所有学生无差别 |
| 合规 | 手机号脱敏；web 资源走人工审核流后才上架；操作日志/自愈事件/同步记录全留痕可审计 |
| 业务对齐 | 一切指标服务于「提分」：薄弱点→定向推题→错题重练→掌握度回升；采题保证每日有新题可练 |
| 持续迭代 | 题库家族/数据源/自愈检查器均为注册表扩展点；`sync_runs`/`self_heal_events` 为迭代提供基线数据 |

---

## 架构

```
src/
├── app/
│   ├── layout.tsx              # 全局布局（UserProvider + Toast）
│   ├── page.tsx                # 落地页
│   ├── dashboard/              # 15 个业务页面（学生/教师/管理员/家长共用，按角色裁剪）
│   └── api/                    # 29 个 API 域（Next Route Handlers，全动态）
├── db/
│   ├── schema.ts               # 30 张表（drizzle-orm → PostgreSQL）
│   └── index.ts                # 连接池
├── lib/
│   ├── ai.ts                   # 意图识别 / 主观题批改 / 画像更新 / 自动标注
│   ├── alerts.ts               # 学习预警规则引擎
│   ├── mastery.ts              # 掌握度模型（正确率×难度加权）
│   ├── recommend.ts            # 推荐引擎（行为+内容协同过滤）
│   ├── selfheal.ts             # 11 模块自愈引擎（检测→修复→留痕）
│   ├── sync/                   # 每日智能资源同步（corpus 参数化题库 / web 采集适配器 / pipeline 七阶段管线 / scheduler 每日 0 点调度）
│   └── csv.ts / client.ts      # 导出脱敏 / 前端 API 封装
├── instrumentation.ts          # Next 启动钩子：注册每日 0 点资源同步调度器
├── scripts/sync-daily.ts       # 生产 cron 入口（与进程内调度同一管线）
└── seed.ts                     # 演示数据（多用户画像/图谱/题库/考试/小组…，可重复执行）
```

**关键流程**

- **练习闭环**：取题（每日/智能推题/自适应/专项）→ 作答 → `/api/progress` 写学习记录 + 更新画像 + 判错归集错题本 → 掌握度滚动更新 → 影响后续推荐。
- **考试闭环**：草稿组卷（固定手选 / 随机配置）→ 发布 → 学生取题（防作弊策略生效）→ 交卷自动判分 → 成绩/排名/分布统计 + 错题归集 + 成绩骤降触发预警。
- **预警闭环**：规则引擎扫描（答错/骤降/断档/目标差距）→ 生成预警 + 站内通知 → 管理员/教师处置（提醒/通知/推送补偿内容/忽略）→ 干预规则阈值可调。
- **每日新题闭环**：00:00 调度触发 → 参数化生成（日期种子）+ 全网采集 → 去重（FNV-1a + Jaccard）→ 质检门（<70 拒收）→ 题目即生效/资源卡待审核 → `sync_runs` 留痕 → 自动 11 模块自愈巡检。
- **自愈闭环**：巡检 11 模块检查器 → 检测数据漂移（画像缺失/kpId 悬空/库存不足/课表冲突/进度越界/孤儿数据…）→ 仅执行安全修复 → `self_heal_events` 审计留痕 → 管理台「自愈中心」可视化。

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://postgres@127.0.0.1:5432/app_db` |
| `PG_DATA_DIR` | 嵌入式 PG 数据目录 | `./.pgdata` |
| `NODE_EXTRA_CA_CERTS` | 企业网络/TLS 拦截环境下，挂载系统 CA 库使 web 采集源的 Node fetch 可用（curl 可用而 Node 报证书错误时设置） | 不设（公共 CA 环境无需） |
| `SKIP_SCHEDULER` | 设为任意值禁用进程内每日调度（多实例部署时用 cron 单点执行） | 不设 |

## 每日 0 点任务（部署）

```bash
# 方式一：应用进程内调度（默认开启，instrumentation 自动注册）
npm run dev

# 方式二：系统 cron 单点执行（推荐多实例生产环境，配合 SKIP_SCHEDULER=1）
0 0 * * * cd /path/to/xuex && npm run sync:daily >> /var/log/xuex-sync.log 2>&1
```

同步完成后自动执行 11 模块自愈巡检；管理台「资源同步」「自愈中心」两个 Tab 可查看运行报告与审计事件。
