CREATE TABLE "lms"."notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"recipient_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"preference" text,
	"guard" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"delivered_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE TABLE "lms"."realtime_consumers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms"."realtime_deliveries" (
	"consumer_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "realtime_deliveries_consumer_id_event_id_pk" PRIMARY KEY("consumer_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."realtime_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"sender" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lms"."notifications" DROP CONSTRAINT "notifications_student_id_fkey";
--> statement-breakpoint
ALTER TABLE "lms"."notification_outbox" ADD CONSTRAINT "notification_outbox_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."realtime_deliveries" ADD CONSTRAINT "realtime_deliveries_consumer_id_realtime_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "lms"."realtime_consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."realtime_deliveries" ADD CONSTRAINT "realtime_deliveries_event_id_realtime_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "lms"."realtime_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_outbox_pending_idx" ON "lms"."notification_outbox" USING btree ("available_at") WHERE "lms"."notification_outbox"."delivered_at" is null and "lms"."notification_outbox"."skipped_at" is null;--> statement-breakpoint
CREATE INDEX "realtime_events_expiry_idx" ON "lms"."realtime_events" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "lms"."notifications" ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;
