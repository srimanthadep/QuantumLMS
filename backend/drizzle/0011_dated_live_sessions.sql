CREATE TABLE "lms"."schedule_exceptions" (
	"occurrence_key" text PRIMARY KEY NOT NULL,
	"rule_id" text,
	"session_id" text NOT NULL,
	"action" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"reason" text NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms"."schedule_rule_versions" (
	"rule_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_rule_versions_rule_id_version_pk" PRIMARY KEY("rule_id","version")
);
--> statement-breakpoint
CREATE TABLE "lms"."schedule_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"timezone" text NOT NULL,
	"weekdays" integer[] NOT NULL,
	"local_start" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"title" text NOT NULL,
	"teacher_id" uuid,
	"provider" text NOT NULL,
	"join_url" text,
	"host_url" text,
	"passcode" text,
	"active" boolean DEFAULT true NOT NULL,
	"generated_version" integer DEFAULT 0 NOT NULL,
	"generation_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_duration" CHECK ("lms"."schedule_rules"."duration_minutes">0 and "lms"."schedule_rules"."duration_minutes"<=720)
);
--> statement-breakpoint
CREATE TABLE "lms"."session_attendance" (
	"session_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"join_clicks" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "session_attendance_session_id_student_id_pk" PRIMARY KEY("session_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "default_host_url" text;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "default_passcode" text;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD COLUMN "schedule_rule_id" text;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD COLUMN "schedule_version" integer;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD COLUMN "local_date" text;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD COLUMN "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_rule_id_schedule_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "lms"."schedule_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "lms"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."schedule_rule_versions" ADD CONSTRAINT "schedule_rule_versions_rule_id_schedule_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "lms"."schedule_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."schedule_rule_versions" ADD CONSTRAINT "schedule_rule_versions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."schedule_rules" ADD CONSTRAINT "schedule_rules_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."schedule_rules" ADD CONSTRAINT "schedule_rules_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."session_attendance" ADD CONSTRAINT "session_attendance_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "lms"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."session_attendance" ADD CONSTRAINT "session_attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_batch_idx" ON "lms"."schedule_rules" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "lms"."session_attendance" USING btree ("student_id");--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD CONSTRAINT "live_sessions_schedule_rule_id_schedule_rules_id_fk" FOREIGN KEY ("schedule_rule_id") REFERENCES "lms"."schedule_rules"("id") ON DELETE no action ON UPDATE no action;