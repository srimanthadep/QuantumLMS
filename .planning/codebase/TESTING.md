---
last_mapped_commit: 69b4a5049a93ac7ae76dbc7fba726e93fb6a43c1
last_mapped_at: 2026-11-06
---
# Testing Patterns

**Analysis Date:** 2026-11-06

## Test Framework

**Runner:**
- Node.js Built-in Test Runner (`node:test`)
- Executed via `tsx` loader with concurrent workers
- Configured in `backend/package.json`:
  ```json
  "test": "tsx --env-file=.env --test --test-concurrency=2 tests/*.test.ts"
  ```

**Assertion Library:**
- Node.js Strict Assertions (`node:assert/strict`)

**Run Commands:**
```bash
npm --prefix backend run test      # Run all backend integration tests
npm run test:backend              # Monorepo root shortcut to run backend tests
npm --prefix frontend run typecheck # Verify frontend TypeScript contracts
```

## Test File Organization

**Location:**
- Backend tests live in `backend/tests/`
- Helper utilities and test harness in `backend/tests/helpers.ts`

**Naming:**
- Files named by functional domain: `<domain>.test.ts`
  - `backend/tests/admin.test.ts`
  - `backend/tests/student.test.ts`
  - `backend/tests/evaluator.test.ts`
  - `backend/tests/teacher.test.ts`
  - `backend/tests/support.test.ts`
  - `backend/tests/auth.test.ts`

**Structure:**
```
backend/tests/
├── helpers.ts             # TestHarness, Cognito mock, token forge, tmpdir cleanup
├── admin.test.ts          # Admin courses, video transcode, platform stats
├── admin-ops.test.ts      # Cohort capacity, seat extensions, enrollments
├── auth.test.ts           # Token verification, claims inspection, revoked tokens
├── student.test.ts        # Curriculum progress, doubts, quiz submissions
├── evaluator.test.ts      # Rubric scoring, criteria weighting, re-evaluations
├── teacher.test.ts        # Teacher approval workflows and timetable slots
└── support.test.ts        # Ticket queue triage, chat replies, FAQ voting
```

## Test Structure

**Suite Organization:**
```typescript
import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let admin: TestUser

before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Student Alex", groups: ["students"] })
  admin = await h.user({ name: "Admin Rohan", groups: ["admins"] })
})

after(async () => {
  await h.close()
})

describe("admin API access control", () => {
  test("unauthenticated requests are refused with 401", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/admin/courses" })
    assert.equal(res.statusCode, 401)
  })

  test("students cannot access admin endpoints (403)", async () => {
    const res = await student.call("GET", "/api/admin/courses")
    assert.equal(res.status, 403)
  })
})
```

**Patterns:**
- **Setup:** `before` hook generates ephemeral RS256 keypair for fast local JWT signing, boots Fastify app with real PostgreSQL database, and creates test user accounts.
- **Teardown:** `after` hook terminates Fastify instance, drains connection pool, and cleans temporary upload directories.
- **Assertion:** Strict equality assertions `assert.equal(res.status, 200)` and truthy checks `assert.ok(res.body.courses)`.

## Mocking

**Framework:**
- Native in-memory test doubles defined in `backend/tests/helpers.ts`

**Patterns:**
```typescript
// Fake Cognito Gateway implementation in helpers.ts
const cognito: CognitoGateway = {
  async getAttributes(accessToken) {
    const sub = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()).sub as string
    const a = attributes.get(sub)
    if (!a || signedOut.has(accessToken)) {
      throw Object.assign(new Error("Access Token has been revoked"), { name: "NotAuthorizedException" })
    }
    return a
  },
  async setPassword() {},
  async disableMfa() {},
  async addToGroup() {},
  async removeFromGroup() {},
  async signOutEverywhere(accessToken) {
    signedOut.add(accessToken)
  },
}
```

**What to Mock:**
- AWS Cognito User Pool service (mocked via local JWK set and `CognitoGateway` interface)
- Object storage (redirected to temporary OS directories via local storage driver)
- External GPU Whisper/Parakeet calls (mocked or executed in test sandbox)

**What NOT to Mock:**
- PostgreSQL database: Tests run against real PostgreSQL database in the `lms` schema to guarantee constraints, foreign keys, triggers, and transactions work.
- Fastify server routing and Zod parsing: Handled by injecting HTTP requests via `h.app.inject()`.

## Fixtures and Factories

**Test Data Factory (`backend/tests/helpers.ts`):**
```typescript
// Creates authenticated user with specific Cognito groups and access token
const testUser = await h.user({
  name: "Evaluator Maya",
  groups: ["evaluators"],
  email: "maya@lms.test",
})
```

**Location:**
- Factories and cleanup helpers: `backend/tests/helpers.ts`
- Database seeds: `backend/src/db/seed/`

## Coverage

**Requirements:**
- Core access control matrix (Admin, Student, Evaluator, Teacher) required for all new endpoints
- Critical user paths (Quiz grading, evaluation rubrics, course creation) covered by integration tests

**View Coverage:**
- Run test suite with `--test-reporter=spec` to review passing test suites

## Test Types

**Integration Tests:**
- Primary test approach for the backend API (`backend/tests/*.test.ts`). Tests invoke Fastify endpoints via `inject`, write to Postgres, assert response schemas, and verify database state.

**Frontend Type & Build Verification:**
- `npm --prefix frontend run typecheck` (`tsc --noEmit`) validates all React component props, API client types, and hook dependencies.
- `npm --prefix frontend run build` verifies full production bundle creation with zero asset or syntax errors.

## Common Patterns

**Async Testing:**
```typescript
test("creates a new chapter and appends lesson", async () => {
  const res = await admin.call("POST", `/api/admin/courses/${courseId}/modules`, {
    title: "Chapter 2: Streaming Architecture",
    duration: "2 Hours",
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.module.title, "Chapter 2: Streaming Architecture")
})
```

**Error Testing:**
```typescript
test("rejects assignment submission past due date", async () => {
  const res = await student.call("POST", `/api/student/assignments/${assignmentId}/submit`, {
    content: "Late submission",
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /deadline has passed/i)
})
```

---

*Testing analysis: 2026-11-06*
