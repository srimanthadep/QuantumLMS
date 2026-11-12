CREATE TABLE "lms"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms"."batch_teachers" (
	"batch_id" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batch_teachers_batch_id_teacher_id_pk" PRIMARY KEY("batch_id","teacher_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."course_teachers" (
	"course_id" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_teachers_course_id_teacher_id_pk" PRIMARY KEY("course_id","teacher_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."upload_intents" (
	"key" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"content_type" text NOT NULL,
	"expected_bytes" bigint NOT NULL,
	"max_bytes" bigint NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_intent_state" CHECK ("lms"."upload_intents"."state" in ('pending','verified','quarantined'))
);
--> statement-breakpoint
ALTER TABLE "lms"."audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."batch_teachers" ADD CONSTRAINT "batch_teachers_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."batch_teachers" ADD CONSTRAINT "batch_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_teachers" ADD CONSTRAINT "course_teachers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_teachers" ADD CONSTRAINT "course_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."upload_intents" ADD CONSTRAINT "upload_intents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_time_idx" ON "lms"."audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "batch_teachers_teacher_idx" ON "lms"."batch_teachers" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "course_teachers_teacher_idx" ON "lms"."course_teachers" USING btree ("teacher_id");