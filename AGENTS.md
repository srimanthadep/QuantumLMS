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
- `backend/` - Backend services, API endpoints, and database models (currently empty placeholder)
- `package.json` - Monorepo workspace root orchestration with npm/pnpm delegation scripts

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
