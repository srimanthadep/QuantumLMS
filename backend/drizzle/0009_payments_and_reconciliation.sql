CREATE TABLE "lms"."orders" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"offer_id" text NOT NULL,
	"course_id" text NOT NULL,
	"batch_id" text,
	"idempotency_key" text NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_order_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"offer_title" text NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'creating' NOT NULL,
	"fulfilled_payment_id" text,
	"error" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "checkout_idempotency_key" UNIQUE("student_id","idempotency_key"),
	CONSTRAINT "order_amount" CHECK ("lms"."orders"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"event_id" text NOT NULL,
	"body_hash" text NOT NULL,
	"kind" text NOT NULL,
	"payment_id" text,
	"refund_id" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "payment_event_identity" UNIQUE("provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"method" text,
	"captured_at" timestamp with time zone,
	"refunded_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_payment_id_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"order_id" text NOT NULL,
	"provider_refund_id" text,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "refunds_payment_id_unique" UNIQUE("payment_id"),
	CONSTRAINT "refunds_provider_refund_id_unique" UNIQUE("provider_refund_id")
);
--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ALTER COLUMN "batch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ADD COLUMN "course_id" text;--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ADD COLUMN "offer_id" text;--> statement-breakpoint
ALTER TABLE "lms"."orders" ADD CONSTRAINT "orders_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."orders" ADD CONSTRAINT "orders_offer_id_course_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "lms"."course_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."orders" ADD CONSTRAINT "orders_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."orders" ADD CONSTRAINT "orders_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "lms"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "lms"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "lms"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."refunds" ADD CONSTRAINT "refunds_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_reconcile_idx" ON "lms"."orders" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "payment_event_queue_idx" ON "lms"."payment_events" USING btree ("state","available_at");--> statement-breakpoint
CREATE INDEX "refund_queue_idx" ON "lms"."refunds" USING btree ("status","available_at");--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ADD CONSTRAINT "seat_reservations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ADD CONSTRAINT "seat_reservations_offer_id_course_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "lms"."course_offers"("id") ON DELETE no action ON UPDATE no action;