---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
# External Integrations

**Analysis Date:** 2026-11-06

## APIs & External Services

**Authentication & User Management:**
- AWS Cognito User Pool (production) / `cognito-local` emulator (development)
  - Purpose: Secure user registration, sign-in, MFA, JWT generation, and password resets
  - SDK/Client: `@aws-sdk/client-cognito-identity-provider` on backend, `aws-amplify` on frontend
  - Auth Config: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`, `COGNITO_ENDPOINT`

**Object & Media Storage:**
- Cloudflare R2 / AWS S3
  - Purpose: Storage for multi-quality masterclass videos (`videos/`), neural transcripts, and course materials (`materials/` for PDFs, Jupyter notebooks, slide decks, datasets)
  - SDK/Client: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (`backend/src/storage/s3.ts`)
  - Auth Config: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`

**Speech Recognition & Neural Audio Processing:**
- In-browser Web Audio API & Silero VAD (Voice Activity Detection)
  - Purpose: 16kHz mono audio extraction and silence filtering client-side (`frontend/src/lib/audioExtractor.ts`)
- Backend ASR Transcription Services
  - Purpose: Accelerated speech-to-text chunk processing using NVIDIA Parakeet-TDT 0.6B (English) and Faster-Whisper int8 (Telugu/Hindi/multilingual) via `POST /admin/courses/audio-chunk` (`backend/src/modules/admin/courses.ts`)

**Video Encoding & Multi-Quality Streaming:**
- Local/Containerized FFmpeg Process
  - Purpose: Automated transcode generation for adaptive bitrates (1080p, 720p, 480p, 144p) via `POST /admin/courses/video-transcode` (`backend/src/modules/admin/courses.ts`)

## Data Storage

**Databases:**
- PostgreSQL (hosted on Supabase or AWS RDS)
  - Schema: Dedicated `lms` schema (`backend/src/db/schema.ts`)
  - Connection: `DATABASE_URL` with SSL configuration (`DATABASE_SSL=require`)
  - Client: `pg` Pool (`backend/src/db/client.ts`) with Drizzle ORM (`drizzle-orm`)
  - Connection Pooling: Configured via `DATABASE_POOL_MAX` (defaults to 5 in dev to fit within pooler quotas)

**File Storage:**
- Dual Driver Storage Interface (`backend/src/storage/index.ts`):
  - `s3`: Production driver storing into S3/R2 with signed download/upload URLs
  - `local`: Development fallback saving files to `.data/uploads/` on local disk

**Caching & Real-Time Sync:**
- Fastify in-memory state and database query caching for fast student dashboard metrics
- Background jobs: Periodic quiz sweep (`startQuizSweep` in `backend/src/modules/student/quizzes.ts`)

## Authentication & Identity

**Auth Provider:**
- AWS Cognito User Pool with JWT token validation
  - Implementation:
    - Frontend: Signs in via Amplify (`frontend/src/lib/auth.ts`), acquiring access token and ID token
    - Backend: Pre-validation hook in `backend/src/auth/` verifies JWT claims using `jose` against Cognito JWKS (`backend/src/auth/cognito.ts`), injecting authenticated user identity and role into Fastify request context

## Monitoring & Observability

**Error Tracking & Diagnostics:**
- Global error handler registered in Fastify (`backend/src/app.ts`) mapping Zod parsing errors, not-found errors, and database constraint violations to standardized JSON error envelopes

**Logs:**
- Fastify built-in Pino structured logger (`app.log.info`, `app.log.error`)
- Audit logging tracking admin and evaluator actions in `lms.audit_logs`

## CI/CD & Deployment

**Hosting:**
- Architecture designed for AWS deployment (ECS Fargate container tasks, RDS/Supabase Postgres, S3/R2 assets)
- Local development runs via lightweight background Node processes with Vite proxying `/api` calls

**CI Pipeline:**
- Type-checking (`npm run typecheck`) and automated integration test runner (`npm test`)

## Environment Configuration

**Required env vars:**
- `NODE_ENV`: Runtime environment (`development` | `production`)
- `PORT`: Server port (4000)
- `DATABASE_URL`: Postgres connection string
- `COGNITO_USER_POOL_ID`: AWS Cognito pool ID
- `COGNITO_CLIENT_ID`: AWS Cognito client ID
- `COGNITO_REGION`: AWS region
- `STORAGE_DRIVER`: `local` or `s3`
- `UPLOAD_SIGNING_SECRET`: Random salt for download/upload validation

**Secrets location:**
- Development: `backend/.env` and `frontend/.env.local` (both git-ignored)
- Production: AWS Secrets Manager / ECS Task Definition environment injection

## Webhooks & Callbacks

**Incoming:**
- Not applicable / internal API endpoints for video and audio finalization

**Outgoing:**
- WebSocket live classroom event streams for student attendance, chat messages, and live captions (`backend/src/routes/`)

---

*Integration audit: 2026-11-06*
