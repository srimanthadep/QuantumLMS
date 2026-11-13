CREATE TABLE "lms"."assessment_definition_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_definition_version_key" UNIQUE("definition_id","version")
);
--> statement-breakpoint
CREATE TABLE "lms"."assessment_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_definition_kind" CHECK ("lms"."assessment_definitions"."kind" in ('quiz','assignment')),
	CONSTRAINT "assessment_definition_status" CHECK ("lms"."assessment_definitions"."status" in ('Draft','Published','Archived'))
);
--> statement-breakpoint
CREATE TABLE "lms"."assessment_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid,
	"definition_version" integer,
	"course_id" text NOT NULL,
	"batch_id" text,
	"offer_id" text,
	"context" text NOT NULL,
	"title" text NOT NULL,
	"quiz_id" text,
	"assignment_id" text,
	"required" boolean DEFAULT true NOT NULL,
	"passing_pct" integer DEFAULT 40 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"available_from" timestamp with time zone,
	"due_at" timestamp with time zone,
	"days_after_enrollment" integer,
	"status" text DEFAULT 'Published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_offering_quiz_key" UNIQUE("quiz_id"),
	CONSTRAINT "assessment_offering_assignment_key" UNIQUE("assignment_id"),
	CONSTRAINT "assessment_offering_instance" CHECK (("lms"."assessment_offerings"."quiz_id" is not null)::int + ("lms"."assessment_offerings"."assignment_id" is not null)::int = 1),
	CONSTRAINT "assessment_offering_context" CHECK (("lms"."assessment_offerings"."context"='batch' and "lms"."assessment_offerings"."batch_id" is not null and "lms"."assessment_offerings"."offer_id" is null) or ("lms"."assessment_offerings"."context"='self_paced' and "lms"."assessment_offerings"."offer_id" is not null and "lms"."assessment_offerings"."batch_id" is null) or ("lms"."assessment_offerings"."context"='legacy' and "lms"."assessment_offerings"."offer_id" is null and "lms"."assessment_offerings"."batch_id" is null)),
	CONSTRAINT "assessment_offering_limits" CHECK ("lms"."assessment_offerings"."passing_pct" between 0 and 100 and "lms"."assessment_offerings"."max_attempts" between 1 and 20 and ("lms"."assessment_offerings"."days_after_enrollment" is null or "lms"."assessment_offerings"."days_after_enrollment" between 1 and 3650)),
	CONSTRAINT "assessment_offering_status" CHECK ("lms"."assessment_offerings"."status" in ('Published','Archived'))
);
--> statement-breakpoint
CREATE TABLE "lms"."completion_checks" (
	"student_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"requested_version" integer DEFAULT 1 NOT NULL,
	"processed_version" integer DEFAULT 0 NOT NULL,
	"error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "completion_checks_student_id_course_id_pk" PRIMARY KEY("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."completion_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"completion_id" uuid,
	"student_id" uuid NOT NULL,
	"course_id" text,
	"credential_id" text NOT NULL,
	"title" text NOT NULL,
	"course_title" text NOT NULL,
	"grade" text DEFAULT 'Completed' NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"replaces_id" uuid,
	"issue_reason" text DEFAULT 'Policy satisfied' NOT NULL,
	CONSTRAINT "completion_credential_identifier_key" UNIQUE("credential_id"),
	CONSTRAINT "completion_credential_completion_key" UNIQUE("completion_id"),
	CONSTRAINT "completion_credential_replaces_key" UNIQUE("replaces_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."completion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"completion_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "completion_event_kind_key" UNIQUE("completion_id","kind")
);
--> statement-breakpoint
CREATE TABLE "lms"."completion_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"context_key" text NOT NULL,
	"version" integer NOT NULL,
	"rules" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "completion_policy_version_key" UNIQUE("context_key","version")
);
--> statement-breakpoint
CREATE TABLE "lms"."completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"context_key" text NOT NULL,
	"batch_id" text,
	"offer_id" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"policy_id" uuid NOT NULL,
	"policy_snapshot" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "completion_student_context_revision_key" UNIQUE("student_id","context_key","revision")
);
--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" DROP CONSTRAINT "assignment_submissions_student_id_assignment_id_key";--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" ADD COLUMN "attempt_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."assessment_definition_versions" ADD CONSTRAINT "assessment_definition_versions_definition_id_assessment_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "lms"."assessment_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_definitions" ADD CONSTRAINT "assessment_definitions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_definitions" ADD CONSTRAINT "assessment_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_offerings" ADD CONSTRAINT "assessment_offerings_definition_id_assessment_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "lms"."assessment_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_offerings" ADD CONSTRAINT "assessment_offerings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_offerings" ADD CONSTRAINT "assessment_offerings_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_offerings" ADD CONSTRAINT "assessment_offerings_offer_id_course_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "lms"."course_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_offerings" ADD CONSTRAINT "assessment_offerings_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "lms"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assessment_offerings" ADD CONSTRAINT "assessment_offerings_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "lms"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_checks" ADD CONSTRAINT "completion_checks_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_checks" ADD CONSTRAINT "completion_checks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_credentials" ADD CONSTRAINT "completion_credentials_completion_id_completions_id_fk" FOREIGN KEY ("completion_id") REFERENCES "lms"."completions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_credentials" ADD CONSTRAINT "completion_credentials_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_credentials" ADD CONSTRAINT "completion_credentials_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_credentials" ADD CONSTRAINT "completion_credentials_replaces_id_completion_credentials_id_fk" FOREIGN KEY ("replaces_id") REFERENCES "lms"."completion_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_events" ADD CONSTRAINT "completion_events_completion_id_completions_id_fk" FOREIGN KEY ("completion_id") REFERENCES "lms"."completions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_policies" ADD CONSTRAINT "completion_policies_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completion_policies" ADD CONSTRAINT "completion_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completions" ADD CONSTRAINT "completions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completions" ADD CONSTRAINT "completions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completions" ADD CONSTRAINT "completions_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completions" ADD CONSTRAINT "completions_offer_id_course_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "lms"."course_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."completions" ADD CONSTRAINT "completions_policy_id_completion_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "lms"."completion_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_offering_context_idx" ON "lms"."assessment_offerings" USING btree ("course_id","batch_id","offer_id");--> statement-breakpoint
CREATE INDEX "completion_credential_student_idx" ON "lms"."completion_credentials" USING btree ("student_id");--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_assignment_attempt_key" UNIQUE("student_id","assignment_id","attempt_number");--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submission_attempt_positive" CHECK ("lms"."assignment_submissions"."attempt_number" > 0);
--> statement-breakpoint
-- Preserve every historical submission and credential. Legacy assessments have no invented batch/payment context.
insert into lms.assessment_offerings(course_id,context,title,quiz_id,required,passing_pct,max_attempts,available_from,due_at)
select course_id,'legacy',title,id,false,passing_pct,max_attempts,available_from,due_at from lms.quizzes on conflict(quiz_id) do nothing;
--> statement-breakpoint
insert into lms.assessment_offerings(course_id,context,title,assignment_id,required,passing_pct,max_attempts,due_at)
select course_id,'legacy',title,id,false,40,1,due_at from lms.assignments on conflict(assignment_id) do nothing;
--> statement-breakpoint
insert into lms.completion_credentials(student_id,course_id,credential_id,title,course_title,grade,skills,issued_at,issue_reason)
select student_id,course_id,credential_id,title,course_title,grade,skills,issued_at,'Preserved legacy credential; original completion policy unavailable'
from lms.certificates where status='Earned' and credential_id is not null on conflict(credential_id) do nothing;
