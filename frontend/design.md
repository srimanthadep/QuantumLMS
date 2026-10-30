# Quantum School of AI: design system

Quantum School of AI is an LMS that sells and delivers AI courses. The interface should feel like a quiet, precise "AI lab", in the spirit of Linear, Vercel and Raycast. It is dark-first and has a fully supported light mode.

## Source of truth

| What | Where |
| --- | --- |
| Colour, radius, elevation and layout tokens | `src/styles/tokens.css` (light on `:root`, dark on `.dark`, accents on `[data-accent]`) |
| Tailwind mapping and type scale | `src/index.css` (`@theme inline`) |
| Base element styles, focus ring, scrollbars, keyframes, reduced motion | `src/styles/base.css` |
| Motion tokens and variants | `src/lib/motion.ts` |
| Theme mode and accent state | `src/services/themeService.ts`, `src/app/ThemeProvider.tsx` (`useTheme()`) |
| Components | `src/components/ui`, `motion`, `charts`, `shell`, `shared` |
| Kitchen sink of every component and state | `/design-system`, only in development builds (`npm run dev`) |

If this document and the code disagree, the code wins. Fix this document in the same change.

## Principles

1. **Neutral first, accent on purpose.** Surfaces are deep neutrals. The accent marks the one thing that matters on screen: the primary action, the active nav item, progress. Glow and gradients appear only on focal elements: the marketing hero, the primary CTA, Ask AI, the live badge and the video player.
2. **Crisp structure.** Separate areas with 1px borders, not heavy shadows. Elevation is for floating layers: popovers, dialogs, sheets and toasts.
3. **Strong hierarchy.** Each page has one clear title. Secondary text is quiet, and data uses tabular numbers.
4. **Motion explains change.** Motion is short, moves things with `transform` and `opacity`, and always respects reduced motion (see [Motion](#motion)).
5. **Accessible by default.** Token text pairs meet WCAG AA in both themes, focus rings are always visible, and every dialog and menu works from the keyboard.

## Theming

- **Mode** is `dark` (default), `light` or `system`, stored in `localStorage.app_theme_mode`. Dark mode is the `.dark` class on `<html>`. Tailwind's `dark:` variant follows it via `@custom-variant dark (&:where(.dark, .dark *))`.
- **Accent** is `violet` (default), `blue`, `emerald` or `amber`, stored in `localStorage.app_theme_accent` and applied as `data-accent` on `<html>`. Unknown legacy accent ids are migrated to `violet`.
- **No flash of the wrong theme.** An inline script in `index.html` applies the class, the accent and `<meta name="theme-color">` (`#09090b` dark, `#fafafa` light) before first paint.
- **Changing the theme** goes through `useTheme()` or `themeService`. Both update `<html>` and dispatch the `quantum-theme-change` window event. The UI for it is `ThemeAccentPicker` in the top bar and `ThemeControls` on settings pages.
- **The per-user background hex picker is retired.** Portals still receive a transparent `hexColor` through `LEGACY_BG` until their phase removes the prop.

## Colour tokens

Use semantic utilities such as `bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary` and `text-primary-text`. Don't write raw hex or raw palette utilities (`zinc-*`, `purple-*`) in new code.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `#FAFAFA` | `#09090B` | Page background |
| `surface` | `#FFFFFF` | `#111113` | Cards, sidebar |
| `surface-2` | `#F4F4F5` | `#18181B` | Hover rows, tracks, inset areas, secondary buttons |
| `surface-3` | `#FFFFFF` | `#202024` | Popovers, menus, dialogs, toasts |
| `border` | `#E4E4E7` | `#26262B` | Default 1px borders and dividers |
| `border-strong` | `#8E8E96` | `#63636B` | Form-control outlines and other non-text UI that must reach 3:1 |
| `foreground` | `#09090B` | `#EDEDEF` | Primary text |
| `muted-foreground` | `#52525B` | `#A1A1AA` | Secondary text |
| `subtle-foreground` | `#6B6B76` | `#8A8A93` | Captions, placeholders, meta |
| `primary` | `#6D4AFF` | `#6D4AFF` | Solid accent: buttons, indicators, progress |
| `primary-hover` | `#5B3DF5` | `#7557FF` | Hover state of the solid accent. White text stays at AA on it |
| `primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text and icons on `primary` |
| `primary-text` | `#5B3DF5` | `#A397FF` | Accent-coloured text, links and icons |
| `primary-soft` | `primary` at 8% | `primary` at 14% | Tinted backgrounds |
| `primary-border` | `primary` at 28% | `primary` at 40% | Tinted borders |
| `secondary` / `secondary-text` / `secondary-soft` | `#0891B2` / `#0E7490` / 8% | `#22D3EE` / `#67E8F9` / 12% | Restrained cyan second accent (charts, AI highlights) |
| `success` (+`-soft`) | `#047857` | `#34D399` | Published, paid, completed |
| `warning` (+`-soft`) | `#A14A07` | `#FBBF24` | In review, due soon |
| `danger` (+`-soft`) | `#C81E1E` | `#F87171` | Errors, destructive actions, live |
| `info` (+`-soft`) | `#2563EB` | `#60A5FA` | Processing, neutral information |
| `ring` | `#6D4AFF` | `#8B7CFF` | Focus ring |
| `overlay` | ink at 45% | black at 60% | Dialog and sheet backdrop |

Status `-soft` tints are 10% (light success and warning), 8% (light danger and info) or 12% (dark) of the status hue. The light warning and danger tints use the original `#B45309` and `#DC2626`. Only the text colours were darkened for AA.

`index.css` also maps shadcn-style aliases (`card`, `popover`, `muted`, `accent`, `input`, `destructive`) for older `components/ui` code. Prefer the semantic names above.

### Accents

Only `primary`, `primary-hover`, `primary-text` and `ring` change per accent. `primary-soft` and `primary-border` derive from `--primary` through `color-mix`, so they follow automatically.

| Accent | Solid (`primary`) | Light `primary-text` | Dark `primary-text` | Dark `primary-hover` |
| --- | --- | --- | --- | --- |
| `violet` (default) | `#6D4AFF` | `#5B3DF5` | `#A397FF` | `#7557FF` |
| `blue` | `#2563EB` | `#1D4ED8` | `#60A5FA` | `#2C6EEF` |
| `emerald` | `#047857` | `#047857` | `#34D399` | `#06855F` |
| `amber` | `#B45309` | `#9A4508` | `#FBBF24` | `#BB5908` |

Dark hovers are the lightest shade of each accent that keeps white button text at 4.5:1 or better. A brighter hover would fail, so hover feedback in dark mode stays subtle on purpose.

### Contrast

`contrast.mjs` parses `tokens.css` and asserts at least 4.5:1 for text (including white text on `primary` and on `primary-hover`) and 3:1 for the ring and `border-strong`. It currently passes **98/98** checks.

| Pair | Light | Dark |
| --- | --- | --- |
| `foreground` on background / surface / surface-2 | 19.06 / 19.90 / 18.10 | 17.02 / 16.13 / 15.15 |
| `muted-foreground` on background / surface / surface-2 | 7.41 / 7.73 / 7.03 | 7.76 / 7.36 / 6.91 |
| `subtle-foreground` on background / surface / surface-2 | 5.04 / 5.26 / 4.79 | 5.81 / 5.51 / 5.18 |
| `primary-text` (violet) on background / surface / surface-2 | 5.86 / 6.12 / 5.57 | 7.98 / 7.57 / 7.11 |
| `primary-text` on surface-2 for blue / emerald / amber | 6.10 / 4.99 / 5.92 | 6.97 / 9.22 / 10.61 |
| `secondary-text` on background / surface / surface-2 | 5.13 / 5.36 / 4.87 | 13.73 / 13.01 / 12.22 |
| `success` / `warning` / `danger` / `info` on surface-2 | 4.99 / 5.46 / 5.22 / 4.70 | 9.22 / 10.61 / 6.40 / 6.97 |
| `primary-foreground` on `primary` (violet / blue / emerald / amber) | 5.15 / 5.17 / 5.48 / 5.02 | same solids, same ratios |
| `primary-foreground` on `primary-hover` (violet / blue / emerald / amber) | 6.12 / 6.70 / 7.68 / 7.09 | 4.60 / 4.58 / 4.64 / 4.62 |
| `ring` on surface (needs 3:1) | 5.15 | 5.77 |
| `border-strong` on surface (needs 3:1) | 3.25 | 3.17 |

A supplementary check (`contrast-extra.mjs`) covers pairs that `contrast.mjs` does not. All of them pass 4.5:1.

| Pair | Light | Dark |
| --- | --- | --- |
| On `surface-3`: foreground / muted / subtle | 19.90 / 7.73 / 5.26 | 13.89 / 6.33 / 4.74 |
| On `surface-3`: primary-text / success / warning / danger / info | 6.12 / 5.48 / 6.00 / 5.74 / 5.17 | 6.52 / 8.45 / 9.73 / 5.87 / 6.39 |
| Badge text on its own soft tint over surface: primary / success / warning / danger / info / secondary | 5.49 / 4.78 / 5.25 / 5.08 / 4.65 / 4.87 | 6.78 / 8.03 / 8.99 / 5.81 / 6.23 / 10.58 |

`subtle-foreground` on dark `surface-3` (4.74) is the tightest pair. Don't use it there for anything the user must read.

These planned values were changed to pass AA:
- `border-strong`: light `#D4D4D8` → `#8E8E96`, dark `#34343A` → `#63636B`.
- Light `danger`: `#DC2626` → `#C81E1E`.
- Light `warning`: `#B45309` → `#A14A07`.
- Light amber `primary-text`: `#9A4508`.
- Dark `primary-hover`: violet `#7C5CFF` → `#7557FF`, blue `#3B82F6` → `#2C6EEF`, emerald `#059669` → `#06855F`, amber `#D97706` → `#BB5908`. The old values put white text at 3.2–4.4:1.

**Rendered pages are checked too.** `audit.mjs` loads every portal page at desktop and mobile in both themes and measures the contrast of each visible text element against its real background. It also flags horizontal overflow on phones and light panels left inside dark mode. At the end of Phase 1 it checked 14,946 text elements on 140 pages and found 0 below AA, 0 overflowing pages and 0 light panels. Two limits apply: it skips text over images or gradients, and it only sees what renders without interaction (no hover states, open menus or dialogs).

Use `border` for ordinary dividers and keep `border-strong` for control outlines.

The checkers live outside the repo in `.agents/tasks/redesign-premium-ui/tools/` (see [Legacy bridge](#legacy-bridge-and-its-retirement)). Run `node contrast.mjs` there after any token change.

## Typography

The font is **Inter Variable** (`@fontsource-variable/inter`, imported in `main.tsx`). It is self-hosted and bundled by Vite, so there is no CDN. The feature settings `"cv11", "ss01"` apply globally. Mono is the system `ui-monospace` stack. The Sassoon font files remain in `public/fonts/` as user assets, but nothing loads them.

| Utility | Size / line height, tracking | Use |
| --- | --- | --- |
| `text-display` | 56 / 60, −0.035em | Marketing hero |
| `text-h1` | 36 / 40, −0.025em | Marketing section titles |
| `text-h2` | 28 / 34, −0.02em | App page titles (`PageHeader` from `sm`; 24 / 32 below) |
| `text-h3` | 20 / 28, −0.01em | Section and card-group titles |
| `text-body-lg` | 16 / 26 | Marketing body copy |
| `text-body` | 14 / 22 | App body (the `body` default) |
| `text-caption` | 12 / 16 | Meta, hints, timestamps, breadcrumbs |

- **Weights:** 400 for body, 500 for labels, nav and buttons, 600 for titles. Avoid 800 and above.
- **Numbers:** use `tabular-nums` for KPIs, prices, timestamps and durations. `AnimatedNumber` applies it automatically.
- **Money:** format rupees with `formatINR()` from `src/lib/utils.ts` (`Intl.NumberFormat("en-IN")`, so ₹1,23,456).

## Layout, radii, elevation

**Spacing** follows a 4 px grid.

| Rule | Value |
| --- | --- |
| Page padding (inside `AppShell`) | 16 px horizontal below `sm`, 24 px from `sm`. 20 px vertical, 24 px from `lg` |
| Content max width | 1440 px, centred |
| Card padding | 20 px (`p-5`, built into `CardHeader` and `CardContent`). Card footer is `px-5 py-3` |
| Gap between cards | 16 px (`gap-4`) |
| Shell sizes | `--shell-sidebar-w` 248 px, `--shell-rail-w` 68 px, `--shell-topbar-h` 56 px |

**Radii.** These tokens override Tailwind's `rounded-*` scale, so the utilities produce these values.

| Utility | Value | Use |
| --- | --- | --- |
| `rounded-sm` | 6 px | Chips, small controls, skip link |
| `rounded-md` | 10 px | Buttons, inputs, nav items, tooltips |
| `rounded-lg` | 14 px | Cards, popovers, menus |
| `rounded-xl` | 20 px | Dialogs, hero panels |
| `rounded-2xl` / `rounded-3xl` | 24 / 28 px | Large marketing panels only |
| `rounded-full` | pill | Badges, avatars, switches |

**Elevation.** Apply these as `shadow-[var(--elev-md)]`. Dark values are deeper because borders carry most of the structure there.

| Token | Use |
| --- | --- |
| `--elev-xs` | Resting cards, inputs, primary buttons |
| `--elev-sm` | Small raised elements |
| `--elev-md` | Hovered interactive cards, tooltips |
| `--elev-lg` | Floating layers: popovers, menus, dialogs, toasts |
| `--glow-primary` | Focal CTAs only: primary button hover, Ask AI, `Card variant="glow"` |
| `--gradient-primary` | Focal fills only: Ask AI, hero, live and player accents |

## Motion

The tokens are in `src/lib/motion.ts`. `main.tsx` wraps the app in `<MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: ease.out }}>`, so a framer-motion element without its own transition uses `base` timing.

| Token | Value |
| --- | --- |
| `duration.fast` / `base` / `slow` | 0.15 s / 0.22 s / 0.32 s |
| `ease.out` (default) | `[0.22, 1, 0.36, 1]` (CSS `--ease-out-quint`) |
| `ease.inOut` | `[0.65, 0, 0.35, 1]` (CSS `--ease-in-out-quint`) |
| `spring.snappy` | stiffness 500, damping 34: indicators, press feedback, switch thumb |
| `spring.soft` | stiffness 260, damping 30: toasts, larger moves |
| `transition.fast` / `base` / `slow` | The durations above with `ease.out` |
| Variants | `fadeIn`, `fadeUp` (y 8 → 0), `scaleIn` (0.96 → 1), `staggerContainer(stagger = 0.04, delayChildren = 0)`. `fadeIn`, `fadeUp` and `scaleIn` exit with `fast` |

### Timing by category

| Category | Timing | Examples |
| --- | --- | --- |
| Hover, press and small state changes | `fast` (150 ms) to 200 ms, or `spring.snappy` | Buttons, interactive cards, nav items, field errors |
| Entrances | `base` (220 ms) | `fadeUp`, `scaleIn`, dialogs, page transitions |
| Larger moves | `slow` (320 ms) or `spring.soft` | Sheets sliding in, toasts |
| Exits | 100–150 ms | Every variant exit, popovers and menus (120 ms), tooltips (100 ms) |
| Data reveals (once, on first view) | 0.6–0.9 s | Chart reveals, progress fills, `AnimatedNumber` counters |
| Loops (status only) | 1.4–1.6 s | Live-dot pulse, skeleton shimmer, spinners |

### Rules

- **Movement uses `transform` and `opacity` only.** Never animate layout properties (`width`, `height`, `top`/`left`, `margin`, `padding`) or SVG stroke length. Charts reveal with a `scaleX`/`scaleY` clip or a rotate plus fade. The progress bar fills with `scaleX`.
- **Colour feedback may use short CSS transitions.** Hover changes to colour, border and shadow use `transition-colors` or `transition-[transform,border-color,box-shadow]` at 200 ms or less.
- **Data reveals run once,** on first view (`whileInView` with `once`), and never replay on re-render.
- **Use loops only to signal live or busy state.** Never use them for decoration.
- **Reduced motion:** `MotionConfig reducedMotion="user"` turns off framer-motion transforms. `base.css` cuts CSS animation and transition durations to 0.01 ms and stops loops after one iteration under `prefers-reduced-motion: reduce`. Every new animated component must still make sense in that mode.
- **Shared-layout indicators** (`layoutId`) are used for the sidebar active item, `Tabs`, `SegmentedControl`, the theme mode toggle and the command palette highlight. Each indicator is scoped per instance: through `useId()`, the sidebar's `instance` prop, or the `idPrefix` prop of `ThemeControls`. If you render two `ThemeControls` on one page, give each its own `idPrefix`, or their indicators will jump between them.

### Primitives (`@/components/motion`)

| Primitive | Behaviour | Use |
| --- | --- | --- |
| `PageTransition` | `AnimatePresence mode="wait"` keyed on `location.pathname` (or `transitionKey`), `fadeUp` | Wrap routed content inside a portal |
| `Stagger` / `StaggerItem` | Staggers children's `fadeUp` by 0.04 s by default. Props: `stagger`, `delay`, and `inView` (once, −40 px margin) | Card grids, lists, KPI rows |
| `Reveal` | Fade and rise once when scrolled into view (−60 px margin) | Marketing sections, below-the-fold panels |
| `AnimatedNumber` | Counts from 0 to the value once in view (0.9 s), with `Intl` formatting and tabular numbers | KPIs, prices, scores |
| `Pressable` | Hover lift (`y −lift`), press `scale 0.98`, `spring.snappy` | Custom clickable tiles that are not `Button` or `Card interactive` |

## Components

Import paths:

- **Primitives:** `@/components/ui`. The barrel re-exports every file there.
- **Charts:** `@/components/charts`.
- **Motion:** `@/components/motion`.
- **Shell:** `@/components/shell`.
- **Course art:** `@/components/shared` (`CourseCover`).

| Component | What it does | Do / don't |
| --- | --- | --- |
| `Button` | Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`, `link`, `glass`. Sizes: `sm` 32 px, `md` 36 px (default), `lg` 44 px, `icon` 36 px, `icon-sm` 32 px. Props: `loading`, `leftIcon`/`rightIcon`, `block`. `default`/`destructive` are aliases. `primary` glows on hover. | **Do** use one `primary` per view and give icon-only buttons an `aria-label`. **Don't** use `glass` anywhere except over dark imagery (hero, `CourseCover`, player). |
| `Card` (+`Header`/`Title`/`Description`/`Content`/`Footer`) | `rounded-lg`, 1px border, `surface`, `--elev-xs`. `variant`: `default`, `subtle` (`surface-2`, no shadow) or `glow`. `interactive` adds a 2 px hover lift, `--elev-md`, and a 0.99 press. | **Do** use `interactive` only when the whole card is one link or button. **Don't** nest cards more than one level deep. |
| `Badge` | Tones: `neutral`, `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `live`. `dot` adds a status dot, which pulses for `live`. Legacy `variant` names are mapped. | **Do** use badges for status. **Don't** make them clickable, and use `live` only for a session that is live right now. |
| `Input`, `Textarea`, `Select`, `Label`, `Field` | `Field` wires the label, hint and error to `aria-describedby` and `aria-invalid`. The error fades in (`fast`) with `role="alert"`. | **Do** label every control (visually hidden if needed). **Don't** use a placeholder as the label. |
| `Switch`, `Checkbox` | `role="switch"` with a spring thumb, and `role="checkbox"` with a scaling tick. | **Do** use `Switch` for settings that apply instantly and `Checkbox` for choices submitted with a form. |
| `Tabs`, `SegmentedControl` | Radix tabs with a sliding indicator. `variant`: `pill` (default) or `underline`. `SegmentedControl` is a `radiogroup` with arrow-key support. | **Do** use `underline` in dense panels such as the player sidebar, and `SegmentedControl` for 2–4 view modes. |
| `Dialog`, `Sheet` | Radix focus trap and AnimatePresence. Dialogs scale in at `base` and become a bottom sheet below `sm`. Sheets slide from any edge at `slow`. | **Do** keep one task per dialog. **Don't** stack dialogs. Confirm destructive actions with a `danger` button. |
| `Popover`, `DropdownMenu`, `Select` content | Share `floatingClasses`: `surface-3`, border, `--elev-lg`, `q-pop-in` 160 ms / `q-pop-out` 120 ms. | **Do** align menus to their trigger's edge. |
| `Tooltip` | Its own `surface-3` chip using the same keyframes (140 ms in, 100 ms out). | **Do** give rail and icon-only buttons a tooltip. **Don't** hide essential information in tooltips, because touch users can't see them. |
| `Avatar` | Image with an initials fallback (also used when the image fails to load) and an optional status dot. | **Do** always pass the person's name. |
| `Progress` (ui), `ProgressRing` (charts) | The bar fills with `scaleX`. The ring sweeps in and its number counts up. | **Do** show the percentage as text next to it when the value matters. |
| `Skeleton`, `SkeletonText` | A shimmer band moved with `transform` (1.6 s loop). | **Do** match the final layout's shape. **Don't** show skeletons for data that is already in memory. |
| `EmptyState` | Icon tile, title, description and action. Sizes `md` (default) and `sm`. | **Do** always offer a next action. |
| `DataTable` | Typed columns, sortable headers (`aria-sort`), sticky header, row hover, keyboard row activation, and a `mobileCard` render below `md`. | **Do** provide `mobileCard` for tables with more than 4 columns. |
| `PageHeader` | Breadcrumb, eyebrow, title, description, actions. | **Do** use exactly one per page. **Don't** repeat the page title elsewhere in the content. |
| `Accordion` | Disclosure list with `aria-expanded` that reflows with `layout` (transform-based). | **Do** use it for FAQs and curriculum modules. |
| `Toast` | `ToastProvider` plus `useToast()` (`show`, `success`, `error`). Toasts stack, rise in with `spring.soft`, use `aria-live="polite"`, and dismiss after 4.2 s. Legacy `onToast("…")` copy has its tone inferred. | **Do** confirm completed actions. **Don't** use toasts for errors the user must act on. Use an inline `Field` error or a dialog. |
| `CommandPalette` (ui) | Dialog with a filtered, grouped listbox, arrow keys and Enter. The shell's `CommandPalette` fills it with the role's pages and actions. | |
| `Kbd` | Keyboard key chip. | **Do** use it for shortcuts in menus, tooltips and the palette. |
| `StatCard` | Keeps the `item: MetricItem` API. Legacy tones map lavender / pink / yellow / lime to primary / danger / warning / success. Numeric values count up. Optional `sparkline`. | **Do** keep labels to 2–3 words and put 3–4 cards in a row on desktop. |
| `ThemeAccentPicker`, `ThemeControls` | The picker is the top-bar popover trigger. `ThemeControls` is the light/dark/system control plus accent swatches, used in the popover and on settings pages. | |
| Charts: `Sparkline`, `AreaChart`, `BarChart`, `DonutChart`, `ProgressRing` | SVG, no dependencies, reveal once in view. `AreaChart` has a hover crosshair and tooltip. | **Do** use `formatINR` for money axes. **Don't** use more than 5 colours in one chart. |
| `CourseCover` | Course image with a gradient scrim, or generated gradient art with an icon per AI category. Always dark, so overlay text stays white. | **Do** use it for every course thumbnail. **Don't** point it at remote image URLs. Seed data uses local `/assets/*`. |

## App shell

`AppShell` (`src/components/shell/AppShell.tsx`) is the single frame for every portal: Student, Teacher, Evaluator, Support, Admin and Super Admin.

```
┌──────────────────┬──────────────────────────────────────────────────────┐
│ Logo  Quantum    │ [☰] [🔍 Search pages, courses, actions…  ⌘K]          │
│ School of AI     │                       [✦ Ask AI] [◐ theme] [🔔] [👤]  │  ← TopBar: sticky, 56 px,
│ workspace label  ├──────────────────────────────────────────────────────┤     background/80 + blur
│                  │                                                      │
│ ▌Dashboard       │   <main id="main">                                   │
│  Courses         │     page content, max-w 1440, px 16 → 24             │
│  …               │                                                      │
│ ──────────────── │                                                      │
│  Support         │                                                      │
│  Settings        │                                                      │
│ [✦ Ask AI card]  │                                                      │
│ « Collapse       │                                                      │
└──────────────────┴──────────────────────────────────────────────────────┘
  Sidebar: 248 px, or a 68 px rail when collapsed (lg and up)
```

- **Brand:** logo, "Quantum School of AI", and a workspace label per role (`ROLE_WORKSPACE`): Learning, Instructor studio, Evaluation desk, Support desk, Academy admin, Platform console.
- **Navigation:** defined per role in `navConfig.ts` (`NAV`). A portal passes `activeId` and `onNavigate(id)`. It calls `navigate()` when the portal is routed, or its tab setter otherwise. `availableIds` hides items whose pages arrive in a later phase, and `badges` shows counts.

  | Role | Main items | Below the divider |
  | --- | --- | --- |
  | Student | Dashboard, My Courses, Schedule, Assessments, Grades & Certificates, Notes, Community, Career Hub | Support, Settings |
  | Teacher | Dashboard, Courses, Live Classes, Recordings, Students, Doubts, Calendar, Analytics | Support, Settings |
  | Evaluator | Dashboard, Queue, Re-evaluations, Reports | Settings |
  | Support | Dashboard, Inbox, Live Chat, Knowledge Base, Agents, Analytics | Settings |
  | Admin | Overview, Courses, Batches, Teachers, Students, Orders, Reports | Settings |
  | Super Admin | Platform Health, Tenants, Access Control, Audit Logs, AI Usage, Revenue | Settings |

- **Active item:** a shared-layout `surface-2` pill with a 3 px `primary` bar that springs between items (`spring.snappy`). It carries `aria-current="page"`.
- **Collapse:** the sidebar collapses to the rail with the "Collapse" control. The state persists in `localStorage.quantum_shell_collapsed`, and rail items show tooltips.
- **Below `lg`:** the sidebar is hidden. The top bar shows the brand and an `[aria-label="Open navigation"]` button that opens the same navigation in a left `Sheet`. Below `sm`, the top-bar Ask AI button and theme picker are hidden. Ask AI stays reachable from the drawer.
- **Top bar:** the command palette trigger (⌘K / Ctrl+K anywhere), Ask AI (`AiAssistantProvider` / `useAiAssistant`), the theme picker, notifications (`NotificationContext`, or a portal-supplied `NotificationSource`), and the user menu. The user menu holds the role switcher, Settings, Reset demo data and Sign out.
- **Accessibility:** a skip link to `#main` (focusable with `tabIndex={-1}`), focus trapping in the drawer, palette and dialogs, and labelled icon-only controls.

## Legacy bridge and its retirement

About 70k lines of existing pages had to look coherent in both themes before each portal is rebuilt. Three mechanisms do that, and each portal phase removes its share.

1. **`src/styles/palette-bridge.css`** is generated by `gen-palette-bridge.mjs`, so don't edit it by hand. It overrides Tailwind's colour scales with theme-aware variables:
   - All neutral scales (`zinc`, `slate`, `gray`, `neutral`, `stone`, and the newer `mauve`, `olive`, `mist`, `taupe`) share one neutral ramp: Tailwind zinc in light mode, inverted in dark mode. In light mode, shades 400 and 500 are darkened to `#6B6B76` and `#5F5F69`. Legacy pages use them for secondary text, and Tailwind's values (2.6:1 and 4.8:1 on white) fail AA.
   - `purple-*` follows the primary accent, and `lime-*` follows `success`.
   - Other hue scales get dark-mode tints. Shades 50–300 mix hue-500 into the surface at 10 / 16 / 26 / 40%. 400 maps to hue-400. 500–600 map to hue-500, or to hue-400 where hue-500 is too dark to read on `surface-2` (indigo and violet). 700 maps to hue-300, 800 to hue-200, and 900 / 950 to hue-100 / hue-50.
   - `ink-50…950` is a static, non-inverting zinc ramp for deliberately dark panels: the Live Studio, the player and hero art. It is part of the design system and stays.
   - **Dark islands.** An element with an opaque dark background class (`bg-ink-700/80`…`bg-ink-950`, `bg-black`, `from-ink-900`) is dark in both themes, so its content gets the light-theme palette in both themes. This palette uses Tailwind's original zinc-400/500 and the dark values of the text tokens (`foreground`, `muted-foreground`, `success`, …). Light surfaces nested inside an island (`bg-surface`, `bg-white`, `bg-zinc-50`, …) switch back to the page theme. The generator finds the island classes by scanning `src`.
   - **Utility fixes** in `@layer utilities`:
     - In light mode, hue text at shades 400–600 is raised to the lightest shade that reads at 4.5:1 on white, `#FAFAFA` and its own 50 tint. This doesn't apply inside islands or to SVG icons.
     - Coloured 500/600 fills that carry `text-white` use a static shade that keeps the white text at AA, and so do their hover states.
     - In dark mode, `bg-purple-500/600` is `primary` and `bg-purple-700` and the purple hover fills are `primary-hover`, as in light mode.
   - **Size.** Every colour value is declared once, as `--pl-*` (light) and `--pd-*` (dark) constants. The active `--p-*` palette and the island blocks only reference them. Repeating raw `oklch()` / `color-mix()` values per block made the minifier add a fallback copy of each, which added about 115 kB to the built CSS. With the constants, the contrast fixes cost about 42 kB raw and 3.6 kB gzipped: the built CSS went from 293 kB (43.8 kB gzipped) to 335 kB (47.4 kB gzipped).
2. **One-time codemods,** already applied and not to be rerun:
   - `codemod-colors.mjs` rewrote brand hex classes and `bg-white` in TSX to semantic tokens, and dark neutral backgrounds to `ink-*`.
   - `split-legacy-css.mjs` and `legacy-color-pass2.mjs` moved the old component CSS into `legacy.css` and rewrote its hard-coded colours to tokens.
   - From the Phase 1 contrast check:
     - `strip-dark-overrides.mjs` removed 85 `dark:` palette overrides in four student pages. The bridge already inverts those utilities, so the overrides inverted them twice, which put dark text on dark cards.
     - `fix-legacy-contrast.mjs` switched 33 `legacy.css` text colours from the solid accent to `--primary-text`, and moved the `.status` badges to status tokens.
     - `fix-hex-contrast.mjs` and `fix-contrast-pass2.mjs` replaced 45 hard-coded colours and `text-black` uses that failed AA in one of the themes.
3. **`src/styles/legacy.css`** holds the old component CSS moved out of `index.css`. The old variable names (`--purple`, `--lavender`, `--noorly-*`, `--bg-custom`, …) are aliased to tokens at the top of the file.

All of these scripts, and the contrast checkers, live **outside the repo** in `.agents/tasks/redesign-premium-ui/tools/` and are not committed. To change the bridge, edit the generator there and regenerate. Don't edit the CSS directly.

### Remaining legacy usage

Measured on 30 Oct 2026 on `main`, after the student portal rebuild, in `frontend/src` TS/TSX:

| Measure | Count |
| --- | --- |
| Raw palette utilities: `zinc-*` / `purple-*` / `gray-*` / `slate-*` / `lime-*` | 1,708 / 870 / 358 / 18 / 50 |
| Arbitrary hex colour classes (`-[#…]`) | 36 |
| `dark:` palette overrides in legacy pages | 0 |
| `legacy.css` | 5,382 lines |
| Semantic token utilities (for comparison) | 1,975 |

**Student portal: done.** `pages/student` and `components/student` were rebuilt on the design system and pass the portal check below: no raw palette or hex colour utilities, no `legacy.css` classes, and no `hexColor` props. The shared student building blocks are `CourseCard`, `DateTile`, `CopyButton`, `CertificateDialog`, `QuizRunner` and `AssignmentSubmitDialog` in `src/components/student`. Notes, the resume, interview history and notification preferences persist in `localStorage` (`quantum_student_notes_v2`, `quantum_resume_v2`, `quantum_interview_history_v2`, `quantum_student_notification_prefs`).

### Retirement plan

- **Each portal phase (2–7)** is done when the portal's files contain no raw neutral, `purple` or `lime` palette utilities, no arbitrary hex colour classes, and no `legacy.css` class names, and its `hexColor` / `onChangeHexColor` props are gone. This check must return nothing for the portal's folder:

  ```
  git grep -nE "\b(bg|text|border|ring|from|via|to|fill|stroke|divide|outline|shadow)-(zinc|slate|gray|neutral|stone|purple|lime)-[0-9]{2,3}|-\[#[0-9a-fA-F]{3,8}\]" -- <portal folder>
  ```

- **Phase 8** is done when all of the following hold:
  - The same check over all of `frontend/src` returns nothing.
  - Unreferenced `legacy.css` rules and the variable aliases are deleted. The target is to delete the file.
  - The static `ink-*` scale has moved from `palette-bridge.css` into `index.css`'s `@theme`.
  - `palette-bridge.css` and its import are removed, including the dark-island and utility-fix rules. Tailwind's default palettes don't invert in dark mode, so this must happen only after the grep is clean.
  - `audit.mjs` still reports 0 findings on every route.
  - `src/app/legacy.ts` (`LEGACY_BG`) is deleted.
  - `contrast.mjs` still passes.
