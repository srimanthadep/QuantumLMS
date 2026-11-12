# Offers, admission and legacy access

Migration 0008 adds offers, registrations, reservations, source-specific grants, batch lifecycle fields and disabled/provisioning account state. It retains the old roster and enrollment tables as compatibility projections. A minimal live-session table is introduced early so launch prerequisites can check real persisted schedules; recurrence authoring and protected provider actions are phase 6.

Existing enrollments become `legacy_manual` grants. Existing admitted roster entries become registrations and batch-specific grants; waitlisted entries do not. **No payment dates, orders or paid registrations are fabricated.** A separate legacy/manual grant is preserved when a batch source is removed, because historical enrollment ownership cannot be inferred safely. Review unexplained legacy grants manually, especially where an old waitlist action may have accidentally created a course enrollment.

Legacy offers are Draft and batch lifecycle fields start Draft until reviewed. Existing display status is retained in storage; the admin UI shows the new lifecycle. Assign teachers, configure the live offer, dates/deadline and minimum, publish the offer, then move to Recruiting. Ready and Running require the configured paid threshold, assigned teachers and a persisted schedule. Actual paid registrations arrive through phase 4. Refund decisions intentionally fail until that integration is delivered; no refund is simulated.

New defaults: 60% capacity minimum, registration closing 3 days before start, manual underfilled decision, late joins off, replay expiry 12 months after batch end. Historical replay settings are not overwritten. Admission locks the batch row and counts confirmed/paused registrations plus live reservations. The former capacity override cannot bypass the seat limit. Raise capacity explicitly or use the waitlist.

Teacher invites use Cognito plus a durable account row. Failed provisioning is visible and can be retried with the same email. Disabling blocks existing API tokens immediately via a DB check and disables Cognito sign-in. New IAM permissions in infra cover AdminCreateUser, AdminGetUser, AdminDisableUser and AdminEnableUser. Real invitations were not sent during implementation; the integration suite uses a fake Cognito gateway.

The read-only development instructor reconciliation on 12 Nov 2026 checked nine labels. None matched exactly one Teacher-role user. These all require explicit assignment after real teacher provisioning:

- Courses: `c-mwamc4yg-343`, `c-mwamjvw5-543` (display instructor: Srimanth).
- Batches: `batch-agents-04`, `batch-genai-14`, `batch-ml-09`, `batch-mwd4waue-185`, `batch-mwd4wkd7-734`, `batch-py-22` (Srimanth).
- Batch `batch-cv-03` (Dr. Elena Vance).

No user was created from these display names. Detailed local inventory is `backend/.data/instructor-reconciliation.json`; rerun `node --import tsx --env-file=.env scripts/reconcile-instructors.ts` from backend to refresh it. The migration maps names only where there is exactly one Teacher-role match. All development/production migrations and assignments remain unapplied.
