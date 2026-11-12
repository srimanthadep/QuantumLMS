CREATE TABLE "lms"."alumni_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"tag" text NOT NULL,
	"current_company" text NOT NULL,
	"company_logo" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"hike" text DEFAULT '' NOT NULL,
	"lms_program" text DEFAULT 'Joined Quantum School' NOT NULL,
	"prior_role" text DEFAULT '' NOT NULL,
	"prior_company" text DEFAULT '' NOT NULL,
	"location" text NOT NULL,
	"degree" text NOT NULL,
	"package" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"prep_strategy" text DEFAULT '' NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"linkedin_url" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_profiles_tag_check" CHECK (tag = ANY (ARRAY['Career Gap'::text, 'Fresher'::text, 'Non-Tech to Tech'::text, 'Switcher'::text, 'Upskiller'::text])),
	CONSTRAINT "alumni_profiles_name_check" CHECK ((char_length(name) >= 1) AND (char_length(name) <= 120))
);
--> statement-breakpoint
CREATE TABLE "lms"."placement_stories" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"full_name" text NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"package" text DEFAULT '' NOT NULL,
	"head" text NOT NULL,
	"quote" text NOT NULL,
	"highlight" text DEFAULT 'Featured Offer' NOT NULL,
	"accent" text DEFAULT '#2563EB' NOT NULL,
	"glow" text DEFAULT 'rgba(37, 99, 235, 0.38)' NOT NULL,
	"kicker_class" text DEFAULT 'text-sky-300' NOT NULL,
	"avatar_bg" text DEFAULT 'from-blue-500 to-indigo-600' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_stories_name_check" CHECK ((char_length(full_name) >= 1) AND (char_length(full_name) <= 120))
);
--> statement-breakpoint
CREATE TABLE "lms"."recent_placements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#2563EB' NOT NULL,
	"src" text DEFAULT '' NOT NULL,
	"offset_y" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recent_placements_name_check" CHECK ((char_length(name) >= 1) AND (char_length(name) <= 120))
);
--> statement-breakpoint
ALTER TABLE "lms"."timetable_slots" DROP CONSTRAINT IF EXISTS "timetable_slots_day_check";--> statement-breakpoint
ALTER TABLE "lms"."lessons" ADD COLUMN IF NOT EXISTS "video_url" text;--> statement-breakpoint
ALTER TABLE "lms"."lessons" ADD COLUMN IF NOT EXISTS "video_qualities" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE INDEX "alumni_profiles_position_idx" ON "lms"."alumni_profiles" USING btree ("position");--> statement-breakpoint
CREATE INDEX "placement_stories_position_idx" ON "lms"."placement_stories" USING btree ("position");--> statement-breakpoint
CREATE INDEX "recent_placements_position_idx" ON "lms"."recent_placements" USING btree ("position");--> statement-breakpoint
ALTER TABLE "lms"."timetable_slots" ADD CONSTRAINT "timetable_slots_day_check" CHECK (day = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text]));