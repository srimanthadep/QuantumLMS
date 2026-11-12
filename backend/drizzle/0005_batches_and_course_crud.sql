CREATE TABLE "lms"."batch_students" (
	"batch_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batch_students_pkey" PRIMARY KEY("batch_id","student_id"),
	CONSTRAINT "batch_students_status_check" CHECK (status = ANY (ARRAY['Active'::text, 'Waitlisted'::text, 'Completed'::text, 'Paused'::text, 'At Risk'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."cohort_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"course_id" text NOT NULL,
	"instructor" text NOT NULL,
	"instructor_avatar" text DEFAULT '' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"schedule" text DEFAULT 'Mon, Wed, Fri · 7:30 PM - 9:30 PM' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"max_seats" integer DEFAULT 100 NOT NULL,
	"delivery_mode" text DEFAULT 'Live + Replay' NOT NULL,
	"replay_delay_hours" integer DEFAULT 2 NOT NULL,
	"access_expiry_months" integer DEFAULT 24 NOT NULL,
	"meeting_url" text,
	"features" jsonb DEFAULT '{"liveChat":true,"doubtClearing":true,"aiTutor":true,"certificate":true}'::jsonb NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohort_batches_name_check" CHECK ((char_length(name) >= 2) AND (char_length(name) <= 150)),
	CONSTRAINT "cohort_batches_max_seats_check" CHECK (max_seats > 0),
	CONSTRAINT "cohort_batches_delivery_mode_check" CHECK (delivery_mode = ANY (ARRAY['Live + Replay'::text, 'Replay Only'::text, 'Self-Paced'::text])),
	CONSTRAINT "cohort_batches_replay_delay_check" CHECK (replay_delay_hours >= 0),
	CONSTRAINT "cohort_batches_access_expiry_check" CHECK (access_expiry_months >= 0),
	CONSTRAINT "cohort_batches_meeting_url_check" CHECK ((meeting_url IS NULL) OR (meeting_url ~ '^https?://'::text)),
	CONSTRAINT "cohort_batches_features_check" CHECK (jsonb_typeof(features) = 'object'::text),
	CONSTRAINT "cohort_batches_status_check" CHECK (status = ANY (ARRAY['Active'::text, 'Upcoming'::text, 'Completed'::text, 'Archived'::text]))
);
--> statement-breakpoint
ALTER TABLE "lms"."courses" ADD COLUMN "price" integer DEFAULT 39999 NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."courses" ADD COLUMN "capacity" integer DEFAULT 250 NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."courses" ADD COLUMN "status" text DEFAULT 'Published' NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."batch_students" ADD CONSTRAINT "batch_students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."batch_students" ADD CONSTRAINT "batch_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "cohort_batches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_students_student_idx" ON "lms"."batch_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "cohort_batches_course_idx" ON "lms"."cohort_batches" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "cohort_batches_position_idx" ON "lms"."cohort_batches" USING btree ("position","created_at");--> statement-breakpoint
ALTER TABLE "lms"."courses" ADD CONSTRAINT "courses_price_check" CHECK (price >= 0);--> statement-breakpoint
ALTER TABLE "lms"."courses" ADD CONSTRAINT "courses_capacity_check" CHECK (capacity > 0);--> statement-breakpoint
ALTER TABLE "lms"."courses" ADD CONSTRAINT "courses_status_check" CHECK (status = ANY (ARRAY['Published'::text, 'Draft'::text, 'Archived'::text]));