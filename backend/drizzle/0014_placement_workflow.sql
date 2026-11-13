CREATE TABLE "lms"."job_application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"note" text NOT NULL,
	"actor_id" uuid,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_application_event_version_key" UNIQUE("application_id","version")
);
--> statement-breakpoint
CREATE TABLE "lms"."job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"resume_student_id" uuid,
	"resume_snapshot" jsonb NOT NULL,
	"resume_updated_at" timestamp with time zone NOT NULL,
	"cover_note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_application_student_job_key" UNIQUE("student_id","job_id"),
	CONSTRAINT "job_application_status" CHECK ("lms"."job_applications"."status" in ('Submitted','Reviewing','Shortlisted','Interview','Offered','Placed','Rejected','Withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "lms"."placement_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"work_mode" text DEFAULT 'Remote' NOT NULL,
	"employment_type" text DEFAULT 'Full-time' NOT NULL,
	"description" text NOT NULL,
	"requirements" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"closes_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_job_status" CHECK ("lms"."placement_jobs"."status" in ('Draft','Published','Closed')),
	CONSTRAINT "placement_job_mode" CHECK ("lms"."placement_jobs"."work_mode" in ('Remote','Hybrid','On-site'))
);
--> statement-breakpoint
CREATE TABLE "lms"."placement_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"completion_id" uuid NOT NULL,
	"eligibility" text DEFAULT 'Eligible' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"mentor_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"eligible_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_membership_student_track_key" UNIQUE("student_id","track_id"),
	CONSTRAINT "placement_eligibility" CHECK ("lms"."placement_memberships"."eligibility" in ('Eligible','Revoked')),
	CONSTRAINT "placement_membership_status" CHECK ("lms"."placement_memberships"."status" in ('Active','Placed','Closed'))
);
--> statement-breakpoint
CREATE TABLE "lms"."placement_support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"application_id" uuid,
	"ticket_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_support_ticket_key" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."placement_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"auto_enroll" boolean DEFAULT true NOT NULL,
	"eligible_modes" text[] DEFAULT ARRAY['live','self_paced']::text[] NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_track_course_key" UNIQUE("course_id"),
	CONSTRAINT "placement_track_modes" CHECK (cardinality("lms"."placement_tracks"."eligible_modes")>0 and "lms"."placement_tracks"."eligible_modes"<@ARRAY['live','self_paced']::text[])
);
--> statement-breakpoint
ALTER TABLE "lms"."job_application_events" ADD CONSTRAINT "job_application_events_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "lms"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."job_application_events" ADD CONSTRAINT "job_application_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."job_applications" ADD CONSTRAINT "job_applications_job_id_placement_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "lms"."placement_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."job_applications" ADD CONSTRAINT "job_applications_membership_id_placement_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "lms"."placement_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."job_applications" ADD CONSTRAINT "job_applications_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."job_applications" ADD CONSTRAINT "job_applications_resume_student_id_resumes_student_id_fk" FOREIGN KEY ("resume_student_id") REFERENCES "lms"."resumes"("student_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_jobs" ADD CONSTRAINT "placement_jobs_track_id_placement_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "lms"."placement_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_jobs" ADD CONSTRAINT "placement_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_memberships" ADD CONSTRAINT "placement_memberships_track_id_placement_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "lms"."placement_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_memberships" ADD CONSTRAINT "placement_memberships_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_memberships" ADD CONSTRAINT "placement_memberships_completion_id_completions_id_fk" FOREIGN KEY ("completion_id") REFERENCES "lms"."completions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_memberships" ADD CONSTRAINT "placement_memberships_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_support_requests" ADD CONSTRAINT "placement_support_requests_membership_id_placement_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "lms"."placement_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_support_requests" ADD CONSTRAINT "placement_support_requests_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "lms"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_support_requests" ADD CONSTRAINT "placement_support_requests_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "lms"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."placement_tracks" ADD CONSTRAINT "placement_tracks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_application_membership_idx" ON "lms"."job_applications" USING btree ("membership_id","status");--> statement-breakpoint
CREATE INDEX "placement_jobs_track_idx" ON "lms"."placement_jobs" USING btree ("track_id","status");--> statement-breakpoint
CREATE INDEX "placement_mentor_idx" ON "lms"."placement_memberships" USING btree ("mentor_id","status");