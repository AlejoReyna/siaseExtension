# SIASE Plus

Chrome Extension Manifest V3 for modernizing the UANL SIASE portal at `https://deimos.dgi.uanl.mx`.

## Features

- Modern reskin for SIASE `top`, `left`, and `center` frames.
- Dashboard-style landing experience for `eselcarrera.htm`, preserving the legacy career selector while keeping a persistent left rail when SIASE opens.
- Popup dashboard with cached grades and schedule.
- Grade-change notifications from a background service worker.
- Schedule parsing and `.ics` export.
- Searchable, categorized, pinnable sidebar menu.

## Setup

```bash
npm install
npm run dev
```

Load the generated extension in Chrome from `chrome://extensions` using **Load unpacked** and select the Vite/CRXJS development output.

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Architecture Notes

SIASE is a server-rendered OpenEdge/WebSpeed CGI application with a root `frameset`. All frame content is same-origin, so content scripts can coordinate state across `top`, `left`, and `center` frames. Session data is carried in query-string parameters.

---

## Project Updates

April 27th, 2026
During this session, I continued evolving the SIASE extension from a visual refresh into a more complete academic dashboard experience. My main goal was to make the portal feel cleaner, more modern, and more useful while preserving the original services and navigation flow from the UANL student portal.

### Modern Dashboard Layout

I redesigned the central dashboard so it now presents the student experience in a more organized way. The header now focuses on a friendly greeting using the student's first name, academic metadata chips, and a compact theme customization control. I also removed unnecessary visual noise from the header, including the previous avatar circle, so the layout feels lighter and more intentional.

The dashboard now includes inline academic information for:

- Career
- Study plan
- Student ID

I also improved the student data parsing so the extension can better extract the student's name, matricula, career, and study plan from the portal when those values are available.

### Theme Customization

I added a theme customization control that uses a small gear icon instead of a large text button. The control is positioned in the lower-right corner of the dashboard header, keeping it accessible without competing with the greeting or academic information.

The theme menu now stays hidden until I explicitly click the gear icon. This fixed the issue where the theme options appeared as if the control was always active.

The dashboard still supports the planned theme options:

- Institutional
- Dark Mode
- Minimalist

### Academic Summary And Progress

I moved the academic summary into the main quick-access card area. Instead of having a separate summary panel, the main section now starts with a "Resumen Académico" block that includes a credit progress bar.

The progress bar is currently prepared visually and uses a temporary fallback total of 220 credits. Once the real study-plan logic is implemented, this value can be replaced with dynamic credit requirements based on the student's academic program.

The academic summary currently shows:

- Credits completed
- Estimated credit progress
- Student academic status

### Quick Access Cards

I kept the main quick actions connected to the academic summary so the dashboard feels like one cohesive workspace. The visible quick access cards remain focused on the most important student tasks:

- Schedule
- Grades
- Kardex
- Internal fee receipt

I also added a pencil icon button in the upper-right corner of this card section. This prepares the interface for a future customization feature where I will be able to choose which quick-access shortcuts are visible.

### Sidebar Navigation

I reworked the left sidebar into a cleaner service navigation panel. The sidebar now uses a fixed 280px layout with institutional UANL colors, a search input, and grouped service categories.

The service categories now start closed by default and only expand when clicked. I also adjusted the sidebar layout so the category buttons use consistent width and height, distributing themselves across the available sidebar height in a more balanced way.

The sidebar categories are:

- Academic
- Schedule
- Finance
- Procedures
- Profile
- Programs

Each category includes a minimal icon and a counter badge. When a category is opened, its services appear below it with an internal scroll if needed.

### Responsive Sidebar Behavior

I updated the frame layout so the sidebar can collapse into a narrower icon-only mode when the window becomes small. This helps the extension stay usable in constrained screen sizes while keeping the main dashboard readable.

### Viewport-Fit Dashboard Refinement

I also adjusted the dashboard so it behaves more like a full-screen application inside the portal frame. The main shell now uses the available viewport height, keeps the header compact, and lets the central dashboard content fit within the screen instead of stretching downward unnecessarily.

I refined the two-column dashboard behavior so the main academic content stays on the left and the quick access shortcuts remain visible as a dedicated right-side column on desktop. I also lowered the responsive breakpoint so the right-side shortcut bar does not collapse too early inside the portal's center frame.

### Visual Design Improvements

I refined the visual system across the dashboard and sidebar with:

- UANL institutional blue and gold colors
- CSS variables for theme colors
- Rounded 12px corners
- Softer shadows
- Cleaner spacing
- More consistent icon usage
- A friendlier greeting style

These updates make the extension feel closer to a modern academic web app while still fitting inside the original portal structure.

### Build And Validation

After each major UI change, I ran the project build to make sure the TypeScript and Vite pipeline still passed. I also checked linter diagnostics for the edited files to make sure the implementation did not introduce new issues.

The latest build completed successfully.

### Career Landing Dashboard

The `eselcarrera.htm` post-login landing page is handled by a dedicated content script (`src/content/career-landing.ts`) because it uses legacy tables, hover-swapped absolute panels, and CGI forms that must remain intact. It shares the center-frame theme tokens through `src/content/theme.ts` and scopes its CSS under `body.siase-plus-career-landing`.

For the **current** full-width resumen strip (progress tabs, inline career carousel, and access button placement), see the **May 6, 2026 — Career landing banner and resumen layout** section at the end of this document.

### Slim Left-Rail Career Design

The career landing dashboard now moves the quick-access services into a slim fixed left rail inspired by the SIASE sidebar. The rail stays attached to the left edge at roughly 10% of the viewport width, while the central area focuses on the Nexus "Proximas a vencer" widget and the right column keeps institutional news.

### Persistent SIASE Shell

Opening a career from the `eselcarrera.htm` selector now keeps the modern landing shell alive instead of replacing the whole page. The original `SelCarrera` form is submitted into a named iframe inside the right-side content area, so the left rail remains visible while the legacy SIASE frameset loads internally.

Once SIASE loads, `career-landing.ts` collapses the embedded legacy `top` and `left` frames and shows only the embedded `center` frame. It then parses the legacy `left` menu with the existing menu parser and replaces the initial landing shortcuts with real SIASE navigation buttons. Clicking those rail buttons changes only the embedded `center` frame, preserving the modern shell around the portal content.

---

## May 5, 2026 — Nexus Upcoming Activities Widget

I built a widget on the `eselcarrera.htm` dashboard that pulls the student's upcoming Nexus assignments and renders them inline, without requiring the student to open Nexus separately.

### Getting the token

Nexus runs on a different origin (`api.nexus.uanl.mx`) and authenticates through a SIASE-signed session token. The career landing page does not have that token in scope. I thread together three systems to get it: the legacy CGI session, a hidden iframe submit that bounces through the SIASE auth flow, and a service worker that intercepts the Nexus session when the student visits Nexus directly and stores it in `chrome.storage.local`.

`career-landing.ts` tries each authentication path in sequence until one works, caches the resulting token in `localStorage`, then calls two Nexus API endpoints: `ConsultarCarpetaCursos` to get the student's active courses, and `ConsultarEstructura` once per course to fetch activity deadlines. I filter results to the next seven calendar days and render them as a sorted list.

### Four bugs, zero activities

I ran a live diagnostic against real ENE-JUN 2026 semester data and found the widget showing zero activities for a student with five deadlines inside the next seven days. The problems stacked.

**Token TTL mismatch.** I had hardcoded `8 * 60 * 60 * 1000` (eight hours) as the session cache TTL. Nexus expires sessions after roughly five hours and twenty minutes. The cached token looked valid to my code, but the API returned `Code: 2004` on every request. I changed `leerSesionNexus` to read `Sesion.FechaInicio` and `Sesion.TiempoRestante` directly from the stored session object and compute the exact expiry with a two-minute safety margin. When those fields are absent on older cached sessions, I fall back to four hours instead of eight.

**Service worker returning stale sessions.** Even after fixing the TTL check in the content script, the service worker's `GET_CAPTURED_NEXUS_SESSION` handler sent back whatever was in `chrome.storage.local` without checking its age. The content script would receive the expired session, write it to `localStorage` with a fresh `_cachedAt` timestamp, and pass the TTL check I had just added. I added the same `FechaInicio + TiempoRestante` validation inside the SW handler. If the stored session is expired, the SW deletes it from `chrome.storage.local` before responding, so `career-landing.ts` never sees a stale token.

**Off-by-hours filter.** `filtrarActividades` calculated the seven-day window as `Date.now() + 7 * 24 * 60 * 60 * 1000`. An activity due at 23:59 on day seven would miss the cutoff if the page loaded after, say, 21:43. I replaced the cutoff with a date advanced by seven days via `setDate`, then clamped to end-of-day with `setHours(23, 59, 59, 999)`, so the window always reaches the last second of the seventh calendar day regardless of when the student loads the page.

**Silent error swallowing.** When the API returned a session-expired payload (`Code: 2004` or `Code: 2011`) with an HTTP 200 status, `extractCoursesFromNexusResponse` received that error object, found no courses in it, and the widget reported "No tienes cursos activos en Nexus" as if the student had no classes. I added a `data.Code` check right after `ConsultarCarpetaCursos` returns. On a session error, the widget now shows "Sesión de Nexus expirada. Recarga la página para reconectar", clears the local token, and fires a `CLEAR_NEXUS_SESSION` message so the service worker and the content script both clear their caches in sync.

All five activities for the week appear after the four fixes.

---

## May 6, 2026 — Kardex Background Scraping: Credits, Progress, and Average

I wired the credit progress bar and academic average on the dashboard to real data from the student's kardex, loaded automatically in the background without requiring any manual navigation.

### New types and storage key

I created `src/types/kardex.ts` with `KardexEntry` (one parsed subject row: plan semester, course key, name, first passing score across opportunity columns, optional lab score/lab flag, `passed`, raw row text) and `KardexSummary` (`entries`, credit totals and `progressPercent` from the `TOTAL … : X de Y` body snippet, **simple** `average` across passing subjects, `capturedAt`). I added `kardexSnapshot: KardexSummary` to the `StorageSchema` in `src/types/storage.ts`, keeping `KardexSummary` in its own file to avoid a circular import between the parser and storage modules.

### Parser

`parseKardexSummary` in `src/utils/parser/kardex.ts` matches the live SIASE kardex markup rather than generic row heuristics:

- **Credits**: Reads accumulated vs required credits from plain body text using a `TOTAL … : X de Y` pattern. Per-course credit columns are not relied on in the main table (they are not consistently present there).
- **Subject rows**: Finds the primary table via a header cell `Sem.` and parses semester-in-plan, course key, course name, six opportunity columns, and the lab column.
- **Grade used**: First numeric grade ≥ 70 read left-to-right across opportunity columns; that row counts as passed for the average.
- **Average**: Simple arithmetic mean of passing subjects’ scores (not credit-weighted), rounded to two decimals. If the mean falls outside 0–100 it is treated as a parse error and omitted from the UI.
- **Progress percent**: `(completedCredits / requiredCredits) × 100`, capped at 100 (required defaults when the pattern is missing).

### Page handler and dashboard connection

`src/content/pages/kardex-page.ts` still calls `parseKardexSummary` when the student opens the kardex page, persists with `setStorageValue('kardexSnapshot', ...)`, and mirrors the grades-page pattern including a `REFRESH_KARDEX` hint to the service worker.

On `eselcarrera.htm`, `fetchKardexInBackground` in `career-landing.ts` runs after the shell renders. It reuses a cached snapshot when younger than about one hour and structurally usable (`totalCreditsCompleted > 0` or `average` defined, average in range when present). Otherwise it builds `econkdx01.htm` with WebSpeed session query params from storage (`siaseSessionParams`), **`fetch`es** the HTML with credentials, parses it with **`DOMParser`** (no in-page kardex script), runs `parseKardexSummary`, saves the snapshot, and calls **`updateCreditProgressUI`**.

The strip uses a **single** metric surface `#siase-insight-metric-panel` with `data-kardex-progress` and `data-kardex-average`. **`applyInsightMetricView`** switches the headline and bar according to the pill (**Progreso** → percentage + visible bar; **Mi promedio** → decimal average with the **bar hidden**). This avoids maintaining two stacked tab panels and dodges `display`/`[hidden]` specificity bugs.

### Legacy note on kardex alerts

Earlier experiments loaded kardex in a sandboxed iframe to suppress portal `alert()` noise. The **fetch + static parse** path does not execute that page’s scripts during background refresh, so those alerts are not triggered there.

---

## May 6, 2026 — Career landing banner and resumen layout

Work focused on the injected dashboard on `eselcarrera.htm` (`src/content/career-landing.ts` + `src/content/styles/center.css`): the full-width **Resumen** strip above the two-column main area (upcoming tasks + news).

### Horizontal strip and structure

- The **insight** card spans the content width. The **left SIASE rail** stays a sibling of the main grid so the strip can breathe next to the narrow rail.
- In **SIASE embed mode** (`body.siase-career-siase-mode`), the strip is hidden so only the embedded SIASE center frame fills the shell.

### Grid layout (two logical rows)

- **Row 1:** **“Selecciona tu carrera”** (larger, high-contrast title) is **horizontally aligned** with the **Progreso | Mi promedio** pill. The carousel **next** arrow sits in the third grid column and spans the strip height beside those rows.
- **Row 2:** **Left column** — career carousel (previous arrow, dynamic title with extra gap after the arrow, trailing next arrow remains on the far right of row 1 layout as implemented). **Compact yellow “Acceder a esta carrera”** sits **under** the carousel row (not inside the metrics column); it stays **`inline`** width rather than full bleed.
- **Row 2:** **Right column** — **one** `#siase-insight-metric-panel` fed by kardex data. **`applyInsightMetricView`** binds the pill state to the headline + optional bar (see Kardex section above).

### Career carousel behavior

- Initial selection defaults to the **last** career link returned by `getCareerLinks` (most recent in SIASE order).
- The **`N / M`** carousel index caption was removed.
- Modal career list remains available; inline carousel + access button still call the same `selectCareerByIndex` flow.

### Metrics column alignment

- The **metrics** and **career** columns **stretch** to equal row height. Inside the metrics stack, the **progress bar** uses **`margin-top: auto`** so it lines up with the **access** button row on the left (both sit at the bottom of the stretched row).
- Footnote copy (“Progreso estimado…”, kardex subtitle under promedio) was removed for a cleaner strip.

### Insight pills and JavaScript

- Tab buttons use **`getAttribute('data-siase-insight-tab')`**; both **`aria-controls`** point at **`siase-insight-metric-panel`**.
- **`updateCreditProgressUI`** writes `dataset.kardexProgress` / `dataset.kardexAverage` and calls **`applyInsightMetricView`**.

### Visual cleanup called out earlier

- Removed the **vertical divider** between career block and metrics and the **“Tu sesión”** eyebrow.
- **Banner height** stays compact (tight padding, **8px** bar in the wide card).
- Experimental **triangular wedge** asset was dropped.

### Responsive behavior

- Below ~**900px**, the strip stacks (heading, pills, carousel/access, metrics). Mobile tweaks reset auto-margins so the stacked layout does not preserve the desktop “bar aligned with button” trick.

### Related files

- **`src/content/career-landing.ts`**: strip HTML, `attachCareerCarouselNavigation`, insight pill listener, `applyInsightMetricView`, `updateCreditProgressUI`, `fetchKardexInBackground`.
- **`src/content/styles/center.css`**: `.siase-career-insight-wide__split` two-row grid, heading + tabs rail placement, `.siase-career-insight-wide__career-column` / `__metrics` stretch flex, `.siase-career-insight-wide__metric-slot`, compact access button, carousel gaps.

Earlier in the same timeframe, frame and rail sizing tokens were also tightened (`src/content/single-view-layout.ts`, `shadow.css`, `left.css`) so the narrow rail and career landing padding stay consistent with the frameset.
