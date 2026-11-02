# Quantum LMS API

The backend for the Student and Evaluator portals: a Node.js API server on PostgreSQL, with sign-in through Amazon
Cognito and uploads in Amazon S3. It is built to run on AWS (see [Deploying to AWS](#deploying-to-aws)).

- **Server:** Node 22, TypeScript, [Fastify 5](https://fastify.dev), [Drizzle ORM](https://orm.drizzle.team) on
  node-postgres, [zod](https://zod.dev) for input.
- **Database:** any PostgreSQL 15+. Development and the current deployment use a Supabase project **as plain
  PostgreSQL**: tables, constraints and indexes only, all in the `lms` schema. Nothing uses Supabase Auth, Storage, the
  REST/Data API, row-level security, SQL functions, triggers or pg_cron; every rule lives in this server.
- **Sign-in:** Cognito user pool. The browser signs in with Amplify and sends the access token; the API verifies it
  against the pool's JWKS (issuer, `token_use=access`, app client id) and reads the role from `cognito:groups`.
- **Files:** S3 with presigned upload and download links. In development a local-disk driver serves HMAC-signed links
  from the API itself.

The teacher, support and admin portals still run on demo data in the browser.

## Layout

| Path | What it holds |
| --- | --- |
| `src/server.ts`, `src/app.ts`, `src/bootstrap.ts` | Process entry, the Fastify app (security headers, CORS, rate limit, errors), wiring |
| `src/config.ts` | Every setting, validated at startup (`.env.example` lists them) |
| `src/auth/` | Token verification, the Cognito gateway, first-sign-in account creation |
| `src/db/schema.ts` | The whole data model; `drizzle/` holds the generated migrations |
| `src/db/seed/` | Course content, rubrics, the demo student and the demo evaluator's marking history |
| `src/modules/student/` | `/api/student/*`: courses, quizzes, campus, community, career, support, evaluation results |
| `src/modules/evaluator/` | `/api/evaluator/*`: queue, rubric evaluations, release, re-evaluations, reports, profile |
| `src/storage/` | The storage interface with the S3 and local drivers |
| `scripts/` | Cognito setup and smoke test, database check, frontend type generation |
| `tests/` | Integration tests against the real database with a local token issuer |
| `Dockerfile` | The production image |

## Run it locally

You need Node 22+ and a PostgreSQL database (a Supabase project works; use its **session pooler** connection string).

```powershell
cd backend
npm install
copy .env.example .env            # then fill in DATABASE_URL and UPLOAD_SIGNING_SECRET
npm run db:migrate                # creates the lms schema and tables
npm run cognito:local             # terminal 1: the Cognito emulator on :9229 (keep it running)
npm run cognito:setup             # once: creates the user pool, app client, groups and demo users, and writes the ids to backend/.env and frontend/.env.local
npm run db:seed                   # course content and rubrics (demo accounts are seeded on first sign-in)
npm run dev                       # terminal 2: the API on :4000, restarts on changes
```

Then run `npm run dev` in `frontend/` (`cognito:setup` already wrote its `.env.local`, pointing at the emulator with
`VITE_COGNITO_AUTH_FLOW=USER_PASSWORD_AUTH`). Vite proxies `/api` to `localhost:4000`.

The emulator keeps its data in `backend/.cognito` (git-ignored). It prints sign-up and reset codes to its console;
start it with `$env:CODE="123456"; npx cognito-local` to make every code `123456` (the browser checks rely on that).

### Settings

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_CA_CERT` | PostgreSQL connection; `require` = TLS without certificate checks, `verify` = checked against the CA |
| `DATABASE_POOL_MAX` | Connections per API process. Supabase's session pooler allows 15 clients in total on the smallest compute size, so keep processes × this below it (or use the transaction pooler, port 6543; the API keeps no session state) |
| `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | The user pool and the browser app client |
| `COGNITO_ENDPOINT` | Only for the local emulator; empty in AWS |
| `STORAGE_DRIVER` | `s3` in AWS (`S3_BUCKET`, `S3_REGION`), `local` in development (`LOCAL_STORAGE_DIR`, `UPLOAD_SIGNING_SECRET`) |
| `CORS_ORIGINS` | Browser origins allowed to call the API directly (not needed when the site reaches it through `/api` on the same origin) |
| `DEMO_MODE` | Demo accounts, quick launch and "Reset demo data" |
| `CAMPUS_TZ` | Campus time zone for timetables, mentor slots and reports (default `Asia/Kolkata`) |
| `QUIZ_SWEEP_SECONDS` | How often expired quiz attempts are graded in the background (0 turns it off) |

## Accounts and roles

- A Cognito user with no group is a **student**. Groups `evaluators`, `teachers`, `support`, `admins` and
  `super-admins` give those roles; the highest one wins. The role is re-read from the token on every request.
- The first request of a new Cognito user creates its `lms.users` row from the Cognito attributes (email, name) and
  runs the role's onboarding: a student profile with starter courses, or an evaluator profile assigned to every
  assessment that has a rubric. A row with the same email (a seeded demo account) is linked instead of duplicated.
- **Sign out of all devices** (`POST /api/me/sign-out-everywhere`) revokes the Cognito refresh tokens and stores
  `users.sessions_revoked_at`; access tokens issued before it are refused at once.
- **Demo accounts** (with `DEMO_MODE=true`): `aarav.mehta@learner.ai` / `DemoStudent2026` and
  `evaluator@quantumschool.ai` / `DemoEvaluator2026`. Their passwords are public, so password, two-factor and session
  changes are blocked in the UI, and "Reset demo data" restores their data, password and MFA. The evaluator demo
  marks eight seeded learners (on `.invalid` addresses, so nobody can sign in as them) alongside a colleague evaluator.

## What the API enforces

**Students** only ever see and change their own rows; ids in request bodies are ignored. Quiz questions go out without
answers, attempts are timed and graded on the server, and expired attempts are graded lazily on read and by a
background sweep (one instance at a time through a transaction-scoped advisory lock). Submissions take a GitHub link
and/or a file the student uploaded to their own storage folder; graded work, and work an evaluator has started
(`Under Review`), can't be resubmitted. Counters, author fields, ticket numbers and certificates are written by the
server only.

**Evaluators** see only submissions to assessments they're assigned (`evaluator_assignments`); others return 404.

| Step | Endpoint | Rules |
| --- | --- | --- |
| Queue | `GET /api/evaluator/queue` | Every submission with its state: pending, draft, evaluated, released |
| Workspace | `GET /api/evaluator/submissions/:id` (`/file`, `/file/preview`) | Submission, rubric, evaluation, student context; text files up to 200 KB inline |
| Draft | `PUT …/evaluation` | The first save claims the submission (others get 409) and marks it `Under Review` for the student. Points must be whole numbers within each criterion |
| Finish | `POST …/evaluation/finish` | Every criterion scored and 20+ characters of feedback; `release: true` releases at once |
| Reopen / discard | `POST …/evaluation/reopen`, `DELETE …/evaluation` | Only the owner, only before release |
| Release | `POST /api/evaluator/release` | Writes the score (rubric total on the assignment's scale), letter grade and feedback to the submission, marks it `Graded` and notifies the student |
| Re-evaluation | `GET /api/evaluator/reevaluations`, `POST …/:id/start`, `POST …/:id/resolve` | Students ask once per grade, within 14 days (`POST /api/student/assignments/:id/reevaluation`). Taking a request locks it to that evaluator. *Revise* re-scores the rubric and must change the score; *uphold* keeps it. Either way the student gets the explanation |
| Reports | `GET /api/evaluator/reports` | Own pace and turnaround, score spread, grades and criterion averages per assessment, team totals |

Students read a released grade's rubric breakdown at `GET /api/student/assignments/:id/evaluation`.

Letter grades: A+ ≥ 90, A ≥ 85, A- ≥ 80, B+ ≥ 75, B ≥ 70, B- ≥ 65, C+ ≥ 60, C ≥ 55, D ≥ 50, otherwise F.

## Database changes

Edit `src/db/schema.ts`, then:

```powershell
npm run db:generate -- --name <what-changed>   # writes drizzle/NNNN_<name>.sql; review it
npm run db:migrate                             # applies pending migrations (history in lms.__drizzle_migrations)
npm run gen:types                              # rewrites frontend/src/lib/api.types.ts
```

## Tests

```powershell
npm test                     # 46 integration tests: auth, student, evaluator (about 3 minutes against Supabase)
npm run typecheck
npm run cognito:smoke        # signs a demo account in through the emulator and calls /api/me
```

The tests use the real database with a local token issuer and a fake Cognito; each file tags the accounts it creates
and deletes them afterwards. Browser checks live in `.agents/tasks/redesign-premium-ui/tools/`: `student-flows.mjs`,
`evaluator-flows.mjs` and `smoke.mjs` (they need the API, the emulator started with `CODE=123456`, and the site).

## Deploying to AWS

`infra/` is an AWS CDK app (TypeScript) with two stacks in one region (default `eu-north-1`):

- **Auth:** the **Cognito** user pool (email sign-in, the password rule, optional authenticator-app MFA), the role
  groups and the browser app client (SRP; no client secret). Kept and deletion-protected.
- **App:** the **API** from `backend/Dockerfile` on **ECS Fargate** in private subnets, behind an internal Application
  Load Balancer that only CloudFront reaches (a VPC origin); `DATABASE_URL` comes from **Secrets Manager**; each
  container applies pending migrations before the server starts. An **S3** bucket for uploads (private, encrypted,
  CORS for the site's origin). The **site** in a private S3 bucket behind **CloudFront**, which routes `/api/*` to
  the API, so the browser calls it on its own origin.

`npm run deploy` in `infra/` deploys both and builds the web app with the user pool's ids in between; with
`DEMO_MODE` on, `npm run cognito:setup:aws` here adds the demo accounts. See `infra/README.md`. You need an AWS
account signed in on the machine (`aws configure sso`) and Docker running.

## Known limits

- No outgoing email from the API. In AWS, Cognito sends sign-up and reset codes with its default sender (limited daily
  volume); configure SES for production volumes.
- Admins can't yet assign assessments to evaluators from a screen: new evaluators get every assessment with a rubric.
- Rubrics are seeded with the course content; there is no rubric editor yet.
- Joining a live class and opening recordings are placeholders until the teacher portal has real sessions.
