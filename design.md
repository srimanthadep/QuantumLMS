---
name: Noorly Soft UI Component System
colors:
  background: '#F1F0F3'
  on-background: '#171526'
  surface: '#F7F5F7'
  surface-dim: '#E7E4E9'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#FBFAFC'
  surface-container: '#F5F2F6'
  surface-container-high: '#EEEAF0'
  surface-container-highest: '#E7E3EA'
  surface-variant: '#F0EDFF'
  on-surface: '#171526'
  on-surface-variant: '#514B68'
  inverse-surface: '#111111'
  inverse-on-surface: '#FFFFFF'
  outline: '#B6AEC8'
  outline-variant: '#E2DCEE'
  surface-tint: '#905FEB'
  primary: '#905FEB'
  on-primary: '#FFFFFF'
  primary-container: '#F0E7FF'
  on-primary-container: '#5F2BC0'
  inverse-primary: '#D8C2FF'
  secondary: '#AEEB00'
  on-secondary: '#151B00'
  secondary-container: '#E7FF9C'
  on-secondary-container: '#385000'
  tertiary: '#F0EDFF'
  on-tertiary: '#4A4560'
  tertiary-container: '#E4DFFD'
  on-tertiary-container: '#33295A'
  neutral: '#111111'
  on-neutral: '#FFFFFF'
  error: '#E21D2D'
  on-error: '#FFFFFF'
  error-container: '#FFE4E5'
  on-error-container: '#9B1020'
  success: '#AEEB00'
  on-success: '#253700'
  primary-fixed: '#F0E7FF'
  primary-fixed-dim: '#D8C2FF'
  on-primary-fixed: '#2E075F'
  on-primary-fixed-variant: '#6330BD'
  secondary-fixed: '#E7FF9C'
  secondary-fixed-dim: '#D2F66A'
  on-secondary-fixed: '#182600'
  on-secondary-fixed-variant: '#385000'
  tertiary-fixed: '#F0EDFF'
  tertiary-fixed-dim: '#D8D1F4'
  on-tertiary-fixed: '#201B38'
  on-tertiary-fixed-variant: '#514B68'
typography:
  display-kpi:
    fontFamily: Sassoon Sans Std
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -1px
  headline-xl:
    fontFamily: Sassoon Sans Std
    fontSize: 25px
    fontWeight: '700'
    lineHeight: 29px
    letterSpacing: -0.7px
  headline-lg:
    fontFamily: Sassoon Sans Std
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 25px
    letterSpacing: -0.5px
  headline-md:
    fontFamily: Sassoon Sans Std
    fontSize: 19px
    fontWeight: '700'
    lineHeight: 23px
    letterSpacing: -0.3px
  headline-sm:
    fontFamily: Sassoon Sans Std
    fontSize: 17px
    fontWeight: '700'
    lineHeight: 21px
  body-lg:
    fontFamily: Sassoon Sans Std
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: -0.2px
  body-md:
    fontFamily: Sassoon Sans Std
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.2px
  body-sm:
    fontFamily: Sassoon Sans Std
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-lg:
    fontFamily: Sassoon Sans Std
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Sassoon Sans Std
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Sassoon Sans Std
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 13px
    letterSpacing: 0.6px
  micro:
    fontFamily: Sassoon Sans Std
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 11px
    letterSpacing: 0.5px
  display-sample:
    fontFamily: Sassoon Sans Std
    fontSize: 112px
    fontWeight: '700'
    lineHeight: 1
    letterSpacing: -0.06em
  body-sample:
    fontFamily: Sassoon Sans Std
    fontSize: 112px
    fontWeight: '400'
    lineHeight: 1
    letterSpacing: -0.06em
  label-sample:
    fontFamily: Sassoon Sans Std
    fontSize: 112px
    fontWeight: '500'
    lineHeight: 1
    letterSpacing: -0.06em
rounded:
  xs: 0.375rem
  sm: 0.75rem
  DEFAULT: 1rem
  md: 1.25rem
  lg: 1.5rem
  xl: 1.75rem
  2xl: 2rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.25rem
  margin: 1.25rem
  margin-lg: 1.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
shadows:
  card: '0 8px 28px rgba(39, 28, 61, 0.055)'
  card-hover: '0 12px 34px rgba(39, 28, 61, 0.085)'
  control: '0 6px 16px rgba(91, 51, 163, 0.14)'
  purple-glow: '0 8px 20px rgba(144, 95, 235, 0.22)'
---

## Brand & Style
Noorly’s component library uses a polished, soft-edged visual language that feels contemporary, warm, and approachable. The system pairs electric purple and vivid lime with a calm, pale neutral canvas, allowing core controls to feel vivid without making the overall interface visually noisy. White component cards sit on a soft grey-lavender background with gentle shadows and generous internal spacing.

The reference sheet is arranged as a practical UI inventory rather than a live dashboard: color ramps occupy the left column; typography, buttons, progress bars, and compact button examples occupy the center; and search, status badges, icon navigation, and action icons occupy the right. The overall tone is premium SaaS with a friendly EdTech personality.

## Colors
The palette is organized into four foundational groups, each displayed as a labelled color card with a horizontal tint ramp. Treat the listed hex values as the design tokens; the individual ramp steps are supporting shades for hover states, borders, backgrounds, and charts.

- **Primary Purple (`#905FEB`):** The signature brand color used for primary buttons, active icon navigation, icon-only actions, progress fills, links, and emphasis. A brighter violet (`#8C59E9` to `#905FEB`) may be used for subtle gradients, as shown in the reference image.
- **Secondary Lime (`#AEEB00`):** A vivid chartreuse accent used for selected secondary actions, positive progress states, grouping/action icons, highlights, and small moments of visual emphasis. Keep dark ink on lime surfaces for readability.
- **Tertiary Lavender (`#F0EDFF`):** Pale purple-lavender used for muted panels, search field surfaces, secondary controls, quiet icon backgrounds, outlined-button surroundings, and low-emphasis states.
- **Neutral Ink (`#111111`):** Deep near-black for inverted buttons, core typography, high-contrast icons, and destructive/action icon contrast. Pure white is used for inverted button text.
- **Base Canvas (`#F1F0F3`):** Soft grey-lavender page background. It is intentionally low contrast so white component cards are the primary visual plane.
- **Card Surface (`#FFFFFF`):** White or near-white surfaces (`#FEFEFD`) for component panels. Separate panels with whitespace and very subtle shadows rather than heavy borders.
- **Supporting Text (`#514B68`):** Muted indigo-grey for descriptions, supporting labels, placeholder text, and secondary metadata.
- **Destructive Accent (`#E21D2D`):** Red reserved for delete or destructive actions, paired with white iconography. Do not use it for standard primary actions.

### Palette Ramp Guidance
- **Purple ramp:** `#2B087D`, `#4B18B8`, `#6E36D5`, `#905FEB`, `#A780F1`, `#C1A6F7`, `#D8C7FB`, `#E9E0FD`, `#F6F1FF`.
- **Lime ramp:** `#1B2800`, `#365600`, `#5F8700`, `#86B800`, `#AEEB00`, `#C3F43D`, `#D7F875`, `#E7FFAA`, `#F5FFDC`.
- **Lavender ramp:** `#514B68`, `#77718F`, `#9B95B4`, `#BFB9D5`, `#D6D1E9`, `#E4DFFD`, `#F0EDFF`, `#F7F5FF`, `#FCFBFF`.
- **Neutral ramp:** `#111111`, `#29282D`, `#45434A`, `#65616B`, `#89858E`, `#B0ADB5`, `#D0CDD4`, `#E7E4E9`, `#F7F5F7`.

## Typography
Sassoon Sans Std is the primary brand typeface throughout the Noorly component library. It is loaded from local OpenType files and is followed by a system sans-serif fallback stack. Use the same family for headings, descriptions, metadata, form controls, navigation, and buttons so the interface maintains one consistent voice.

- **Font stack:** `"Sassoon Sans Std", "Sassoon Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Local font files:** `sassoon-sans-std-regular.otf` maps to weight `400`; `sassoon-sans-std-medium.otf` maps to weights `500` and `600`; `sassoon-sans-std-bold.otf` maps to weights `700`, `800`, and `900`. Use `font-display: swap` for local `@font-face` definitions, and apply antialiased font smoothing to the body.
- **Display / KPI:** `30px / 34px`, weight `700`, with `-1px` tracking. Use for prominent counters and key dashboard values.
- **Headline hierarchy:** H1 / featured class headings use `25px / 29px`, weight `700`, and `-0.7px` tracking. Greeting or title-one text uses `21px–24px`, weight `700`, around `25px` line height, and `-0.5px` tracking. Section headings use `17px–19px`, weight `700`, with tracking around `-0.3px`.
- **Cards and primary text:** Use `13px–14px`, weight `500` or `600`, approximately `18px` line height, and `-0.2px` tracking for metric labels, navigation items, student names, and core card copy.
- **Buttons / actions:** Use `12px`, weight `700`, with neutral tracking (`0px`) for compact action labels.
- **Inputs and subtitles:** Use `11px`, weight `400` or `500`, with `0px` to `0.3px` tracking for helper copy, search placeholders, and secondary information.
- **Captions / metadata:** Use `10px–10.5px`, weight `400` or `500`, with approximately `0.6px` tracking for role details, hex labels, and captions.
- **Micro labels / badges:** Use `8.5px–9.5px`, weight `500` or `700`, with approximately `0.5px` tracking. Reserve this size for compact status badges and micro labels; maintain adequate contrast and do not use it for essential long-form content.
- **Specimen cards:** The headline “Aa” sample demonstrates weight `700`; the body specimen demonstrates `400`; and the label specimen demonstrates `500`. The oversized specimen is illustrative and should not be confused with application text sizing.
- **Type color:** Use `#171526` for primary text and `#514B68` for supporting text. White type is reserved for purple primary controls, black inverted controls, and other sufficiently dark backgrounds.

## Layout & Spacing
The design sheet follows a wide, three-zone component grid on a soft neutral canvas. Component panels use a consistent alignment grid, ample whitespace, and repeated rounded cards so that tokens and controls feel like one system.

- **Structure:**
  - **Left palette column:** Four vertically stacked palette cards for Primary Purple, Secondary Lime, Tertiary Lavender, and Neutral. Each card contains a name, hex value, tint ramp, and small ramp labels.
  - **Center component area:** A two-column arrangement of typography samples, buttons, progress bars, an icon button, and a label button. Typography cards receive the largest area because type scale and family are core foundations.
  - **Right component column:** Search input at the top, status badges beneath it, followed by icon navigation and action icons. Keep the order and alignment consistent with the reference image.
  - **Gutters:** Use `1rem` to `1.25rem` gaps between panels and approximately `1.25rem` outer page padding on desktop.
  - **Panel padding:** Use `1.5rem` to `1.75rem` for larger panels, with `1rem` for compact icon/button panels.
- **Responsive behavior:**
  - **Desktop (≥1200px):** Show the three-zone grid, with palette cards in a stable left column, the largest component area in the center, and a narrow showcase column on the right.
  - **Tablet (768px–1199px):** Reflow into a two-column layout. Keep palette cards in a two-by-two group and arrange control examples in a fluid grid.
  - **Mobile (<768px):** Use a single-column stack. Keep color-ramp cards and component cards full width; permit button and badge rows to wrap while preserving readable spacing.

## Elevation & Depth
The system uses subtle elevation to separate white component panels from the grey-lavender canvas without making the interface feel heavy.

- **Level 0 (Canvas):** Use `#F1F0F3` as the quiet background. Avoid a high-contrast pattern or texture; the palette and control specimens should be the focus.
- **Level 1 (Component Cards):** Use white (`#FFFFFF`) surfaces, large corner radii, and a delicate shadow such as `0 8px 28px rgba(39, 28, 61, 0.055)`. Use little or no visible border.
- **Level 2 (Interactive Controls):** Purple buttons may use a restrained glow or soft lift (`0 8px 20px rgba(144, 95, 235, 0.22)`). Outlined buttons use a thin purple stroke rather than elevation.
- **Active states:** Use color contrast and fill changes to indicate selection. A selected navigation item is represented by a purple circular/squircle surface; inactive icons remain dark on a light lavender rail.

## Shapes
Rounded geometry is a defining feature of Noorly’s component style. It creates a soft, cohesive system across larger showcase cards and small interactive controls.

- **Component panels:** Use approximately `24px–30px` corner radii (`rounded-2xl` to `rounded-3xl`) for the large white cards shown in the reference image.
- **Palette cards:** Use `20px–24px` corner radii with the palette ramp inset into the card as a separate rounded strip.
- **Buttons and badges:** Use fully rounded pill shapes (`rounded-full`) for filled buttons, status badges, and label buttons. Keep padding generous enough for text and icons.
- **Input field:** Use a pill-shaped search field with a thin pale-lavender outline and a soft inner surface.
- **Icon controls:** Use circles or soft squircle shapes; icons should be centered and optically balanced.
- **Progress bars:** Use capsule tracks and fills with round end caps. The fill should not extend beyond the track radius.

## Components

### Color Palette Cards
- **Palette panel:** A white/colored card showing the token group name at upper-left and the primary hex value at upper-right.
- **Tint ramp:** A full-width horizontal strip of adjacent color steps ranging from darkest to lightest. Round the ramp container, clip each segment to the container shape, and show compact shade labels below it.
- **Group styling:** Primary Purple and Secondary Lime use saturated header/background surfaces. Tertiary Lavender uses a very pale lavender surface with dark text. Neutral uses a near-black surface with white text.

### Typography Specimens
- **Headline specimen:** Large “Aa” sample on the left or center, with hierarchy metadata aligned alongside it. Show “Sassoon Sans Std” in muted text in the panel header and list the current scale/line-height pairs: Display 30/34, H1 25/29, H2 21/25, H3 19/23, and H4 17/21.
- **Body specimen:** Large, regular “Aa” sample paired with a short sample sentence and body/caption size references. Use dark ink for the specimen and muted indigo-grey for explanatory content.
- **Label specimen:** Demonstrate compact Label (14px), Button (12px), Chip (12px), Caption (10px–11px), and Micro (about 9px) styles. Use the project’s configured weight mappings and maintain consistent baseline alignment.

### Buttons
- **Primary:** Purple fill (`#905FEB`) with white text, pill radius, and a soft violet shadow. A small trailing arrow or action icon may be included.
- **Secondary:** Pale lavender fill (`#F0EDFF`) with purple text. Use no heavy shadow.
- **Inverted:** Near-black fill (`#111111`) with white text for high-contrast actions.
- **Outlined:** White or transparent fill with a thin purple outline and purple label. Keep border weight around `1px–1.5px`.
- **Icon Button:** Purple circular/squircle control with a centered white icon, visible padding, and restrained purple glow.
- **Label Button:** Purple pill with a leading plus icon and a short label. Keep the icon and text vertically centered with a clear gap.

### Input / Search
- **Search field:** Wide, pill-shaped input with pale lavender/white fill and a thin `#D8CFFF` or `#E2DCEE` outline.
- **Leading icon:** A simple magnifying glass in muted indigo-grey; maintain adequate space between icon and text.
- **Placeholder:** Use a concise prompt such as “Search students or topics” in `body-md`, colored `#716B86`.
- **Focus state:** Change the outline to primary purple and add a subtle focus ring. Never use a thick or high-contrast glow that overwhelms the field.

### Status Badges
- **Completed:** Pale green/lime tint with deep green text.
- **In Progress:** Pale lavender tint with purple text.
- **Assigned:** Warm pale yellow tint with amber text, used for items requiring attention.
- **Not Started:** Light neutral-grey tint with muted slate text.
- **Sizing:** Use compact text (`label-md` or `label-sm`) with pill radius and balanced horizontal padding. In the reference sheet, badges are shown in a two-column grid with equal height and consistent spacing.

### Progress Bars
- **Track:** Pale grey-lavender (`#EEEAF4`) capsule, approximately `8px–12px` high.
- **Primary progress:** Purple fill (`#905FEB`) for standard completion values.
- **Positive progress:** Lime fill (`#AEEB00`) for positive or highlighted values.
- **Secondary progress:** Soft pink (`#F4A9D4`) may be used for an alternate series where differentiation is needed.
- **Value label:** Place a percentage at the right end in a compact semibold style. Progress is shown at 76%, 48%, and 32% in the reference artwork; these are sample visuals, not fixed application values.

### Navigation / Iconography
- **Navigation rail:** Place icons inside a long pale-lavender rounded container. Use a filled purple circle/squircle for the active item and dark outlined glyphs for inactive items.
- **Icon style:** Use a consistent outline icon family with simple strokes and minimal internal detail. House, search, user, settings, pencil, users/group, tag, and trash icons are represented in the reference image.
- **Sizing:** Standard controls should use approximately `20px–24px` icons; compact action controls may use `18px–20px` icons. Align icon centers optically, not only mathematically.

### Action Icons
- **Edit:** Purple circular fill with a white pencil glyph.
- **Group / Users:** Lime circular fill with a dark group glyph.
- **Tag:** Pale lavender or light-grey circular fill with a dark tag glyph.
- **Delete:** Red circular fill with a white trash glyph. Use only for destructive actions and provide accessible names in interactive implementations.
- **Spacing:** Place action buttons on a shared horizontal baseline, with equal outer diameter and consistent gaps.

## Accessibility & Interaction Notes
- Keep text and icons legible against purple, lime, and dark fills; particularly check contrast when using the lime accent.
- Do not communicate status only through color. Pair each badge with its visible text label and provide an accessible name for icon-only buttons.
- All interactive components should have visible keyboard focus states. The primary button focus ring should be distinct from its purple fill; the search field focus ring should remain visible against the light canvas.
- Preserve a minimum comfortable target size of about `40px` for compact icon actions and larger targets where practical.
- Use destructive red sparingly and provide confirmation for irreversible delete actions in real application flows.
