CREATE TABLE "lms"."recording_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"start_seconds" integer NOT NULL,
	"end_seconds" integer NOT NULL,
	CONSTRAINT "recording_chapter_position" UNIQUE("recording_id","position"),
	CONSTRAINT "recording_chapter_times" CHECK ("lms"."recording_chapters"."start_seconds">=0 and "lms"."recording_chapters"."end_seconds">"lms"."recording_chapters"."start_seconds")
);
--> statement-breakpoint
CREATE TABLE "lms"."recording_provider_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_key" text NOT NULL,
	"body_hash" text NOT NULL,
	"meeting_id" text NOT NULL,
	"meeting_uuid" text NOT NULL,
	"file_id" text NOT NULL,
	"title" text NOT NULL,
	"recording_start" timestamp with time zone,
	"state" text DEFAULT 'Awaiting upload' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recording_provider_events_provider_key_unique" UNIQUE("provider_key")
);
--> statement-breakpoint
CREATE TABLE "lms"."recording_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recording_revision_version" UNIQUE("recording_id","version")
);
--> statement-breakpoint
CREATE TABLE "lms"."recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"chapters_initialized" boolean DEFAULT false NOT NULL,
	"release_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"provider_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recordings_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "recordings_asset_id_unique" UNIQUE("asset_id"),
	CONSTRAINT "recordings_provider_event_id_unique" UNIQUE("provider_event_id"),
	CONSTRAINT "recording_status" CHECK ("lms"."recordings"."status" in ('Draft','Published','Archived')),
	CONSTRAINT "recording_window" CHECK ("lms"."recordings"."expires_at">"lms"."recordings"."release_at")
);
--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "replay_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "lms"."recording_chapters" ADD CONSTRAINT "recording_chapters_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "lms"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recording_revisions" ADD CONSTRAINT "recording_revisions_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "lms"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recording_revisions" ADD CONSTRAINT "recording_revisions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "lms"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ADD CONSTRAINT "recordings_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "lms"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ADD CONSTRAINT "recordings_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "lms"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ADD CONSTRAINT "recordings_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."recordings" ADD CONSTRAINT "recordings_provider_event_id_recording_provider_events_id_fk" FOREIGN KEY ("provider_event_id") REFERENCES "lms"."recording_provider_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."media_assets" ADD CONSTRAINT "media_assets_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "lms"."live_sessions"("id") ON DELETE no action ON UPDATE no action;