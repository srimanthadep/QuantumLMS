---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
# Coding Conventions

**Analysis Date:** 2026-11-06

## Naming Patterns

**Files:**
- React Components: PascalCase matching exported component name (`CourseEditorModal.tsx`, `CoursesView.tsx`, `CognitoGate.tsx`)
- Server Modules & Utilities: camelCase (`courses.ts`, `schema.ts`, `audioExtractor.ts`, `migrate.ts`)
- Tests: `[domain].test.ts` (e.g. `backend/tests/admin.test.ts`, `backend/tests/student.test.ts`)

**Functions:**
- camelCase for functions and methods (`uploadVideoToR2`, `startPipeline`, `loadConfig`, `createContext`, `formatSec`)
- Event handlers: `handle<Action>` (e.g. `handleCreateCourse`, `handleSaveCourseSettings`, `handleDeleteModule`)
- API Route handlers: inline arrow functions or async named functions

**Variables:**
- camelCase for primitives and objects (`courseId`, `editingCourse`, `audioExtractPct`, `assembledTranscript`)
- CONSTANT_CASE for top-level constants, enum lists, and regex patterns (`ROLES`, `METRIC_TONE`, `STORAGE_DRIVER`)
- Booleans: prefixed with `is`, `has`, or `can` (`isProcessing`, `has_git`, `canReadOutputFile`)

**Types & Interfaces:**
- PascalCase for TypeScript types and interfaces (`AdminCourse`, `CourseModuleItem`, `LessonRowItem`, `AssignmentItem`, `AppContext`)
- Props interfaces named `<Component>Props` (`CourseEditorModalProps`, `VideoCourseUploadModalProps`)
- Database infer types: `type Profile = typeof profiles.$inferSelect`

## Code Style

**Formatting:**
- Formatter: `oxfmt` configured in `frontend/package.json`
- Indentation: 2 spaces, no tabs
- Quotes: Double quotes for JSX attributes and strings with apostrophes (`"We're here to help"`), single quotes or double quotes consistently
- Semicolons: Omitted in frontend where clean; standard in backend TypeScript
- Line width: ~100-120 characters soft wrap

**Linting & Type Safety:**
- TypeScript compiler strictly enforcing types (`tsc --noEmit`)
- Explicit parameter types on Fastify route registrations (`app.post<{ Params: { id: string } }>`)
- Zod schema runtime validation for request bodies, query strings, and headers

## Import Organization

**Order:**
1. Node built-ins (`import path from "node:path"`, `import fs from "node:fs"`)
2. External framework libraries (`import { useState, useRef } from "react"`, `import type { FastifyInstance } from "fastify"`)
3. UI icons & third-party libraries (`import { Video, Upload } from "lucide-react"`, `import { z } from "zod"`)
4. Internal UI primitives (`import { Button } from "@/components/ui/button"`, `import { Dialog } from "@/components/ui/dialog"`)
5. Internal core utilities & stores (`import { api } from "@/lib/api"`, `import { accessToken } from "@/lib/auth"`)
6. Types (`import type { AdminCourse } from "@/data/adminStore"`)

**Path Aliases:**
- Frontend: `@/*` resolves to `frontend/src/*` (configured in `frontend/vite.config.ts` and `frontend/tsconfig.json`)
- Backend: Relative imports with explicit `.js` extensions for ESM compliance (`import { db } from "./db/client.js"`)

## Error Handling

**Backend Patterns:**
- Route input parsing throws early via helper `parse(schema, req.body)` in `backend/src/routes/` returning 400 Bad Request
- HTTP errors thrown via utility functions: `notFound("Course not found.")`, `badRequest("Invalid state.")`, `forbidden("Forbidden.")`
- PostgreSQL errors caught with contextual messages, ensuring database connections are not leaked

**Frontend Patterns:**
- API errors caught in `try...catch` blocks and presented to the user via toast notifications (`onToast(err.message)`)
- Async operations track loading, progress percentages, and error states explicitly in state variables (`videoUploadStatus`, `audioExtractStatus`)

## Logging

**Framework:**
- Fastify Pino logger (`app.log`) on backend
- Structured JSON logging: pass context object first, message second:
  ```typescript
  app.log.info({ courseId, moduleId }, "Module created successfully")
  app.log.error({ err, key }, "Failed to generate download URL")
  ```
- Browser: Avoid raw `console.log` in production; use `console.warn` / `console.error` for exceptional conditions only

## Comments

**When to Comment:**
- Explain *why* a particular workaround or architecture choice exists (e.g. R2 CORS streaming bypass, Whisper chunking offset calculation)
- Numbered step comments in long asynchronous workflows (`// 1. Upload video to R2`, `// 2. Extract 16kHz audio`, etc.)

**JSDoc/TSDoc:**
- Used for exported library utilities, complex math calculations, and shared context builders (`backend/src/context.ts`, `frontend/src/lib/audioExtractor.ts`)

## Function Design

**Size:**
- Single responsibility; extract long modal tabs or complex UI cards into focused helper components
- Pure utility functions extracted to `frontend/src/lib/` or `backend/src/utils/`

**Parameters:**
- Functions with more than 3 parameters use a typed options object:
  ```typescript
  interface ExtractOptions {
    chunkDurationSec: number
    onProgress?: (progress: ProgressState) => void
  }
  ```

**Return Values:**
- Server routes return plain objects `{ ok: true, data: ... }`
- Async operations return Promises resolving to typed data

## Module Design

**Exports:**
- React components exported as default exports per `AGENTS.md` guidelines (`export default function CourseEditorModal(...)`)
- Helper functions and types exported as named exports (`export interface AreaSeries`, `export const ROLES`)

**Barrel Files:**
- Used selectively in `frontend/src/components/ui/` and `backend/src/modules/` to group related domain exports cleanly

---

*Convention analysis: 2026-11-06*
