# SIASE Plus

Chrome Extension Manifest V3 for modernizing the UANL SIASE portal at `https://deimos.dgi.uanl.mx`.

## Features

- Modern reskin for SIASE `top`, `left`, and `center` frames.
- Dashboard-style landing experience for `eselcarrera.htm`, preserving the legacy career selector and service forms while adding a modern hero, quick-access cards, sidebar reminders, and themed panels.
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
