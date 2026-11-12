# Audit implementation baseline

Date: 12 November 2026. Branch: fix/audit-2026-11.

Commit c2a6302 preserves all pre-existing working-tree changes before remediation. No push or deployment is authorized or performed. Application data is not copied into Git. The earlier architecture audit is the requirements baseline, amended by the user's Zoom/Meet link-provider design.

## Data provenance

- `backend/src/db/seed/data.ts`, `evaluator.ts`, `alumni.ts` and batch seed definitions are synthetic demo/fixture data. IDs, account names, example grades, schedules and placement stories from these definitions are not evidence of real enrollment, attendance, payments or placement outcomes.
- Course/lesson CRUD, batch roster writes, student submissions/progress, evaluator grading, support tickets and resume writes persist to PostgreSQL. A row's existence alone does not distinguish a real business action from a prior demo seed.
- Existing enrollments have no payment provenance. Existing batch instructor text is not a verified user assignment. Legacy timetable rows do not prove live sessions occurred. These must not be backfilled as paid, attended, or verified.
- No production database dump or object-storage inventory was taken. The configured development/production databases and uploads are unchanged. Exact real/demo row classification and overwritten video recovery remain unverified; future reconciliation must use available history rather than guess.
- Initial frontend/backend typechecks passed. The first isolated full test run exposed a missing welcome notification and a support test depending on pre-existing tickets. The notification was restored; the support suite now creates its own ticket.

## Test isolation

`npm test` creates a temporary local PostgreSQL cluster, then a separate random database for each test file. It applies all migrations and explicitly seeds known fixtures. It never loads `.env`, never uses `DATABASE_URL`, and forces `DEMO_MODE=false`. The helper additionally verifies loopback, a random test database name, and a per-run database marker before application operations.

Set `PG_BIN` to the directory containing `initdb` and `pg_ctl` if they are not on PATH. Windows PostgreSQL installations are detected under Program Files. CI can instead provide `TEST_ADMIN_DATABASE_URL` for an explicitly disposable PostgreSQL service on loopback with CREATE DATABASE permission. The runner creates/drops only its own randomly named databases; it never migrates the admin database. Do not supply a development or production server.

Run one suite with `npm --prefix backend test -- auth.test.ts`. Run the required gates with `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`. Lint uses pinned Oxlint; inherited warnings are reported rather than silently auto-fixing unrelated source files.

Strict-mode tests now assert that demo reset endpoints deny even demo-email accounts. No authentication bypass is enabled to satisfy fixtures.
