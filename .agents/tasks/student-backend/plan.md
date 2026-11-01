# Student portal backend (Supabase)

User request (Oct 31, 2026): "create the entire backend for student, connect every single thing, everything must work
perfectly". Supabase project `yydvlrfsjmpwqthsmzyp` (eu-north-1, Postgres 17), empty at start. Credentials were given in
chat: they are used only from the environment of setup commands and never written to the repo.

## Decisions
- Supabase is the backend: Postgres schema + RLS + SQL functions (RPC) + Storage + Auth. No separate API server.
  `backend/` holds the schema as code (migrations, seed, scripts, tests). The frontend talks to Supabase with the
  publishable key; all access control is row-level security and SECURITY DEFINER functions.
- Real Supabase Auth for the Student role only. Other roles keep the demo session. Demo student
  `aarav.mehta@learner.ai` / `demo-student` exists in Supabase Auth; switching to the Student role signs it in.
  Email confirmation is turned off (no SMTP), so sign-up works immediately.
- Real time, not the frozen demo clock: seeded dates are relative to the seed time, and the UI labels dates against
  `new Date()`. `reset_my_demo_data()` restores the demo student's history with fresh dates.
- Integrity on the server: quiz answers never reach the client before submission (questions come from an RPC, grading
  runs in SQL); submissions, attempts, grades, certificates and attendance are read-only to students; tickets, replies
  and chat go through RPCs that set the author fields.
- Content that is app copy (interview question bank, resume template, booking slots, trending tags) stays in the frontend.
- Credential IDs are random and checkable on a public page (`/verify/<id>`, RPC `verify_certificate`).
- The demo account can't change its password or email or add 2FA (triggers on auth tables), so it stays usable.
- 2FA is real TOTP (Supabase MFA); the sign-in page asks for the code when the account has a verified factor.
- PageTransition is enter-only: AnimatePresence mode="wait" occasionally left the content blank during verification.

## Status
- [x] schema, RLS, functions, storage (backend/supabase/migrations)
- [x] seed: content from the existing mock data + demo student history
- [x] apply to the project, auth config, demo user
- [x] backend integration tests (RLS isolation, RPC behaviour): 23 passing
- [x] frontend: client, data layer (StudentDataProvider + cached resources), auth wiring
- [x] frontend: every student page on live data; studentMockData.ts removed
- [x] tooling: student-flows.mjs runs against the backend (reset per flow, reload checks); live-smoke.mjs
- [x] docs (backend/README.md, AGENTS.md)
- [x] verification: 23/23 backend tests, 15/15 browser flows, 18/18 live smoke pages, production build, other
  portals smoke-tested; rehearse-migrations.mjs shows the migrations rebuild the live database with no differences
  (and reports a planted policy, grant and row change when run with --tamper)
- [x] storage clean-up: tests and flows remove their uploads; clean-storage.mjs removes unreferenced files
- [x] commit

## Tools (`tools/`, all need SUPABASE_ACCESS_TOKEN except live-smoke.mjs)
- `rehearse-migrations.mjs`: rebuilds the database from the migrations inside a rolled-back transaction and lists every
  difference from the live project (`--tamper` plants three changes to prove the comparison works).
- `sync-functions.mjs`: dev-only; re-runs the function definitions and grants from the migration files on the live
  project. Mirror any other hand-made change in a migration, then run the rehearsal.
- `live-smoke.mjs`: opens every student page as the demo student and reports errors and headings.
- `check-seed.sql`, `check-demo.sql`, `list-users.sql`, `list-storage.sql`: inspection queries for
  `node backend/scripts/query.mjs --file <file>`.
- Browser flows: `../redesign-premium-ui/tools/student-flows.mjs` (15 flows, demo reset before each).
