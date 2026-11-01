# Quantum LMS backend

The student portal's backend runs on [Supabase](https://supabase.com): Postgres with row-level security, SQL functions
called over RPC, Storage for uploads and Supabase Auth for sign-in. There is no separate API server. The frontend talks
to Supabase directly with the browser-safe publishable key; every rule that matters is enforced in the database.

Only the Student role uses this backend. The other portals (teacher, evaluator, support, admin) still run on demo data
in the browser.

## Layout

| Path | What it holds |
| --- | --- |
| `supabase/migrations/…_student_schema.sql` | Tables, column privileges and RLS policies |
| `supabase/migrations/…_student_functions.sql` | Triggers, RPCs, storage buckets and policies, the pg_cron job |
| `supabase/migrations/…_student_seed.sql` | Course content and the demo student's history (dates relative to the seed time) |
| `scripts/apply-migrations.mjs` | Applies pending migrations through the Management API |
| `scripts/setup-auth.mjs` | Auth settings (auto-confirm, site URL, redirect URLs) and the demo student account |
| `scripts/frontend-env.mjs` | Writes `frontend/.env.local` with the project URL and publishable key |
| `scripts/gen-types.mjs` | Regenerates `frontend/src/lib/database.types.ts` |
| `scripts/query.mjs` | Runs one SQL statement (for inspection) |
| `scripts/clean-storage.mjs` | Lists uploaded files nothing references any more; `--delete` removes them |
| `tests/student.test.mjs` | Integration tests against the live project |

The scripts need Node 22+ and no npm packages. They read a Supabase personal access token from
`SUPABASE_ACCESS_TOKEN` and the project from `SUPABASE_PROJECT_REF` (default `yydvlrfsjmpwqthsmzyp`). Never commit the
token, the database password or the secret key.

## Set up a project

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<personal access token>"   # supabase.com/dashboard/account/tokens
$env:SUPABASE_PROJECT_REF = "<project ref>"
node backend/scripts/apply-migrations.mjs     # schema, functions, seed (records them in supabase_migrations)
node backend/scripts/setup-auth.mjs           # auto-confirm sign-ups, site URL, demo student
node backend/scripts/frontend-env.mjs         # frontend/.env.local
npm run dev                                   # then open http://localhost:8443 and choose Student
```

`setup-auth.mjs` sets the site URL to `http://localhost:8443`. For a deployed frontend, run it with
`SITE_URL=https://your-host` (and `REDIRECT_URLS=…` for more origins), and set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` in the host's build environment.

Migrations use the Supabase CLI's history table, so `supabase db push` and `supabase migration list` work on the same
project. After a schema change, add a new migration file, apply it, and run `gen-types.mjs`.

## Tests

```powershell
node --test "backend/tests/*.test.mjs"   # or: npm run test:backend
```

The tests sign up two throwaway students, check that each sees only their own rows, that quiz answers and grades can't
be read or forged, and that every RPC enforces its rules. They delete the accounts and their uploaded files afterwards.
The browser flows for the portal live in `.agents/tasks/redesign-premium-ui/tools/student-flows.mjs` and reset the demo
student before each flow.

`.agents/tasks/student-backend/tools/rehearse-migrations.mjs` checks that the migration files rebuild the live
database exactly: it drops everything they own, runs them, and compares functions, tables, columns, grants, policies,
triggers, buckets, the cron job and seeded rows with what was there before, all inside one transaction that it then
rolls back. Run it after changing the live database by hand.

## Data model

- **Shared content** (read-only to students): `courses`, `course_modules`, `lessons`, `course_materials`,
  `assignments`, `quizzes`, `timetable_slots`, `campus_events`, `announcements`, `faqs`, `mentors`, `study_squads`.
  `quiz_questions` holds the correct answers and has no client privileges at all.
- **Per student** (`student_id` defaults to the caller): profile, enrollments, lesson progress, study minutes,
  submissions, quiz attempts, grades, GPA history, certificates, attendance, leave requests, reminders, event
  registrations, announcement reads, notes, FAQ votes, support tickets and replies, live chat, interview sessions,
  resume, mentor meetings and requests, notifications.
- **Community**: posts, replies, likes, bookmarks, squad memberships, course Q&A and votes. Author columns are filled
  from the caller's profile by a trigger; counters (likes, replies, votes, squad members) are kept by triggers.

## Rules the database enforces

- RLS is on for every table. Students read shared content and their own rows; inserts are limited to the columns a
  student may set (status, score and author columns can't be written).
- Grades, attempts, submissions, certificates, attendance and tickets are written only by SQL functions:

  | RPC | Does |
  | --- | --- |
  | `set_lesson_complete` | Marks a lesson done or not, logs today's study minutes, issues the course certificate when every lesson is done |
  | `submit_assignment` | Validates the GitHub link and the uploaded file, records or replaces the submission (not after grading) |
  | `start_quiz` / `save_quiz_answers` / `submit_quiz` / `get_quiz_review` | Timed attempts: questions without answers, autosave, server-side grading and deadline, review after submitting |
  | `create_support_ticket` / `reply_to_support_ticket` / `set_support_ticket_status` | Tickets with sequential `TKT-` ids; replying reopens a resolved ticket |
  | `send_support_chat_message` | Stores the message and the Learner Success reply |
  | `book_mentor_meeting` / `cancel_mentor_meeting` | Weekday slots in the next 60 days; a slot can't be double-booked |
  | `verify_certificate` | Public check behind the shared `/verify/<credential id>` link |
  | `reset_my_demo_data` | Restores the demo student and moves the demo calendar to today |

- Storage buckets `avatars` (public images, 2 MB), `submissions` (private, 50 MB) and `ticket-attachments` (private,
  10 MB) only accept objects under the uploader's own `<user id>/` folder.
- A pg_cron job grades quiz attempts whose time ran out while the student was away.

## The demo student

`aarav.mehta@learner.ai` / `demo-student` is a shared account: the Student quick-launch and the role switcher sign it
in. Its password, email and two-factor settings can't be changed (database triggers, switchable with the
`demo_locked` setting in `app_private.settings`). "Reset demo data" in the account menu, or `reset_my_demo_data()`,
restores its history and moves every seeded date relative to today. Anyone can also create their own student account
on the sign-in page; email confirmation is off because no SMTP server is configured.

Campus times (timetable, mentor slots) are in `Asia/Kolkata`, set in `app_private.settings`.

## Known limits

- No outgoing email: sign-ups are confirmed immediately and password resets go through Learner Success.
- Resetting the demo restores database rows only. Files uploaded from the demo account stay in Storage until
  `node backend/scripts/clean-storage.mjs --delete` removes the ones nothing references.
- Joining a live class and opening recordings are placeholders until the teacher portal has real sessions.
- The "Trending" tags, "Top helpers" list, interview question bank and resume template are app copy in the frontend.
