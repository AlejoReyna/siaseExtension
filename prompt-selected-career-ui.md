# Prompt — replicate the selected-career UI in Oh My SIASE

Attach the frontier design image for the **selected career / career selection main view** to this prompt.

---

You are a senior product designer and frontend engineer. Analyze the attached design image and produce a precise, implementation-ready specification for replicating it in the existing codebase described below. This is a Chrome MV3 extension that progressively enhances the UANL SIASE portal; it is **not** a greenfield React app.

Your job is to tell a coding agent exactly what to change. Do not give generic design advice, do not redesign the screen, and do not invent data, screens, endpoints, dependencies, or navigation that are absent from the reference image or repository context.

## Objective

Reproduce the attached UI as faithfully as practical for the `eselcarrera.htm` career-selection route while keeping every existing SIASE navigation behavior working.

## Codebase and runtime context

- Repository: `siaseExtension`
- Stack: TypeScript, Vite, Chrome Extension Manifest V3, native DOM APIs, plain CSS. Do **not** introduce React, Tailwind classes, a component library, external fonts, or new dependencies for this page.
- The active route is `https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/eselcarrera.htm*`.
- The extension injects `src/content/service-page.ts` and `src/content/styles/service-pages-v2.css` on that route at `document_idle`, including inside frames.
- `src/content/service-page.ts` identifies the route and calls `enhanceCareerSelectorPage(frameDocument)` from `src/content/pages/career-selector-page.ts`.
- The page is a legacy framed SIASE page. The current enhancement deliberately hides the legacy top/left frames for this route and renders a full-viewport replacement surface.

## Current implementation contract (must preserve)

The real server page contains a native form and server-owned controls. Treat them as the source of truth:

```ts
const form = frameDocument.querySelector<HTMLFormElement>('form[name="SelCarrera"]');
const careerLinks = Array.from(form.querySelectorAll<HTMLAnchorElement>('a[href]'))
  .filter((a) => (a.getAttribute('href') ?? '').trim().toLowerCase().startsWith('javascript:'));
```

- Each native career link carries legacy JavaScript that assigns hidden form fields and submits `SelCarrera`.
- The enhanced UI must render one selectable item per native career link, using its text as the label. There can be one or many careers; do not hard-code names or counts.
- A selection must execute the same legacy navigation. The existing implementation saves the native action in `data-siase-career-action`, parses its form-field assignments, writes them to the original `SelCarrera` form, and calls `form.submit()`.
- Keep `form[name="SelCarrera"]`, its hidden inputs, and the original career links in the DOM. Do not change the form action, method, target, or hidden values except immediately before its ordinary native submit.
- Do not fetch SIASE endpoints, reconstruct session data, inspect cookies, create an iframe, or circumvent a session boundary.
- Keep the existing short selected-state transition (approximately 280 ms) before submit, and retain `prefers-reduced-motion` support.
- The route may expose legacy service panels with IDs `#siase`, `#correo`, `#nexus`, and `#codice`, plus native Nexus/CODICE controls. Do not depend on them for the selected-career UI and do not break them; native elements may remain visually hidden as fallback/source markup.
- If `SelCarrera` or its JavaScript career links are missing, do not render an empty replacement UI. Leave the native page intact.

## Current files and structure

`src/content/pages/career-selector-page.ts` currently creates:

```html
<div class="siase-v2-career-shell">
  <header class="siase-v2-career-shell__header">
    <div class="siase-v2-career-shell__brand"><span>U</span><strong>UANL<em>SIASE</em></strong></div>
    <nav aria-label="Módulos"><span class="is-active">Escolar</span><span>Tesorería</span><span>DGPPE</span><span>AFI</span></nav>
  </header>
  <aside class="siase-v2-career-sidebar">
    <div class="siase-v2-career-sidebar__home">⌂ <strong>Inicio</strong></div>
    <p>Carreras disponibles</p>
    <!-- one .siase-v2-career-sidebar__choice per native career -->
  </aside>
  <main class="siase-v2-career-shell__main">
    <section class="siase-v2-career-selector">
      <header>
        <p class="siase-v2-service-eyebrow">SIASE · UANL</p>
        <h1 id="siase-v2-career-title">Selecciona tu carrera</h1>
        <p>Elige el programa académico con el que deseas continuar.</p>
      </header>
      <div class="siase-v2-career-choices">
        <!-- one button per native career -->
      </div>
    </section>
  </main>
</div>
```

Each main choice is a real `<button type="button" class="siase-v2-career-choice">` with:

```html
<span class="siase-v2-career-choice__marker">01</span>
<strong><!-- native career label --></strong>
<span>Continuar</span>
```

The relevant styling is in `src/content/styles/service-pages-v2.css`. Existing page selectors are deliberately scoped beneath `body.siase-v2-service-page`; retain that scoping so other legacy portal pages are not affected.

The anonymous regression fixture is `src/tests/fixtures/career-selector.html`. The extension already has a dirty worktree; do not recommend or rely on reverting unrelated changes.

## Design fidelity rules

1. Treat the attached image as the visual source of truth. Match its hierarchy, layout, spacing, colors, typography, card shapes, borders, shadows, icons, interaction states, and responsive behavior—not just its text.
2. Use only details visible in the image. If a value cannot be measured exactly, give a sensible CSS value/range and clearly label it as an approximation.
3. Preserve Spanish visible copy where it exists, unless the reference image visibly uses different copy. Dynamic career labels must always come from the native page.
4. Do not present decorative module tabs, sidebar choices, home controls, settings, user data, status indicators, or buttons as functional unless the repository already has a safe native behavior for them. Mark them as non-interactive or remove them if the reference does not need them.
5. Reuse existing inline SVG or CSS shapes where possible. Do not request new image assets unless the design cannot be reproduced without them; if an asset is necessary, name it and specify dimensions, transparent background requirements, and fallback behavior.
6. Desktop target: 1440 px wide. Also specify behavior at 1024 px, 768 px, and 375 px. Avoid horizontal overflow and make every career choice keyboard reachable with a visible focus state.
7. Avoid full-page visual changes outside this route. No modifications to `manifest.json` unless absolutely necessary (it should not be necessary).

## Required response format

Return your answer in exactly these sections:

1. **Visual decomposition** — identify every visible region in the reference image, its hierarchy, likely dimensions, and responsive changes.
2. **Gap analysis** — compare the reference with the current markup/classes above. State what can be retained, what must be added/removed, and what must not be made interactive.
3. **File-by-file implementation instructions** — for each file, name the exact selectors, DOM changes, CSS rules, and event-handling changes. Prioritize `src/content/pages/career-selector-page.ts`, `src/content/styles/service-pages-v2.css`, and only if needed `src/tests/fixtures/career-selector.html` / a focused test.
4. **Detailed CSS design tokens** — exact or approximate values for colors, font stacks, sizes, line heights, spacing, radii, shadows, breakpoints, hover/focus/selected/loading states, and reduced-motion behavior.
5. **Behavior and accessibility checklist** — state how selection delegates to the existing native `SelCarrera` form, covers one/many careers, keyboard operation, focus handling, and fallback if native content is unavailable.
6. **Acceptance checklist** — concise visual and functional conditions a coding agent can verify locally.

Be decisive. Where the screenshot leaves something ambiguous, choose the smallest change consistent with the current code and explicitly identify the assumption.
