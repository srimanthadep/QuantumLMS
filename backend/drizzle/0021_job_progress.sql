ALTER TABLE "lms"."processing_jobs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lms"."processing_jobs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;