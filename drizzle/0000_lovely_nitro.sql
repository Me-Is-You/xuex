CREATE TABLE "action_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"entity_id" varchar(50),
	"meta" jsonb,
	"duration" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"role" varchar(10) NOT NULL,
	"content" text NOT NULL,
	"intent" varchar(40),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"student_name" varchar(50),
	"type" varchar(30) NOT NULL,
	"level" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"actions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"handled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "course_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"course_id" integer NOT NULL,
	"last_position_sec" integer DEFAULT 0 NOT NULL,
	"total_sec" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"synced" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"date" varchar(10) NOT NULL,
	"math_target" integer DEFAULT 10,
	"english_target" integer DEFAULT 20,
	"math_completed" integer DEFAULT 0,
	"english_completed" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "exam_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer,
	"user_id" varchar(255) NOT NULL,
	"student_name" varchar(50),
	"score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"duration_sec" integer,
	"details" jsonb,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject" varchar(50) NOT NULL,
	"duration_min" integer DEFAULT 120,
	"mode" varchar(20) DEFAULT 'random',
	"config" jsonb NOT NULL,
	"question_ids" jsonb,
	"status" varchar(20) DEFAULT 'draft',
	"anti_cheat" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar(255) NOT NULL,
	"student_name" varchar(50) NOT NULL,
	"org_id" integer,
	"subject" varchar(50) NOT NULL,
	"exam_name" varchar(255) NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer DEFAULT 150,
	"term" varchar(30),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"author_name" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" text NOT NULL,
	"assignee" varchar(50),
	"due_date" date,
	"status" varchar(20) DEFAULT 'todo',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"owner_name" varchar(50),
	"member_count" integer DEFAULT 1,
	"notice" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intervention_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"action" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parent_id" integer,
	"importance" integer DEFAULT 1 NOT NULL,
	"exam_freq" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kp_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"relation" varchar(20) DEFAULT 'prerequisite' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"receiver_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(30) DEFAULT 'system',
	"title" varchar(255) NOT NULL,
	"content" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" integer,
	"type" varchar(20) DEFAULT 'branch',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"user_name" varchar(50) DEFAULT '匿名用户',
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"course_id" integer,
	"like_count" integer DEFAULT 0,
	"reply_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer" text NOT NULL,
	"explanation" text,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"kp_id" integer,
	"source" varchar(20) DEFAULT 'manual',
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"user_name" varchar(50) DEFAULT '匿名用户',
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"resource_id" integer,
	"title" varchar(255),
	"content" text NOT NULL,
	"position_sec" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(30) NOT NULL,
	"subject" varchar(50) NOT NULL,
	"grade" varchar(30),
	"difficulty" integer DEFAULT 1,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"kp_id" integer,
	"description" text,
	"url" text,
	"cover_color" varchar(30) DEFAULT 'from-leaf-500 to-leaf-800',
	"duration_sec" integer DEFAULT 0,
	"instructor" varchar(100),
	"student_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'published',
	"version" integer DEFAULT 1,
	"reviewer" varchar(100),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer,
	"course_title" varchar(255) NOT NULL,
	"subject" varchar(50) NOT NULL,
	"teacher_name" varchar(100) NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"room" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'confirmed',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "self_heal_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" varchar(40) NOT NULL,
	"name" varchar(100) NOT NULL,
	"level" varchar(10) DEFAULT 'info',
	"detected" integer DEFAULT 0,
	"repaired" integer DEFAULT 0,
	"action" text,
	"detail" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_at" timestamp DEFAULT now(),
	"trigger" varchar(20) DEFAULT 'cron',
	"duration_ms" integer DEFAULT 0,
	"sources" jsonb NOT NULL,
	"generated" integer DEFAULT 0,
	"deduped" integer DEFAULT 0,
	"rejected" integer DEFAULT 0,
	"ingested_questions" integer DEFAULT 0,
	"ingested_resources" integer DEFAULT 0,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "user_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"title" text NOT NULL,
	"target_score" integer,
	"deadline" date,
	"status" varchar(20) DEFAULT 'active',
	"breakdown" jsonb NOT NULL,
	"progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(50),
	"level" varchar(20) DEFAULT 'beginner',
	"style" varchar(20) DEFAULT 'visual',
	"target_university" varchar(255),
	"weak_points" jsonb DEFAULT '[]'::jsonb,
	"daily_minutes" integer DEFAULT 120,
	"notify_reminder" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"question_id" integer,
	"kp_id" integer,
	"is_correct" boolean NOT NULL,
	"duration" integer DEFAULT 0,
	"answered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"phone" varchar(20),
	"role" varchar(20) NOT NULL,
	"org_id" integer,
	"major" varchar(100),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wrong_book" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) DEFAULT 'guest' NOT NULL,
	"question_id" integer NOT NULL,
	"kp_id" integer,
	"wrong_count" integer DEFAULT 1 NOT NULL,
	"mastered" boolean DEFAULT false NOT NULL,
	"last_wrong_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_notes" ADD CONSTRAINT "group_notes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tasks" ADD CONSTRAINT "group_tasks_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kp_edges" ADD CONSTRAINT "kp_edges_source_id_knowledge_points_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kp_edges" ADD CONSTRAINT "kp_edges_target_id_knowledge_points_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_kp_id_knowledge_points_id_fk" FOREIGN KEY ("kp_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wrong_book" ADD CONSTRAINT "wrong_book_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_likes_uidx" ON "post_likes" USING btree ("post_id","user_id");