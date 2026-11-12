You are a senior full-stack engineer working in the QuantumLMS repository
(C:/Users/srima/Downloads/QuantumLMS). Stack: React 19 + TypeScript + Vite +
Tailwind frontend; Fastify 5 + Zod + Drizzle ORM backend; PostgreSQL (Supabase)
in the `lms` schema; AWS Cognito auth; S3-compatible storage; AWS infra in /infra.

My earlier audit (12 Nov 2026) is approved for implementation. FIX EVERYTHING in
it, in the order below. Re-verify each audit finding against the current code
before fixing it. If something has changed or the audit was wrong, say so and
adapt.

## Working rules
- Create a git branch `fix/audit-2026-11` and commit after every phase with a
  clear message. Do not push or deploy.
- Keep the existing stack and reuse what works (course/lesson CRUD, quiz grading,
  evaluator grading and locking, support tickets, certificate verification).
  Do not rewrite wholesale. Do not add a marketplace or unrelated features.
- Database changes: additive first. Change `backend/src/db/schema.ts`, generate
  reviewed SQL migrations with the repo's Drizzle workflow, test them on a
  disposable database, and regenerate API types. Never drop or rewrite existing
  data. Backfill legacy rows conservatively and never invent payment history.
- Tests must use an isolated test database with DEMO_MODE=false. Add tests for
  every phase. Run lint, typecheck, build and the full test suite at the end of
  each phase and fix failures before moving on.
- Never put secrets in code or in the report. Add new environment variables to
  .env.example and the infra config.
- Business values I haven't decided must be configurable fields with sensible
  defaults, not hardcoded. Defaults: minimum paid registrations = 60% of
  capacity; registration deadline = 3 days before start; underfilled action =
  admin decides (extend / merge / refund / cancel); replay access = until 12
  months after batch end; certificate = 100% required lessons + all required
  assessments passed (pass mark 40%) + batch ended + attendance >= 0%
  (attendance rule configurable, off by default); late joining of a running
  batch = off.
- Payments: integrate Razorpay (India-first) behind a PaymentProvider interface
  so Stripe can be added later. Use Razorpay test mode only. Verify webhook
  signatures. All payment handling must be idempotent.

## Live streaming design (important)
Live classes must support three providers behind ONE provider interface
(`LiveProvider`), selected per batch (default) and overridable per session:
1. `zoom_link`   - the admin/teacher pastes a Zoom meeting URL (+ optional passcode)
2. `meet_link`   - the admin/teacher pastes a Google Meet URL
3. `own_stream`  - my own streaming service. DO NOT implement it now. Create the
   enum value, the interface and a stub that returns "not available yet", hidden
   in the UI, so it can be added later without a schema change.

Rules for link-based providers:
- Validate URLs strictly: Zoom must be an https zoom.us / *.zoom.us meeting
  link; Meet must be https://meet.google.com/xxx-xxxx-xxx. Reject anything else.
- Join links are PROTECTED DATA. Never return them in catalogs, lists or any
  endpoint that isn't specifically authorized. Students get the link only from
  `POST /sessions/:id/join` (admitted, entitled student of that exact batch, only
  within a configurable window, e.g. 15 min before start until end + 30 min).
  Teachers get the host link only if assigned to that batch/session. Log each
  join (this drives attendance).
- Attendance: record a join click (joined_at) per student/session. Say clearly in
  the UI that this counts clicks, not verified presence, since Zoom/Meet are
  external.
- Recordings: Zoom/Meet recordings are not ingested automatically. Implement
  this flow: after the session, the teacher or admin uploads the recording file
  (direct-to-storage upload) or attaches it through the admin media flow. It
  then goes through the same durable processing pipeline (transcode, transcript,
  chapter drafting), is reviewed and published by teacher/admin, and is
  replayable only by students entitled to that batch. Add an optional Zoom
  cloud-recording webhook handler behind a feature flag, off by default, with
  signature verification.
- Session status (Scheduled / Live / Ended / Cancelled) is persisted by
  server-side actions (teacher "Start" / "End", plus an admin override), never
  local UI state.

## Phase 0 - Baseline and test isolation
Isolate the test DB, force strict auth in tests, snapshot current state,
document which data is demo and which is real. Add a CI-friendly test script.

## Phase 1 - Security and access (audit findings 01, 02, 04, 09, 20, 21, 22, 23, 29, 30, 31)
- Fail-closed auth: DEMO_MODE defaults to false. Refuse to boot in production if
  it is on. Missing, invalid or wrong-role tokens return 401/403 always. Remove
  demo identities from production builds. Remove implicit demo seeding from GET
  routes. Move seeding to an explicit, environment-guarded script.
- Protected media: authenticate and authorize /api/files/videos and
  /api/files/materials. Resolve lesson/material/recording -> offer/batch ->
  entitlement, then issue short-lived signed playback URLs. Public catalog
  endpoints must return metadata only, with no video URLs.
- WebSockets: authenticate the upgrade, authorize each channel subscription
  against role and membership, derive the sender from the verified identity,
  whitelist client event types, add rate limits.
- Teacher scoping: every teacher query and mutation must go through teacher
  assignments. Compute analytics from the same scoped data.
- Super Admin vs Admin boundary: restrict Super Admin routes to Super Admin. Either
  make RBAC editing real and enforced, or remove the editable matrix and show the
  fixed policy. Write real audit_events instead of example entries.
- Frontend cache: namespace caches by verified user, clear memory and persisted
  caches on logout and account switch, never read private cache before the
  session is known. Add an account A -> logout -> account B regression test.
- Cache-Control: private/no-store for authenticated or personalized responses.
- S3 uploads: enforce size and type limits and verify actual object size/type at
  finalize. Quarantine bad uploads.
- Database TLS: certificate-verifying TLS outside local development.
- UI honesty: roll back failed optimistic updates, show errors, refetch after
  confirmation. Never show a financial action as complete from local state.

## Phase 2 - Media correctness and durable processing (findings 05, 18, 19, 24, 25)
- Add media_assets / media_variants / processing_jobs. Each upload gets a unique
  asset ID and its own storage keys. Never update lessons by course_id. Bind
  assets only to the intended lesson or recording.
- Direct-to-storage uploads, then an asynchronous durable job with retries,
  leases and explicit states (queued / processing / failed / ready). Failed
  transcription must be shown as failed, never as a high-confidence empty result.
- Create a dedicated media worker image with pinned FFmpeg and the transcription
  dependency. Stream input and output, bound concurrency and temp disk.
  Update infra so the API task stays small.
- Fix lesson/module ownership (derive course from module, add a composite FK or
  remove the redundancy). Use stable generated IDs and transactions for
  position/ordering.
- New courses default to Draft, with no fake ratings or reviews. Publishing
  requires valid ready assets and structure.
- Reconcile existing lesson-to-video links from storage and history. Report which
  lessons cannot be recovered and need re-upload.

## Phase 3 - Offers, batches, teachers, entitlements (findings 03, 06, 10, 11, 12, 13)
- Add course_offers (mode = live | self_paced, price, currency, publication
  status, completion policy). Extend batches with offer_id, capacity,
  minimum_paid_registrations, registration_deadline, starts_at/ends_at,
  timezone, lifecycle status (Draft -> Recruiting -> Ready -> Scheduled ->
  Running -> Completed, plus Cancelled), underfilled decision, default
  live_provider.
- Add batch_teachers (and course_teachers) linked to user IDs. Support multiple
  teachers per batch. Migrate text instructors to users only where unambiguous;
  list the rest for admin assignment.
- Real teacher provisioning: invite via Cognito plus the users table, assign,
  disable. Return success only after durable state exists.
- Evolve batch_students into batch_registrations (state, order_id, paid_at,
  confirmed_at, reservation). Waitlisted is never entitled.
- Add seat_reservations and ONE shared admission service. It locks the batch row
  and counts confirmed seats plus unexpired reservations. Use it for add,
  transfer, promote, paid registration and admin enrol. Reject mismatched
  batch/course IDs.
- Add entitlement_grants with source_type/source_id and optional batch_id.
  Revoking or transferring one source must not remove another source's access.
  Backfill existing enrollments as legacy/manual grants.
- Student self-enrollment only for free published offers. Paid offers go
  through checkout. Enforce publication, capacity and offer mode server-side.
- Lifecycle service: Ready/Start transitions are allowed only when the confirmed
  paid count >= minimum, teachers are assigned and a schedule exists. Implement
  the underfilled actions (extend / merge / refund / cancel) with audit entries.

## Phase 4 - Payments (finding 15)
Add orders / payments / payment_events / refunds, Razorpay checkout, a signature-
verified idempotent webhook, seat reservations that expire, and failed/duplicate/
delayed payment reconciliation. Refunds stay pending until the provider
confirms. Replace the fabricated orders/refund endpoints with real persisted data.
Admin orders and revenue pages must show real data only.

## Phase 5 - Self-paced publishing and learning
Wire checkout/free enrollment to entitlements; entitlement-aware playback;
preserve per-lesson progress; validate draft -> publish; safe lesson replace
and reorder. A newly uploaded course must be purchasable, accessible only to its
learner, completable and certifiable without any seeded data.

## Phase 6 - Schedules and live sessions (findings 07, 08, 27)
- Add schedule_rules (timezone, weekdays, local start time, duration, start/end
  dates, version) and schedule_exceptions. Add live_sessions with a unique
  occurrence_key, batch_id, assigned teacher, UTC start/end, status, provider,
  join_url / host_url (stored server-side, protected as described above) and
  actual start/end. Support all seven weekdays.
- Generate occurrences within batch bounds with an idempotent job. Show a
  recurrence preview before saving. Rule edits must handle past vs future
  sessions explicitly. Cancel/reschedule must not duplicate sessions.
- Fix the teacher "create class" flow: send the real date/timezone or rule and
  return the persisted occurrence. Remove the hardcoded demo date/batch/meeting
  URL from the student schedule and the live page.
- Implement the `LiveProvider` interface with zoom_link and meet_link, plus the
  hidden own_stream stub (see "Live streaming design"). Build:
  * admin/teacher UI to choose the provider and paste a link per batch/session,
    with validation and a "test link format" check;
  * teacher "Start class" / "End class" persisted server-side;
  * student join page that calls POST /sessions/:id/join and opens the provider
    link in a new tab, with countdown, join window and clear messages when it is
    not open yet or has ended;
  * per-session attendance from join clicks (replace course/date attendance);
  * persisted schedule/session notifications.

## Phase 7 - Recordings, chapters, replay (findings 14, 18, 19)
- Add recordings and recording_chapters linked recording -> live_session ->
  batch, with release_at / expires_at and publication state.
- Teacher/admin recording upload -> processing pipeline -> transcript -> draft
  chapters (timestamped, ordered, within recording bounds) -> teacher edits and
  publishes. Students see whole-session playback plus chapter jumps like YouTube.
- Authorization: playback is allowed only with an effective entitlement for that
  exact batch, within the release/expiry window. Apply feature flags server-side.
- Processing/failure states in the UI. Duplicate provider events must not create
  duplicate assets or chapters.

## Phase 8 - Assessments and completion (findings 16, 17, 26, 27)
- Admin authoring for quiz questions and answer keys, rubrics and criteria, and
  evaluator allocation. Block publishing an assessment unless its grading
  configuration is valid.
- assessment_offerings: per-batch or per-self-paced deadlines and attempts,
  separate from reusable definitions. Migrate existing data with explicit legacy
  context.
- Versioned completion_policies and completions. Issue certificates only from an
  idempotent, transactionally serialized policy service (not from the lesson-
  complete button). Persist the policy snapshot, never silently change an issued
  credential's ID, and add an explicit revocation/reissue policy. Preserve
  existing issued certificates.

## Phase 9 - Placement
Placement eligibility triggered by a completion event. Add placement_tracks,
placement_memberships, jobs and job_applications. Add student jobs/applications
pages, admin/support job and application management, resume linkage and support
handoff. Reuse existing resume, interview and ticket features. Explicit mentor
assignment for the Support/Mentor role.

## Phase 10 - Reliability and truth
- Notification outbox with retries (payment confirmed, threshold reached,
  schedule change/reminder, replay ready, assessment released/due, certificate
  earned, placement eligible).
- Shared event distribution for WebSockets across API instances. Budget total DB
  connections across API replicas, workers and scripts against the pooler limit.
- Remove demo statistics and success-shaped stubs from admin and super-admin
  pages. Real audit events everywhere.
- Load/race tests: two simultaneous claims for the last seat, duplicate and
  out-of-order payment webhooks, 250 authorized users hitting join and replay
  endpoints, worker restart recovery.

## Acceptance checks (must pass, automated where possible)
unauthenticated and unenrolled media access denied; cross-batch replay denied;
unassigned teacher denied; a student can't get join links for other batches or
outside the join window; Zoom/Meet URL validation rejects look-alike domains;
last-seat race can't overbook; duplicate payment webhooks don't double-grant;
below-threshold batch can't start; Mon/Tue/Wed over 6 months generates exact
dates with no duplicates; two lessons in one course keep separate videos; failed
transcription shows failed; failing a required assessment or an unfinished batch
blocks the certificate; a completed cohort becomes placement-eligible; account
switch shows no old data; production boot with DEMO_MODE=true fails.

## Final deliverable
1. All code, migrations and tests on the branch, one commit per phase.
2. A `FIX_REPORT.md` listing each audit finding (01-32) as Fixed / Partially
   fixed / Not fixed / Not reproducible, with files changed and the test that
   proves it.
3. A list of manual steps for me: environment variables to set, Razorpay test
   keys, migrations to run, media worker deployment, and anything that needs my
   business decision.
4. Any data you couldn't recover or migrate safely.

If any phase is blocked, stop, explain why, and continue with the next
independent phase instead of guessing.