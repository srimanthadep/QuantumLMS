CREATE TABLE "lms"."media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"state" text DEFAULT 'uploading' NOT NULL,
	"duration_seconds" integer,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"draft_chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "media_asset_state" CHECK ("lms"."media_assets"."state" in ('uploading','queued','processing','failed','ready'))
);
--> statement-breakpoint
CREATE TABLE "lms"."media_variants" (
	"asset_id" text NOT NULL,
	"quality" text NOT NULL,
	"key" text NOT NULL,
	"bytes" bigint NOT NULL,
	"height" integer NOT NULL,
	CONSTRAINT "media_variants_asset_id_quality_pk" PRIMARY KEY("asset_id","quality"),
	CONSTRAINT "media_variants_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "lms"."processing_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "processing_jobs_asset_id_unique" UNIQUE("asset_id"),
	CONSTRAINT "processing_job_state" CHECK ("lms"."processing_jobs"."state" in ('queued','processing','failed','ready'))
);
--> statement-breakpoint
ALTER TABLE "lms"."courses" ALTER COLUMN "status" SET DEFAULT 'Draft';--> statement-breakpoint
ALTER TABLE "lms"."lessons" ADD COLUMN "media_asset_id" text;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD CONSTRAINT "media_assets_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."media_variants" ADD CONSTRAINT "media_variants_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "lms"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."processing_jobs" ADD CONSTRAINT "processing_jobs_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "lms"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processing_jobs_claim_idx" ON "lms"."processing_jobs" USING btree ("state","available_at");--> statement-breakpoint
ALTER TABLE "lms"."course_modules" ADD CONSTRAINT "course_modules_id_course_key" UNIQUE("id","course_id");
--> statement-breakpoint
ALTER TABLE "lms"."lessons" ADD CONSTRAINT "lessons_module_course_fkey" FOREIGN KEY ("module_id","course_id") REFERENCES "lms"."course_modules"("id","course_id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
