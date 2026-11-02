# AWS backend (Cognito + PostgreSQL) and the evaluator portal

User requests (Nov 2026):
1. "redesign the entire evaluator page from scratch … premium, micro animations, interactive and clean; add or remove any components"
2. "build the backend simultaneously for evaluator"
3. "I don't want supabase backend, I want a real backend; I will not be using supabase in production"
4. "deploying this entire application in AWS, AWS Cognito for auth; for the database use Supabase only, just create
   tables, don't use any backend functions of Supabase, use Supabase as PostgreSQL"

## Decisions
- **Server:** Node 22+ and TypeScript, Fastify 5, Drizzle ORM on node-postgres, zod for input. Lives in `backend/`.
  The old Supabase migrations, scripts and tests are removed (they stay in git history).
- **Database:** Supabase Postgres used as plain PostgreSQL through `DATABASE_URL` (session pooler, TLS). All tables in
  schema `lms` (Supabase's Data API exposes `public` to the browser key, so nothing goes there). Tables, constraints,
  indexes and identity columns only: no SQL functions, triggers, RLS, pg_cron, Supabase Auth, Storage or REST.
  Drizzle migrations (`backend/drizzle/`), history table in `lms`.
- **Pooler limit:** Supabase's session pooler allows 15 clients in total. `DATABASE_POOL_MAX=5` locally and per AWS
  task, the test harness uses 4, `npm test` runs two files at a time.
- **Auth:** AWS Cognito user pool. Frontend: Amplify v6 Auth (`aws-amplify/auth`). Backend verifies Cognito access
  tokens (jose, remote JWKS, iss + token_use + client_id), reads groups from `cognito:groups`. Groups: `students`,
  `teachers`, `evaluators`, `support`, `admins`, `super-admins`; no group = student. Profiles are created on the first
  request (attributes from Cognito `GetUser` with the access token).
- **Sign out of all devices:** Cognito GlobalSignOut plus `users.sessions_revoked_at`; tokens issued before it are
  refused. Blocked for the shared demo accounts.
- **Local dev:** `cognito-local` emulator on :9229 (USER_PASSWORD_AUTH; Amplify `userPoolEndpoint` override). Its
  missing operations (GlobalSignOut, AdminSetUserMFAPreference) are skipped locally. Production uses SRP against
  real Cognito. Backend tests sign tokens with a local test key (configurable issuer/JWKS).
- **Uploads:** storage driver interface. `s3` (presigned PUT/GET) in AWS, `local` (disk + HMAC-signed URLs served by
  the API) for development.
- **Jobs:** quiz attempts past their deadline are graded lazily on reads and by an in-process interval
  (`pg_try_advisory_xact_lock`, so it works through any pooler and several instances don't race).
- **AWS:** `backend/Dockerfile` (migrations, then the server). CDK app in `infra/` with two stacks: Auth (Cognito pool,
  web client, groups; retained) and App (VPC with one NAT gateway, API on ECS Fargate behind an internal ALB that
  only CloudFront reaches through a VPC origin, Secrets Manager for DATABASE_URL, S3 uploads bucket, the site in S3 +
  CloudFront with `/api/*` to the ALB). `npm run deploy` builds the site with the pool's ids between the two.
  Region eu-north-1.
- **Contract:** the API returns the same snake_case row shapes the student data layer already derives from, so the
  pages keep their view models.
- **Evaluator domain:** rubrics + criteria, evaluator assignments per assessment, evaluations (draft → evaluated →
  released, criterion scores; the first draft save claims the submission), release to students (writes the
  submission's score, grade and feedback + notification), re-evaluation requests created by students (once, within
  14 days) and resolved by evaluators (revise or uphold), reports. Demo learners (DB only) supply submissions.
- Teacher, support and admin portals keep demo data for now.

## Stages
1. [x] Server foundation: config, db client, schema for every table, migrations, Cognito auth, storage, errors,
       health, test harness with a local token issuer, cognito-local setup script.
2. [x] Student API (ported from the SQL functions + RLS rules) + seed; ported integration tests; frontend: Amplify
       auth + API client replacing supabase-js; 15 browser flows pass again.
3. [x] Evaluator API + from-scratch evaluator portal; student evaluation view and re-evaluation requests; 8 evaluator
       browser flows.
4. [x] Removed supabase-js and the old Supabase files; Dockerfile, CDK, docs (backend/README.md, infra/README.md,
       AGENTS.md, design.md).
5. [ ] Waiting on the user: AWS access for a real deploy; confirmation to drop the old Supabase objects (44 public
       tables, schema app_private, triggers on auth.users and auth.mfa_factors, storage buckets and policies, the
       pg_cron job finalize-quiz-attempts, the old demo auth user).

## Verification (Nov 2)
- Backend: 46/46 integration tests (auth 8, student 23, evaluator 15), typecheck.
- Browser: student flows 15/15, evaluator flows 8/8, live student smoke 18/18, portal smoke (all portals, desktop +
  mobile).
- Production build of the API rehearsed without Docker: `npm ci`, `tsc` build, `npm ci --omit=dev`, migrations and
  the server from `dist/` (health, signed-in student and evaluator requests).
- `cdk synth` of both stacks with placeholder account values; template checked (internal ALB, CloudFront-only
  ingress, VPC origin HTTP-only, secrets, IAM, CORS). Not deployed: no AWS access here.

## Notes
- Credentials live only in git-ignored `backend/.env` / `frontend/.env.local`.
- Remind the user to rotate the Supabase DB password and access token.
