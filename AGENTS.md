# QuantumLMS Monorepo

Full-stack Learning Management System monorepo segregated into `frontend/` and `backend/`.

## Architecture & Directory Structure

- `frontend/` - React 19 + Vite 8 + Tailwind CSS v4 single-page application
  - `frontend/src/main.tsx` - React entrypoint; mounts `App.tsx` into `#root`
  - `frontend/src/App.tsx` - Primary application component and navigation router
  - `frontend/src/index.css` - Global CSS entrypoint and Tailwind CSS v4 design tokens
  - `frontend/index.html` - Vite HTML shell
  - `frontend/package.json` - Frontend dependencies and scripts
  - `frontend/vite.config.ts` - Vite configuration with React and Tailwind v4 plugins
- `backend/` - Node API for the Student and Evaluator portals (see `backend/README.md`)
  - `backend/src/` - Fastify 5 server: `auth/` (Cognito token checks), `db/schema.ts` (Drizzle data model), `db/seed/`, `modules/student/`, `modules/evaluator/`, `storage/` (S3 and local drivers)
  - `backend/drizzle/` - Generated SQL migrations
  - `backend/scripts/` - Cognito setup and smoke test, database check, frontend API type generation
  - `backend/tests/` - Integration tests against the real database (`npm test` in `backend/`)
- `frontend/src/lib/api.ts` - API client (sends the Cognito access token); `frontend/src/lib/api.types.ts` is generated
- `frontend/src/lib/auth.ts` - Amplify sign-in against the Cognito user pool
- `frontend/src/app/CognitoGate.tsx` - Session gate shared by the Student and Evaluator portals
- `frontend/src/pages/student/data/`, `frontend/src/pages/evaluator/data/` - Each portal's data layer: cached resources and API calls
- `package.json` - Monorepo workspace root orchestration with npm/pnpm delegation scripts

## Backend

- The Student and Evaluator portals use the API in `backend/`. The teacher, support and admin portals still run on demo data in the browser.
- Stack: Fastify 5 + TypeScript, Drizzle ORM on node-postgres, zod for input, AWS Cognito for sign-in, S3 for uploads. Everything is meant to run on AWS.
- The database is plain PostgreSQL. Supabase hosts it in development, used **only** as Postgres: tables, constraints and indexes in the `lms` schema. Don't use Supabase Auth, Storage, the REST/Data API, row-level security, SQL functions, triggers or pg_cron; every rule lives in the API.
- Settings live in `backend/.env` (`backend/.env.example` lists them) and `frontend/.env.local` (`frontend/.env.example`). Both are git-ignored. Never commit tokens, passwords or secret keys.
- Schema changes: edit `backend/src/db/schema.ts`, then `npm run db:generate -- --name <change>`, `npm run db:migrate` and `npm run gen:types` (all in `backend/`).
- Supabase's session pooler allows 15 clients in total, so keep `DATABASE_POOL_MAX` low (5 in development).
- Local development needs three processes: `npm run cognito:local` (with `$env:CODE="123456"`), `npm run dev` in `backend/` (API on :4000) and `npm run dev` in `frontend/` (Vite proxies `/api` to the API).
- Keep grading, quiz answers, ownership checks and author fields on the server; ids in request bodies are never trusted.

## Development Server

You can run the project from either the repository root or inside `frontend/`:
- From root: `npm run dev` (delegates to `npm --prefix frontend run dev`); `npm run dev:api` starts the API
- From `frontend/`: `npm run dev`
- Port: Default 8443 (configured in `frontend/vite.config.ts`); the API listens on 4000

## Dependencies

- Runtime: React 19 and React DOM 19, React Router 7, Framer Motion, Radix UI primitives
- Styling: Tailwind CSS v4 with `@tailwindcss/vite`
- Build tooling: Vite 8, TypeScript 5.7, `@vitejs/plugin-react`
- Auth: `aws-amplify` (Cognito)
- API: Node 22, Fastify 5, Drizzle ORM, `pg`, zod, AWS SDK v3 (Cognito, S3)

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
