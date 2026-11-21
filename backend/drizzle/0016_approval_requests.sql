CREATE TABLE "lms"."approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"target_id" text NOT NULL,
	"target_version" integer NOT NULL,
	"batch_id" text,
	"requested_by" uuid,
	"note" text DEFAULT '' NOT NULL,
	"state" text DEFAULT 'Pending' NOT NULL,
	"decided_by" uuid,
	"decision_note" text DEFAULT '' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_kind" CHECK ("lms"."approval_requests"."kind" in ('recording.publish')),
	CONSTRAINT "approval_state" CHECK ("lms"."approval_requests"."state" in ('Pending','Approved','Rejected','Withdrawn','Superseded')),
	CONSTRAINT "approval_decision" CHECK (("lms"."approval_requests"."state"='Pending') = ("lms"."approval_requests"."decided_at" is null))
);
--> statement-breakpoint
ALTER TABLE "lms"."approval_requests" ADD CONSTRAINT "approval_requests_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."approval_requests" ADD CONSTRAINT "approval_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."approval_requests" ADD CONSTRAINT "approval_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_one_open_per_target" ON "lms"."approval_requests" USING btree ("kind","target_id") WHERE "lms"."approval_requests"."state"='Pending';--> statement-breakpoint
CREATE INDEX "approval_state_time_idx" ON "lms"."approval_requests" USING btree ("state","created_at");--> statement-breakpoint
CREATE INDEX "approval_target_idx" ON "lms"."approval_requests" USING btree ("kind","target_id","created_at");