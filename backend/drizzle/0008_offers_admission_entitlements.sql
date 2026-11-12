CREATE TABLE "lms"."batch_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"state" text NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"order_id" text,
	"paid_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_batch_student_key" UNIQUE("batch_id","student_id"),
	CONSTRAINT "registration_state" CHECK ("lms"."batch_registrations"."state" in ('confirmed','waitlisted','paused','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "lms"."course_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"mode" text NOT NULL,
	"title" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"completion_policy" jsonb DEFAULT '{"requiredLessonsPercent":100,"requiredAssessments":true,"passMark":40,"batchEnded":true,"attendancePercent":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_id_course_key" UNIQUE("id","course_id"),
	CONSTRAINT "offer_mode" CHECK ("lms"."course_offers"."mode" in ('live','self_paced')),
	CONSTRAINT "offer_status" CHECK ("lms"."course_offers"."status" in ('Draft','Published','Archived')),
	CONSTRAINT "offer_price" CHECK ("lms"."course_offers"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."entitlement_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"offer_id" text,
	"batch_id" text,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grant_source_key" UNIQUE("student_id","course_id","source_type","source_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."live_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"teacher_id" uuid,
	"occurrence_key" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"provider" text DEFAULT 'zoom_link' NOT NULL,
	"join_url" text,
	"host_url" text,
	"passcode" text,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_sessions_occurrence_key_unique" UNIQUE("occurrence_key"),
	CONSTRAINT "session_dates" CHECK ("lms"."live_sessions"."ends_at" > "lms"."live_sessions"."starts_at"),
	CONSTRAINT "session_status" CHECK ("lms"."live_sessions"."status" in ('Scheduled','Live','Ended','Cancelled')),
	CONSTRAINT "session_provider" CHECK ("lms"."live_sessions"."provider" in ('zoom_link','meet_link','own_stream'))
);
--> statement-breakpoint
CREATE TABLE "lms"."seat_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"order_id" text,
	"state" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seat_reservations_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "reservation_state" CHECK ("lms"."seat_reservations"."state" in ('active','converted','released'))
);
--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ALTER COLUMN "access_expiry_months" SET DEFAULT 12;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "offer_id" text;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "lifecycle" text DEFAULT 'Draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "minimum_paid_registrations" integer;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "registration_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "underfilled_action" text DEFAULT 'admin_decides' NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "allow_late_join" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "live_provider" text DEFAULT 'zoom_link' NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "join_before_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD COLUMN "join_after_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lms"."users" ADD COLUMN "provisioning_state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "lms"."batch_registrations" ADD CONSTRAINT "batch_registrations_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."batch_registrations" ADD CONSTRAINT "batch_registrations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_offers" ADD CONSTRAINT "course_offers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."entitlement_grants" ADD CONSTRAINT "entitlement_grants_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."entitlement_grants" ADD CONSTRAINT "entitlement_grants_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."entitlement_grants" ADD CONSTRAINT "entitlement_grants_offer_id_course_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "lms"."course_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."entitlement_grants" ADD CONSTRAINT "entitlement_grants_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD CONSTRAINT "live_sessions_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."live_sessions" ADD CONSTRAINT "live_sessions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "lms"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ADD CONSTRAINT "seat_reservations_batch_id_cohort_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "lms"."cohort_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."seat_reservations" ADD CONSTRAINT "seat_reservations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grant_access_idx" ON "lms"."entitlement_grants" USING btree ("student_id","course_id","batch_id");--> statement-breakpoint
CREATE INDEX "sessions_batch_start_idx" ON "lms"."live_sessions" USING btree ("batch_id","starts_at");--> statement-breakpoint
CREATE INDEX "reservations_batch_idx" ON "lms"."seat_reservations" USING btree ("batch_id","state","expires_at");--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "cohort_batches_offer_id_course_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "lms"."course_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "batch_offer_course_fkey" FOREIGN KEY ("offer_id","course_id") REFERENCES "lms"."course_offers"("id","course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "batch_lifecycle" CHECK ("lms"."cohort_batches"."lifecycle" in ('Draft','Recruiting','Ready','Scheduled','Running','Completed','Cancelled'));--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "batch_provider" CHECK ("lms"."cohort_batches"."live_provider" in ('zoom_link','meet_link','own_stream'));--> statement-breakpoint
ALTER TABLE "lms"."cohort_batches" ADD CONSTRAINT "batch_threshold" CHECK ("lms"."cohort_batches"."minimum_paid_registrations" is null or "lms"."cohort_batches"."minimum_paid_registrations" between 0 and "lms"."cohort_batches"."max_seats");
--> statement-breakpoint
-- CONSERVATIVE LEGACY BACKFILL: no paid_at/order/payment rows are inferred.
INSERT INTO lms.course_offers (id, course_id, mode, title, price, status)
SELECT 'legacy-self:' || id, id, 'self_paced', title, price, 'Draft' FROM lms.courses ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO lms.course_offers (id, course_id, mode, title, price, status)
SELECT 'legacy-live:' || b.id, b.course_id, 'live', b.name, c.price, 'Draft' FROM lms.cohort_batches b JOIN lms.courses c ON c.id=b.course_id ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE lms.cohort_batches SET offer_id = coalesce(offer_id, 'legacy-live:' || id), minimum_paid_registrations = coalesce(minimum_paid_registrations, ceil(max_seats * 0.6)::int);
--> statement-breakpoint
INSERT INTO lms.entitlement_grants (id, student_id, course_id, source_type, source_id, starts_at)
SELECT 'legacy-enrollment:' || student_id::text || ':' || course_id, student_id, course_id, 'legacy_manual', course_id, enrolled_at FROM lms.enrollments ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO lms.batch_registrations (id, batch_id, student_id, state, source_type, confirmed_at, created_at)
SELECT 'legacy-batch:' || batch_id || ':' || student_id::text, batch_id, student_id,
  CASE WHEN status='Waitlisted' THEN 'waitlisted' WHEN status='Paused' THEN 'paused' ELSE 'confirmed' END,
  'legacy_manual', CASE WHEN status IN ('Active','Completed','At Risk') THEN enrolled_at ELSE NULL END, enrolled_at
FROM lms.batch_students ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO lms.entitlement_grants (id, student_id, course_id, offer_id, batch_id, source_type, source_id, starts_at)
SELECT 'legacy-batch-grant:' || r.id, r.student_id, b.course_id, b.offer_id, b.id, 'batch_registration', r.id, r.created_at
FROM lms.batch_registrations r JOIN lms.cohort_batches b ON b.id=r.batch_id WHERE r.state='confirmed' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO lms.course_teachers (course_id, teacher_id)
SELECT c.id, u.id FROM lms.courses c JOIN lms.users u ON lower(trim(c.instructor))=lower(trim(u.full_name)) AND u.role='Teacher'
WHERE (SELECT count(*) FROM lms.users other WHERE other.role='Teacher' AND lower(trim(other.full_name))=lower(trim(c.instructor)))=1 ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO lms.batch_teachers (batch_id, teacher_id)
SELECT b.id, u.id FROM lms.cohort_batches b JOIN lms.users u ON lower(trim(b.instructor))=lower(trim(u.full_name)) AND u.role='Teacher'
WHERE (SELECT count(*) FROM lms.users other WHERE other.role='Teacher' AND lower(trim(other.full_name))=lower(trim(b.instructor)))=1 ON CONFLICT DO NOTHING;
