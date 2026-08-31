import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  subject: varchar('subject', { length: 50 }).notNull(), // 'Math' | 'English'
  category: varchar('category', { length: 100 }).notNull(), // e.g., 'Calculus', 'Grammar'
  content: text('content').notNull(),
  options: jsonb('options').notNull(), // Array of strings or objects
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  difficulty: integer('difficulty').default(1), // 1-5
  createdAt: timestamp('created_at').defaultNow(),
});

export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  questionId: integer('question_id').references(() => questions.id),
  isCorrect: boolean('is_correct').notNull(),
  answeredAt: timestamp('answered_at').defaultNow(),
});

export const dailyGoals = pgTable('daily_goals', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  mathTarget: integer('math_target').default(10),
  englishTarget: integer('english_target').default(20),
  mathCompleted: integer('math_completed').default(0),
  englishCompleted: integer('english_completed').default(0),
});

// 新增：知识点表
export const knowledgePoints = pgTable('knowledge_points', {
  id: serial('id').primaryKey(),
  subject: varchar('subject', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parentId: integer('parent_id'), // 用于树形结构
  importance: integer('importance').default(1), // 重要程度 1-5
});

// 新增：课程资源表
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'video', 'pdf', 'interactive'
  subject: varchar('subject', { length: 50 }).notNull(),
  url: text('url'),
  coverUrl: text('cover_url'),
  kpId: integer('kp_id').references(() => knowledgePoints.id), // 关联知识点
  createdAt: timestamp('created_at').defaultNow(),
});

// 新增：讨论帖表
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().default('guest'),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).default('general'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 新增：用户画像与偏好
export const userProfiles = pgTable('user_profiles', {
  userId: varchar('user_id', { length: 255 }).primaryKey(),
  level: varchar('level', { length: 20 }).default('beginner'), // beginner, intermediate, advanced
  style: varchar('style', { length: 20 }).default('visual'), // visual, auditory, kinesthetic
  targetUniversity: varchar('target_university', { length: 255 }),
  weakPoints: jsonb('weak_points').default([]), // 存储薄弱知识点ID数组
});

// 新增：行为埋点日志
export const actionLogs = pgTable('action_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'view_video', 'answer_question', 'login'
  entityId: varchar('entity_id', { length: 50 }),
  duration: integer('duration'), // 单位：秒
  createdAt: timestamp('created_at').defaultNow(),
});

// 新增：即时消息
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: varchar('sender_id', { length: 255 }).notNull(),
  receiverId: varchar('receiver_id', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 新增：考试卷管理
export const exams = pgTable('exams', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  duration: integer('duration'), // 分钟
  config: jsonb('config').notNull(), // { random: boolean, count: number, difficulty: number }
  createdAt: timestamp('created_at').defaultNow(),
});
