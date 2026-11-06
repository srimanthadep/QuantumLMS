---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
<!-- refreshed: 2026-11-06 -->
# Architecture

**Analysis Date:** 2026-11-06

## System Overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                      Client UI Single-Page Application                    │
│                        (React 19 + Vite 8 + Tailwind)                     │
├────────────────────┬────────────────────┬─────────────────────────────────┤
│   Student Portal   │  Evaluator Portal  │  Admin / Teacher UI Portals     │
│ `frontend/src/`    │ `frontend/src/`    │ `frontend/src/pages/admin/`     │
└─────────┬──────────┴─────────┬──────────┴───────────────┬─────────────────┘
          │ (JWT Access Token) │ (Direct /api Proxied)    │
          ▼                    ▼                          ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    Fastify 5 REST API & WebSocket Gateway                 │
│                              `backend/src/`                               │
├────────────────────┬────────────────────┬─────────────────────────────────┤
│ Auth & Cognito Gate│ Rate Limiter & CORS│ Zod Validation & Error Handling │
│ `src/auth/`        │ `src/app.ts`       │ `src/errors.ts`                 │
└─────────┬──────────┴─────────┬──────────┴───────────────┬─────────────────┘
          │                    │                          │
          ▼                    ▼                          ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Modular Domain Controllers                       │
│    `student/` · `evaluator/` · `admin/` · `teacher/` · `support/`         │
└─────────┬───────────────────────────────────────────────┬─────────────────┘
          │                                               │
          ▼                                               ▼
┌──────────────────────────────────────────┐  ┌─────────────────────────────┐
│       Drizzle ORM & Database Layer       │  │    Storage & Media Engine   │
│   `backend/src/db/schema.ts` (pg Pool)   │  │  S3 / Cloudflare R2 / Local │
└─────────────────┬────────────────────────┘  │ `backend/src/storage/`      │
                  │                           └──────────────┬──────────────┘
                  ▼                                          ▼
┌──────────────────────────────────────────┐  ┌─────────────────────────────┐
│       PostgreSQL Database (lms)          │  │ Cloudflare R2 Bucket        │
│   Courses, Lessons, Profiles, Grades     │  │ `videos/` · `materials/`    │
└──────────────────────────────────────────┘  └─────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Frontend Root & Router** | Application entry point, global styles, and route switching | `frontend/src/main.tsx`, `frontend/src/App.tsx` |
| **Cognito Gate** | Intercepts unauthenticated sessions and validates Cognito token freshness | `frontend/src/app/CognitoGate.tsx` |
| **API Client** | Typesafe HTTP communication with Fastify API injecting bearer tokens | `frontend/src/lib/api.ts` |
| **Audio Extractor & VAD** | Client-side 16kHz audio extraction and Silero VAD silence chunking | `frontend/src/lib/audioExtractor.ts` |
| **Course Editor Modal** | Full-lifecycle chapter, video, material, and assignment authoring | `frontend/src/pages/admin/views/CourseEditorModal.tsx` |
| **Video Upload Modal** | Browser-to-R2 streaming, chunked transcription, and multi-quality transcoding | `frontend/src/pages/admin/views/VideoCourseUploadModal.tsx` |
| **Fastify Server Boot** | Application lifecycle, graceful shutdown, plugin and route registration | `backend/src/server.ts`, `backend/src/app.ts` |
| **Database Schema** | Drizzle ORM table models, relational foreign keys, check constraints, indexes | `backend/src/db/schema.ts` |
| **Admin Courses Controller** | Full CRUD for courses, modules, lessons, materials, assignments, audio, and video | `backend/src/modules/admin/courses.ts` |
| **Student Domain Module** | Enrolment, lesson progress tracking, live classes, quizzes, and grades | `backend/src/modules/student/index.ts` |
| **Evaluator Domain Module** | Rubric evaluations, student assignment scoring, and re-evaluation appeals | `backend/src/modules/evaluator/index.ts` |
| **Storage Driver** | Dual abstraction for signed S3/R2 download/upload and local filesystem storage | `backend/src/storage/index.ts` |

## Pattern Overview

**Overall:** Modular Monorepo Architecture with Segregated Frontend SPA and Domain-Driven Backend API.

**Key Characteristics:**
- **Zero Server State in Supabase:** Supabase is treated strictly as a PostgreSQL database; no Supabase Auth, Storage, or RLS policies are used.
- **Server-Enforced Authorization:** Request body user IDs are never trusted. All identity checks and author fields are assigned directly from verified Cognito JWT access token claims.
- **Direct-to-Cloudflare R2 Video Uploads:** Heavy raw video files are uploaded directly from the browser or streamed to R2, bypassing API memory limits.
- **Client-Side VAD Audio Chunking:** 16kHz mono audio is isolated in the browser using the Web Audio API, skipping silent chunks before sending to GPU speech recognition endpoints.

## Layers

**Presentation Layer (`frontend/src/pages/`):**
- Purpose: User interfaces segregated by role (Student, Evaluator, Teacher, Admin, Support)
- Contains: React components, Radix UI dialogs, charts, and interactive media players
- Depends on: `frontend/src/lib/api.ts`, `frontend/src/lib/auth.ts`, `frontend/src/data/`

**Session & Auth Gate (`frontend/src/app/CognitoGate.tsx`, `backend/src/auth/`):**
- Purpose: Validates authentication tokens, enforces role-based access, and handles redirection
- Depends on: AWS Cognito JWKS public key set

**API Route Modules (`backend/src/modules/`):**
- Purpose: Encapsulates business logic, input validation via Zod, and HTTP route handlers
- Contains: `admin/`, `student/`, `evaluator/`, `teacher/`, `support/`, `super-admin/`
- Depends on: Fastify instance, AppContext (`db`, `storage`, `config`)

**Persistence & Data Layer (`backend/src/db/`):**
- Purpose: Connects to PostgreSQL, manages transactions, and executes Drizzle ORM queries
- Location: `backend/src/db/schema.ts`, `backend/src/db/client.ts`

**Media Storage Layer (`backend/src/storage/`):**
- Purpose: Abstract storage provider for presigned URLs, file streaming, and head requests
- Location: `backend/src/storage/s3.ts`, `backend/src/storage/local.ts`

## Data Flow

### Primary Request Path (Student accessing course curriculum):
1. User navigates to `/student?page=course-details&course=:id` (`frontend/src/App.tsx:76`)
2. Client calls `api.get("/student/courses/:id")` with Cognito Bearer token (`frontend/src/lib/api.ts:25`)
3. Fastify verifies JWT signature via `jose` and injects `req.user` (`backend/src/auth/cognito.ts:40`)
4. Route handler queries `courses`, `course_modules`, `lessons`, and `lesson_progress` via Drizzle (`backend/src/modules/student/courses.ts:35`)
5. Fastify responds with JSON payload; client renders synchronized curriculum (`frontend/src/pages/student/CourseDetailsPage.tsx:110`)

### Video Lecture Upload & Neural Transcription Flow:
1. Admin selects a video file and target course (`frontend/src/pages/admin/views/VideoCourseUploadModal.tsx:120`)
2. Client Web Audio API decodes audio, slices into 30s chunks, and evaluates Silero VAD silence (`frontend/src/lib/audioExtractor.ts:45`)
3. Client streams speech chunks to `/admin/courses/audio-chunk` for GPU Parakeet/Whisper transcription (`backend/src/modules/admin/courses.ts:720`)
4. Raw video is uploaded to R2 under `videos/{courseId}/video/{timestamp}.mp4`
5. Client calls `POST /admin/courses/video-transcode` generating 1080p, 720p, 480p, and 144p encoded variants
6. Client invokes `POST /admin/courses/video-finalize` creating module, lesson, and multi-quality URLs in PostgreSQL (`backend/src/modules/admin/courses.ts:840`)

**State Management:**
- Frontend: Local component state + lightweight Zustand/custom stores (`frontend/src/data/adminStore.ts`, `frontend/src/data/teacherStore.ts`) + cached resource layer (`frontend/src/lib/resource.ts`)
- Backend: Stateless HTTP with background in-memory job timers (`startQuizSweep`)

## Key Abstractions

**AppContext (`backend/src/context.ts`):**
- Encapsulates database connection pool, Drizzle client, storage driver, and runtime configuration
- Injected into every route module and background job

**StorageDriver (`backend/src/storage/index.ts`):**
- Unifies local filesystem and S3/R2 storage with identical `createDownloadUrl`, `createUploadUrl`, and `head` methods

**CognitoGate (`frontend/src/app/CognitoGate.tsx`):**
- Shared session wrapper checking Cognito credentials before rendering protected student or evaluator views

## Entry Points

**Frontend SPA:**
- `frontend/src/main.tsx` — Mounts React DOM tree into `#root`
- `frontend/src/App.tsx` — Navigation router resolving portal routes based on URL path

**Backend Server:**
- `backend/src/server.ts` — Loads configuration, connects database pool, builds Fastify app, and starts listening on port 4000

## Architectural Constraints

- **Single-Threaded Event Loop:** Long-running CPU operations (such as FFmpeg video transcoding or local speech chunking) run via child processes (`child_process.execFile`), keeping the Fastify event loop unblocked.
- **Supabase Connection Limit:** Pool max is clamped to 5 (`DATABASE_POOL_MAX=5`) to prevent exceeding Supabase session pooler connection limits.
- **Relational Integrity:** Drizzle schema enforces strict composite unique constraints on `(course_id, position)` for modules and lessons.

## Anti-Patterns

### Trusting Client-Supplied User IDs
**What happens:** Passing `student_id` or `author_id` in request bodies.
**Why it's wrong:** Vulnerable to IDOR (Insecure Direct Object Reference) and privilege escalation.
**Do this instead:** Always extract caller identity directly from `req.user.sub` or `req.user.role` set by the Cognito auth pre-handler.

### Bypassing Positional Sequencing
**What happens:** Inserting modules or lessons with hardcoded positions.
**Why it's wrong:** Violates PostgreSQL unique constraints on `(course_id, position)`.
**Do this instead:** Compute `max(position) + 1` atomically within the route before inserting.

## Error Handling

**Strategy:** Fail-fast with typed HTTP errors and centralized error translation.

**Patterns:**
- `parse(schema, req.body)` rejects invalid payloads immediately with HTTP 400.
- `notFound("Course not found")` and `badRequest(...)` throw standard Fastify HttpErrors.
- PostgreSQL error codes (e.g. `23505` unique violation) are mapped to meaningful user error messages.

## Cross-Cutting Concerns

**Logging:** Fastify built-in Pino structured JSON logger (`app.log.info({ courseId, duration }, "video finalized")`).
**Validation:** Zod schemas for all route inputs (`backend/src/modules/**`).
**Authentication:** AWS Cognito JWT claims verification via `jose` on all protected endpoints.

---

*Architecture analysis: 2026-11-06*
