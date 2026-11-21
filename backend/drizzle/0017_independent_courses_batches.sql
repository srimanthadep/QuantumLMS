ALTER TABLE "lms"."cohort_batches" DROP CONSTRAINT "batch_offer_course_fkey";
--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" DROP CONSTRAINT "cohort_batches_course_id_fkey";
--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."course_offers" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."courses" ALTER COLUMN "capacity" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lms"."courses" ALTER COLUMN "capacity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."orders" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ALTER COLUMN "session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ADD COLUMN "batch_id" text;--> statement-breakpoint
UPDATE "lms"."recordings" r SET "batch_id" = s."batch_id" FROM "lms"."live_sessions" s WHERE s."id" = r."session_id";--> statement-breakpoint
ALTER TABLE "lms"."recordings" ALTER COLUMN "batch_id" SET NOT NULL;--> statement-breakpoint
UPDATE "lms"."media_assets" a SET "batch_id" = s."batch_id" FROM "lms"."live_sessions" s WHERE s."id" = a."session_id" AND a."batch_id" IS NULL;--> statement-breakpoint
UPDATE "lms"."courses" SET "capacity" = NULL WHERE "capacity" = 250;--> statement-breakpoint
UPDATE "lms"."courses" c SET "price" = o."price" FROM (SELECT DISTINCT ON ("course_id") "course_id", "price" FROM "lms"."course_offers" WHERE "mode" = 'self_paced' AND "status" <> 'Archived' ORDER BY "course_id", ("status" = 'Published') DESC, "created_at") o WHERE o."course_id" = c."id";--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "cohort_batches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD CONSTRAINT "media_assets_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ADD CONSTRAINT "recordings_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_offers" ADD CONSTRAINT "offer_self_paced_needs_course" CHECK ("lms"."course_offers"."mode" <> 'self_paced' or "lms"."course_offers"."course_id" is not null);--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD CONSTRAINT "media_asset_scope" CHECK ("lms"."media_assets"."course_id" is not null or "lms"."media_assets"."batch_id" is not null);