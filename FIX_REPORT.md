# Audit remediation progress

Branch: fix/audit-2026-11. No push or deployment performed.

This is a living report. **The full implementation is not complete.** Statuses below describe delivered behavior only; planned code is not counted as fixed. The approved scope is in [IMPLEMENTATION_PLAN.md](docs/audit/IMPLEMENTATION_PLAN.md).

## Phase record

- Baseline: c2a6302 preserves all existing LMS changes before remediation.
- Phase 0: disposable local PostgreSQL databases per test file, strict authentication, marker checks, explicit fixtures, pinned linter, CI workflow and root validation scripts. Validation passed: 102 integration tests in disposable databases, lint (existing warnings), frontend/backend/infra typechecks, and frontend/backend builds.
- Phase 1: strict authentication and role checks, protected enrollment-based legacy media, authenticated/channel-scoped WebSockets, teacher assignment tables and scoped queries, verified-user cache boundaries, private response headers, fixed read-only RBAC, durable request audit records, validated learner upload intents, verifying TLS defaults, and removal of implicit read-time seeding. Validation: 121 tests passed; lint (inherited warnings), all typechecks and builds passed. Migration 0006 applied in every disposable suite.
- Phases 2-10: pending.

## Finding status

| Finding | Status | Evidence / remaining work |
| --- | --- | --- |
| 01 - Demo authentication bypass | Fixed | http.ts, config.ts, frontend auth/CognitoGate/demoAccounts; security.test.ts rejects missing/invalid/wrong-role tokens and production demo mode. |
| 02 - Protected media and catalog exposure | Partially fixed | Protected legacy lesson/material URLs and metadata-only catalog; security.test.ts covers anonymous/unenrolled denial. Offer/source grants and recording expiry require phases 3/7. |
| 03 - Unpaid self-enrollment | Partially fixed | Paid or unpublished course self-enrollment denied; no automatic paid starter grants. security.test.ts. Offer-specific checkout/admission remains phase 3/4. |
| 04 - WebSocket authentication/authorization | Fixed | ws.ts verifies upgrades, identities, channel membership, event allowlist and rate limits; realtime-cache.test.ts checks anonymous/cross-user/forged-message denial. |
| 05 - Video asset overwrite | Not fixed | Pending implementation and verification in the approved phase. |
| 06 - Batch lifecycle/thresholds | Not fixed | Pending implementation and verification in the approved phase. |
| 07 - Dated recurrence | Not fixed | Pending implementation and verification in the approved phase. |
| 08 - Persisted live actions | Not fixed | Pending implementation and verification in the approved phase. |
| 09 - Teacher assignment scope | Partially fixed | auth/access.ts and teacher routes enforce course/batch teacher assignments; security.test.ts covers unassigned teachers and separate same-course batch rosters. Dated session scoping awaits phase 6. |
| 10 - Teacher provisioning | Not fixed | Pending implementation and verification in the approved phase. |
| 11 - Seat allocation concurrency | Not fixed | Pending implementation and verification in the approved phase. |
| 12 - Mismatched batch/waitlist grant | Not fixed | Pending implementation and verification in the approved phase. |
| 13 - Entitlement provenance | Not fixed | Pending implementation and verification in the approved phase. |
| 14 - Replay release/expiry | Not fixed | Pending implementation and verification in the approved phase. |
| 15 - Payment/refund stubs | Partially fixed | Fabricated order history removed; refund returns unavailable and UI awaits server confirmation. admin-ops.test.ts. Real provider integration remains phase 4. |
| 16 - Certificate criteria | Not fixed | Pending implementation and verification in the approved phase. |
| 17 - Assessment authoring/allocation | Not fixed | Pending implementation and verification in the approved phase. |
| 18 - Media worker dependencies | Not fixed | Pending implementation and verification in the approved phase. |
| 19 - Durable bounded processing | Not fixed | Pending implementation and verification in the approved phase. |
| 20 - Account cache isolation | Fixed | sessionBoundary.ts, api.ts and session/auth reset hooks namespace cache by verified server identity; frontend-cache.test.ts tests logout/account switch and delayed prior-account responses. |
| 21 - Private response caching | Fixed | app.ts sets private, no-store on API responses and removes personalized ETag/304; realtime-cache.test.ts. |
| 22 - Super Admin/RBAC/audit boundary | Partially fixed | Super Admin-only routes, read-only policy matrix and persisted audit events; security.test.ts and superadmin.test.ts. Domain-transaction audit/outbox coverage remains phase 10. |
| 23 - Upload size/type validation | Partially fixed | Learner upload intents enforce signed byte count, HEAD type/size, ownership and quarantine; security.test.ts mismatch regression. Legacy admin media upload replaced in phase 2. |
| 24 - Lesson/module consistency and ordering | Not fixed | Pending implementation and verification in the approved phase. |
| 25 - Draft publication and real ratings | Not fixed | Pending implementation and verification in the approved phase. |
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

No production/development data was migrated, dropped, copied or rewritten. No storage inventory or historical recovery was performed. Existing video recovery, instructor mapping and legacy grant reconciliation remain unverified. Existing enrollments must not be classified as paid without actual payment records.

Razorpay test credentials, provider configuration, worker deployment, later migrations and business settings will be documented as their phases are implemented. Do not deploy this intermediate branch as a completed remediation.


Phase 1 manual steps: apply reviewed migration 0006 through the normal migration workflow before enabling this code; assign course_teachers/batch_teachers by verified user IDs (no name-based guessing). Set DEMO_MODE=false and DATABASE_SSL=verify; supply DATABASE_CA_CERT for a private CA where necessary. Existing local files without upload intents need explicit reconciliation. Production builds omit developer quick-login credentials. No actual Cognito, S3, TLS endpoint or production database was modified or integration-tested.
