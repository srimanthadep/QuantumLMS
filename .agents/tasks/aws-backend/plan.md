# AWS backend (Cognito + PostgreSQL) and the evaluator portal

User requests (Nov 2026):
1. "redesign the entire evaluator page from scratch … premium, micro animations, interactive and clean; add or remove any components"
2. "build the backend simultaneously for evaluator"
3. "I don't want supabase backend, I want a real backend; I will not be using supabase in production"
4. "deploying this entire application in AWS, AWS Cognito for auth; for the database use Supabase only, just create
   tables, don't use any backend functions of Supabase, use Supabase as PostgreSQL"

## Decisions
- **Server:** Node 22 + TypeScript, Fastify 5, Drizzle ORM on node-postgres, zod for input. Lives in `backend/`.
  The old Supabase migrations, scripts and tests are replaced.
- **Database:** Supabase Postgres used as plain PostgreSQL through `DATABASE_URL` (session pooler, TLS). All tables in
  schema `lms` (Supabase's Data API exposes `public` to the browser key, so nothing goes there). Tables, constraints,
  indexes and identity columns only: no SQL functions, triggers, RLS, pg_cron, Supabase Auth, Storage or REST.
  Drizzle migrations (`backend/drizzle/`), history table in `lms`.
- **Auth:** AWS Cognito user pool. Frontend: Amplify v6 Auth (`aws-amplify/auth`). Backend verifies Cognito access
  tokens (jose, remote JWKS, iss + token_use + client_id), reads groups from `cognito:groups`. Groups: `students`,
  `teachers`, `evaluators`, `support`, `admins`, `super-admins`; no group = student. Profiles are created on the first
  request (attributes from Cognito `GetUser` with the access token).
- **Local dev:** `cognito-local` emulator on :9229 (USER_PASSWORD_AUTH; Amplify `userPoolEndpoint` override).
  Production uses SRP against real Cognito. Backend tests sign tokens with a local test key (configurable issuer/JWKS).
- **Uploads:** storage driver interface. `s3` (presigned PUT/GET) in AWS, `local` (disk + HMAC-signed URLs served by
  the API) for development.
- **Jobs:** quiz attempts past their deadline are graded lazily on reads and by an in-process interval (advisory
  lock so several instances don't race).
- **AWS:** Dockerfile for the API; CDK app in `infra/` (Cognito pool + groups + SPA client, S3 uploads bucket, ECS
  Fargate + ALB for the API, Secrets Manager for DATABASE_URL, S3 + CloudFront for the SPA). Region eu-north-1.
- **Contract:** the API returns the same snake_case row shapes the student data layer already derives from, so the
  pages keep their view models.
- **Evaluator domain (new):** rubrics + criteria, evaluator assignments per assessment, evaluations (draft/submitted,
  criterion scores), release to students (writes the submission's score/grade/feedback + notification), re-evaluation
  requests created by students and resolved by evaluators, reports. Demo learners (DB only) supply submissions.
- Teacher, support and admin portals keep demo data for now.

## Stages
1. [ ] Server foundation: config, db client, schema for every table, migrations, Cognito auth, storage, errors,
       health, test harness with a local token issuer, cognito-local setup script.
2. [ ] Student API (ported from the SQL functions + RLS rules) + seed; port the integration tests; frontend: Amplify
       auth + API client replacing supabase-js; 15 browser flows pass again.
3. [ ] Evaluator API + from-scratch evaluator portal; student re-evaluation requests; evaluator flows.
4. [ ] Remove supabase-js and the old Supabase objects; Dockerfile, CDK, docs (backend/README.md, AGENTS.md, design.md).

## Notes
- Credentials live only in git-ignored `backend/.env` / `frontend/.env.local`.
- Remind the user to rotate the Supabase DB password and access token.
