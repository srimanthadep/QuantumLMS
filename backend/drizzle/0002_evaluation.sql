CREATE TABLE "lms"."evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"evaluator_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"private_note" text DEFAULT '' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluated_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "evaluations_submission_id_key" UNIQUE("submission_id"),
	CONSTRAINT "evaluations_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'evaluated'::text, 'released'::text])),
	CONSTRAINT "evaluations_scores_check" CHECK ((jsonb_typeof(scores) = 'object'::text) AND (pg_column_size(scores) < 32768)),
	CONSTRAINT "evaluations_total_check" CHECK (total >= 0),
	CONSTRAINT "evaluations_feedback_check" CHECK (char_length(feedback) <= 4000),
	CONSTRAINT "evaluations_private_note_check" CHECK (char_length(private_note) <= 2000),
	CONSTRAINT "evaluations_check" CHECK (((status = 'draft'::text) OR (evaluated_at IS NOT NULL)) AND ((status <> 'released'::text) OR (released_at IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "lms"."evaluator_assignments" (
	"evaluator_id" uuid NOT NULL,
	"assignment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluator_assignments_pkey" PRIMARY KEY("evaluator_id","assignment_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."evaluator_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Evaluator' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"specializations" text[] DEFAULT '{}'::text[] NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluator_profiles_title_check" CHECK ((char_length(title) >= 1) AND (char_length(title) <= 120)),
	CONSTRAINT "evaluator_profiles_department_check" CHECK (char_length(department) <= 160),
	CONSTRAINT "evaluator_profiles_specializations_check" CHECK (cardinality(specializations) <= 12),
	CONSTRAINT "evaluator_profiles_preferences_check" CHECK ((jsonb_typeof(preferences) = 'object'::text) AND (pg_column_size(preferences) < 4096))
);
--> statement-breakpoint
CREATE TABLE "lms"."reevaluation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"original_score" integer NOT NULL,
	"revised_score" integer,
	"resolution" text,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "reevaluation_requests_submission_id_key" UNIQUE("submission_id"),
	CONSTRAINT "reevaluation_requests_status_check" CHECK (status = ANY (ARRAY['Pending'::text, 'In Review'::text, 'Revised'::text, 'Upheld'::text])),
	CONSTRAINT "reevaluation_requests_reason_check" CHECK ((char_length(reason) >= 20) AND (char_length(reason) <= 1000)),
	CONSTRAINT "reevaluation_requests_resolution_check" CHECK (char_length(resolution) <= 2000),
	CONSTRAINT "reevaluation_requests_scores_check" CHECK ((original_score >= 0) AND ((revised_score IS NULL) OR (revised_score >= 0))),
	CONSTRAINT "reevaluation_requests_check" CHECK (((status = ANY (ARRAY['Pending'::text, 'In Review'::text])) AND (resolved_at IS NULL) AND (revised_score IS NULL)) OR ((status = 'Upheld'::text) AND (resolved_at IS NOT NULL) AND (resolution IS NOT NULL) AND (revised_score IS NULL)) OR ((status = 'Revised'::text) AND (resolved_at IS NOT NULL) AND (resolution IS NOT NULL) AND (revised_score IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "lms"."rubric_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"rubric_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"max_points" integer NOT NULL,
	"levels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "rubric_criteria_rubric_id_position_key" UNIQUE("rubric_id","position"),
	CONSTRAINT "rubric_criteria_max_points_check" CHECK ((max_points > 0) AND (max_points <= 1000)),
	CONSTRAINT "rubric_criteria_levels_check" CHECK (jsonb_typeof(levels) = 'array'::text)
);
--> statement-breakpoint
CREATE TABLE "lms"."rubrics" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"title" text NOT NULL,
	"version" text DEFAULT 'v1' NOT NULL,
	"guidance" text DEFAULT '' NOT NULL,
	CONSTRAINT "rubrics_assignment_id_key" UNIQUE("assignment_id")
);
--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" DROP CONSTRAINT "assignment_submissions_status_check";--> statement-breakpoint
ALTER TABLE "lms"."evaluations" ADD CONSTRAINT "evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "lms"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "lms"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."evaluator_profiles" ADD CONSTRAINT "evaluator_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."reevaluation_requests" ADD CONSTRAINT "reevaluation_requests_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "lms"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."reevaluation_requests" ADD CONSTRAINT "reevaluation_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."reevaluation_requests" ADD CONSTRAINT "reevaluation_requests_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."rubric_criteria" ADD CONSTRAINT "rubric_criteria_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "lms"."rubrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."rubrics" ADD CONSTRAINT "rubrics_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "lms"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluations_evaluator_idx" ON "lms"."evaluations" USING btree ("evaluator_id","status");--> statement-breakpoint
CREATE INDEX "evaluator_assignments_assignment_idx" ON "lms"."evaluator_assignments" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "reevaluation_requests_status_idx" ON "lms"."reevaluation_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reevaluation_requests_student_idx" ON "lms"."reevaluation_requests" USING btree ("student_id");--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_status_check" CHECK (status = ANY (ARRAY['Submitted'::text, 'Under Review'::text, 'Graded'::text]));