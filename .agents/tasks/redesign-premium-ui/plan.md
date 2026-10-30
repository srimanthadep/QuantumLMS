# Implementation Plan: QuantumLMS premium UI/UX redesign

Worktree: `c:\Users\srima\Downloads\QuantumLMS\.worktrees\redesign-premium-ui` (branch `redesign-premium-ui`, base `main` @ `0bc83ec`).
All paths below are relative to the worktree unless they start with `c:\`. **Always pass absolute paths or `cwd`: a relative path in a shell lands in the user's main checkout.**

## Ground rules (apply to every item)

- Commands (run with `cwd` = `<worktree>\frontend`): `npm run typecheck`, `npm run build`. There is no unit-test framework. `node_modules` is hoisted at `<worktree>\node_modules` (npm workspaces), so no install is needed unless deps change.
- Dev server for verification: `$env:PORT="8543"; npm run dev` (background, `cwd` = `<worktree>\frontend`). Use port 8543 so the user's own server on 8443 is never touched. `vite.config.ts` reads `PORT` and uses `strictPort`.
- Verification harness lives OUTSIDE the repo in `c:\Users\srima\Downloads\QuantumLMS\.agents\tasks\redesign-premium-ui\tools\` (built in item 3). Per-phase screenshots go to `...\redesign-premium-ui\shots\phase-N\`; final screenshots go to `c:\Users\srima\Downloads\QuantumLMS\.agents\tasks\redesign-screenshots\`.
- Phase gate (end of every phase): `npm run typecheck` = 0 errors; `npm run build` succeeds; `smoke.mjs` for the phase's route groups reports 0 console errors and 0 page errors at desktop and mobile in dark and light; open the PNGs and fix alignment, spacing, contrast and theme problems; commit; send an `info` message to the parent session summarising the phase.
- AGENTS.md rules: double quotes for strings containing apostrophes; balanced JSX; **new component files default-export their main component** (named exports for sub-parts are fine; barrels use `export { default as X } from "./x"`).
- Commit after each item (or tighter), Conventional Commits (`feat(student): ...`, `refactor(ui): ...`). Never push. Never delete files in `frontend/public/`.
- Animate only `transform`/`opacity`. Durations come from the motion tokens (150 to 350 ms). Every animated component must behave under `prefers-reduced-motion` (global `MotionConfig reducedMotion="user"` plus the CSS media query).
- Brand: "Quantum School of AI", logo `/assets/logo.png`. The instructor for all courses is **Srimanth** (`/assets/srimanth.png`, "Founder & Lead AI Instructor"), because the user teaches everything; a teaching assistant uses `/assets/teacher-female.png`. Demo student: **Aarav Mehta** (`/assets/student-2.png`). Prices in ₹, formatted with `Intl.NumberFormat("en-IN")`.

## Design decisions (settled here, do not re-open)

- **D1 Tokens.** Semantic CSS variables in `src/styles/tokens.css`. Light values sit on `:root` and dark values on `.dark`; dark is the default. They are exposed to Tailwind v4 through `@theme inline` as `background, surface, surface-2, surface-3, border, border-strong, foreground, muted-foreground, subtle-foreground, primary(+hover/foreground/text/soft/border), secondary(+text/soft), success/warning/danger/info (+soft), ring, ink-700..950`. Today `bg-primary`/`text-muted-foreground` in `components/ui/*` produce no CSS because `index.css` never maps `--color-primary`; this fixes that.
- **D2 Dark variant.** `@custom-variant dark (&:where(.dark, .dark *));` keeps the existing `.dark` class convention from `themeService.ts`. A pre-paint inline script in `index.html` sets the class from `localStorage.app_theme_mode` (default `dark`) so the page never flashes the wrong theme.
- **D3 Palette (AA-checked by `tools/contrast.mjs`).** Dark: bg `#09090B`, surface `#111113`, surface-2 `#18181B`, surface-3 `#202024`, border `#26262B`, border-strong `#34343A`, fg `#EDEDEF`, muted `#A1A1AA`, subtle `#8A8A93`, primary solid `#6D4AFF` (hover `#7C5CFF`, fg `#FFFFFF`), primary-text `#A397FF`, primary-soft `rgb(109 74 255 / 0.14)`, secondary (cyan) text `#67E8F9` / soft `rgb(34 211 238 / 0.12)`, success `#34D399`, warning `#FBBF24`, danger `#F87171`, info `#60A5FA`, ring `#8B7CFF`. Light: bg `#FAFAFA`, surface `#FFFFFF`, surface-2 `#F4F4F5`, surface-3 `#FFFFFF`, border `#E4E4E7`, border-strong `#D4D4D8`, fg `#09090B`, muted `#52525B`, subtle `#6B6B76`, primary `#6D4AFF` (hover `#5B3DF5`), primary-text `#5B3DF5`, primary-soft `rgb(109 74 255 / 0.08)`, secondary-text `#0E7490`, success `#047857`, warning `#B45309`, danger `#DC2626`, info `#2563EB`, ring `#6D4AFF`. Accent options replace the hex background picker: `violet` (default, above), `blue` (solid `#2563EB`, dark text `#60A5FA`), `emerald` (solid `#047857`, dark text `#34D399`), `amber` (solid `#B45309`, dark text `#FBBF24`). The accent is applied with `data-accent` on `<html>`. Glow and gradients are used only on focal elements (hero, primary CTA, live badge, player).
- **D4 Legacy colour bridge.** The codebase has about 3,758 `zinc-*`, 1,469 `purple-*`, 1,268 arbitrary-hex and 569 `bg-white` usages across 102 files. Hand-editing them all in Phase 1 is not feasible, and leaving them breaks dark mode. Two mechanical steps make every portal coherent in both themes on day one, and the portal phases then replace them with semantic tokens: (a) a generated `src/styles/palette-bridge.css` overrides Tailwind's colour scales with theme-aware variables, and (b) a one-time codemod rewrites arbitrary hex and `bg-white` classes. Neutral scales (`zinc/slate/gray/neutral/stone`) all map to one neutral ramp that inverts in dark. `purple-*` maps to the primary ramp and `lime-*` to the success ramp. Hue scales get dark-mode tints: 50→10% / 100→16% / 200→26% / 300→40% mix of hue-500 into surface, 400–600→hue-400, 700→hue-300, 800→hue-200, 900→hue-100, 950→hue-50. Dark backgrounds (`bg-{zinc,slate,gray,neutral}-{800,900,950}`, `from/via/to-` the same) are codemodded to the non-inverting `ink-*` scale so deliberately dark panels stay dark.
- **D5 Typography.** `@fontsource-variable/inter` is self-hosted and bundled by Vite, so there is no CDN. Sans stack is `"Inter Variable", ui-sans-serif, system-ui, sans-serif` with `font-feature-settings: "cv11","ss01"`. Mono is the system `ui-monospace` stack (no extra package). Type scale: display 56/60, h1 36/40, h2 28/34, h3 20/28, body 14/22 (app) and 16/26 (marketing), caption 12/16. Use tabular numbers for KPIs and timestamps. Sassoon `@font-face` rules are removed; the font files stay in `public/fonts/` (user assets).
- **D6 Motion.** Tokens live in `src/lib/motion.ts`: `duration.fast=0.15, base=0.22, slow=0.32`; `ease.out=[0.22,1,0.36,1]`, `ease.inOut=[0.65,0,0.35,1]`; `spring.snappy={type:"spring",stiffness:500,damping:34}`, `spring.soft={stiffness:260,damping:30}`; variants `fadeIn`, `fadeUp` (y 8→0), `scaleIn` (0.96→1), `staggerContainer(0.04)`. `framer-motion` 14.7.1 is already installed.
- **D7 Routing.** One `BrowserRouter` (react-router-dom 7.18.5, already a dependency) is mounted in `main.tsx`. `src/app/AppRoutes.tsx` holds the whole route table, with `React.lazy` per portal and per public page. The path decides the active role, as it does today: visiting `/teacher` while signed in switches the session role to Teacher, which keeps demo switching and screenshots simple. Unauthenticated users go to `/auth?redirect=<path>`. `/` becomes the marketing landing page; the teacher portal moves to `/teacher`. Inner portals move from `pushState`/`?page=` routing to nested `<Routes>` during their own phase; until then they keep their current logic under a splat route.
- **D8 State.** One mock store `src/data/store/` built on `useSyncExternalStore` (no new dependency). It persists to `localStorage["quantum_lms_state_v2"] = { version, data }`; a version mismatch reseeds. Simulated long-running work (upload progress, recording processing) is stored as `startedAt` timestamps, and the UI derives its stage from `Date.now()`. Progress therefore survives reloads and needs no timers in the store. "Reset demo data" in the user menu reseeds.
- **D9 Domain model.** `src/types/lms.ts` is the single domain model. The evaluator's richer `Rubric/EvaluatorAssessment/StudentSubmission/EvaluationRecord/ReassessmentRequest` shapes become the canonical `Rubric/Assessment/Submission/...`, and `lms.ts`'s conflicting `TestSubmission` and `RubricCriterion` are deleted. Student assessments then flow to the evaluator queue and back as grades. `src/types/index.ts` keeps UI-only types (`IconName`, `UserRole`, `CurrentUser`, `MetricItem`) and re-exports `lms.ts`. School-era types are deleted as each portal stops using them.
- **D10 Player.** There are no real videos; the existing sample URLs point to googleapis and unsplash. `ChapterPlayer` therefore runs on a `useMediaClock` hook that offers the same API either way: a requestAnimationFrame-driven simulated clock over the lesson's poster art, or a real `<video>` element when `src` is set (teacher uploads keep a session-only `URL.createObjectURL` in `src/data/store/mediaRegistry.ts`, so an uploaded file really plays). All remote image URLs in seed data are replaced with local `/assets/*.jpg` or the generated `CourseCover` art.
- **D11 Shell.** One `AppShell` (sidebar + top bar + mobile drawer) is driven by `navConfig.ts` per role and replaces `components/Sidebar.tsx` (`AppSidebar`/`DesktopSidebar`/`MobileDrawer`/`MobileTopBar`), `SupportSidebar` and the evaluator top-bar chrome. It provides a skip link, `<main id="main">`, a shared-layout active indicator, a collapsible rail (persisted), ⌘K command palette, theme/accent menu, notifications, Ask AI, and a user menu with role switcher, reset demo data and sign out.
- **D12 Charts.** Lightweight SVG primitives in `src/components/charts/` (Sparkline, AreaChart, BarChart, DonutChart, ProgressRing) with reveal animations. No chart dependency, which keeps the bundle small.
- **D13 Bundle.** Every portal and public page is lazy. Target: `npm run build` prints no ">500 kB" chunk warning. Baseline today: one 1,735 kB `index` chunk.

---

## Phase 1: Design system, tokens, typography, motion, shared components, app shell

- [ ] 1. Fix the 15 pre-existing TypeScript errors with minimal, behaviour-preserving edits.
      `StudentPortal.tsx`: give `MyCoursesPage` `onSelectCourse={(id) => navigateTo("Course Details", id)}` and drop `onOpenAiModal`. Change `GradesPage` `initialTab=` to `initialView={activeTab === "Certificates" ? "certificates" : "grades"}`. Pass `onNavigate={navigateTo}` to `SupportHelpPage`. `TimetablePage.tsx:402`: `ann.date` → `ann.timestamp`. Add `import type { MetricItem } from "@/types"` to `KnowledgeBasePage.tsx`, `SupportAgentsPage.tsx`, `SupportAnalyticsPage.tsx`, `TicketsInboxPage.tsx`. `EvaluatorPortal.tsx:243,250`: use `"Submitted" | "In Progress" | "Draft Saved" | "Resubmitted"` for pending and `"Reassessment Requested"` for reassessment. `evaluator/Dashboard.tsx:207,219,236,261`: `"Assessments"`, `"Reassessment"` and `"My Evaluations"` → `"Submissions"` (pass `{ filter: "reassessment" }` context for the reassessment button); `"Results & Feedback"` → `"Reports"`.
      Files: `frontend/src/pages/student/StudentPortal.tsx`, `frontend/src/pages/student/TimetablePage.tsx`, `frontend/src/pages/support/{KnowledgeBasePage,SupportAgentsPage,SupportAnalyticsPage,TicketsInboxPage}.tsx`, `frontend/src/pages/evaluator/{EvaluatorPortal,Dashboard}.tsx`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds.

- [ ] 2. Update dependencies. Add `@fontsource-variable/inter@^5.3.0`. Remove the unused `better-auth`, `@better-auth/infra`, `better-sqlite3`, `@types/better-sqlite3` and `react-useanimations`; grep shows nothing in `frontend/src`, `vite.config.ts` or `.figma` imports them. Rename `package.json` `name` from `figma-make-app` to `quantum-lms-frontend`.
      Commands: in `<worktree>\frontend` run `npm install --package-lock-only --workspaces=false` to refresh `frontend/package-lock.json`, and `pnpm install --lockfile-only` to refresh `frontend/pnpm-lock.yaml` (Vercel builds with pnpm). Then run `npm install` in `<worktree>` to update the hoisted `node_modules`. If the npm lock refresh refuses to run inside a workspace, run `npm install --package-lock-only` from a temporary copy of `frontend/package.json` and copy the lock back; record which method worked in the commit body.
      Files: `frontend/package.json`, `frontend/package-lock.json`, `frontend/pnpm-lock.yaml`
      Verify: `git diff --stat` shows both lockfiles changed; `npm run typecheck` reports 0 errors; `npm run build` succeeds.

- [ ] 3. Build the verification harness outside the repo in `c:\Users\srima\Downloads\QuantumLMS\.agents\tasks\redesign-premium-ui\tools\`.
      - `package.json` (`"type":"module"`, dependency `playwright-core@1.48.2`); run `npm install` there.
      - `routes.mjs` exports route groups `{ public, auth, student, teacher, evaluator, support, admin, superAdmin }`, each a list of `{ name, path, role }`. Every later phase appends its routes.
      - `smoke.mjs` takes `--base http://localhost:8543 --groups a,b --out <dir> --viewports desktop,mobile --themes dark,light [--reduced-motion]`. It launches `chromium` with `executablePath = %LOCALAPPDATA%\ms-playwright\chromium-1140\chrome-win\chrome.exe` and args `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`. Viewports are desktop 1440×900 and mobile 390×844. Per route it uses `addInitScript` to seed `localStorage` (`quantum_auth_session`, `quantum_user_role`, `quantum_current_user` from a demo user per role, `app_theme_mode`), calls `goto`, waits for `networkidle` plus 700 ms, and takes a full-page PNG named `<group>-<name>-<viewport>-<theme>.png`. It collects `console` errors, `pageerror` and failed same-origin requests into `report.json`, and exits 1 on any error.
      - `flows.mjs` holds scripted end-to-end flows; later phases add them.
      Files: tools dir only (not committed; outside the worktree).
      Verify: start the dev server; `node smoke.mjs --groups student,teacher,support,evaluator,admin,superAdmin --viewports desktop --themes light --out ..\shots\baseline` produces PNGs and a report. Record existing console errors as the baseline; they must be fixed by the phase that owns them.

- [ ] 4. Install the token, theme and typography foundation.
      Create `src/styles/tokens.css` (D1/D3: semantic variables for `:root` and `.dark`, the `[data-accent=*]` overrides, radii `--radius-sm 6px / md 10px / lg 14px / xl 20px`, shadows, `--glow-primary`), and `src/styles/base.css` (Inter, body colours, `:focus-visible` 2px ring with offset, `::selection`, thin themed scrollbars replacing today's globally hidden scrollbars, and `@media (prefers-reduced-motion: reduce)` that zeroes CSS animation and transition durations).
      Generate `src/styles/palette-bridge.css` with `tools/gen-palette-bridge.mjs`, which reads `<worktree>\node_modules\tailwindcss\theme.css` for light defaults and applies the D4 dark rules. It outputs an `@theme inline` block mapping `--color-<hue>-<shade>` to `var(--p-<hue>-<shade>)`, plus `:root`/`.dark` definitions and the static `ink-*` scale.
      Move `index.css` lines 280–5648 (legacy component CSS) into `src/styles/legacy.css`, replacing hard-coded colours property by property: background `#fff/#ffffff` → `var(--surface)`, `#f8fafc` → `var(--background)`; `color: #172033/#111111` → `var(--foreground)`; `#64748b` → `var(--muted-foreground)`; border `#e2e8f0` → `var(--border)`; `#f0442e/#905feb` → `var(--primary)`. Keep `color: #fff` on filled buttons. `index.css` becomes `@import "tailwindcss"`, the `@custom-variant dark`, the `@theme inline` semantic mapping, and imports of tokens, base, palette-bridge and legacy. Delete the Sassoon `@font-face` blocks and the old `@theme`/`:root`/`.dark` blocks (lines 1–279).
      Import `@fontsource-variable/inter` in `main.tsx`. Add the pre-paint theme script and `<meta name="theme-color">` to `index.html`.
      Rewrite `services/themeService.ts`: mode `dark|light|system` (default `dark`, key `app_theme_mode`) and accent `violet|blue|emerald|amber` (key `app_theme_accent`, migrate unknown ids to `violet`); it applies `.dark` and `data-accent` to `<html>` and dispatches a `quantum-theme-change` event. Add `src/app/ThemeProvider.tsx` exporting default `ThemeProvider` and named `useTheme()`. Rewrite `components/ui/ThemeAccentPicker.tsx` with the same named export plus a default export: a popover with a light/dark/system segmented control and accent swatches.
      Add `tools/contrast.mjs`. It parses `tokens.css` and asserts ≥4.5:1 for fg, muted, subtle, primary-text, secondary-text and status text on background/surface/surface-2 in both themes, plus primary-foreground on primary for every accent, and ≥3:1 for ring and border-strong on surface.
      Files: `frontend/src/index.css`, `frontend/src/styles/{tokens,base,palette-bridge,legacy}.css` (new), `frontend/src/main.tsx`, `frontend/index.html`, `frontend/src/services/themeService.ts`, `frontend/src/app/ThemeProvider.tsx` (new), `frontend/src/components/ui/ThemeAccentPicker.tsx`
      Verify: `node tools\contrast.mjs` passes; `npm run typecheck` reports 0 errors; `npm run build` succeeds and the CSS asset contains `Inter Variable` and no `Sassoon`.

- [ ] 5. Run the one-time colour codemod (`tools/codemod-colors.mjs`) over `frontend/src/**/*.tsx|ts`. It handles variant prefixes (`hover:`, `md:`, `dark:` ...) and `/opacity` suffixes.
      Mapping for utilities `bg|text|border|ring|from|via|to|fill|stroke|outline|divide|decoration|shadow`:
      - `#905FEB #7E4BDC #7D4BD8 #5B4FE9 #4F46E5 #F0442E` → `primary` (`text-` → `text-primary-text`)
      - `#7042D2 #5F2BC0` → `primary-hover`
      - `#F0EDFF #FAF9FF #F0E7FF` → `primary-soft`
      - `#E5DEFF #D8C2FF` → `primary-border`
      - `#111111 #171526` → `foreground` (`bg-` → `bg-ink-900`)
      - `#514B68` → `muted-foreground`
      - `#AEEB00` → `success`; `#E7FF9C #EAFCC7` → `success-soft`; `#3B6600 #385000` → `success`
      - `#B45309` → `warning`; `#FFF3E0` → `warning-soft`
      - `#F3F4F6 #F1F0F3` → `zinc-100`
      - `bg-white` (no opacity, or opacity ≥ 50) → `bg-surface`; `bg-white/5..40` stays
      - `bg|from|via|to-{zinc,slate,gray,neutral,stone}-{800,900,950}` → `*-ink-{800,900,950}`
      - in `pages/teacher/LiveStudioPage.tsx` only, every `zinc-*` → `ink-*`, because it is a deliberately dark studio
      The script prints a per-file change count. Leave the remaining long-tail hex values; portal phases handle them.
      Files: all `frontend/src` TSX/TS that the script changes.
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; smoke all portal groups (desktop+mobile, dark+light) into `shots\phase-1-codemod`. Review the PNGs: no white cards on a dark page, no unreadable text, studio stays dark. Fix the worst offenders by hand.

- [ ] 6. Add motion primitives. `src/lib/motion.ts` holds the D6 tokens and variants. `src/components/motion/` holds `PageTransition.tsx` (AnimatePresence keyed on `location.pathname`, fadeUp, `mode="wait"`), `Stagger.tsx` (default `Stagger` container plus named `StaggerItem`), `Reveal.tsx` (`whileInView`, once), `AnimatedNumber.tsx` (springs from 0 to value when in view, `Intl` formatting prop, tabular-nums), `Pressable.tsx` (`whileHover` y −2 / `whileTap` scale 0.98 wrapper) and `index.ts`. Wrap the app in `<MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}>` in `main.tsx`.
      Files: `frontend/src/lib/motion.ts`, `frontend/src/components/motion/*` (new), `frontend/src/main.tsx`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds.

- [ ] 7. Build the shared component library on the tokens and keep every existing named export and prop API, because the support, student and teacher pages import them. The barrel `components/ui/index.ts` re-exports everything.
      Rewrite `button` (variants `primary|secondary|outline|ghost|danger|link|glass`, sizes `sm|md|lg|icon`, `loading` spinner, motion press feedback; keep `default/destructive` as aliases; drop `navigator.vibrate`), `card` (surface, 1px border, optional `interactive` hover lift), `badge` (tones neutral/primary/success/warning/danger/info/live with dot), `dialog` and `sheet` (Radix plus AnimatePresence scale/slide, overlay blur, focus trap from Radix), `tabs` (Radix with a `layoutId` sliding indicator; also export `SegmentedControl`), `select`, `input`, `popover`, and `StatCard` (keeps the `item: MetricItem` and tone API; maps tones lavender/pink/yellow/lime → primary/danger/warning/success tints; `AnimatedNumber` for numeric values; optional `sparkline`).
      Add `textarea`, `label`, `field` (label + hint + error), `switch`, `checkbox`, `tooltip` (Radix tooltip is installed), `dropdown-menu` (Radix, installed), `avatar` (image + initials fallback + status dot), `progress` (bar), `skeleton` (shimmer via transform), `empty-state`, `table` (`DataTable` with typed columns, sortable headers, row hover, sticky header, `mobileCard` render fallback under `md`), `page-header` (title, description, actions, breadcrumb), `kbd`, `accordion` (motion height via `layout`), `toast` (default `ToastProvider` + named `useToast()`: stacked, AnimatePresence, auto-dismiss, `aria-live="polite"`), and `command-palette` (Dialog + filtered list + arrow-key navigation).
      Add `src/components/charts/` (D12) and `src/components/shared/CourseCover.tsx` (image with gradient scrim, or generated gradient art with a category icon when there is no image).
      Add `src/pages/dev/DesignSystemPage.tsx`, a kitchen sink of every component in all states, routed at `/design-system` only when `import.meta.env.DEV`.
      Files: `frontend/src/components/ui/*`, `frontend/src/components/charts/*` (new), `frontend/src/components/shared/CourseCover.tsx` (new), `frontend/src/pages/dev/DesignSystemPage.tsx` (new)
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; after item 8, smoke `/design-system` at desktop+mobile in both themes. Review focus rings by keyboard-tabbing (add a `--tab-through` option to smoke that presses Tab 15 times and screenshots).

- [ ] 8. Introduce the router, session and lazy portals (D7).
      - `src/app/session.tsx`: default `SessionProvider`, named `useSession()`. It replaces `App.tsx` lines 61–107 and 446–533 (state, `handleLogin`, `handleLogout`, `handleSwitchRole`), keeps the storage keys `quantum_auth_session` / `quantum_user_role` / `quantum_current_user`, and exports `ROLE_HOME = { "Super Admin": "/super-admin", Admin: "/admin", Teacher: "/teacher", Student: "/student", Evaluator: "/evaluator/dashboard", Support: "/support" }`. Demo users per role move from `data/adminMockData.demoAccounts` into `src/data/demoAccounts.ts`, with AI-school titles (no "Maple", "School Admin" or "Exam Board").
      - `src/app/RequireRole.tsx`: unauthenticated → `/auth?redirect=`; role mismatch → switch role.
      - `src/app/AppRoutes.tsx`: `/` → temporary `<Navigate to="/auth">` (Phase 2 replaces it); `/auth` and `/login`; `/student/*`, `/teacher/*`, `/evaluator/*`, `/support/*`, `/admin/*` (role Admin), `/super-admin/*` (role Super Admin); `/design-system` (DEV); `*` → not-found page. All routes are `lazy` with a `Suspense` fallback of shell skeletons.
      - Move the teacher portal body (`App.tsx` lines 109–260 state and route sniffing, plus 535–580 and 690–812 render) into `src/pages/teacher/TeacherPortal.tsx` (default export) with base path `/teacher` instead of `/`. `App.tsx` becomes `<AppRoutes />`.
      - `main.tsx` order: `BrowserRouter` › `ThemeProvider` › `MotionConfig` › `SessionProvider` › `ToastProvider` › `App`. Portals keep their `onToast` prop; route wrappers pass `toast.show`.
      - `pages/support/index.tsx`: remove the inner `BrowserRouter` and make the `<Route path>` values relative (`""`, `dashboard`, `inbox`, `tickets/:ticketId`, `ticket/:ticketId`, ...). Absolute `<Link to="/support/...">` still work.
      - Remove the hex background from all shells. Until each portal's phase deletes the props, pass `hexColor` via a `LEGACY_BG = "transparent"` constant in `src/app/legacy.ts`, and make `AdminPortal`'s `hexColor`/`onChangeHexColor` optional.
      - Remove `"Parent"` from `UserRole`.
      Files: `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/app/{session,RequireRole,AppRoutes,legacy}.tsx|ts` (new), `frontend/src/data/demoAccounts.ts` (new), `frontend/src/pages/teacher/TeacherPortal.tsx` (new), `frontend/src/pages/support/index.tsx`, `frontend/src/pages/admin/AdminPortal.tsx`, `frontend/src/pages/auth/AuthPage.tsx` (wire `onLogin` to session + redirect), `frontend/src/types/index.ts`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` emits separate chunks per portal and no >500 kB warning (record chunk sizes in the commit body); smoke every portal group with 0 errors, including deep links `/support/tickets/<id>`, `/teacher/courses`, `/evaluator/workspace/<id>` and browser back/forward (add a back/forward step to smoke).

- [ ] 9. Build `src/components/shell/` (D11): `AppShell.tsx` (default), `Sidebar.tsx`, `TopBar.tsx`, `MobileNav.tsx` (Sheet), `UserMenu.tsx`, `RoleSwitcher.tsx`, `NotificationsMenu.tsx` (uses `NotificationContext`; move `NotificationProvider` up to `main.tsx`), `CommandPalette.tsx` (nav items of the current role plus courses), `AiAssistantDialog.tsx` (restyled replacement for `Modals.AskAiModal`), and `navConfig.ts`. Nav per role:
      - Student: Dashboard, My Courses, Schedule, Assessments, Grades & Certificates, Notes, Community, Career Hub | Support, Settings
      - Teacher: Dashboard, Courses, Live Classes, Recordings, Students, Doubts, Calendar, Analytics | Support, Settings
      - Evaluator: Dashboard, Queue, Re-evaluations, Reports | Settings
      - Support: Dashboard, Inbox, Live Chat, Knowledge Base, Agents, Analytics | Settings
      - Admin: Overview, Courses, Batches, Teachers, Students, Orders, Reports | Settings
      - Super Admin: Platform Health, Tenants, Access Control, Audit Logs, AI Usage, Revenue | Settings

      Adopt `AppShell` as the outer frame in `TeacherPortal`, `StudentPortal`, `EvaluatorPortal`, `SupportLayout` and `AdminPortal`. Each passes `activeId` and `onNavigate(id)`; it calls `navigate()` where the portal is routed, or its existing tab setter otherwise. Delete `components/Sidebar.tsx`, `SupportSidebar`, and the role-switch dropdowns duplicated in `support/index.tsx` and `AdminPortal.tsx`. Update the barrels `components/{index,teacher/index,admin/index,student/index}.ts`. Leave inner page headers in place; their phases remove the duplication.
      Files: `frontend/src/components/shell/*` (new), the five portal entry files, `frontend/src/components/Sidebar.tsx` (delete), barrels, `frontend/src/main.tsx`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; smoke all portal groups desktop+mobile in both themes. On mobile the drawer opens (add a smoke step that clicks `[aria-label="Open navigation"]` and screenshots). The active indicator animates. ⌘K opens the palette.

- [ ] 10. Rewrite `frontend/design.md` to document the new system: principles, tokens (both themes plus accents, with contrast ratios from `contrast.mjs`), typography scale, spacing (4 px grid; page padding 24/16; card padding 20), radii, elevation, motion tokens and usage rules, component inventory with do/don't, app-shell anatomy, and the legacy bridge with its retirement plan.
      Files: `frontend/design.md`
      Verify: renders as Markdown; every token in it exists in `tokens.css`.

- [ ] 11. Phase 1 gate (see Ground rules) with route groups `student, teacher, evaluator, support, admin, superAdmin` and `/design-system`. Send an `info` message to the parent session.

## Phase 2: Domain model, public marketing site, auth, checkout

- [ ] 12. Consolidate the domain model in `src/types/lms.ts` (D9).
      - Keep and extend: `Course` with `subtitle`, `category` union of the 8 AI categories (Generative AI, LLM Engineering, Agentic Systems, Machine Learning, Computer Vision, MLOps, Prompt Engineering, Python for AI), `level`, `format: "live_cohort" | "self_paced" | "hybrid"`, `outcomes[]`, `skills[]`, `instructorId`, `modules: CourseModule[]`, `priceRupees`, `compareAtRupees?`, `ratingCount`, `language`, `cover?`, `status: "draft" | "published" | "archived"`.
      - Add: `CourseModule {id,title,summary,lessons}`; `Lesson {id, moduleId, title, kind: "live_recording" | "video" | "reading" | "quiz" | "assignment", durationSeconds, status: "draft" | "uploading" | "processing" | "in_review" | "published", source: "live" | "upload", recordingId?, chapters?, transcript?, aiSummary?, resources[], uploadStartedAt?, fileName?, mediaKey?}`.
      - `Batch`/`BatchEntitlement` stay. Add `Enrollment {id,userId,courseId,batchId,accessType,orderId,purchasedAt,progressPct,completedLessonIds[],resume: Record<lessonId,seconds>,lastLessonId?}`, `Order` (rename `PaymentTransaction`, add `userId`, `courseId`, `batchId`, `method: "upi" | "card" | "netbanking" | "emi"`), `Instructor`, `Testimonial`, `FaqItem`, `PricingPlan`.
      - `LiveClassSession` gets `courseId`, `scheduledAt` as ISO, `recordingId?`. `LectureRecording` gets `courseId`, `lessonId?`, `processingStartedAt?`, `status: "processing" | "in_review" | "published"`, with chapters, transcript and `aiSummary`.
      - Assessments: `Assessment`, `Rubric`, `RubricCriterion`, `Submission`, `EvaluationRecord`, `ReassessmentRequest` and `EvaluationStatus`/`ReleaseStatus`, moved from `pages/evaluator/types.ts`, with `courseId` added. `pages/evaluator/types.ts` re-exports them under the old names (`EvaluatorAssessment`, `StudentSubmission`). Delete `TestSubmission` and lms' `RubricCriterion`.
      - Also `Certificate` (rename `CertificateRecord`), `SupportTicket` (unchanged; `supportTicketsData.ts` extends it), `AuditLogEntry`, `Tenant`, `RolePermission`, `AiUsagePoint`, `RevenuePoint`, `StudentDoubt`, `Note {id,userId,courseId,lessonId,atSeconds?,body,createdAt}`, and `LmsUser {id,name,email,role,avatar?,title?}`.
      - `src/types/index.ts`: re-export `lms.ts`. Remove `ClassRoomInfo`, `CampusTenant`, `ReportItem`, `StudentItem.subjects/parentName/parentEmail` only once their consumers migrate; mark them `/** @deprecated school-era, removed in Phase N */` now.
      Files: `frontend/src/types/lms.ts`, `frontend/src/types/index.ts`, `frontend/src/pages/evaluator/types.ts`
      Verify: `npm run typecheck` reports 0 errors.

- [ ] 13. Create the seed data in `src/data/lms/`:
      - `courses.ts`: 8 courses with ids and slugs `genai-engineering`, `llm-engineering`, `agentic-systems`, `ml-foundations`, `computer-vision`, `mlops`, `prompt-engineering`, `python-for-ai`. Covers are `/assets/course_genai.jpg`, `course_agents.jpg`, `course_ml.jpg`, `course_python.jpg`, `rec_cv.jpg`, `rec_prompt.jpg`; the rest use `CourseCover` art. Each course has 4–6 modules. Every course mixes `live_recording` lessons (with chapters, transcript and AI summary) and `video`/`reading`/`quiz`/`assignment` lessons, and at least one course has a `processing` and an `in_review` recording for the teacher demo.
      - `recordings.ts`: port `MOCK_RECORDINGS` chapters and transcripts from `services/mockDataService.ts`; transcripts must cover the whole duration so the highlight moves.
      - Also `batches.ts` (live+replay and replay-only per course; replay-only has `replayReleaseDelayHours: 24`), `instructors.ts`, `users.ts` (students, a TA, staff), `liveSessions.ts` (one live now, upcoming this week, past), `assessments.ts` (port evaluator assessments and submissions; AI-course titles only), `orders.ts`, `certificates.ts`, `tickets.ts`, `doubts.ts`, `audit.ts`, `platform.ts` (tenants, e.g. "Quantum Online", "Bengaluru Hub", "Hyderabad Hub", "Enterprise: Acme Analytics cohort"; AI usage and revenue series for 12 months), `marketing.ts` (testimonials, FAQs, pricing plans) and `index.ts`.
      - Delete `services/mockDataService.ts`, which nothing imports.
      Files: `frontend/src/data/lms/*` (new), `frontend/src/services/mockDataService.ts` (delete)
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; `rg "unsplash|googleapis|Rajesh Verma" frontend/src` returns nothing.

- [ ] 14. Implement the store (D8).
      - `src/data/store/lmsStore.ts`: `getState/setState/subscribe`, localStorage persistence with version, `resetDemoData()`, and a hook `useLms(selector)` built on `useSyncExternalStore` with stable selectors.
      - `src/data/store/actions.ts`: `purchaseCourse({courseId,batchId,buyer:{name,email},method})` creates or returns the user, then the order and enrollment, and returns them. `markLessonComplete`, `saveResume`, `addNote/updateNote/deleteNote`, `askDoubt`, `submitAssessment` (creates a canonical `Submission` with status `Submitted`), `saveEvaluationDraft/finalizeEvaluation/releaseGrades/resolveReassessment` (signatures ported from `evaluatorStorage.ts`), `issueCertificate`, `scheduleLiveClass`, `startLiveClass`, `endLiveClass(sessionId)` (creates a `LectureRecording` with `processingStartedAt=now` and returns its id), `updateRecording(id, patch)` (chapters, transcript, summary), `publishRecording(id, {courseId, moduleId, batchIds})` (adds or updates a `live_recording` lesson and marks the session published), `createCourse/updateCourse/publishCourse`, `addModule/reorderModules/addLesson/updateLesson/reorderLessons/startLessonUpload(lessonId, file)` (stores an object URL in `mediaRegistry`, sets `uploadStartedAt` and `fileName`) and `publishLesson`, `createTicket/replyTicket/updateTicket/applyTicketAction`, `refundOrder`.
      - `src/data/store/derive.ts`: `getUploadProgress(lesson, now)` (0→100 over 6 s, then `processing` for 4 s), `getRecordingStage(rec, now)` (`transcribing` 0–4 s, `chaptering` 4–8 s, `summarizing` 8–11 s, then `in_review`), `isReplayReleased(batch, session, now)`, and `courseProgress`.
      - `src/lib/format.ts`: `formatINR`, `formatDuration(sec)` → `1:28:45`, `formatTimestamp`, `formatRelative`, `formatDate`.
      Files: `frontend/src/data/store/*` (new), `frontend/src/lib/format.ts` (new)
      Verify: `npm run typecheck` reports 0 errors; add `tools/flows.mjs` flow `store-smoke` that runs in the browser console via `page.evaluate` against `window.__lms` (exposed only in DEV) to call `purchaseCourse` and `endLiveClass` and check the derived stages advance after `page.waitForTimeout(12000)`. It passes.

- [ ] 15. Build the public site shell and landing page under `src/pages/public/`.
      - `PublicLayout.tsx`: sticky nav that gains blur and border after scroll; links Courses, How it works, Pricing, FAQ; buttons Sign in and Browse courses; theme toggle; mobile menu sheet; footer.
      - `LandingPage.tsx` composes `sections/`:
        - `Hero`: headline about learning AI from a practitioner, live + recorded, ₹ pricing hint, primary CTA, animated "player with chapter markers" visual with a subtle glow, trust stats with `AnimatedNumber`.
        - `CourseHighlights`: 4–6 featured course cards with stagger and hover lift.
        - `HowLearningWorks`: two tracks with an animated pipeline. Track 1: Live class → Recording → AI chapters + transcript → Rewatch by chapter. Track 2: Pre-recorded modules → Chapters → Learn at your pace.
        - `Instructor` (Srimanth), `Testimonials` (marquee row that pauses on hover and is static under reduced motion), `Pricing` (live+replay vs replay-only vs bundle, ₹), `Faq` (accordion), `FinalCta`.
      - Route `/` → `LandingPage`, replacing the temporary redirect from item 8. Update `.figma/make/site.json` `description` to describe the AI school.
      Files: `frontend/src/pages/public/**` (new), `frontend/src/app/AppRoutes.tsx`, `frontend/.figma/make/site.json`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds and the landing chunk is separate; add group `public` to `routes.mjs` and smoke `/` desktop+mobile in both themes with 0 errors; review the PNGs.

- [ ] 16. Build `CatalogPage.tsx` (`/courses`) and `CourseDetailPage.tsx` (`/courses/:slug`).
      - Catalog: search, category chips, level and format filters as `SegmentedControl`; grid animated with `layout` + AnimatePresence; empty state; skeletons on first paint.
      - Detail: hero with cover, rating, hours, level, format; "What you'll learn"; curriculum accordion of modules and lessons with kind icons and durations, and "Preview" on the first lesson; a chapters preview for a sample recording using a new read-only `src/components/player/ChapterTimeline.tsx` (segmented bar, hover tooltip with chapter title and timestamp, chapter list; Phase 3's scrubber builds on it); a batch/format picker (Live cohort + replays vs Replay-only, with start date, seats left and ₹ price); instructor; FAQ. A sticky purchase card on desktop becomes a bottom bar on mobile, and its CTA links to `/checkout/:slug?batch=<id>`.
      - Unknown slug → not-found state.
      Files: `frontend/src/pages/public/{CatalogPage,CourseDetailPage}.tsx` (new), `frontend/src/components/player/ChapterTimeline.tsx` (new), `frontend/src/app/AppRoutes.tsx`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; smoke `/courses`, `/courses/genai-engineering`, `/courses/does-not-exist` with 0 errors; review the PNGs.

- [ ] 17. Build the mock checkout `CheckoutPage.tsx` (`/checkout/:slug`).
      - Steps with an animated progress indicator: (1) Account: name, email, password, or "signed in as X"; inline validation through `Field`. (2) Batch: confirm or change. (3) Payment: UPI / Card / NetBanking / EMI tabs with mock fields, order summary with GST line, coupon `AI10` for 10% off.
      - Pay: button loading, then a "Processing payment…" overlay of about 1.5 s, then a success check animation. It calls `purchaseCourse` and logs in as Student through `useSession().login`, then navigates to `/student/courses/:courseId?welcome=1`.
      - Until Phase 3, `/student/courses/:id` lands in the current student portal through the `?page=` mapping; add the temporary redirect in `StudentPortal`.
      - Signed-in non-students see "Switch to a student account" instead of the form.
      Files: `frontend/src/pages/public/CheckoutPage.tsx` (new), `frontend/src/app/AppRoutes.tsx`, `frontend/src/pages/student/StudentPortal.tsx`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; add `flows.mjs` flow `checkout`: open `/courses/agentic-systems`, choose the replay-only batch, fill the steps, pay, and assert the URL starts with `/student` and that `localStorage.quantum_lms_state_v2` contains an enrollment for `agentic-systems`. It passes with 0 console errors.

- [ ] 18. Redesign `pages/auth/AuthPage.tsx`.
      - Split layout: brand panel with animated gradient mesh, testimonial and logo; form card on the right.
      - Sign in / Create account as a `SegmentedControl` with a shared-layout indicator. Show/hide password. Remember me.
      - A "Demo access" grid of the 6 roles (icon, role, one-line description) that launches each portal.
      - Honours `?redirect=` and `?mode=signup`. Sign-up always creates a Student and goes to `/student` (or the redirect).
      - Remove the `hexColor` props and the old `auth-*` classes, and the matching rules from `legacy.css`.
      Files: `frontend/src/pages/auth/AuthPage.tsx`, `frontend/src/styles/legacy.css`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; smoke `/auth` and `/auth?mode=signup` desktop+mobile in both themes; flow `auth-demo` clicks each demo role and asserts it lands on `ROLE_HOME`.

- [ ] 19. Phase 2 gate with groups `public, auth` plus the `checkout` and `auth-demo` flows. Send an `info` message to the parent session.

## Phase 3: Student portal and chapterized player

- [ ] 20. Convert `StudentPortal.tsx` to nested routes inside `AppShell`: `dashboard` (index), `courses`, `courses/:courseId`, `learn/:courseId/:lessonId`, `live/:sessionId`, `schedule`, `assessments`, `assessments/:assessmentId`, `grades`, `certificates`, `notes`, `community`, `career/*`, `attendance`, `support`, `settings`. `parseInitialTab()` becomes a legacy redirect: `/student?page=x` → its route. Add `PageTransition` around the outlet. Drop the `hexColor` props and `StudentHeader` usage; use `PageHeader`. Read data from the store (enrollments → courses) instead of `studentMockData` lists.
      Files: `frontend/src/pages/student/StudentPortal.tsx`, `frontend/src/pages/student/studentTypes.ts` (remove `StudentNavPage` values that no longer exist; drop the divergent `CourseItem` once its consumers migrate in items 22–26)
      Verify: `npm run typecheck` reports 0 errors; smoke `/student`, `/student?page=grades` (redirects), `/student/courses`.

- [ ] 21. Build the player in `src/components/player/`:
      - `useMediaClock.ts` (D10): `{currentTime, duration, playing, rate, play, pause, seek, setRate}`, with a simulated rAF clock or a real `<video>` element.
      - `ChapterPlayer.tsx` (default): poster or video stage, big play button with scale-in, buffering shimmer, chapter title chip that cross-fades on chapter change, keyboard (Space/K play, J/L ±10 s, ←/→ ±5 s, F fullscreen, `[`/`]` previous/next chapter), auto-hiding controls on idle, fullscreen via `requestFullscreen`.
      - `PlayerControls.tsx`: play/pause, skip, time, speed menu 0.75–2×, captions toggle (shows the active transcript line), fullscreen.
      - `ChapterScrubber.tsx`: composes `ChapterTimeline`; segments separated by 2 px gaps; the hovered segment grows on Y; hover preview card with chapter title, timestamp and poster crop at the hover position; drag to seek; `role="slider"` with aria values and arrow keys.
      - `ChapterList.tsx`: active chapter with `layoutId` highlight, progress inside the active chapter, click to seek.
      - `TranscriptPanel.tsx`: active line highlighted, auto-scroll that pauses for 4 s after manual scroll, click a line to seek, search box.
      - Props: `chapters`, `transcript`, `durationSeconds`, `poster`, `src?`, `initialTime`, `onTimeUpdate` (throttled to 5 s for resume), `onEnded`.
      Files: `frontend/src/components/player/*` (new)
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; add the player to `/design-system` and smoke it.

- [ ] 22. Build the dashboard and courses.
      - `StudentDashboardPage.tsx`: welcome banner when `?welcome=1` (purchased course unlocked, confetti-free scale-in), continue-watching card with resume time, next live class with countdown and Join, progress rings per course, assessments due, recent certificates, learning streak (from `StudentActivityHeatmap` restyled), all with stagger entrances.
      - `MyCoursesPage.tsx`: enrolled grid with progress and an entitlement badge ("Live + Replay" / "Replay only"), filters, and an Explore card linking to `/courses`.
      - New `pages/student/course/CourseOverviewPage.tsx` (`/student/courses/:courseId`): hero with progress, next lesson CTA, modules with lesson rows (completed/locked state, live recordings show chapter count and an "AI summary" chip, replay-only batches show "Replay available in Xh" from `isReplayReleased`), upcoming live sessions for the batch, and tabs Materials / Discussion / Notes. The tab bodies are extracted from `CourseDetailsPage.tsx` into `pages/student/course/tabs/{MaterialsTab,DiscussionTab,NotesTab}.tsx`, keeping `materialUtils.ts` behaviour.
      Files: `frontend/src/pages/student/{StudentDashboardPage,MyCoursesPage}.tsx`, `frontend/src/pages/student/course/**` (new), `frontend/src/components/StudentActivityHeatmap.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke `/student`, `/student/courses`, `/student/courses/genai-engineering`, `/student?welcome=1` with 0 errors; review the PNGs.

- [ ] 23. Build `pages/student/learn/LessonPlayerPage.tsx` (`/student/learn/:courseId/:lessonId`).
      - Layout: player left (desktop), tabbed side panel right (Chapters / Transcript / Notes / Resources / Doubts); under the player go the title, AI summary card (collapsible), key concepts chips, and Previous/Next lesson. On mobile the player sits on top and the tabs below.
      - `live_recording` and `video` lessons use `ChapterPlayer` with `initialTime = enrollment.resume[lessonId]`. They show a "Resume from 12:04" toast and save resume through the store.
      - Notes capture `atSeconds` and click to seek. "Ask a doubt at 24:18" creates a `StudentDoubt` with the timestamp.
      - `reading` lessons render content through `LessonContentInlineViewer` (restyled); `quiz`/`assignment` lessons link to the assessment.
      - "Mark complete" plays an animated check and updates progress; when the course reaches 100%, `issueCertificate` runs and a toast links to the certificate.
      - Delete `CourseDetailsPage.tsx` once its remaining pieces are extracted (quizzes go to item 24).
      Files: `frontend/src/pages/student/learn/**` (new), `frontend/src/components/LessonContentInlineViewer.tsx`, `frontend/src/pages/student/CourseDetailsPage.tsx` (delete), `frontend/src/pages/student/index.ts`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; add `flows.mjs` flow `player`: open a seeded recording lesson, hover the scrubber and assert the preview card text equals a chapter title, click chapter 3 in the list and assert the time label ≥ chapter 3 start, switch to Transcript and assert exactly one `[aria-current="true"]` line whose timestamp ≤ current time, reload and assert the resume time persisted (±5 s). It passes with 0 console errors.

- [ ] 24. Build assessments, grades and certificates.
      - `AssignmentsPage.tsx` → `pages/student/assessments/AssessmentsPage.tsx`: tabs Quizzes / Assignments / Projects, status filters, due-date badges.
      - `QuizRunner.tsx`: extracted from the old `CourseDetailsPage` quiz logic (timer, saved progress, auto-submit, review with explanations, `initialQuizAttempts` behaviour) and restyled. It shows a question progress bar, an option press animation, and a result ring with `AnimatedNumber`.
      - `AssignmentSubmit.tsx`: drag-and-drop file with simulated upload, repo URL, comments. It calls `submitAssessment`, so the submission appears in the evaluator queue in Phase 5.
      - `GradesPage.tsx`: per-course scores and rubric feedback from the store's released evaluations. Remove the GPA, semester and "MATH-201"/"CS-102" school framing. Request re-evaluation creates a `ReassessmentRequest`.
      - `CertificatesPage.tsx`: certificate cards plus a viewer dialog with a styled certificate (name, course, date, verification code), mock Download PDF (`window.print` of the certificate node) and Share/copy link.
      Files: `frontend/src/pages/student/assessments/**` (new), `frontend/src/pages/student/{AssignmentsPage,GradesPage}.tsx` (move/rewrite), `frontend/src/pages/student/CertificatesPage.tsx` (new), `frontend/src/pages/student/studentMockData.ts` (remove migrated lists)
      Verify: `npm run typecheck` reports 0 errors; smoke `/student/assessments`, `/student/assessments/<quizId>`, `/student/grades`, `/student/certificates`; flow `quiz`: take the seeded quiz, submit, and assert the result screen.

- [ ] 25. Build schedule and the live room.
      - `TimetablePage.tsx` → `SchedulePage`: week strip plus agenda list of the batch's live sessions from the store, "Live now" pulse badge, add-to-calendar (.ics download), and announcements restyled.
      - New `pages/student/live/LiveRoomPage.tsx` (`/student/live/:sessionId`), opened by Join when the entitlement is `live_and_replay`: simulated stream stage with the poster and an animated "LIVE" badge, chat panel with seeded messages and send, Raise hand / "I'm lost" buttons with counters, and Leave. Replay-only users see "Your plan includes replays" with a link to the recording.
      Files: `frontend/src/pages/student/TimetablePage.tsx` (→ `SchedulePage.tsx`), `frontend/src/pages/student/live/LiveRoomPage.tsx` (new)
      Verify: `npm run typecheck` reports 0 errors; smoke `/student/schedule` and `/student/live/<liveSessionId>`.

- [ ] 26. Apply the design system to the remaining student pages, with less bespoke work: `MyNotesPage` (notes from the store, grouped by course/lesson, timestamp chips that deep-link into the player), `AttendancePage` (live-session attendance per course; drop the semester framing), `CommunityPage`, `CareerHubPage` + `career/*` (shared `Card/Tabs/Button/Select`, replace `StudentDropdown` with `Select`; no logic changes), `SupportHelpPage` (keep the `saveSupportTicketToSupabase`/`fetchSupportTicketsFromSupabase`/`fetchStudentIdFromSupabase` calls exactly; tickets also go to the store so Support sees them), and `StudentSettingsPage` (profile, Appearance through `useTheme()`, notifications, security; remove the hex picker and `ThemeAccentPicker` duplication).
      Files: `frontend/src/pages/student/{MyNotesPage,AttendancePage,CommunityPage,CareerHubPage,SupportHelpPage,StudentSettingsPage}.tsx`, `frontend/src/pages/student/career/*`
      Verify: `npm run typecheck` reports 0 errors; smoke every student route desktop+mobile in both themes with 0 errors.

- [ ] 27. Phase 3 gate with group `student` plus the `checkout`, `player` and `quiz` flows. Send an `info` message to the parent session.

## Phase 4: Teacher portal and both content paths

- [ ] 28. Convert `TeacherPortal.tsx` to nested routes: `dashboard` (index), `courses`, `courses/:courseId` (builder), `live`, `live/studio/:sessionId`, `recordings`, `recordings/:recordingId`, `students`, `doubts`, `calendar`, `analytics`, `settings`, `support`. Legacy `/teacher/live-class/*`, `/teacher/reports` and `/teacher/help` redirect to the new routes. Remove `parseCourseRoute` and the regex path sniffing. Remove the `hexColor`, `searchQuery` and `LEGACY_BG` plumbing from the teacher pages. The top bar search replaces each page's header search; replace `CoursesHeader`/`StudentsHeader`/... with `PageHeader`.
      Files: `frontend/src/pages/teacher/TeacherPortal.tsx`, `frontend/src/pages/teacher/index.ts`, every teacher page's header export
      Verify: `npm run typecheck` reports 0 errors; smoke `/teacher` and the legacy redirects.

- [ ] 29. Build `pages/teacher/TeacherDashboardPage.tsx` (new): today's live classes with a Go live CTA, the "Recordings to review" queue with processing stage chips, open doubts, course KPIs (`StatCard` + sparklines: active students, watch hours, completion, avg score), and recent activity.
      Files: `frontend/src/pages/teacher/TeacherDashboardPage.tsx` (new)
      Verify: `npm run typecheck` reports 0 errors; smoke `/teacher`.

- [ ] 30. Build the course builder for the pre-recorded path. Split `CoursesPage.tsx` (1,828 lines) into `pages/teacher/courses/`:
      - `CourseListPage`: cards/table toggle, status filter, "New course" dialog with title, category, level and format.
      - `CourseBuilderPage`: tabs Curriculum / Details / Pricing & batches / Publish.
        - Curriculum: modules and lessons reorderable with framer-motion `Reorder`, plus keyboard up/down buttons for accessibility; add module; add lesson by kind.
        - `LessonEditorSheet`: title, kind, description, resources. For `video` lessons it shows an `UploadDropzone` (accepts video/*; calls `startLessonUpload`; animated progress from `getUploadProgress`, then a "Processing" shimmer, then Ready with a real preview through `ChapterPlayer src=objectURL`). It includes `ChapterEditor`.
        - Publish: checklist (cover, at least one module, all lessons ready), Publish course / Publish lesson with confirm dialog, and "Preview as student" linking to `/student/learn/...`.
      - `components/ChapterEditor.tsx`, shared with item 32: chapter rows with timestamp input (`mm:ss`), title and summary; "Set to current time" from the player; add, delete and auto-sort; markers on `ChapterScrubber` update live.
      - Keep `ModuleAssignmentSection` and `LessonContentInlineViewer` behaviour, restyled.
      Files: `frontend/src/pages/teacher/CoursesPage.tsx` (replace with a re-export or delete), `frontend/src/pages/teacher/courses/**` (new), `frontend/src/components/{ModuleAssignmentSection,LessonContentInlineViewer}.tsx`, `frontend/src/data/courseAssignmentsData.ts`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; add `flows.mjs` flow `upload-path`: as Teacher create a module and a video lesson, upload a small generated file (`page.setInputFiles` with a Buffer named `intro.mp4`), wait for Ready, add 2 chapters, publish, then switch role to Student (enrolled in that course) and open the lesson. Assert 2 chapter markers and that clicking chapter 2 seeks. It passes with 0 console errors.

- [ ] 31. Build live scheduling and the studio.
      - New `pages/teacher/live/LiveClassesPage.tsx`: tabs Live now / Upcoming / Past, and a schedule dialog with course, batch(es), title, description, date/time and duration, validated through `Field`, calling `scheduleLiveClass`. Rows have Go live (enabled from 15 min before the start, or always for the demo session), Edit and Cancel.
      - Restyle `LiveStudioPage.tsx` on ink tokens: stage, camera/screen toggles (keep the existing getUserMedia logic and handle permission denial without console errors), chat/Q&A/participants/AI-monitor panels as Tabs with sliding indicator, live timer, "I'm lost" counter. End class → confirm dialog → `endLiveClass` → navigate to `/teacher/recordings/:newId`.
      - Restyle `AttendanceSection` and `AIMonitoringSection`.
      Files: `frontend/src/pages/teacher/live/LiveClassesPage.tsx` (new), `frontend/src/pages/teacher/LiveStudioPage.tsx`, `frontend/src/components/{AttendanceSection,AIMonitoringSection}.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke `/teacher/live` and `/teacher/live/studio/<id>` with 0 errors (fake media flags).

- [ ] 32. Build recordings for the live path.
      - New `pages/teacher/recordings/RecordingsPage.tsx`: list with stage chips (Transcribing / Generating chapters / Summarizing / Ready for review / Published) from `getRecordingStage`.
      - New `RecordingReviewPage.tsx`: while processing, an animated pipeline stepper with per-step progress. When `in_review`: the player with `ChapterEditor`, `TranscriptPanel` in edit mode (inline edit a line), an AI summary editor with "Regenerate" (simulated 1 s), key concepts chips, a publish panel (target course, module, batches; replay-only batches show the release delay), and a Publish button that calls `publishRecording` and shows a success toast with "View as student".
      Files: `frontend/src/pages/teacher/recordings/**` (new)
      Verify: `npm run typecheck` reports 0 errors; add `flows.mjs` flow `live-path`: as Teacher schedule a session, Go live, End class, wait for `in_review` (about 12 s), rename chapter 1, publish to `genai-engineering` module 1, then switch to Student and open the new lesson. Assert the renamed chapter title appears in the chapter list and transcript highlighting works. It passes with 0 console errors.

- [ ] 33. Realign the remaining teacher pages with the AI-course model and the design system.
      - `StudentsPage` → enrolments table: course, batch, access type, progress, last active, score, at-risk flag. Remove the english/math/science/art subjects and parent fields.
      - `DoubtsPage`: timestamped doubts with "Open at 24:18", AI-suggested answer, reply/resolve.
      - `CalendarPage`: live sessions + deadlines from the store.
      - `AnalyticsPage` (2,492 lines): split into `pages/teacher/analytics/{OverviewSection,EngagementSection,RecordingsSection,AssessmentsSection}.tsx` using `components/charts`; remove parent digests and "dispatched to parent portals".
      - `SettingsPage`, `SupportPage`: restyle, theme via `useTheme()`.
      - `Modals.tsx`: `NewAssignmentModal` → create assessment for a course module; `AddStudentModal` → enrol learner into a batch; delete `ReportSenderModal` and `Toast`; `AskAiModal` is superseded by `AiAssistantDialog`, so delete it once the evaluator stops importing it (Phase 5).
      - Remove the now-unused teacher datasets from `data/mockData.ts` (`initialStudents` subjects, `initialReports`, metrics) or replace them with selectors over the store.
      Files: `frontend/src/pages/teacher/{StudentsPage,DoubtsPage,CalendarPage,AnalyticsPage,SettingsPage,SupportPage}.tsx`, `frontend/src/pages/teacher/analytics/**` (new), `frontend/src/components/Modals.tsx`, `frontend/src/data/mockData.ts`, `frontend/src/data/studentActivityData.ts`
      Verify: `npm run typecheck` reports 0 errors; smoke every teacher route desktop+mobile in both themes; `rg -i "maple|year 4|parent" frontend/src/pages/teacher frontend/src/components/Modals.tsx` returns only DOM uses (`parentElement` and similar).

- [ ] 34. Phase 4 gate with group `teacher` plus the `upload-path`, `live-path` and `player` flows. Send an `info` message to the parent session.

## Phase 5: Evaluator portal

- [ ] 35. Convert `EvaluatorPortal.tsx` to nested routes inside `AppShell`: `dashboard`, `queue`, `workspace/:submissionId`, `re-evaluations`, `reports`, `settings`; legacy `/evaluator/submissions` → `queue`. Replace `evaluatorStorage.ts` with store selectors and actions (same semantics: draft, finalize, auto-advance, notifications). Student submissions from item 24 appear in the queue. Migrate `evaluatorMockData.ts` seeds into `data/lms/assessments.ts` (done in item 13) and delete the duplicates. Drop `hexColor` and the `EvaluatorTopBar` chrome now in `AppShell`.
      Files: `frontend/src/pages/evaluator/{EvaluatorPortal,types}.ts(x)`, `frontend/src/pages/evaluator/data/*`, `frontend/src/pages/evaluator/components/EvaluatorTopBar.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke `/evaluator/dashboard` and `/evaluator/queue`.

- [ ] 36. Redesign the dashboard and queue.
      - Dashboard: KPIs (pending, due today, SLA breaches, avg turnaround) with `AnimatedNumber`, workload by assessment bar chart, "Resume grading" focal card, deadlines.
      - Queue: `DataTable` with filters (course, assessment, status, priority, overdue), search, blind-grading toggle (masks names), keyboard row navigation (Enter opens the workspace), and status/release badges through the restyled `StatusBadge`.
      Files: `frontend/src/pages/evaluator/{Dashboard,Submissions}.tsx`, `frontend/src/pages/evaluator/components/StatusBadge.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke both routes desktop+mobile in both themes.

- [ ] 37. Redesign the grading workspace. Split `EvaluationWorkspace.tsx` (1,041 lines) into `pages/evaluator/workspace/{WorkspacePage,SubmissionViewer,CodeFileTabs,AnswerList,RubricPanel,FeedbackPanel,WorkspaceToolbar}.tsx`.
      - Resizable split on desktop, tabs on mobile.
      - The rubric panel has per-criterion level chips and a points stepper, a running total ring, the AI-suggested score with rationale and "Apply", and validation that partial credit stays within max.
      - Draft autosave indicator. Finalize opens a confirm dialog with a summary. Previous/Next with shortcuts (Alt+←/→) and a toast after finalize.
      Files: `frontend/src/pages/evaluator/EvaluationWorkspace.tsx` (delete after split), `frontend/src/pages/evaluator/workspace/**` (new)
      Verify: `npm run typecheck` reports 0 errors; add `flows.mjs` flow `grade`: open the first queue item, set every criterion, finalize, release, then switch to Student and assert `/student/grades` shows the score. It passes with 0 console errors.

- [ ] 38. Build `pages/evaluator/ReEvaluationsPage.tsx` (new): request list, request detail with the original evaluation, revise marks, and Uphold/Adjust through `resolveReassessment`. Restyle `Reports.tsx` (charts) and `Settings.tsx` (theme via `useTheme()`). Remove `AskAiModal` from the evaluator and delete it from `Modals.tsx`.
      Files: `frontend/src/pages/evaluator/{ReEvaluationsPage,Reports,Settings}.tsx`, `frontend/src/components/Modals.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke the `evaluator` group desktop+mobile in both themes.

- [ ] 39. Phase 5 gate with group `evaluator` plus the `grade` flow. Send an `info` message to the parent session.

## Phase 6: Support portal

- [ ] 40. Redesign `SupportDashboard` and `TicketsInboxPage`.
      - Point both at the store's tickets, seeded from `supportTicketsData.ts` plus student-created tickets.
      - Dashboard: queue KPIs, SLA-at-risk list, CSAT sparkline, channel mix donut.
      - Inbox: saved views as `SegmentedControl` (All, Mine, Unassigned, Escalated, Resolved), filters, bulk select with assign/close, SLA countdown badges, row hover preview, `?filter=escalated` support. Mobile shows cards.
      - Remove the duplicate header and search in `SupportLayout`; `AppShell` provides them. Keep `LEARNERS_SEARCH_INDEX` as command-palette items.
      Files: `frontend/src/pages/support/{index,SupportDashboard,TicketsInboxPage,supportTicketsData}.tsx|ts`
      Verify: `npm run typecheck` reports 0 errors; smoke `/support/dashboard` and `/support/inbox?filter=escalated`.

- [ ] 41. Redesign `TicketDetailPage` with Student 360.
      - Conversation thread with message entrance animation, composer with macros and internal-note toggle, status/priority/assignee controls.
      - `Student360Drawer` becomes a right panel on desktop and a sheet on mobile, built from store data: profile, enrolments with access type and expiry, orders with refund action, recent watch activity, open doubts.
      - `proposedAction` (batch move / validity extension) cards apply through `applyTicketAction`, which really changes the enrolment.
      - Keep the existing Supabase-related imports and behaviour of this page.
      Files: `frontend/src/pages/support/TicketDetailPage.tsx`, `frontend/src/components/shared/Student360Drawer.tsx`
      Verify: `npm run typecheck` reports 0 errors; add `flows.mjs` flow `support-action`: open a ticket with a proposed batch move, approve it, and assert the student's enrolment batch changed in `localStorage`. It passes.

- [ ] 42. Restyle `LiveChatPage` (conversation list + chat with typing indicator and quick replies), `KnowledgeBasePage` (search, categories, article reader dialog, copy link), `SupportAgentsPage`, `SupportAnalyticsPage` (`components/charts`) and `SupportSettingsPage` onto the shared components. Remove `ThemeAccentPicker` duplicates and replace long-tail hex classes with tokens.
      Files: `frontend/src/pages/support/{LiveChatPage,KnowledgeBasePage,SupportAgentsPage,SupportAnalyticsPage,SupportSettingsPage}.tsx`, `frontend/src/components/SupportCategoryDropdown.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke the `support` group desktop+mobile in both themes.

- [ ] 43. Phase 6 gate with group `support` plus the `support-action` flow. Send an `info` message to the parent session.

## Phase 7: Admin and Super Admin

- [ ] 44. Split `AdminPortal.tsx` (1,614 lines) into route-based portals. `pages/admin/AdminPortal.tsx` uses nested routes `overview` (index), `courses`, `batches`, `teachers`, `students`, `orders`, `reports`, `settings`. New `pages/super-admin/SuperAdminPortal.tsx` uses `health` (index), `tenants`, `rbac`, `audit`, `ai-usage`, `revenue`, `settings`. Each view goes in its own file under `pages/admin/views/` or `pages/super-admin/views/`, and `AppRoutes` lazy-loads both portals. Remove the `role` prop branching, `selectedCampus`, and the `hexColor` props.
      Files: `frontend/src/pages/admin/**`, `frontend/src/pages/super-admin/**` (new), `frontend/src/app/AppRoutes.tsx`
      Verify: `npm run typecheck` reports 0 errors; `npm run build` emits separate admin and super-admin chunks; smoke `/admin` and `/super-admin`.

- [ ] 45. Build the Admin views from store data.
      - Overview: revenue this month in ₹, active learners, enrolments trend, live classes this week, recordings pending review, top courses.
      - Courses: table with status, students, revenue, publish/archive.
      - Batches: create batch dialog with entitlement (live+replay / replay-only, replay delay, expiry, chat/doubts/AI tutor/certificate toggles) and seat fill bars.
      - Teachers: Srimanth + TAs, with courses and ratings.
      - Students: enrolments with filters and manual enrol.
      - Orders: payments table with status and method, invoice dialog, and Refund through `refundOrder` with a confirm dialog.
      - Reports: completion, revenue and engagement charts with CSV export via Blob download.
      - Settings: organisation, branding preview, notifications.
      Rework `AdminModals.tsx` (`AddFacultyModal` → `AddTeacherModal`, `SchoolAnnouncementModal` → `AnnouncementModal` targeting batches, `AuditDetailModal` → Sheet).
      Files: `frontend/src/pages/admin/views/*` (new), `frontend/src/components/AdminModals.tsx`
      Verify: `npm run typecheck` reports 0 errors; smoke each admin route desktop+mobile in both themes.

- [ ] 46. Build the Super Admin views.
      - Platform health: service status grid (API, video processing, transcription, AI tutor, payments, storage) with uptime sparklines, incident timeline, "Flush cache" and "Snapshot" actions kept from today's handlers.
      - Tenants: hubs and enterprise cohorts with learners, AI quota usage bars, region and status.
      - RBAC: matrix of the six roles × AI-LMS permissions (manage courses, publish recordings, schedule live, grade, refund orders, manage tenants, view audit logs, configure AI), with toggles animated and audit-logged. Remove "Dispatched Parent Reports".
      - Audit logs: filterable `DataTable` with a detail sheet.
      - AI usage: tokens by feature (tutor, chaptering, transcription, grading assist), cost in ₹, and model settings (keep `aiModel`/`aiStrictness`/quota controls; drop `parentDigestTone`).
      - Revenue: MRR/ARR area chart, revenue by course and by tenant.
      Delete `data/adminMockData.ts` (move anything still needed into `data/lms/platform.ts`) and the `FacultyMember`, `CampusTenant`, `ClassRoomInfo` and `AuditLogItem` types.
      Files: `frontend/src/pages/super-admin/views/*` (new), `frontend/src/data/adminMockData.ts` (delete), `frontend/src/types/index.ts`
      Verify: `npm run typecheck` reports 0 errors; smoke the `admin` and `superAdmin` groups desktop+mobile in both themes with 0 errors.

- [ ] 47. Phase 7 gate with groups `admin, superAdmin`. Send an `info` message to the parent session.

## Phase 8: Cleanup, docs, final verification

- [ ] 48. Remove dead code. Candidates (delete only when `rg` finds no importers): `components/{StudentHeader,StudentDropdown,HexColorField,Icon}.tsx` (`Icon` only if all uses moved to lucide), `utils/colorUtils.ts`, `src/app/legacy.ts`, leftovers in `data/mockData.ts` / `pages/student/studentMockData.ts` / `studentTypes.ts`, deprecated school-era types in `types/index.ts`, and stale barrels in `components/index.ts` and `pages/index.ts` (fix their header comments mentioning "Maple Class").
      Prune `styles/legacy.css`: `tools/css-usage.mjs` lists class selectors not found in any `src/**/*.tsx`. Delete those rules, and delete the file entirely if it is empty. Shrink `palette-bridge.css` to the hues still referenced (`rg -o "(bg|text|border)-(\w+)-\d{2,3}"`).
      Files: as listed
      Verify: `npm run typecheck` reports 0 errors; `npm run build` succeeds; compare CSS asset size with Phase 1 (record both).

- [ ] 49. Run the content and accessibility sweep.
      - `rg -n -i "maple|year 4|\bparents?\b|english|science|semester|gpa|school admin" frontend/src`: every remaining hit must be legitimate (`parentElement`, "data science" in an AI course, etc.); list them in the final summary.
      - Keyboard check with smoke `--tab-through` on each portal home: focus is visible and dialogs and menus trap and restore focus.
      - `--reduced-motion` run: no transitions on route change; the testimonial marquee is static.
      - Every icon-only button has an `aria-label`.
      - `node tools\contrast.mjs` passes.
      Files: any with findings
      Verify: the commands above are clean; `npm run typecheck` reports 0 errors.

- [ ] 50. Update the docs. Rewrite `frontend/src/PAGES_ARCHITECTURE.md` to the real tree: routes table per portal, `src/app`, `src/components/{ui,motion,shell,player,charts,shared}`, `src/data/{lms,store}`, `src/types`, `src/styles`. Update the root `AGENTS.md` "Architecture & Directory Structure" and "Dependencies" sections: router-based `App.tsx` → `AppRoutes`, public site, `framer-motion`, `react-router-dom`, Inter via fontsource, removed deps, mock store, dev port note. Finalise `frontend/design.md` for anything that changed after Phase 1.
      Files: `frontend/src/PAGES_ARCHITECTURE.md`, `AGENTS.md`, `frontend/design.md`
      Verify: every path mentioned in the docs exists (`tools/check-doc-paths.mjs`, or a manual `Test-Path` loop).

- [ ] 51. Run the final verification.
      - `npm run typecheck`: 0 errors.
      - `npm run build`: succeeds with no >500 kB warning; record chunk sizes.
      - Smoke all groups (`public, auth, student, teacher, evaluator, support, admin, superAdmin`) at desktop+mobile in dark, plus light for every portal home and the core flows, into `c:\Users\srima\Downloads\QuantumLMS\.agents\tasks\redesign-screenshots\`, with 0 console and page errors.
      - Run every flow (`checkout, auth-demo, player, quiz, upload-path, live-path, grade, support-action`).
      - Review all screenshots and fix issues found.
      - Write `c:\Users\srima\Downloads\QuantumLMS\.agents\tasks\redesign-premium-ui\final-summary.md`: changes per portal, features cut or simplified, removed dependencies (`better-auth`, `@better-auth/infra`, `better-sqlite3`, `@types/better-sqlite3`, `react-useanimations`), remaining grep hits, and known gaps (simulated media, no backend, Supabase optional).
      - Send an `info` message to the parent session.
      Verify: as listed; the report files exist.

## Assumptions and gaps

- `framer-motion` resolves to 14.7.1; its API (`motion`, `AnimatePresence`, `LayoutGroup`, `Reorder`, `MotionConfig`, `useReducedMotion`, `useSpring`, `useInView`) is used as in v11–12. If `Reorder` misbehaves, fall back to up/down buttons, which item 30 includes anyway.
- Playwright: only browser binaries exist (`chromium-1140`), so `playwright-core@1.48.2` is installed in the tools dir and pointed at that `chrome.exe`. If launch fails, install `playwright-core` at the version matching `chromium-1140` or run `npx playwright@1.48.2 install chromium`. If screenshots stay impossible, say so in the final summary.
- The student live room (item 25) and the command palette are lightweight additions in service of the live path and the shell; nothing else beyond the brief is added.
- The cross-portal flows (student submission → evaluator, publish → student) depend on the single store. Each portal must read from the store rather than its old local `useState` copies.

---

## Digest

Baseline verified in the worktree (HEAD `0bc83ec`):
- `npx tsc --noEmit` (= `npm run typecheck`) reports exactly 15 errors: `evaluator/Dashboard.tsx` 207, 219, 236, 261; `EvaluatorPortal.tsx` 243 (×2), 250; `StudentPortal.tsx` 411, 459, 503; `TimetablePage.tsx` 402; `MetricItem` missing in `KnowledgeBasePage.tsx:229`, `SupportAgentsPage.tsx:256`, `SupportAnalyticsPage.tsx:164`, `TicketsInboxPage.tsx:130`.
- `npm run build` succeeds in about 1.3 s. Output: one `index` chunk of 1,735 kB (gzip 422 kB) with the >500 kB warning, `support` 341 kB, `EvaluatorPortal` 141 kB, CSS 244 kB.
- No test runner or test files exist; verification is typecheck + build + the harness.
- `node_modules` is hoisted at `<worktree>\node_modules`; `frontend\node_modules` does not exist. Installed: tailwindcss 4.3.3 (`node_modules\tailwindcss\theme.css` holds the oklch defaults), framer-motion 14.7.1, react-router-dom 7.18.5.
- `%LOCALAPPDATA%\ms-playwright\chromium-1140\chrome-win\chrome.exe` exists; no playwright package is installed. npm has `playwright-core@1.48.2` and `@fontsource-variable/inter@5.3.0`. Port 8443 was free at planning time.
- Tracked lockfiles: `frontend/package-lock.json`, `frontend/pnpm-lock.yaml`. The root `package-lock.json` is gitignored. pnpm is on PATH, and `.mise.toml` pins `node 22` and `pnpm 10.34.3`.

Files and blocks:
- `frontend/src/App.tsx` (812 lines). Path-sniffing auth and role state: lines 61–107. Teacher `activeTab`/live/studio/review state and popstate: 109–260. Hex background: 297–335. `handleSendReport` with "Parents of"/"Year 4": 412–440. `handleSwitchRole`/`handleLogout`/`handleLogin` push `"/"` for Teacher: 446–533. Portal branches: 535–688 (Support and Evaluator already `lazy`). Teacher render: 690–812. The `reviewSessionId` state (153–163) is never rendered, so no recording-review page exists today. Covered by items 8, 28, 32.
- `frontend/src/main.tsx` (9 lines): StrictMode > App plus `index.css`. Items 4, 6, 8.
- `frontend/index.html`: title "Quantum School of AI", favicon `/favicon.png`, figma comment slots consumed by `vite.config.ts`. Item 4 adds the theme script.
- `frontend/vite.config.ts`: the `PORT` env var drives the port (8443 default, `strictPort`); the `@` alias points to `./src`. No change planned.
- `frontend/package.json`: deps as listed in item 2; `name` is `figma-make-app`.
- `frontend/src/index.css` (5,648 lines). Lines 1–98 are Sassoon `@font-face` blocks. 99–149 are an `@theme` with brand and legacy `purple`→orange and `lime`→teal scales. 150–255 are `:root` tokens; 256–279 are `.dark` HSL tokens. No `--color-primary` mapping exists, so `bg-primary` etc. in `ui/*` are inert. 280+ is legacy component CSS (`.panel`, `.card-title`, `.auth-*`, `.dashboard-shell`, teacher viewport lock at 399, Noorly block at 5599). Item 4.
- `frontend/src/types/index.ts` (496 lines). `UserRole` includes `"Parent"`. `StudentItem.subjects {english, math, science, art}`, `parentName`, `parentEmail`; also `FacultyMember`, `CampusTenant`, `ClassRoomInfo`, `ReportItem`, `MetricItem.tone` (`lavender|pink|yellow|lime`), `CourseItem`/`CourseModuleItem`/`LessonItem` (teacher), `LiveSessionItem`, `RecordingReviewDataset`. Items 8, 12, 33, 46, 48.
- `frontend/src/types/lms.ts` (208 lines): `BatchEntitlement`, `Course` (5 categories), `Batch`, `LiveClassSession`, `VideoChapter`, `TranscriptSnippet`, `LectureRecording`, `StudentDoubt`, `RubricCriterion` (conflicts with the evaluator's), `TestSubmission`, `SupportTicket`, `PaymentTransaction`, `CertificateRecord`, `AuditLogEntry`. Importers: `services/mockDataService.ts` and `pages/support/supportTicketsData.ts` (`SupportTicket`). Item 12.
- `frontend/src/pages/evaluator/types.ts`: `EvaluatorTab` = Dashboard|Submissions|Reports|Settings; `EvaluationStatus` = "Submitted"|"In Progress"|"Draft Saved"|"Evaluated"|"Resubmitted"|"Reassessment Requested"|...; `Rubric`, `RubricCriterion`, `EvaluatorAssessment`, `StudentSubmission`, `EvaluationRecord`, `ReassessmentRequest`. Items 1, 12, 35.
- `frontend/src/pages/evaluator/EvaluatorPortal.tsx` (395 lines): `parseInitialRoute` at 32–70, `pushState` tab routing at 125–160, invalid status literals at 243/250, `hexColor` default `"#9860e9"`; it imports `AppSidebar` and `AskAiModal`. `evaluatorStorage.ts` exports `loadEvaluatorState`, `saveSubmissionDraft`, `finalizeEvaluation`, `resolveReassessment`, `markNotificationRead`, `updateEvaluatorSettings` and `resetEvaluatorToDefaults`. Items 1, 35–38.
- `frontend/src/pages/student/StudentPortal.tsx` (489 lines): `parseInitialTab` at 43–138 (`?page=`/`#` mapping); the state for courses, catalog, assignments and quizzes is local `useState` from `studentMockData`; the page router is at 404–485. The three prop errors are at 411, 459 and 503. Items 1, 17, 20.
- `frontend/src/pages/student/{MyCoursesPage,GradesPage,SupportHelpPage}.tsx` props: `MyCoursesPage` takes `{courses, catalog, onSelectCourse, onNavigate, onToast, onEnrollCourse}`; `GradesPage` takes `{onToast, initialView?: "grades"|"certificates"}`; `SupportHelpPage` takes `{onToast, onOpenAiModal, onNavigate, initialSection?}` and calls the Supabase helpers `saveSupportTicketToSupabase`, `fetchSupportTicketsFromSupabase` and `fetchStudentIdFromSupabase`. `TimetablePage.tsx:402` reads `ann.date`, but `AnnouncementItem` only has `timestamp`. Items 1, 24, 26.
- `frontend/src/pages/student/studentTypes.ts`: a divergent `CourseItem` (title, image, progress, status "In Progress"|"Completed"|"Catalog"...) and the `StudentNavPage` union. Items 20–26.
- `frontend/src/pages/student/CourseDetailsPage.tsx` (3,773 lines). Tabs `"Curriculum"|"Materials"|"Discussion"|"Notes"|"Assignments"|"Quizzes"` (line 72). Notes state is at 163–330, assignment submission at 370–590, quiz engine (attempts, timer, saved progress, review) at 595–1000. It has no real video player; materials preview uses a Google Drive iframe at 1580. Items 22–24.
- `frontend/src/components/Sidebar.tsx` (667 lines): `AppSidebar` with per-role nav at 229–301 and utility items at 304–319; legacy `DesktopSidebar`/`MobileDrawer`/`MobileTopBar` at 542–667; the role switcher (emoji labels, "School Admin") at 163–200. Importers: `App.tsx`, `StudentPortal.tsx`, `EvaluatorPortal.tsx`, `AdminPortal.tsx`, and the barrels. Item 9.
- `frontend/src/components/ui/*`: `button` (cva; `default/destructive/outline/secondary/ghost/link/glass`; `navigator.vibrate`), `card`, `badge`, `dialog`, `sheet`, `tabs`, `select`, `input`, `popover`, `StatCard` (`item?: MetricItem`, `tone`, `trend`, `onClick`), `ThemeAccentPicker`, plus the barrel `index.ts` with `export *`. The support pages import `Card`, `Button`, `Badge`, `Input`, `Dialog`, `Select`, `Tabs` and `StatCard` by name; student and teacher pages import `StatCard` and `ThemeAccentPicker`. Item 7 keeps these named exports.
- `frontend/src/services/themeService.ts`: accents `apex-rose|apex-royal|cobalt|violet|amber`, keys `app_theme_accent`/`app_theme_mode`, `.dark` class toggle; nothing calls `init()` on startup. Item 4.
- `frontend/src/pages/support/index.tsx` (761 lines): an inner `BrowserRouter` at 734–758 with absolute route paths `/support/...`, `SupportSidebar` at 75–240, a role dropdown at 640–700, and `NotificationProvider` wrapping only Support. Items 8, 9, 40.
- `frontend/src/pages/admin/AdminPortal.tsx` (1,614 lines): `activeTab` state with Super Admin tabs (System Health, Campuses, Access Control, Audit Logs, AI Engine, Faculty & Staff, School Pulse) and Admin tabs (Overview, Faculty Directory, Student Roster, Class Schedules, School Reports, School Settings). The RBAC matrix includes "Dispatched Parent Reports". It also holds `parentDigestTone`, the `handleTriggerSnapshot`/`handleFlushCache` toasts, and data from `data/adminMockData.ts` (`demoAccounts`, `initialFaculty`, `initialAuditLogs`, `initialCampuses`, `initialClassRooms`). Items 8, 44–46.
- `frontend/src/pages/teacher/CoursesPage.tsx` (1,828 lines): `parseCourseRoute` regexes at 17–80; `CourseDetailsView`, `ModuleDetailsView` and `LessonDetailsView` are read-only with no upload or publish ("published by School Administration" at 1107). `LiveStudioPage.tsx` (909 lines) uses getUserMedia camera/screen and props `{session, students, onLeaveStudio, onEndClass, onToast}`. No teacher live-scheduling or recording-review page exists. Items 28–32.
- `frontend/src/services/mockDataService.ts` (1,078 lines): `MOCK_COURSES` (unsplash thumbnails), `MOCK_BATCHES`, `MOCK_LIVE_CLASSES`, `MOCK_RECORDINGS` (chapters + transcript, googleapis sample video), `MOCK_SUBMISSIONS`, `MOCK_TICKETS`, `MOCK_TRANSACTIONS`, `MOCK_CERTIFICATES`, `MOCK_AUDIT_LOGS`. Nothing imports it; `lib/supabase.ts` only matches the string `"supabase"`. Item 13.
- `frontend/src/lib/supabase.ts`: a client created only when `VITE_SUPABASE_URL`/`ANON_KEY` or localStorage keys are present; exports `fetchStudentIdFromSupabase`, `generateUniqueTicketId`, `saveSupportTicketToSupabase`, `fetchSupportTicketsFromSupabase`. Must keep working (item 26). No change.
- School-era hit counts (`Maple|Year 4|parent|english|science|Grade N|semester|campus|School Admin|GPA`): `data/mockData.ts` 143, `AdminPortal.tsx` 41, `teacher/AnalyticsPage.tsx` 37, `studentMockData.ts` 22, `Modals.tsx` 21, `adminMockData.ts` 19, `GradesPage.tsx` 19, `teacher/StudentsPage.tsx` 17, and a long tail. Items 33, 46, 49.
- Colour usage counts that drive D4/item 5: `zinc` 3,758; `purple` 1,469; arbitrary hex 1,268 (top: `#905FEB` 263, `#F0EDFF` 134, `#111111` 126, `#E5DEFF` 112, `#7042D2` 110); `bg-white` 569; dark backgrounds concentrated in `LiveStudioPage.tsx` (54), `GradesPage.tsx` (18), `CourseDetailsPage.tsx` (15), `EvaluationWorkspace.tsx` (13).
- Docs: `frontend/src/PAGES_ARCHITECTURE.md` (105 lines) is stale; it lists files that do not exist (`ClassPage.tsx`, `StudentOtherPages.tsx`, `Student360Page.tsx` ...). `frontend/design.md` is the "Noorly Soft UI" spec. The root `AGENTS.md` architecture section names `App.tsx` as the router. Items 10, 50.
