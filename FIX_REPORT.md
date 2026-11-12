# Audit remediation progress

Branch: fix/audit-2026-11. No push or deployment performed.

This is a living report. **The full implementation is not complete.** Statuses below describe delivered behavior only; planned code is not counted as fixed. The approved scope is in [IMPLEMENTATION_PLAN.md](docs/audit/IMPLEMENTATION_PLAN.md).

## Phase record

- Baseline: c2a6302 preserves all existing LMS changes before remediation.
- Phase 0: disposable local PostgreSQL databases per test file, strict authentication, marker checks, explicit fixtures, pinned linter, CI workflow and root validation scripts. Validation passed: 102 integration tests in disposable databases, lint (existing warnings), frontend/backend/infra typechecks, and frontend/backend builds.
- Phase 1: strict authentication and role checks, protected enrollment-based legacy media, authenticated/channel-scoped WebSockets, teacher assignment tables and scoped queries, verified-user cache boundaries, private response headers, fixed read-only RBAC, durable request audit records, validated learner upload intents, verifying TLS defaults, and removal of implicit read-time seeding. Validation: 111 tests passed; lint (inherited warnings), all typechecks and builds passed. Migration 0006 applied in every disposable suite.
- Phase 2: unique media assets/variants/jobs, streaming worker with leased retries, direct upload/review/attach UI, video container checks, module/course constraint, serialized position allocation and draft-first courses. Validation: 116 tests passed, including real FFmpeg encode + missing-transcriber failure, stale lease fencing, separate lesson assets and publication checks; lint (inherited warnings), all typechecks/builds passed. Migration 0007 applied in disposable databases. Docker image/full model inference not run because Docker is unavailable.
- Phase 3: offers, source-specific entitlements, one locked admission service, capacity/reservation handling, lifecycle prerequisites and underfilled decisions, durable teacher provisioning/disable, and batch admission UI. Migration 0008 preserves legacy grants without payment history; exact-name instructor reconciliation is conservative. Validation: 124 tests passed, lint (inherited warnings), all typechecks/builds passed. Refund action awaits phase 4; schedule authoring awaits phase 6.
- Phase 4: persisted Razorpay test-mode orders/payments/events/refunds, idempotent signed ingress, seat reservations, provider reconciliation, refund confirmation, checkout UI and truthful ledgers/revenue. Migration 0009 tested from zero. Validation: 136 tests passed, lint (inherited warnings), all typechecks/builds passed. Real Razorpay account/browser integration remains a documented manual sandbox check.
- Phases 5-10: pending.

## Finding status

| Finding | Status | Evidence / remaining work |
| --- | --- | --- |
| 01 - Demo authentication bypass | Fixed | http.ts, config.ts, frontend auth/CognitoGate/demoAccounts; security.test.ts rejects missing/invalid/wrong-role tokens and production demo mode. |
| 02 - Protected media and catalog exposure | Partially fixed | Protected legacy lesson/material URLs and metadata-only catalog; security.test.ts covers anonymous/unenrolled denial. Offer/source grants and recording expiry require phases 3/7. |
| 03 - Unpaid self-enrollment | Partially fixed | Free enrollment requires a published self-paced offer and enforces capacity under a row lock; paid/live bypasses denied. admission.test.ts. Actual paid checkout is phase 4. |
| 04 - WebSocket authentication/authorization | Fixed | ws.ts verifies upgrades, identities, channel membership, event allowlist and rate limits; realtime-cache.test.ts checks anonymous/cross-user/forged-message denial. |
| 05 - Video asset overwrite | Fixed | media/routes.ts, media/jobs.ts and processor.ts replace course-wide overwrite; media.test.ts proves two lessons retain distinct videos. Three development source objects still exist at distinct keys; historical variant contents require review. |
| 06 - Batch lifecycle/thresholds | Partially fixed | Lifecycle service requires paid threshold, assigned teachers and persisted sessions; admission.test.ts. Extend/merge/cancel persist audit entries; refund awaits phase 4 and schedule authoring phase 6. |
| 07 - Dated recurrence | Not fixed | Pending implementation and verification in the approved phase. |
| 08 - Persisted live actions | Not fixed | Pending implementation and verification in the approved phase. |
| 09 - Teacher assignment scope | Partially fixed | auth/access.ts and teacher routes enforce course/batch teacher assignments; security.test.ts covers unassigned teachers and separate same-course batch rosters. Dated session scoping awaits phase 6. |
| 10 - Teacher provisioning | Fixed | Cognito invite/enable/disable gateway, pending/failed/active DB state, role/identity linkage, teacher assignments, and UI waits for confirmation. admission.test.ts verifies durable success, provider failure and old-token denial. Real Cognito invite remains a deployment integration check. |
| 11 - Seat allocation concurrency | Fixed | learning/admission.ts locks batch rows and counts occupied seats plus active reservations; all add/promote/transfer paths use it. admission.test.ts races two claims including the obsolete override flag, and tests reservation expiry. |
| 12 - Mismatched batch/waitlist grant | Fixed | Generic admin enrollment checks batch/course consistency and returns waitlist admission without a course grant; admission.test.ts. |
| 13 - Entitlement provenance | Fixed | entitlement_grants retains source identity; removal, transfer and waitlist demotion revoke only their own registration source. admission.test.ts verifies independent access survives and original batch access is removed. Legacy unknown provenance remains explicit manual access for review. |
| 14 - Replay release/expiry | Not fixed | Pending implementation and verification in the approved phase. |
| 15 - Payments and refunds | Fixed | payments/service.ts, jobs.ts, routes.ts and razorpay.ts; payments.test.ts covers duplicate/out-of-order events, signatures, lost responses, last-seat races, delayed captures, source-specific refunds and persisted ledger totals. PaymentLedger replaces fabricated financial data; real Razorpay sandbox check remains manual. |
| 16 - Certificate criteria | Not fixed | Pending implementation and verification in the approved phase. |
| 17 - Assessment authoring/allocation | Not fixed | Pending implementation and verification in the approved phase. |
| 18 - Media worker dependencies | Partially fixed | Dedicated Dockerfile.worker pins FFmpeg, Python, faster-whisper and model revision; missing transcription is explicit failure (media-processor.test.ts). Docker image build/full model inference require an environment with Docker. |
| 19 - Durable bounded processing | Fixed | Durable processing_jobs with retries, expiring leases and fencing; stream input/output, sequential encoding, bounded temp disk/time, separate worker infra. media.test.ts recovery and media-processor.test.ts encoder coverage; production throughput remains to benchmark. |
| 20 - Account cache isolation | Fixed | sessionBoundary.ts, api.ts and session/auth reset hooks namespace cache by verified server identity; frontend-cache.test.ts tests logout/account switch and delayed prior-account responses. |
| 21 - Private response caching | Fixed | app.ts sets private, no-store on API responses and removes personalized ETag/304; realtime-cache.test.ts. |
| 22 - Super Admin/RBAC/audit boundary | Partially fixed | Super Admin-only routes, read-only policy matrix and persisted audit events; security.test.ts and superadmin.test.ts. Domain-transaction audit/outbox coverage remains phase 10. |
| 23 - Upload size/type validation | Fixed | Direct media and learner uploads validate ownership/size/type at finalize, with video/avatar signatures and quarantine. API no longer accepts large video payloads. security.test.ts and media.test.ts; local streaming upload tests in student/evaluator suites. |
| 24 - Lesson/module consistency and ordering | Fixed | Composite lesson/module/course FK enforces new writes, transactionally serialized position allocation, UUID IDs and API ownership checks; media.test.ts covers mismatch and concurrent insertion. Historical mismatches are not rewritten; NOT VALID constraint needs review/validation. |
| 25 - Draft publication and real ratings | Fixed | New courses start Draft without invented ratings/reviews or empty lessons; publication requires ready content. media.test.ts, admin.test.ts and admin-batches.test.ts. Legacy ratings retained pending provenance review. |
| 26 - Idempotent completion/credentials | Not fixed | Pending implementation and verification in the approved phase. |
| 27 - Session attendance/assessment context | Not fixed | Pending implementation and verification in the approved phase. |
| 28 - Scaling/shared events/connection budget | Not fixed | Pending implementation and verification in the approved phase. |
| 29 - Database TLS verification | Fixed | config.ts, db/ssl.ts and infra default to certificate verification; production rejects disabled/insecure TLS. security.test.ts verifies refusal; local isolated tests explicitly disable TLS. |
| 30 - Implicit demo seeding | Fixed | Batch/alumni reads no longer seed. Explicit seed command restricted to development DEMO_MODE=true; security.test.ts proves reads leave empty data empty. |
| 31 - Optimistic UI honesty | Partially fixed | Removed auth/demo recovery and offline admin success fallbacks; refund waits for server, teacher schedule awaits durable result. Remaining CRUD/live optimistic flows require phases 3/6/10. |
| 32 - Test isolation/coverage | Partially fixed | backend/scripts/test-isolated.ts, backend/tests/isolation.ts, isolation.test.ts; remaining phase-specific security/race/provider tests are pending. |

## Re-verification notes

- The existing backend is Fastify, not Express. Current tests used development .env and inherited DEMO_MODE; both were confirmed and corrected in the test runner/harness.
- Tests previously assumed populated development data. The support suite now creates its own ticket. The student suite exposed a missing welcome notification; onboarding now persists it.
- Strict-mode demo tests assert denial rather than enabling a bypass to make tests pass.
- The approved Zoom/Meet link providers supersede the audit's managed in-platform broadcast recommendation. own_stream remains explicitly out of scope for implementation beyond a hidden unavailable stub.

## Manual setup and data limits

Phase 0 needs local PostgreSQL binaries (PG_BIN if not detected) or a disposable loopback CI PostgreSQL service (TEST_ADMIN_DATABASE_URL). Do not point these at a real application database. npm test does not load backend/.env or use DATABASE_URL.

No production/development data was migrated, dropped, copied or rewritten. Read-only source-object and instructor reconciliation was performed in phases 2–3; the results and limits are documented below. No historical lesson identity or unknown grant provenance was guessed. Existing enrollments must not be classified as paid without actual payment records.

Razorpay test credentials, provider configuration, worker deployment, later migrations and business settings will be documented as their phases are implemented. Do not deploy this intermediate branch as a completed remediation.


Phase 1 manual steps: apply reviewed migration 0006 through the normal migration workflow before enabling this code; assign course_teachers/batch_teachers by verified user IDs (no name-based guessing). Set DEMO_MODE=false and DATABASE_SSL=verify; supply DATABASE_CA_CERT for a private CA where necessary. Existing local files without upload intents need explicit reconciliation. Production builds omit developer quick-login credentials. No actual Cognito, S3, TLS endpoint or production database was modified or integration-tested.

Phase 2 deployment/recovery details: [MEDIA_PROCESSING.md](docs/audit/MEDIA_PROCESSING.md). The read-only development reconciliation found all three source objects present, but did not infer lesson identity from filenames or alter existing data. No current source was proven unrecoverable. Review and reprocess legacy sources after migration; do not reuse course-wide variants.

Phase 3 manual steps and nine unresolved instructor assignments: [ADMISSION_MIGRATION.md](docs/audit/ADMISSION_MIGRATION.md). No development or production migration was applied and no real invitations were sent. Phase totals above were corrected by parsing test-runner output, rather than manually adding suite counts.

Phase 4 setup and provider recovery: [PAYMENTS.md](docs/audit/PAYMENTS.md). Configure test keys and a separate signed webhook secret, automatic test capture, and the optional Secrets Manager ARN before sandbox verification. No real payment or refund was sent. Test credentials are never supplied to the frontend or media worker; only the public checkout key is exposed.
