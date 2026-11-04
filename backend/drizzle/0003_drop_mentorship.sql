DROP TABLE IF EXISTS "lms"."mentor_meetings" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "lms"."mentor_requests" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "lms"."mentors" CASCADE;--> statement-breakpoint
ALTER TABLE "lms"."profiles" DROP CONSTRAINT IF EXISTS "profiles_mentor_id_fkey";--> statement-breakpoint
ALTER TABLE "lms"."profiles" DROP COLUMN IF EXISTS "mentor_id";
