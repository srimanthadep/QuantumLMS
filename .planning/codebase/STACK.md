---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
# Technology Stack

**Analysis Date:** 2026-11-06

## Languages

**Primary:**
- TypeScript 5.7+ / 5.9 — Frontend (`frontend/src/**/*.tsx`, `frontend/src/**/*.ts`) and Backend (`backend/src/**/*.ts`, `backend/scripts/**/*.ts`, `backend/tests/**/*.ts`)

**Secondary:**
- SQL (PostgreSQL dialect) — Drizzle schema definitions and migrations (`backend/src/db/schema.ts`, `backend/drizzle/`)
- CSS3 with Tailwind CSS v4 design tokens (`frontend/src/index.css`)
- HTML5 shell (`frontend/index.html`)

## Runtime

**Environment:**
- Node.js >= 22 (`backend/package.json` specifies `"node": ">=22"`)
- Browser: Modern Evergreen Browsers (Chrome, Edge, Firefox, Safari)

**Package Manager:**
- npm / pnpm workspace orchestration
- Monorepo root `package.json` delegating scripts to sub-packages (`--prefix frontend`, `--prefix backend`)
- Lockfiles: `package-lock.json` present

## Frameworks

**Core:**
- React 19.0.0 (`frontend/package.json`) — Single-page application UI component model
- React Router 7.18.4 (`frontend/src/App.tsx`) — Client-side route resolution and navigation
- Fastify 5.12.7 (`backend/src/server.ts`, `backend/src/app.ts`) — High-throughput Node.js HTTP server
- Drizzle ORM 0.45.4 (`backend/src/db/`) — Type-safe PostgreSQL SQL queries and migrations

**Testing:**
- Node.js Native Test Runner (`node --test`) via `tsx` (`backend/package.json`, `npm test` runs `tests/*.test.ts`)
- TypeScript compiler verification (`tsc --noEmit`) on both frontend and backend

**Build/Dev:**
- Vite 8.0.5 (`frontend/vite.config.ts`) — Next-generation frontend bundler with React plugin
- `@tailwindcss/vite` 4.0.0 — Tailwind CSS v4 JIT compiler
- `tsx` 4.23.15 — TypeScript execute and watch runtime for Fastify backend
- `oxfmt` 0.2.0 — High-speed code formatting tool

## Key Dependencies

**Critical:**
- `fastify` (^5.12.7) — Core API server handling request validation, routing, and lifecycle hooks
- `drizzle-orm` (^0.45.4) & `pg` (^8.23.1) — Database interaction with connection pooling against PostgreSQL
- `zod` (^4.6.7) — Request payload, query, and parameter schema validation in API routes
- `aws-amplify` (^6.22.2) — Client-side AWS Cognito authentication in React
- `@aws-sdk/client-cognito-identity-provider` (^3.1161.0) — Server-side Cognito administration and token verification
- `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` (^3.1161.0) — Direct-to-storage and presigned URL handling for files and lecture videos
- `jose` (^6.2.15) — JWT token decoding, claims verification, and public key verification
- `framer-motion` (^14.6.0) — Smooth UI micro-interactions, layout transitions, and animated portals
- `@radix-ui/react-*` primitives — Accessible UI dropdowns, dialogs, popovers, tabs, and tooltips

**Infrastructure:**
- `@fastify/cors` (^11.3.1) — Cross-origin resource sharing configuration
- `@fastify/helmet` (^13.2.0) — HTTP security headers enforcement
- `@fastify/rate-limit` (^11.2.1) — Endpoint rate limiting against abuse
- `@fastify/websocket` (^11.3.6) — Real-time bidirectional streaming for live chat and notifications
- `cognito-local` (^5.3.0) — Local offline Cognito emulator for zero-AWS local development

## Configuration

**Environment:**
- Backend: Configured via `backend/.env` (validated by Zod in `backend/src/config.ts`)
- Frontend: Configured via `frontend/.env.local` (Vite client env vars prefixed with `VITE_`)
- Key configs required:
  - `DATABASE_URL`: PostgreSQL connection string (Supabase session/transaction pooler)
  - `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`: AWS Cognito settings
  - `STORAGE_DRIVER`: `local` or `s3`
  - `S3_BUCKET`, `S3_REGION`, `UPLOAD_SIGNING_SECRET`: S3/R2 storage settings
  - `PORT`: API server listen port (default 4000)

**Build:**
- Frontend: `frontend/vite.config.ts`, `frontend/tsconfig.json`
- Backend: `backend/tsconfig.json`, `backend/tsconfig.build.json`, `backend/drizzle.config.ts`

## Platform Requirements

**Development:**
- Node.js 22.x or higher
- PowerShell / Bash
- Local PostgreSQL instance or Supabase cloud connection
- Ports: Frontend on `:8443`, Backend on `:4000`, Cognito Local emulator on `:9229`

**Production:**
- Linux container / AWS ECS Fargate or EC2
- Managed PostgreSQL (Supabase / AWS RDS PostgreSQL)
- AWS Cognito User Pool
- Cloudflare R2 / AWS S3 for video assets and learning materials

---

*Stack analysis: 2026-11-06*
