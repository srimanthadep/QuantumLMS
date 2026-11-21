# Dated classes and local development access

Phase 6 adds migration 0011. The user reported applying migrations through 0011 to their development database on 13 November 2026; the remediation runner still migrates only isolated disposable databases. No deployment was performed.

## Scheduling workflow

1. Set batch start/end instants, timezone, admission threshold and active teacher assignments in batch settings.
2. Open Live sessions → Schedule classes in batch settings, or the teacher Live classes page. Choose an assigned batch, teacher, Zoom or Google Meet, and protected meeting links. Test link format validates syntax; it does not claim that a meeting exists.
3. Choose a real local date/time or all required weekdays (including Saturday/Sunday). Preview recurring dates before saving. A schedule rule and immutable version are saved before the durable generator runs. SCHEDULE_SWEEP_SECONDS defaults to 60; 0 disables the background sweep for tests. Generation errors remain visible in the scheduler.
4. Rule edits affect future sessions only. Existing past/live/ended sessions and individual cancellation/reschedule exceptions are preserved. Each rule/date has one occurrence key. Concurrent generators serialize on the batch/rule; restarting the API resumes rules whose generated version is behind.
5. Transition the batch through its admission lifecycle once the verified paid minimum, teacher assignment and saved schedule are satisfied. Teacher Start/End writes status and actual timestamps to the server. Administrative status overrides require a reason and cannot bypass the batch paid threshold.
6. Students see metadata only. POST /api/sessions/:id/join checks confirmed exact-batch registration, an effective exact-batch grant, batch/session state, and the configured -15/+30-minute default window. The provider opens in a separate tab. Host links and per-session settings require a batch/session assignment (or Admin/Super Admin).

Clock changes: invalid local wall times are rejected; repeated local times select the earlier UTC instant. Batch bounds are checked for every occurrence. Manual reschedule UI explicitly uses the device timezone and submits UTC instants. Lists display the batch timezone.

Attendance records store first/last join click and click count, unique per student/session. These are **not verified meeting presence**. The student attendance view and dashboard label this basis. Legacy course/date attendance remains at /api/student/attendance/legacy and is not mixed into new session counts. Leave requests are retained.

Legacy weekday-only timetable rows lack actual dates and exact batch identity. They are retained but no longer delivered as live classes; an assigned teacher/admin must create and preview a dated rule. No six-month recurrence, teacher identity, or paid registration history was guessed. own_stream is an unavailable server provider and is hidden in scheduling controls.

## Local password accounts

Fake-login pages, passwordless development sessions, and implicit demo-account sign-ins have been removed. Every role uses Cognito password authentication and API-verified group membership. Visiting another role's URL does not change the signed-in account.

Run `npm --prefix backend run cognito:accounts:local` with the local Cognito emulator and API running to provision the six test accounts. The script writes generated passwords to git-ignored `backend/.data/local-role-accounts.json` and verifies their API identities. It refuses AWS pools and unknown existing accounts.

At `/auth` or `/login`, select a saved account to sign in immediately, or use the email/password form. Saved buttons are available only from the loopback Vite development server with a local Cognito pool and endpoint. Builds and preview servers export an empty account list; saved passwords are not included in production output. Passwords are verified by Cognito, and MFA/email confirmation challenges still use the normal flow.

Automated coverage includes rejection of the removed endpoint and legacy tokens, verified roles for all six groups, and production exclusion of saved credentials. Earlier unsigned fake logins may have changed legacy identity links; review known Cognito account data rather than guessing a subject.
