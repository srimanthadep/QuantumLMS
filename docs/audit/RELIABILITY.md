# Reliability, operations and acceptance evidence

Migration `0015_reliability_outbox.sql` adds four tables and changes the notification recipient FK from student profiles to users. Existing notification rows are retained. A valid student profile already has a user, so this allows staff notifications without rewriting history. No SQL triggers, custom functions or scheduled database jobs are used.

## Notifications

`notify()` enqueues inside the caller's domain transaction. A rolled-back domain mutation cannot emit a notification. `notification_outbox` stores the recipient, key, payload, delivery time, retry count and optional eligibility guard. Delivery uses a short transaction with `FOR UPDATE SKIP LOCKED`; inserting the inbox row, publishing its realtime event and marking delivery all commit together. A crash rolls them back together. Failed delivery retries with exponential backoff capped at one hour; there is no silent discard after a retry limit. `last_error` contains a safe generic message. Delayed delivery rechecks preferences and disabled accounts.

Payment confirmation/refund, schedules, certificate issuance and placement eligibility enqueue from their domain transactions. Repeated sweeps discover the current paid-registration threshold, session reminders, assessment release and fixed/relative due reminders. Keys deduplicate overlapping sweeps across API instances. A certificate notice checks revocation; a placement notice checks current membership/credential state. Class reminders check the original session time and Scheduled status. Replay notices wait until release and check the published version, ready asset, exact-batch grant, registration, flags and expiry. Cancellation, replacement or unpublishing suppresses stale notices.

These are **in-app notifications only**. No email, SMS, push, employer application or external message delivery is configured or claimed. Staff inboxes use `/api/notifications`, authenticated to the current user; read actions persist. Students retain their existing inbox API. The current admin bell refreshes every 30 seconds.

API environment defaults (also in `.env.example` and the API task definition):

- `NOTIFICATION_SWEEP_SECONDS=15` (0 disables, intended for isolated tests).
- `REALTIME_POLL_MS=1000` (0 disables polling, intended for isolated tests).
- `SESSION_REMINDER_MINUTES=30`.
- `ASSESSMENT_DUE_REMINDER_HOURS=24`.

Keep `SCHEDULE_SWEEP_SECONDS=60`, `COMPLETION_SWEEP_SECONDS=30` and `PAYMENT_SWEEP_SECONDS=30` enabled to drive their existing durable queues. View pending/retrying notification counts in Super Admin Platform Health. Repair the underlying database/configuration problem; the worker retries automatically. Never mark pending financial operations complete to clear a queue.

## Realtime and database connections

Every API instance owns its sockets and a unique database consumer. Domain events go into `realtime_events` in the same transaction as the saved operation. All instances poll with the existing pool. Per-consumer event-ID acknowledgements avoid losing an earlier insert that commits after a later event; a sequence/high-water cursor would miss it. Consumer startup acknowledges already-committed history, which belongs in the initial REST snapshot. Newly committed events remain discoverable. Socket membership and verified identity are checked again before delivery. Broad admin/evaluator channels contain a refresh hint rather than private student data. Client typing is the only client-published event and uses the verified sender.

Dispatch is at least once: a crash after send and before acknowledgement can repeat an event. The browser deduplicates a bounded set of event IDs. Realtime events expire after five minutes (typing after ten seconds), and inactive consumer acknowledgements are pruned. Durable inbox/domain rows remain the source of truth; reconnecting or delayed clients must fetch current records. This is not an archival event replay API. Operational queue statistics are shared; socket statistics and API latency are explicitly local to the current instance.

Pool budget against the 15-client session pooler:

- API: at most two steady tasks, three connections each = six.
- API rolling deployment at 200%: at most four tasks = twelve.
- Media worker: one task, two connections; replacement stops the old task first.
- Migration/script: one connection = **15 maximum during rollout**.

`infra/bin/app.ts` rejects more than two API tasks. Realtime polling, outbox, payment, schedule and completion work reuse API pools; no LISTEN client or extra event-bus pool is opened. Do not run an additional development API, several migration processes or an ad-hoc script pool against this same 15-client allowance. Recalculate before raising replicas/concurrency. Worker concurrency remains one; production media bandwidth belongs to storage/provider/CDN infrastructure.

## Truthful administration

Platform Health measures the latest 1,000 completed requests on the responding process, its uptime/errors/pool usage, one database query and persisted queue counts. It does not invent availability percentages, third-party provider health or AI spend. AI usage is unavailable until instrumented. Deployment configuration is read-only. Clearing caches only clears that API instance's in-memory catalog/identity caches. Unsupported snapshots, tenant mutations and settings writes return 501 and have no success button. Permissions are fixed and readable; real persisted audit rows replace example events, with no unsupported HMAC/immutability claim.

Admin reports derive payments from actual capture dates and confirmed refunds in the test ledger. Cohort/courses/learners come from persisted records. Course completion percentages count current enrolled learners with non-revoked credentials. Roster attendance is labeled as join clicks for ended sessions after roster enrollment; an empty denominator displays no ended classes. Legacy/demo records still present in a development database are not evidence of real payments or attendance.

Academy profile edits persist in `app_state`. Student name edits await the server; unsupported status changes are rejected. Disabling an account retains history and immediately denies subsequent authenticated access. Transfers and completion status remain in their appropriate batch/policy workflows. A separate teacher approval queue and general AI assistant are explicitly unavailable; they cannot pretend to perform actions. Failed refreshes show a visible warning instead of silently fabricating results.

## Automated acceptance and limits

- `reliability.test.ts`: transaction rollback, concurrent notification deduplication, retry/recovery, preferences, stale reminders, actual published replay delivery, threshold and assessment notices, out-of-order event commits, two API instances with real WebSocket clients, durable settings and student disable enforcement.
- `cohort-load.test.ts`: 250 distinct signed-in, confirmed and entitled learners; 500 simultaneous requests to exact-batch join and replay authorization; all 200, 250 unique attendance rows, pool maximum four. Final full-suite run: 1,505 ms wall time, median 985 ms, p95 1,471 ms, p99 1,476 ms.
- Existing `payments.test.ts` and `admission.test.ts`: last-seat/free-vs-paid races, duplicate/out-of-order provider events and lease recovery. `media.test.ts`: expired worker leases and fencing out stale completions. `media-processor.test.ts`: real FFmpeg encoding and explicit missing-transcriber failure.

The concurrency numbers measure in-process HTTP injection plus disposable local PostgreSQL under the full test run. They are **not** a production latency SLA, browser/WebSocket load test, CDN throughput test, 250-video-stream test, or Zoom/Meet capacity certification. Real cloud worker inference, provider checkout/webhooks and a browser walkthrough remain manual checks. No development or production migration, push or deployment was performed by this remediation run.
