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

## Development login hardening

The user-added unsigned fake-token email/role format was rejected because it bypassed the strict auth boundary. The /fake-login, /dev/login and /fake screens are retained in development builds only. Local login now calls POST /api/auth/fake-login and uses a random server-issued session, valid for four hours or until API restart. Browser storage is session-scoped; production builds do not use it. Profile-load failure never opens the portal.

Enable locally with NODE_ENV=development, DEMO_MODE=true and DEV_FAKE_LOGIN=true. DEV_FAKE_LOGIN defaults false and production configuration refuses it. The current git-ignored local backend .env was updated to opt in at the user's request; AWS explicitly sets it false. The issuing endpoint checks the actual loopback socket, Host and browser Origin. User-entered tokens are rejected. Real accounts cannot be replaced, existing demo account roles cannot be changed, disabled accounts stay disabled, and configured demo accounts keep their Cognito association. Custom demo accounts must use separate email addresses per role. Normal Cognito authentication remains available.

Runtime localhost smoke check: /api/health on ports 4000 and 8443 returned 200; handwritten Admin token returned 401; server-issued development Admin session and /api/me returned 200. No token was printed or committed.

If an earlier unsigned fake login already rewrote a demo account's Cognito subject, that historical identity cannot be recovered from the new session token. Re-link the configured demo account by normal Cognito sign-in, or review the original Cognito subject explicitly. Do not guess a real user's identity.

Automated coverage: live-sessions.test.ts, updated teacher.test.ts/admin-batches.test.ts, auth.test.ts and security.test.ts. Full provider meeting availability and a visual browser walkthrough remain manual integration checks.
