---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
# Codebase Concerns

**Analysis Date:** 2026-11-06

## Tech Debt

**Dual State Models (Real API vs Mock Stores):**
- Issue: The Student and Evaluator portals communicate with the real Fastify API, but portions of the Teacher and Support portals still reference browser-side demo data stores (`frontend/src/data/teacherStore.ts`, `frontend/src/data/adminStore.ts`).
- Files: `frontend/src/pages/teacher/`, `frontend/src/pages/support/`, `frontend/src/data/`
- Impact: Inconsistent persistence across portals; changes made in teacher demo views do not reflect in student API views until fully wired to PostgreSQL.
- Fix approach: Continue migrating teacher batch scheduling and support ticket queues to Fastify route controllers in `backend/src/modules/teacher/` and `backend/src/modules/support/`.

**In-Memory Background Job Coordination:**
- Issue: `startQuizSweep` runs inside the Fastify application instance using `setInterval` (`backend/src/modules/student/quizzes.ts:15`).
- Files: `backend/src/modules/student/quizzes.ts`, `backend/src/server.ts`
- Impact: If the backend is horizontally scaled across multiple containers/instances, multiple concurrent sweeps will execute without synchronization.
- Fix approach: Implement distributed locking using PostgreSQL advisory locks (`pg_try_advisory_lock`) or delegate background jobs to an external worker queue.

## Known Bugs

**Client Audio Extraction Memory Spike on Massive Files:**
- Symptoms: Browser tab may crash or freeze when uploading raw 4K videos exceeding 1.5 GB for in-browser audio extraction.
- Files: `frontend/src/lib/audioExtractor.ts:40`, `frontend/src/pages/admin/views/VideoCourseUploadModal.tsx:210`
- Trigger: Loading uncompressed video files directly into the Web Audio API buffer.
- Workaround: Prompt admins to upload compressed 1080p MP4 lectures or extract audio track prior to upload.

## Security Considerations

**Supabase Connection Exposure:**
- Risk: Direct client connections to Supabase bypassing Fastify API.
- Files: `backend/.env.example`, `frontend/src/lib/api.ts`
- Current mitigation: Per project rules (`AGENTS.md`), Supabase is used strictly as a PostgreSQL database; all access is mediated exclusively through the Fastify API. Supabase public Data API and direct browser keys are disabled.
- Recommendations: Keep Supabase API keys completely out of `frontend/` bundle and enforce network firewall rules.

**Storage Download URL Expiry:**
- Risk: Download URLs for course videos or materials could be leaked if presigned expiration windows are excessively long.
- Files: `backend/src/modules/admin/courses.ts`, `backend/src/storage/s3.ts`
- Current mitigation: URLs are generated with bounded expiration (24 hours to 7 days depending on resource sensitivity).

## Performance Bottlenecks

**Supabase Connection Pool Saturation:**
- Problem: Supabase session pooler on micro/free tier limits total connections to 15 across all clients.
- Files: `backend/src/config.ts:35`, `backend/src/db/client.ts:15`
- Cause: Development dev server, test runs, and migration scripts sharing the same pooler port (5432).
- Improvement path: Keep `DATABASE_POOL_MAX` low (5) in development, and use the transaction pooler on port 6543 when running multi-instance production workloads.

**FFmpeg Local Video Transcoding:**
- Problem: Generating 4 concurrent quality encodes (1080p, 720p, 480p, 144p) consumes high CPU when executing locally on the API host.
- Files: `backend/src/modules/admin/courses.ts:770`
- Cause: Multi-pass CPU software encoding via `child_process.execFile`.
- Improvement path: Offload transcode jobs to an asynchronous cloud pipeline (e.g. AWS Elemental MediaConvert or Cloudflare Stream).

## Fragile Areas

**Composite Position Constraints in Curriculum:**
- Files: `backend/src/db/schema.ts:85`, `backend/src/modules/admin/courses.ts:860`
- Why fragile: Unique constraints on `(course_id, position)` for `course_modules` and `lessons` mean manual deletions or position shifts can trigger constraint violation `23505` if not calculated in a transaction.
- Safe modification: Always query `coalesce(max(position), 0) + 1` atomically inside the insertion route.

## Scaling Limits

**File Storage Throughput:**
- Current capacity: Direct binary upload streaming via Fastify gateway.
- Limit: API container memory and network bandwidth limit concurrent 1GB+ uploads if streamed through Fastify rather than direct presigned S3 URLs.
- Scaling path: Transition from gateway streaming to S3/R2 direct presigned client-side PUT uploads with S3 multipart upload protocol.

## Dependencies at Risk

**`cognito-local` (^5.3.0):**
- Risk: Third-party offline emulator for AWS Cognito. Does not emulate 100% of advanced enterprise Cognito features (e.g. advanced risk detection, custom auth lambdas).
- Impact: Dev/prod parity differences if advanced Cognito trigger lambdas are added.
- Migration plan: Run smoke tests against real AWS Cognito User Pool via `npm run cognito:smoke` prior to production releases.

## Missing Critical Features

**Granular Lesson Reordering:**
- Problem: Drag-and-drop reordering of chapters and lessons in the course curriculum is not yet implemented.
- Blocks: Admins must delete and re-insert or sequentially adjust positions when changing syllabus ordering.

## Test Coverage Gaps

**Frontend Component Unit Tests:**
- What's not tested: Individual React component renders, modal tab switching, and audio extractor state machine.
- Files: `frontend/src/pages/admin/views/CourseEditorModal.tsx`, `frontend/src/lib/audioExtractor.ts`
- Risk: Regressions in complex modal interactions require manual browser QA.
- Priority: Medium (backend is thoroughly tested, but Vitest/Testing-Library on frontend would accelerate UI iteration).

---

*Concerns audit: 2026-11-06*
