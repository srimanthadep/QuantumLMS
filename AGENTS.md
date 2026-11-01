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
- `backend/` - Supabase backend for the Student role (see `backend/README.md`)
  - `backend/supabase/migrations/` - Schema with row-level security, SQL functions (RPC), storage, seed data
  - `backend/scripts/` - Apply migrations, configure auth, write `frontend/.env.local`, regenerate DB types, clean unreferenced uploads
  - `backend/tests/` - Integration tests against the live project (`npm run test:backend`)
- `frontend/src/lib/supabase.ts` - Supabase client; `frontend/src/lib/database.types.ts` is generated
- `frontend/src/pages/student/data/` - Student data layer: session gate, cached resources, queries and RPC calls
- `package.json` - Monorepo workspace root orchestration with npm/pnpm delegation scripts

## Backend

- Only the Student portal uses Supabase (Auth, Postgres, Storage). The other portals still run on demo data.
- The frontend needs `frontend/.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  (`node backend/scripts/frontend-env.mjs` writes it; `frontend/.env.example` shows the format).
- Backend scripts read `SUPABASE_ACCESS_TOKEN` from the environment. Never commit tokens, passwords or secret keys.
- Schema changes go in a new migration file; apply with `npm run db:migrate`, then run `node backend/scripts/gen-types.mjs`.
- Don't leave hand-made changes on the live database: mirror them in a migration, then run
  `node .agents/tasks/student-backend/tools/rehearse-migrations.mjs`, which reports any difference between the live
  database and a fresh build from the migrations (it rolls itself back).
- Students can only write through RLS-checked tables or the SQL functions; keep grading, quiz answers and author fields on the server.

## Development Server

You can run the project from either the repository root or inside `frontend/`:
- From root: `npm run dev` (delegates to `npm --prefix frontend run dev`)
- From `frontend/`: `npm run dev`
- Port: Default 8443 (configured in `frontend/vite.config.ts`)

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with `@tailwindcss/vite`
- Build tooling: Vite 8, TypeScript 5.7, `@vitejs/plugin-react`
- State/Database: `@supabase/supabase-js`

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
