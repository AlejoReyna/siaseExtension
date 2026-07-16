# Concrete UI inspiration

Research date: 2026-07-16.

This is a component-level reference board for the SIASE rebuild. It is not permission to copy another product's branding or interface wholesale.

## Recommended direction

Build a **calm institutional workspace**:

- Workday Student for academic information structure;
- Ellucian Experience for the dashboard/card model;
- Liferay's student portal concept for daily priorities;
- Blackboard Ultra for restrained navigation and responsive behavior;
- CETYS and LORIS redesign case studies for simplifying a legacy student portal without making it feel like generic enterprise software.

The result should feel recognizably UANL: navy as the structural color, gold only for emphasis, a warm neutral canvas, dense information presented with excellent spacing, and native SIASE actions preserved underneath.

## Reference 1 — Workday Student Academics Hub

Reference: [Workday Academic Advising and Planning](https://www.workday.com/en-us/products/student/advising.html)

Concrete patterns to borrow:

- one clear academic-period context at the top;
- a prominent `Awaiting your action` / requirements area;
- current schedule as a readable list or table, not decorative cards;
- academic progress and GPA grouped together;
- important contacts kept visible but secondary;
- quick actions separated from informational content.

Use for SIASE:

- registration dates and blockers;
- schedule;
- Kardex progress and average;
- pending documents;
- frequently used academic actions.

Avoid: Workday's excessive nested pages and enterprise terminology.

## Reference 2 — UBC Workday Student

Reference: [UBC Workday navigation guide](https://workday.students.ubc.ca/navigating-workday/)

Concrete patterns to borrow:

- task-first landing page;
- a small row of high-frequency actions;
- `Awaiting Your Action` distinct from general announcements;
- predictable page headers and breadcrumbs;
- dashboards that link into workflows instead of duplicating them.

Use for SIASE: surface enrollment, documents, receipts, holds, and surveys only when they require attention.

## Reference 3 — Ellucian Experience

Reference: [Ellucian Experience](https://www.ellucian.com/solutions/ellucian-experience)

Concrete patterns to borrow:

- personalized cards backed by separate systems;
- consistent card anatomy across academic, financial, and campus modules;
- cards that can fail independently;
- a single hub instead of exposing the technical source system;
- desktop/mobile parity.

Use for SIASE: independent schedule, grades, Kardex, Nexus, payments, and news modules. A Nexus outage must not affect native SIASE navigation.

Avoid: a user-customizable card grid in the first version. It adds complexity before the information architecture is stable.

## Reference 4 — Liferay higher-education portal

Reference: [Liferay student-experience portal concept](https://www.liferay.com/web/lr/revolutionise-the-student-experience)

Concrete patterns to borrow:

- `Today` and `This week` as the dashboard's main time horizons;
- counts with the next important item shown immediately;
- schedule, assessments, exams, and events sharing one visual language;
- news placed below academic priorities.

Use for SIASE: today's classes, next enrollment deadline, pending document, upcoming Nexus activity, and recent grade change.

## Reference 5 — Blackboard Ultra

Reference: [Blackboard student navigation](https://help.anthology.com/blackboard/student/en/original-course-view/getting-started/access-blackboard.html)

Concrete patterns to borrow:

- shallow global navigation;
- one active destination with strong focus indication;
- minimal visual chrome around dense content;
- responsive/mobile-first interaction targets;
- accessibility treated as a system requirement.

Use for SIASE: the global sidebar, focus states, reduced-motion behavior, and mobile navigation.

Avoid: borrowing LMS concepts such as course streams for administrative SIASE pages.

## Reference 6 — CETYS student portal redesign

Reference: [CETYS University Student Portal case study](https://www.carosalazare.com/cetys-uxui)

Why it matters: it is a Mexican university portal redesign dealing with the same class of problems—confusing menus, payments, academic history, outdated tables, and poor responsiveness.

Concrete patterns to borrow:

- simple, serious, youthful visual direction;
- academic, financial, registration, evaluation, and services as top-level groups;
- redesigned academic tables with deliberate spacing and hierarchy;
- responsive behavior instead of a separate resize mode.

## Reference 7 — LORIS portal redesign

Reference: [LORIS student portal redesign](https://www.behance.net/gallery/226526881/LORIS-UX-Case-Study-on-Student-Portal-Redesign)

Concrete patterns to borrow:

- simplify labels and remove redundant steps;
- make errors and unavailable states explicit;
- use consistent buttons and page titles;
- keep academic and financial workflows recognizable;
- validate navigation structure before visual customization.

## Reference 8 — Boston University MyBU

Reference: [MyBU student portal case study](https://attainpartners.com/blog/attain-partners-boston-university-student-portal/)

Concrete lesson: a legacy SIS should be wrapped with a clearer self-service experience rather than rewritten as unrelated decorative pages. This supports the SIASE rebuild's additive/delegated architecture.

## Proposed SIASE composition

### Global shell

- Desktop: 240–264 px collapsible navigation rail, compact top bar, content canvas.
- Mobile: top bar plus modal/drawer navigation.
- Sidebar groups: Inicio, Académico, Inscripción, Finanzas, Trámites, Perfil, Otros sistemas.
- Preserve every original anchor and its `target`; the new menu delegates to the native link.

### Home dashboard

1. Student/career context and session state.
2. `Requiere tu atención`: enrollment window, pending documents, holds, receipts.
3. Today's schedule.
4. Academic snapshot: progress, average, latest grades.
5. This week's Nexus activities.
6. Secondary UANL notices/news.

### Detail pages

- One page title and short context line.
- Native action toolbar kept visible.
- Readable responsive table/list.
- Explicit empty, unavailable, expired-session, and error states.
- No dashboard shell duplicated inside page content.

## Initial visual tokens

These are a starting direction, not finalized values:

| Token | Direction |
| --- | --- |
| Structural navy | `#123B70` |
| Active navy | `#174F91` |
| UANL gold accent | `#D6A93B` |
| Page canvas | `#F5F6F8` |
| Surface | `#FFFFFF` |
| Primary text | `#172033` |
| Secondary text | `#667085` |
| Border | `#DDE2EA` |
| Success | `#18794E` |
| Warning | `#A15C00` |
| Danger | `#B42318` |
| Radius | 10–14 px |
| Main content width | 1200–1360 px |

## Decisions for the first mockup

- Light theme first; dark mode after the core pages work.
- Information-dense rather than oversized cards.
- Navy navigation, neutral content canvas, gold for priority/active emphasis only.
- No gradients, glass effects, gaming metaphors, profile-photo upload, or configurable widgets in version one.
- Use icons only when they improve scanning; every icon retains a text label.

