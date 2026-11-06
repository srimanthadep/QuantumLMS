---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
# Codebase Structure

**Analysis Date:** 2026-11-06

## Directory Layout

```
QuantumLMS/
├── frontend/                   # React 19 + Vite 8 SPA client
│   ├── src/
│   │   ├── app/                # Application root, Cognito session gates, router
│   │   ├── components/         # Shared design system components & UI primitives
│   │   │   ├── charts/         # AreaChart, DonutChart, Sparkline, TrendChart
│   │   │   ├── shared/         # SecuritySettings, ThemeAccentPicker, StatCard
│   │   │   ├── shell/          # Global shell headers, sidebar, Clover AI assistant
│   │   │   └── ui/             # Radix UI primitives (Button, Dialog, Badge, Input)
│   │   ├── data/               # Client-side Zustand stores & mock demo datasets
│   │   ├── lib/                # API client, Amplify auth wrapper, audio extractor
│   │   └── pages/              # Portal views segregated by user role
│   │       ├── admin/          # Admin Portal & Course Management views
│   │       ├── evaluator/      # Evaluator Portal & Grading Rubric views
│   │       ├── student/        # Student Portal (Dashboard, Courses, LiveClass, Quizzes)
│   │       ├── superadmin/     # Super Admin Portal & Platform Governance views
│   │       ├── support/        # Support Desk, Ticket Queues, Knowledge Base
│   │       └── teacher/        # Teacher Portal & Cohort Batch Management
│   ├── index.html              # Vite HTML shell
│   ├── package.json            # Frontend dependencies and scripts
│   └── vite.config.ts          # Vite bundler configuration with React and Tailwind v4
├── backend/                    # Fastify 5 REST API & WebSocket server
│   ├── src/
│   │   ├── auth/               # AWS Cognito JWT token validation and role guards
│   │   ├── db/                 # Drizzle ORM schema, client connection, migrations
│   │   │   ├── schema.ts       # PostgreSQL table definitions in lms schema
│   │   │   └── seed/           # Seed scripts for courses, users, and timetable
│   │   ├── modules/            # Modular domain controllers & business logic
│   │   │   ├── admin/          # Admin courses, videos, audio chunking, stats
│   │   │   ├── evaluator/      # Rubrics, criteria, student evaluation scoring
│   │   │   ├── student/        # Courses, lessons, quizzes, timetable, notes
│   │   │   ├── super-admin/    # Tenant management, audit logs, role grants
│   │   │   ├── support/        # Tickets, chat messages, FAQs, knowledge base
│   │   │   └── teacher/        # Teacher cohort scheduling and approvals
│   │   ├── routes/             # Public file streaming and WebSocket routes
│   │   ├── storage/            # S3/R2 and local disk storage drivers
│   │   ├── app.ts              # Fastify application builder and plugin wiring
│   │   ├── config.ts           # Zod-validated environment configuration
│   │   └── server.ts           # Server bootstrap and process signal listeners
│   ├── drizzle/                # Generated SQL migrations from Drizzle Kit
│   ├── scripts/                # Cognito setup, DB check, API type generation
│   ├── tests/                  # Node.js integration tests against PostgreSQL
│   └── package.json            # Backend dependencies and scripts
├── .planning/                  # GSD planning, codebase intelligence, and roadmap
│   └── codebase/               # 7 structured codebase mapping documents
├── AGENTS.md                   # Project rules and architectural guidelines
└── package.json                # Monorepo root workspace orchestration
```

## Directory Purposes

**`frontend/src/pages/`:**
- Purpose: Contains individual web application pages segregated into role-specific subfolders (`student/`, `admin/`, `evaluator/`, `teacher/`, `support/`, `superadmin/`)
- Contains: Full-page React components and modular view components
- Key files: `frontend/src/pages/admin/views/CoursesView.tsx`, `frontend/src/pages/admin/views/CourseEditorModal.tsx`, `frontend/src/pages/student/CourseDetailsPage.tsx`

**`frontend/src/lib/`:**
- Purpose: Core browser utilities, network clients, authentication wrappers, and media processors
- Key files: `frontend/src/lib/api.ts` (API client), `frontend/src/lib/auth.ts` (Amplify Cognito auth), `frontend/src/lib/audioExtractor.ts` (Web Audio & VAD)

**`backend/src/modules/`:**
- Purpose: Domain-driven API route controllers implementing business rules, database transactions, and Zod validations
- Key files: `backend/src/modules/admin/courses.ts`, `backend/src/modules/student/courses.ts`, `backend/src/modules/evaluator/evaluations.ts`

**`backend/src/db/`:**
- Purpose: Data access layer defining PostgreSQL schema, constraints, sequences, and Drizzle query builders
- Key files: `backend/src/db/schema.ts`, `backend/src/db/client.ts`, `backend/src/db/migrate.ts`

**`backend/src/storage/`:**
- Purpose: Pluggable object storage drivers for Cloudflare R2 / AWS S3 and local filesystem fallback
- Key files: `backend/src/storage/s3.ts`, `backend/src/storage/local.ts`, `backend/src/storage/index.ts`

## Key File Locations

**Entry Points:**
- `frontend/src/main.tsx`: React DOM mount point
- `frontend/src/App.tsx`: Primary application navigation and route selector
- `backend/src/server.ts`: Fastify HTTP listener and job initialization

**Configuration:**
- `package.json`: Root monorepo scripts
- `frontend/vite.config.ts`: Vite plugins, dev server port (8443), and API proxying
- `backend/src/config.ts`: Environment schema validation
- `backend/drizzle.config.ts`: Drizzle ORM migration configuration

**Core Logic:**
- `backend/src/modules/admin/courses.ts`: Course, chapter, lesson, material, assignment, and video pipeline CRUD
- `backend/src/modules/student/courses.ts`: Student curriculum progress, lesson playback, and doubt bookmarks
- `frontend/src/pages/admin/views/VideoCourseUploadModal.tsx`: Real-time audio extraction and multi-quality transcoding

**Testing:**
- `backend/tests/`: Integration test suites covering admin, student, evaluator, and auth workflows

## Naming Conventions

**Files:**
- React Components: PascalCase (`CourseEditorModal.tsx`, `VideoCourseUploadModal.tsx`, `LiveClassPage.tsx`)
- Utilities & Modules: camelCase (`audioExtractor.ts`, `api.ts`, `schema.ts`, `courses.ts`)
- Test files: `*.test.ts` placed in `backend/tests/`

**Directories:**
- Frontend: lowercase or kebab-case for folders (`components/shell`, `pages/student`)
- Backend: lowercase domain groupings (`modules/admin`, `modules/student`, `storage/`)

## Where to Add New Code

**New Feature (e.g. New Student Quiz or Course Discussion):**
- Backend Route: Add route handler in `backend/src/modules/student/` or create a new file in that module directory, registering it in `backend/src/modules/student/index.ts`.
- Backend Schema: Add or update table models in `backend/src/db/schema.ts`, then run `npm run db:generate` in `backend/`.
- Frontend API Client: Types are generated in `frontend/src/lib/api.types.ts`. Call endpoints via `api.get` / `api.post` in `frontend/src/lib/api.ts`.
- Frontend View: Add view component in `frontend/src/pages/student/` and register navigation in `frontend/src/pages/student/StudentPortal.tsx`.

**New Component/UI Primitive:**
- Reusable UI component: Add to `frontend/src/components/ui/` using Radix UI primitives and Tailwind CSS.
- Portal-specific modal/view: Add to `frontend/src/pages/<role>/views/`.

**Utilities:**
- Client-side helpers: `frontend/src/lib/`
- Server-side helpers: `backend/src/` (e.g. `backend/src/auth/`, `backend/src/storage/`)

## Special Directories

**`.planning/`:**
- Purpose: Contains GSD planning artifacts, codebase maps, roadmaps, and requirements
- Generated: Managed by GSD tooling
- Committed: Yes

**`backend/drizzle/`:**
- Purpose: SQL migration snapshots generated by Drizzle Kit
- Generated: Yes (`npm run db:generate`)
- Committed: Yes

**`backend/.data/`:**
- Purpose: Local uploads storage directory when `STORAGE_DRIVER=local`
- Generated: Yes
- Committed: No (git-ignored)

---

*Structure analysis: 2026-11-06*
