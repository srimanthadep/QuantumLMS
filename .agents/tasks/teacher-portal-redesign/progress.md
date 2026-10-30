# Teacher portal redesign (from scratch)

User request (30 Oct 2026): "redesign the entire teacher page from scratch, premium and visually stunning,
micro animations and motion, interactive and clean. You can add or remove any components."
Scope: every teacher nav page, plus the course workspace, live studio, recordings library and review.

## Rules (frontend/design.md)
- Semantic tokens only. No raw zinc/purple/lime/gray/slate, no hex classes, no legacy.css classes.
- No duplicate shell chrome in pages (old pages each had a theme picker + Ask AI). Clover is the only assistant entry.
- One PageHeader per page, Stagger/Reveal motion, transform/opacity only, loops only for live/busy.
- Default exports (AGENTS.md).

## Architecture
- pages/teacher/teacherStore.tsx: context with all teacher data + actions (sessions/doubts/events persisted, v2 keys).
  Course/module progress is recomputed from delivered lessons (seed percentages disagree with the lesson ticks).
- pages/teacher/teacherUtils.ts: DEMO_NOW = 2026-10-22 12:17 (Thu; ls-1 is live 11:30-13:00), date/time helpers,
  tones, buildRoster (attendance records joined with learner names and photos), recordedLabel.
- components/teacher/: IconTile, LiveSessionHero, StudentDrawer, GradingSheet, ScheduleSessionDialog, SendReportDialog.
- TeacherPortal: nested <Routes> inside PageTransition, lazy pages, open-doubts badge, teacher NotificationSource,
  all nav items available. Legacy paths redirect (/teacher/reports, /teacher/live-class/recordings,
  /teacher/live-class/review/:sessionId, /teacher/live/studio/:id, unknown -> /teacher).

## Data notes
- Module ids collide across courses (m1 in c1 and c2): assignments are keyed `${courseId}:${moduleId}`.
- Only c1 (all modules) and c2 m1 have seed assignments.
- Attendance records (att-1..24, ls-1) carry made-up names; the roster takes names/photos from the learner records.

## Status
- [x] foundation (store, utils, shared components)
- [x] dashboard
- [x] courses + workspace
- [x] live classes + studio
- [x] recordings + review
- [x] students
- [x] doubts
- [x] calendar
- [x] analytics + reports
- [x] support
- [x] settings
- [x] portal + routes, legacy components deleted
- [x] verify: tsc, build, smoke 52/52, audit 0/0/0, teacher-flows 13/13, student-flows 10/10, retirement grep clean
- [x] design.md updated
- [ ] commit

## Verification commands (from .agents/tasks/redesign-premium-ui/tools)
- node smoke.mjs --base http://localhost:8443 --groups teacher --viewports desktop,mobile --themes dark,light --out ..\shots\teacher-v2
- node audit.mjs (same args) --out ..\shots\teacher-v2\audit
- node teacher-flows.mjs --base http://localhost:8443
- node shoot-full.mjs --group teacher --only <names> --viewport desktop --theme dark --out ..\shots\teacher-v2\full
- node check-legacy-classes.mjs src/pages/teacher src/components/teacher
- node count-legacy.mjs [<rev>]

## Known, out of scope
- /design-system (dev only) has 4 pre-existing light-mode contrast findings: the `live` Badge inside CourseCover
  (white on the island's light danger, 2.77) and the `info` Badge on surface-2 (4.46).
