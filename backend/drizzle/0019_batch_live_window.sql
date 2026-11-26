-- Batches made from plain dates had no exact start or end time, so scheduling live classes failed with
-- "Set the batch start and end before creating a schedule". Fill the gaps from the dates: the start of the first day
-- to the end of the last day, in the batch's timezone. Times an admin already set are left alone, and a time is only
-- filled in when it keeps the start before the end.
UPDATE "lms"."cohort_batches"
SET "starts_at" = ("start_date"::date)::timestamp AT TIME ZONE "timezone"
WHERE "starts_at" IS NULL AND "start_date" ~ '^\d{4}-\d{2}-\d{2}$'
  AND ("ends_at" IS NULL OR ("start_date"::date)::timestamp AT TIME ZONE "timezone" < "ends_at");
--> statement-breakpoint
UPDATE "lms"."cohort_batches"
SET "ends_at" = ("end_date"::date + 1)::timestamp AT TIME ZONE "timezone"
WHERE "ends_at" IS NULL AND "end_date" ~ '^\d{4}-\d{2}-\d{2}$'
  AND ("starts_at" IS NULL OR ("end_date"::date + 1)::timestamp AT TIME ZONE "timezone" > "starts_at");
