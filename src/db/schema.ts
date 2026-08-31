import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/* =====================================================================
 * 模块一：智能学习体验 —— 题库 / 知识点 / 学习记录 / 画像 / 目标 / AI 对话
 * ===================================================================== */

// 题目表
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  subject: varchar('subject', { length: 50 }).notNull(), // 'Math' | 'English'
  category: varchar('category', { length: 100 }).notNull(), // e.g., 'Calculus', 'Grammar'
  content: text('content').notNull(),
  options: jsonb('options').notNull(), // Array of strings
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  difficulty: integer('difficulty').default(1).notNull(), // 1-5
  kpId: integer('kp_id'), // 关联知识点
  source: varchar('source', { length: 20 }).default('manual'), // manual | ai
  status: varchar('status', { length: 20 }).default('active'), // active | archived
  createdAt: timestamp('created_at').defaultNow(),
});

// 知识点表（学科知识图谱节点）
export const knowledgePoints = pgTable('knowledge_points', {
  id: serial('id').primaryKey(),
  subject: varchar('subject', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parentId: integer('parent_id'), // 树形结构父节点
  importance: integer('importance').default(1).notNull(), // 重要程度 1-5
  examFreq: integer('exam_freq').default(50).notNull(), // 历年真题出现频率 0-100
  createdAt: timestamp('created_at').defaultNow(),
});

// 知识点关系边（有向图：prerequisite 前置 / related 相关扩展）
export const kpEdges = pgTable('kp_edges', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').notNull().references(() => knowledgePoints.id),
  targetId: integer('target_id').notNull().references(() => knowledgePoints.id),
  relation: varchar('relation', { length: 20 }).notNull().default('prerequisite'), // prerequisite | related
  createdAt: timestamp('created_at').defaultNow(),
});

// 答题记录（含知识点冗余字段，便于聚合）
export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  questionId: integer('question_id').references(() => questions.id),
  kpId: integer('kp_id'), // 冗余：知识点掌握度聚合
  isCorrect: boolean('is_correct').notNull(),
  duration: integer('duration').default(0), // 秒
  answeredAt: timestamp('answered_at').defaultNow(),
});

// 每日目标
export const dailyGoals = pgTable('daily_goals', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  mathTarget: integer('math_target').default(10),
  englishTarget: integer('english_target').default(20),
  mathCompleted: integer('math_completed').default(0),
  englishCompleted: integer('english_completed').default(0),
});

// 错题本
export const wrongBook = pgTable('wrong_book', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  questionId: integer('question_id').notNull().references(() => questions.id),
  kpId: integer('kp_id'),
  wrongCount: integer('wrong_count').default(1).notNull(),
  mastered: boolean('mastered').default(false).notNull(),
  lastWrongAt: timestamp('last_wrong_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 学习进度 / 断点续学 / 多端同步
export const courseProgress = pgTable('course_progress', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  courseId: integer('course_id').notNull(), // 关联 resources.id
  lastPositionSec: integer('last_position_sec').default(0).notNull(),
  totalSec: integer('total_sec').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  synced: boolean('synced').default(true).notNull(), // 离线缓存是否已同步
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 学习目标（含系统自动拆解的阶段任务）
export const userGoals = pgTable('user_goals', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  title: text('title').notNull(),
  targetScore: integer('target_score'), // 目标分数
  deadline: date('deadline'),
  status: varchar('status', { length: 20 }).default('active'), // active | paused | done
  breakdown: jsonb('breakdown').notNull(), // [{phase, range, tasks:[...]}]
  progress: integer('progress').default(0), // 0-100
  createdAt: timestamp('created_at').defaultNow(),
});

// 用户画像与偏好
export const userProfiles = pgTable('user_profiles', {
  userId: varchar('user_id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 50 }),
  level: varchar('level', { length: 20 }).default('beginner'), // beginner | intermediate | advanced
  style: varchar('style', { length: 20 }).default('visual'), // visual | auditory | kinesthetic
  targetUniversity: varchar('target_university', { length: 255 }),
  weakPoints: jsonb('weak_points').default([]), // 薄弱知识点ID数组（系统维护）
  dailyMinutes: integer('daily_minutes').default(120),
  notifyReminder: boolean('notify_reminder').default(true),
});

// AI 助教对话记录（多轮上下文）
export const aiChats = pgTable('ai_chats', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  role: varchar('role', { length: 10 }).notNull(), // user | assistant
  content: text('content').notNull(),
  intent: varchar('intent', { length: 40 }), // NLU 识别意图
  createdAt: timestamp('created_at').defaultNow(),
});

// 行为埋点日志
export const actionLogs = pgTable('action_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(), // view_video / answer_question / login / ...
  entityId: varchar('entity_id', { length: 50 }),
  meta: jsonb('meta'),
  duration: integer('duration'), // 单位：秒
  createdAt: timestamp('created_at').defaultNow(),
});

/* =====================================================================
 * 模块二：内容生态 —— 资源库 / 课程 / 资源笔记
 * ===================================================================== */

// 学习资源（视频 / 课件 / 电子教材 / 虚拟仿真）
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(), // video | slide | ebook | lab
  subject: varchar('subject', { length: 50 }).notNull(),
  grade: varchar('grade', { length: 30 }), // 适用年级
  difficulty: integer('difficulty').default(1), // 1-5
  tags: jsonb('tags').default([]), // AI 智能标注：学科/知识点/难度/年级等
  kpId: integer('kp_id').references(() => knowledgePoints.id),
  description: text('description'),
  url: text('url'),
  coverColor: varchar('cover_color', { length: 30 }).default('from-leaf-500 to-leaf-800'),
  durationSec: integer('duration_sec').default(0),
  instructor: varchar('instructor', { length: 100 }),
  studentCount: integer('student_count').default(0),
  status: varchar('status', { length: 20 }).default('published'), // draft | pending | published | offline
  version: integer('version').default(1),
  reviewer: varchar('reviewer', { length: 100 }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 资源笔记（播放器截图笔记 / 课堂笔记）
export const resourceNotes = pgTable('resource_notes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  resourceId: integer('resource_id').references(() => resources.id),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  positionSec: integer('position_sec').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/* =====================================================================
 * 模块三：数据驱动教学管理 —— 排课 / 考试 / 成绩 / 预警 / 干预
 * ===================================================================== */

// 排课表
export const scheduleItems = pgTable('schedule_items', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id'),
  courseTitle: varchar('course_title', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  teacherName: varchar('teacher_name', { length: 100 }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 1-7
  startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 5 }).notNull(),
  room: varchar('room', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('confirmed'), // confirmed | pending
  createdAt: timestamp('created_at').defaultNow(),
});

// 试卷
export const exams = pgTable('exams', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  durationMin: integer('duration_min').default(120),
  mode: varchar('mode', { length: 20 }).default('random'), // fixed | random
  config: jsonb('config').notNull(), // { count, difficulty, kpIds }
  questionIds: jsonb('question_ids'), // 固定卷题目ID
  status: varchar('status', { length: 20 }).default('draft'), // draft | published | archived
  antiCheat: jsonb('anti_cheat').default({}), // { shuffle, fullscreen, timerLock, antiCopy }
  createdAt: timestamp('created_at').defaultNow(),
});

// 考试结果
export const examResults = pgTable('exam_results', {
  id: serial('id').primaryKey(),
  examId: integer('exam_id').references(() => exams.id),
  userId: varchar('user_id', { length: 255 }).notNull(),
  studentName: varchar('student_name', { length: 50 }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  durationSec: integer('duration_sec'),
  details: jsonb('details'), // [{questionId, isCorrect}]
  submittedAt: timestamp('submitted_at').defaultNow(),
});

// 成绩管理
export const grades = pgTable('grades', {
  id: serial('id').primaryKey(),
  studentId: varchar('student_id', { length: 255 }).notNull(),
  studentName: varchar('student_name', { length: 50 }).notNull(),
  orgId: integer('org_id'),
  subject: varchar('subject', { length: 50 }).notNull(),
  examName: varchar('exam_name', { length: 255 }).notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').default(150),
  term: varchar('term', { length: 30 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 学情预警
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  studentName: varchar('student_name', { length: 50 }),
  type: varchar('type', { length: 30 }).notNull(), // inactive | score_drop | low_accuracy | missed_exam
  level: varchar('level', { length: 10 }).notNull(), // low | medium | high
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending | handled | ignored
  actions: jsonb('actions').default([]), // 已执行干预动作
  createdAt: timestamp('created_at').defaultNow(),
  handledAt: timestamp('handled_at'),
});

// 干预策略
export const interventionRules = pgTable('intervention_rules', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 30 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  config: jsonb('config').notNull(), // 规则参数
  action: jsonb('action').notNull(), // 触发动作 { remind, notifyTeacher, pushContent }
  updatedAt: timestamp('updated_at').defaultNow(),
});

/* =====================================================================
 * 模块四：互动与协作 —— 讨论区 / 消息 / 学习小组
 * ===================================================================== */

// 讨论帖
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  userName: varchar('user_name', { length: 50 }).default('匿名用户'),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).default('general'),
  courseId: integer('course_id'),
  likeCount: integer('like_count').default(0),
  replyCount: integer('reply_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 回帖
export const replies = pgTable('replies', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  userName: varchar('user_name', { length: 50 }).default('匿名用户'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 点赞（一人一点）
export const postLikes = pgTable('post_likes', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [uniqueIndex('post_likes_uidx').on(t.postId, t.userId)]);

// 举报
export const postReports = pgTable('post_reports', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending | resolved
  createdAt: timestamp('created_at').defaultNow(),
});

// 站内信 / 即时消息（师生一对一）
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: varchar('sender_id', { length: 255 }).notNull(),
  receiverId: varchar('receiver_id', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 学习小组
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  ownerName: varchar('owner_name', { length: 50 }),
  memberCount: integer('member_count').default(1),
  notice: text('notice'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 小组共享笔记
export const groupNotes = pgTable('group_notes', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => groups.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  authorName: varchar('author_name', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 小组协作任务
export const groupTasks = pgTable('group_tasks', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => groups.id),
  title: text('title').notNull(),
  assignee: varchar('assignee', { length: 50 }),
  dueDate: date('due_date'),
  status: varchar('status', { length: 20 }).default('todo'), // todo | doing | done
  createdAt: timestamp('created_at').defaultNow(),
});

/* =====================================================================
 * 模块五：平台基础能力 —— 用户 / 角色 / 机构 / 通知
 * ===================================================================== */

// 机构（多校区层级树）
export const orgs = pgTable('orgs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: integer('parent_id'),
  type: varchar('type', { length: 20 }).default('branch'), // main | branch
  createdAt: timestamp('created_at').defaultNow(),
});

// 用户与角色
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // 业务ID，如 jiang2027
  name: varchar('name', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 20 }).notNull(), // student | teacher | admin | parent
  orgId: integer('org_id').references(() => orgs.id),
  major: varchar('major', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 通知
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 30 }).default('system'), // system | alert | message | course
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

/* =====================================================================
 * 模块五附加：智能资源同步 + 自愈引擎
 * ===================================================================== */

// 资源同步运行记录（每日 0 点智能采集：发现→抓取→转换→去重→质检→入库）
export const syncRuns = pgTable('sync_runs', {
  id: serial('id').primaryKey(),
  runAt: timestamp('run_at').defaultNow(),
  trigger: varchar('trigger', { length: 20 }).default('cron'), // cron | manual
  durationMs: integer('duration_ms').default(0),
  sources: jsonb('sources').notNull(), // [{id,name,kind,status,generated,deduped,rejected,ingested,error?}]
  generated: integer('generated').default(0),
  deduped: integer('deduped').default(0),
  rejected: integer('rejected').default(0),
  ingestedQuestions: integer('ingested_questions').default(0),
  ingestedResources: integer('ingested_resources').default(0),
  error: text('error'),
});

// 自愈事件审计（11 模块自愈算法执行留痕：检测→修复→记录，可解释可追溯）
export const selfHealEvents = pgTable('self_heal_events', {
  id: serial('id').primaryKey(),
  module: varchar('module', { length: 40 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  level: varchar('level', { length: 10 }).default('info'), // info | warn
  detected: integer('detected').default(0),
  repaired: integer('repaired').default(0),
  action: text('action'),
  detail: jsonb('detail').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
