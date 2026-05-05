Here is the complete descriptive markdown technical reference document for the `eselcarrera.htm` page and associated SIASE sub-page architecture patterns:

---

```markdown
# SIASE/UANL — Sub-Page Technical Reference: eselcarrera.htm & Center-Frame Architecture

> **Purpose:** Extend the SIASE Complete Technical Reference with deep inspection of center-frame sub-pages, beginning with the career-selection landing page (`eselcarrera.htm`) and documenting all DOM patterns, CSS rules, JavaScript behaviors, form mechanics, and inline styles used across the portal's sub-page layer.
>
> **Captured on:** 2026-04-28
> **Captured from:** Live authenticated session (student Matrícula 1851265)
> **Page URL (base):** `https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/eselcarrera.htm`
> **Companion to:** SIASE Complete Technical Reference Document (2026-04-27)

---

## Table of Contents

1. [Page Overview — eselcarrera.htm](#1-page-overview--eselcarrerahtm)
2. [Document Head — Assets & Metadata](#2-document-head--assets--metadata)
3. [Inline CSS Rules (Complete)](#3-inline-css-rules-complete)
4. [Body Structure — Top-Level Layout](#4-body-structure--top-level-layout)
5. [Banner Table (TABLE[0])](#5-banner-table-table0)
6. [Main Content Table (TABLE[1]) — The Tab-Panel System](#6-main-content-table-table1--the-tab-panel-system)
7. [DIV#siase — Career Selection Panel](#7-divsiase--career-selection-panel)
8. [DIV#correo — University Email Panel](#8-divcorreo--university-email-panel)
9. [DIV#codice — Library System Panel](#9-divcodice--library-system-panel)
10. [DIV#nexus — Learning Platform Panel](#10-divnexus--learning-platform-panel)
11. [Overlay Divs: #bloqueo, #Mensaje, #ExUn](#11-overlay-divs-bloqueo-mensaje-exun)
12. [jQuery UI Dialogs](#12-jquery-ui-dialogs)
13. [JavaScript Behaviors](#13-javascript-behaviors)
14. [Form Mechanics — SelCarrera Form](#14-form-mechanics--selcarrera-form)
15. [All Image Assets on This Page](#15-all-image-assets-on-this-page)
16. [CSS Classes & ID Reference (This Page)](#16-css-classes--id-reference-this-page)
17. [Design System Tokens (Computed)](#17-design-system-tokens-computed)
18. [Sub-Page Architecture Patterns](#18-sub-page-architecture-patterns)
19. [Chrome Extension — Sub-Page Targeting Guide](#19-chrome-extension--sub-page-targeting-guide)
20. [Appendix — Raw Data Snapshots](#20-appendix--raw-data-snapshots)

---

## 1. Page Overview — eselcarrera.htm

### Purpose

`eselcarrera.htm` is the **post-login landing page / career selector**. When a student logs into SIASE, this page is the first content loaded into the center frame (`frame[2]`). It serves four functions:

1. **Career selection** — the student picks which faculty/degree program to operate under (important for students enrolled in multiple programs simultaneously).
2. **Service hub** — provides quick access to external UANL services: Correo Universitario (Microsoft 365 email), CODICE (library system), and Nexus (LMS platform).
3. **Modal announcements** — displays server-controlled jQuery UI dialog modals for: first-time document upload instructions and Outlook/Teams password compliance.
4. **Personal data reminder** — a persistent `#Mensaje` overlay reminding students to review and validate their personal data.

### Relationship to Main Dashboard

This page is **NOT** the same as `maincenter.htm` (the default dashboard). The routing is:

```
Login → default.htm (frameset) → frame[center] = eselcarrera.htm
                                                        ↓
                     Student clicks career link → form POST to default.htm → loads full portal
```

`eselcarrera.htm` acts as a **gateway page** between authentication and the full portal. It is a standalone page (not nested inside another frameset when served directly), yet may also be loaded into `frame[center]` depending on session state.

### Title

```
(empty string) — document.title = ""
```

The `<title>` tag is present but empty — the ABL procedure that generates this page does not set a title. This is a detectable signal for the extension.

---

## 2. Document Head — Assets & Metadata

### Meta Tags

None. This page has **no `<meta>` tags** in the `<head>` — no charset declaration, no cache-control headers (unlike `mainleftdin01.htm` and `maincenter.htm` which have full no-cache meta tags).

### External Scripts (in `<head>`)

| # | Type | URL | Purpose |
|---|---|---|---|
| 1 | External | `https://www.googletagmanager.com/gtag/js?id=G-DN81BCCZTF` | Google Analytics 4 |
| 2 | Inline | [inline, 139 chars] | GA4 config block (`gtag('js',...); gtag('config',...)`) |
| 3 | External | `https://deimos.dgi.uanl.mx/uanlimg/ws/jquery/jquery-ui-1.11.2.SiaseEscolar/external/jquery/jquery.js` | jQuery core |
| 4 | External | `https://deimos.dgi.uanl.mx/uanlimg/ws/jquery/jquery-ui-1.11.2.SiaseEscolar/jquery-ui.js` | jQuery UI 1.11.2 (SiaseEscolar build) |

### Inline Scripts (in `<body>`)

| # | Length | Content |
|---|---|---|
| 5 | 3,221 chars | Session variable initialization block (BLOCKED — contains session tokens) |
| 6 | 393 chars | `MensajeInicial()` function definition |
| 7 | 216 chars | `muestra()` / `oculta()` function references |
| 8 | 642 chars | Codice/Nexus button onclick handler setup |
| 9 | 4,377 chars | `$(document).ready(...)` — jQuery UI Dialog initialization for `#idMensajePrimerIngreso` and `#idMensajePass` |
| 10 | 1,734 chars | Additional inline session state script (BLOCKED) |

### Stylesheets

| # | Type | URL |
|---|---|---|
| 1 | External | `https://deimos.dgi.uanl.mx/uanlimg/ws//jquery/jquery-ui-1.11.2.SiaseEscolar/jquery-ui.css` |
| 2 | Inline `<style>` | Embedded in `<head>` — 13 CSS rules (see Section 3) |

### Favicon

```
/cgi-bin/wspd_cgi.sh/../../uanlimg/ws/favicon.ico?1484372620
→ resolves to: https://deimos.dgi.uanl.mx/uanlimg/ws/favicon.ico
```

The query string `?1484372620` is a Unix timestamp cache-buster (January 14, 2017 — never updated since).

---

## 3. Inline CSS Rules (Complete)

This is the **complete set of 13 CSS rules** defined in the inline `<style>` tag on `eselcarrera.htm`. These rules govern the tab-panel visibility system and the main content styling.

```css
/* Rule 0 — Career list table border */
.auto-style1 {
    border-style: solid;
    border-width: 3px;
    text-align: center;
}

/* Rules 1–5 — Tab panel visibility system */
/* All panels start hidden; #siase is the default visible one */

#correo {
    position: absolute;
    visibility: hidden;
    right: 100px;
    top: 180px;
}

#nexus {
    position: absolute;
    visibility: hidden;
    right: 100px;
    top: 180px;
}

#codice {
    position: absolute;
    visibility: hidden;
    text-align: justify;
    width: 550px;
    right: 100px;
    top: 180px;
}

#unibolsa {
    position: absolute;
    visibility: hidden;
    right: 100px;
    top: 180px;
}

/* #siase is the default VISIBLE panel */
#siase {
    position: absolute;
    visibility: visible;
    right: 100px;
    top: 180px;
    font-family: arial;
}

/* Rules 6–9 — Content styling classes */
.margen {
    padding: 20px;
    font-size: 12px;
    font-family: "Arial Unicode MS";
    color: #000000;
}

.barra {
    background-color: #094988;  /* UANL blue */
    display: block;
    color: #FFFFFF;
    padding: 4px;
}

.titulo {
    font-size: 16px;
    text-align: center;
    font-weight: bold;
}

.Estilo2 {
    color: #FFFFFF;
    font-family: "Arial Unicode MS";
}

/* Rules 10–12 — Overlay system */
#bloqueo {
    visibility: hidden;
    position: absolute;
    padding: 0px;
    inset: 0px;
    background-color: #444444;
    width: 100%;
    height: 800px;
    z-index: 1;
    opacity: 0.6;
}

#Mensaje {
    visibility: hidden;
    position: absolute;
    background-color: #FFFFCC;
    opacity: 0.8;
    padding: 5px;
    margin: 15px;
    border-style: solid;
    border-width: 2px;
    border-color: #CC9900;
    border-radius: 10px;
    left: 200px;
    top: 100px;
    width: 500px;
    height: 240px;
    z-index: 2;
    font-family: "Arial Unicode MS";
    font-size: 12px;
    font-style: normal;
    color: #0000BB;
    text-align: center;
    font-weight: bold;
}

#ExUn {
    visibility: hidden;
    position: absolute;
    background-color: #FFFFFF;
    opacity: 0.9;
    padding: 5px;
    margin: 15px;
    border-style: solid;
    border-width: 2px;
    border-color: #CC9900;
    border-radius: 10px;
    left: 50px;
    top: 10px;
    width: 735px;
    height: 530px;
    z-index: 3;
    font-family: "Arial Unicode MS";
    font-size: 12px;
    font-style: normal;
    color: #0000BB;
    text-align: center;
}
```

### Key Design Tokens Extracted

| Token | Value | Usage |
|---|---|---|
| UANL Blue | `#094988` | `.barra` background, accent color |
| Dark overlay | `#444444` at 60% opacity | `#bloqueo` — page dimming overlay |
| Warning yellow | `#FFFFCC` bg + `#CC9900` border | `#Mensaje` + `#ExUn` overlays |
| UANL link blue | `#0000BB` | Text color in overlay divs |
| Panel font | `"Arial Unicode MS"` | `.margen`, overlays |
| Body default | `Times` (browser default) | `<body>` has no explicit font-family |

---

## 4. Body Structure — Top-Level Layout

```
<body>
  [0]  TABLE                     ← Banner/header table (width=600, align=center)
  [1]  TABLE                     ← Main content table (width=800, align=center)
  [2]  DIV#bloqueo               ← Semi-transparent overlay (dimmer, z-index:1)
  [3]  DIV#Mensaje               ← Personal data reminder overlay (z-index:2)
  [4]  DIV#ExUn                  ← Extended message/ExUn overlay (z-index:3)
  [5..16] BR×12                  ← Spacer line breaks (legacy HTML spacing)
  [17] SCRIPT                    ← Inline script block
  [18] DIV.ui-dialog (×2)        ← jQuery UI dialog DOM nodes (injected by jQuery UI)
```

> **Extension note:** The `<body>` has no class, no bgcolor, no background attributes. The default browser white background applies. All layout is controlled by HTML4 table attributes.

---

## 5. Banner Table (TABLE[0])

This is the **page header**. A pure HTML4 table, no CSS class, no ID.

```
TABLE[0]  width=600 border=0 cellspacing=0 cellpadding=0 align=center
├── TR[0]
│   └── TD[width=360]
│       └── IMG src=.../ws/interfase/banner-siase.png  width=738 height=150
│           (UANL/SIASE banner image)
└── TR[1]
    └── TD[bgcolor=#094988]
        └── DIV.Estilo2 [align=center]
            "Sistema Integral para la Administración de los Servicios Educativos"
```

**Key observations:**
- The `<img>` has `width=738` but its parent `<td>` has `width=360` — the image overflows by 378px. This is a legacy HTML sizing bug that browsers silently handle by letting the image overflow.
- `bgcolor=#094988` is set as an HTML4 attribute (not CSS) — the UANL blue color applied directly on the `<td>`.
- `.Estilo2` class provides white text in `"Arial Unicode MS"` font — the same class used in the top frame (`maintop.htm`), confirming it is a **shared design system class** across frames.

---

## 6. Main Content Table (TABLE[1]) — The Tab-Panel System

This is the central layout table. It contains the icon navigation buttons (SIASE, Correo, Nexus, Codice) on the left and the corresponding content panels on the right using an **absolute-positioned visibility-toggle pattern** — not real tabs, but overlapping absolute divs shown/hidden on hover.

```
TABLE[1]  width=800 border=0 cellspacing=0 cellpadding=0 align=center
│
├── TR[main row]
│   ├── TD[width=251]  ← Left column: icon buttons
│   │   ├── BR
│   │   └── TABLE[inner]  border=0 cellspacing=0 cellpadding=6 align=right
│   │       ├── TR → TD → A[onmouseover="muestra('siase')"]
│   │       │              └── IMG src=.../logosiase.jpg  150×50
│   │       ├── TR → TD → A[onmouseover="muestra('correo')"]
│   │       │              └── IMG src=.../correo_btn.jpg  150×34
│   │       ├── TR → TD → A[onmouseover="muestra('nexus')"]
│   │       │              └── IMG src=.../nexus_btn.jpg   150×45
│   │       └── TR → TD → A[onmouseover="muestra('codice')"]
│   │                      └── IMG src=.../LogoCODICE.jpg 150×41
│   │
│   └── TD[width=544]  ← Right column: content panels (absolutely positioned)
│       ├── DIV#siase    ← Career selector (VISIBLE by default)
│       ├── DIV#correo   ← Email info panel (hidden)
│       ├── DIV#codice   ← CODICE library panel (hidden)
│       └── DIV#nexus    ← Nexus LMS panel (hidden)
│
└── (additional rows for section header tabs and content separators)
    ├── TD[class=auto-style1] ← "Si no aparece tu información..." message
    ├── Multiple IMG src=.../negro.jpg (black spacer images, 1px height separators)
    ├── Multiple IMG src=.../pestana2_correo.jpg, pestana2_codice.jpg, pestana2_nexus.jpg
    │   (width=538, height=28 — section header tab images for each panel)
    └── Multiple TD[bgcolor=#000000] (black line separators, width=1)
```

### Tab-Panel Visibility Mechanism

The panel system uses JavaScript `muestra()` / `oculta()` functions to toggle `visibility` between `visible` and `hidden`:

```javascript
// Conceptual reconstruction of muestra/oculta functions:
function muestra(panel) {
    // Hide all panels
    document.getElementById('siase').style.visibility = 'hidden';
    document.getElementById('correo').style.visibility = 'hidden';
    document.getElementById('codice').style.visibility = 'hidden';
    document.getElementById('nexus').style.visibility = 'hidden';
    // Show requested panel
    document.getElementById(panel).style.visibility = 'visible';
}

function oculta(panel) {
    document.getElementById(panel).style.visibility = 'hidden';
}
```

All four panels have `position: absolute` with identical `right: 100px; top: 180px` positioning — they stack on top of each other in the same location. Only one is visible at a time.

> **Extension note:** Because all panels are `position: absolute`, they do not affect document flow. Injecting new content into the page must account for this absolutely-positioned stacking context.

---

## 7. DIV#siase — Career Selection Panel

This is the **default visible panel** when the page loads.

```
DIV#siase  [position:absolute, visibility:visible, right:100px, top:180px, font-family:arial]
└── TABLE  width=540 border=0 cellspacing=0 cellpadding=0
    ├── TR[0]
    │   └── TD → IMG src=.../pestana2_siase.jpg  (section header image)
    │
    ├── TR[1]  (main content row)
    │   ├── TD[width=1, bgcolor=#000000]  (left border line)
    │   │
    │   ├── TD  (main content cell)
    │   │   └── DIV.margen
    │   │       ├── P.titulo  "Seleccione la Carrera"
    │   │       └── DIV#contenido
    │   │           └── FORM[name=SelCarrera]  (see Section 14)
    │   │               ├── P.barra  "Listado de Carreras"
    │   │               ├── A [javascript: set fields + submit]
    │   │               │   "ESCUELA PREPARATORIA NO. 6 - BACHILLERATO BILINGUE PROGRESIVO"
    │   │               ├── A [javascript: set fields + submit]
    │   │               │   "FACULTAD DE CIENCIAS FÍSICO MATEMÁTICAS - LICENCIADO EN CIENCIAS COMPUTACIONALES"
    │   │               ├── A [javascript: set fields + submit]
    │   │               │   "FACULTAD DE INGENIERÍA MECÁNICA Y ELÉCTRICA - INGENIERO EN TECNOLOGIA DE SOFTWARE"
    │   │               ├── DIV → INPUT[type=button, value="Salir", onclick="location='https://www.uanl.mx'"]
    │   │               └── TABLE.auto-style1
    │   │                   └── "Si no aparece tu información en el Listado de Carreras..."
    │   │
    │   └── TD[class=auto-style1]  (right cell — warning message)
    │       └── STRONG "Si no aparece tu información..."
    │
    └── (additional TR rows with IMG separators and section-header tab images)
```

### `.margen` Class Role

`.margen` is the **primary content container class** for all sub-panels on this page. It applies:
- `padding: 20px` — content inset
- `font-size: 12px` — standard body text size for content areas
- `font-family: "Arial Unicode MS"` — overrides the `<body>` default of `Times`
- `color: #000000` — explicit black text

> **Extension note:** `.margen` is the key injection target for adding content to any panel. Any injected UI elements inside `.margen` will inherit the correct font and color context.

### `.titulo` Role

`P.titulo` is the **section heading** inside each content panel. Appears as centered, bold, 16px text. Used consistently across sub-pages.

### `.barra` Role

`P.barra` is a **section sub-heading / list header** — a blue bar (`#094988`) with white text, 12px, 4px padding. Used to label lists and grouped content within panels. The name "barra" (Spanish for "bar") reflects its visual role.

---

## 8. DIV#correo — University Email Panel

```
DIV#correo  [position:absolute, visibility:hidden, right:100px, top:180px]
└── TABLE  (structural wrapper, same pattern as #siase)
    └── ... → DIV.margen
        ├── P → STRONG "Correo Electrónico Universitario"
        │      BR
        │      [description text about the email service]
        ├── BR
        ├── BR
        └── DIV
            ├── P  → A.style3  "alexis.reynasz@uanl.edu.mx"  (mailto link)
            └── A[href="https://login.microsoftonline.com/?whr=uanl.edu.mx", target="_blank"]
                └── IMG src=.../ingresar.jpg  (login button image)
```

### `A.style3` Class

Applied to the student's email address link. Computed styles:
- `color: rgb(0, 0, 238)` — browser default blue link color (no custom color defined in `style3`, it inherits)
- `font-size: 12px`
- `text-decoration: underline`

This is another auto-generated WebSpeed ABL class name. The `.style3` class itself applies no rules in the inline stylesheet — it's a bare class used as a hook.

### Email Pattern

The student's UANL email address is rendered **directly in the DOM as plain text** inside `A.style3`. It follows the pattern: `{firstname}.{lastname}@uanl.edu.mx`. This is accessible from the extension:

```javascript
// In frame-center.js, on eselcarrera.htm:
const emailEl = document.querySelector('#correo a.style3');
const studentEmail = emailEl ? emailEl.textContent.trim() : null;
// Returns: "alexis.reynasz@uanl.edu.mx"
```

---

## 9. DIV#codice — Library System Panel

```
DIV#codice  [position:absolute, visibility:hidden, text-align:justify, width:550px, right:100px, top:180px]
└── TABLE
    └── ... → DIV.margen
        ├── P → STRONG "Codice" + BR + [description text]
        ├── BR × 2
        ├── DIV
        │   └── FORM#idfrCodice
        │       ├── INPUT[type=button, name=btnCodice, value="Ingresar"]
        │       └── [action=eselcarrera.htm POST, target=""]
        ├── BR
        └── P  "* Excepto bibliotecas de administración central: ..."
```

### `FORM#idfrCodice`

| Attribute | Value |
|---|---|
| `id` | `idfrCodice` |
| `action` | `https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/eselcarrera.htm` (same page) |
| `method` | `post` |
| `target` | `""` (empty — same frame) |

The "Ingresar" button for CODICE submits **back to the same URL** (`eselcarrera.htm`). The server-side ABL procedure likely handles the button name `btnCodice` and redirects to the CODICE system. This is a **POST-to-self** pattern used for programmatic navigation.

---

## 10. DIV#nexus — Learning Platform Panel

```
DIV#nexus  [position:absolute, visibility:hidden, right:100px, top:180px]
└── TABLE
    └── ... → DIV.margen
        ├── P → STRONG "Nexus" + BR + [description text]
        ├── BR × 2
        ├── DIV
        │   └── FORM#idfrNexus
        │       ├── INPUT[type=button, name=btnNexus, value="Ingresar"]
        │       └── [action=eselcarrera.htm GET, target="_new"]
        └── P  "Carga Moderada"
```

### `FORM#idfrNexus`

| Attribute | Value |
|---|---|
| `id` | `idfrNexus` |
| `action` | `https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/eselcarrera.htm` |
| `method` | `get` |
| `target` | `_new` (opens in a new tab/window) |

Nexus uses `target="_new"` (equivalent to `target="_blank"` in modern browsers) — the LMS platform opens in a new tab. The server processes the `btnNexus` button name and redirects to the Nexus URL.

The `"Carga Moderada"` label is a server-rendered **server load indicator** — it could theoretically change to reflect actual server load, though in practice it appears static.

---

## 11. Overlay Divs: #bloqueo, #Mensaje, #ExUn

These three divs form a **layered overlay system** using z-index stacking. All are direct children of `<body>` (not inside any table or panel div).

### `#bloqueo` — Page Dimmer

```css
#bloqueo {
    visibility: hidden;       /* toggled by JS to block the page */
    position: absolute;
    inset: 0px;               /* covers entire page */
    background-color: #444444;
    width: 100%; height: 800px;
    z-index: 1;
    opacity: 0.6;
}
```

- A **dark semi-transparent overlay** that covers the entire page content
- Activated (made visible) programmatically to block interaction while a message is shown
- `height: 800px` hard-coded (not `100vh`) — may leave uncovered content if page is taller

### `#Mensaje` — Personal Data Reminder

```html
<div id="Mensaje">
  <h1>Se le recuerda que tiene que entrar a revisar sus datos personales,
      actualizarlos de ser necesario y validarlos.</h1>
</div>
```

```css
#Mensaje {
    visibility: hidden;
    position: absolute;
    background-color: #FFFFCC;   /* pale yellow */
    opacity: 0.8;
    border: 2px solid #CC9900;   /* gold border */
    border-radius: 10px;
    left: 200px; top: 100px;
    width: 500px; height: 240px;
    z-index: 2;
    color: #0000BB;              /* navy blue text */
    font-family: "Arial Unicode MS";
    font-size: 12px;
    font-weight: bold;
    text-align: center;
}
```

- A **yellow modal card** reminding students to update personal data
- Uses an `<h1>` inside for the message text (semantic mismatch — `<h1>` as body text inside a modal)
- `visibility: hidden` by default; shown via `DesMensajeMaestros()` (called via `INPUT[onclick="DesMensajeMaestros()"]` button)
- The "Aceptar" button (`INPUT[type=button, value="Aceptar", onclick="DesMensajeMaestros()"]`) **closes** this overlay

### `#ExUn` — Extended Message / Document Upload Overlay

```html
<div id="ExUn">
  <!-- Empty at capture time — server renders content when applicable -->
</div>
```

```css
#ExUn {
    visibility: hidden;
    position: absolute;
    background-color: #FFFFFF;
    opacity: 0.9;
    border: 2px solid #CC9900;
    border-radius: 10px;
    left: 50px; top: 10px;
    width: 735px; height: 530px;
    z-index: 3;                  /* highest z-index — top layer */
    color: #0000BB;
    font-family: "Arial Unicode MS";
    font-size: 12px;
    text-align: center;
}
```

- A **white large overlay** (735×530px) for extended messages (document upload notices, etc.)
- Has the highest `z-index: 3` in the stack — appears on top of everything including `#Mensaje`
- Was empty at capture time — its content is dynamically populated by the server-side ABL when applicable

---

## 12. jQuery UI Dialogs

Two jQuery UI dialogs are initialized on this page via `$(document).ready(...)`.

### Dialog 1 — `#idMensajePrimerIngreso`

```javascript
$("#idMensajePrimerIngreso").dialog({
    autoOpen: false,
    show: "fade",
    hide: "fade",
    width: 700,
    modal: true,
    buttons: {
        Aceptar: function() { $(this).dialog("close"); }
    }
});
// Controlled by server flag:
vlgPrimerIngreso = 'yes';  // 'no' = open the dialog; 'yes' = don't open
if (vlgPrimerIngreso == 'no') {
    $("#idMensajePrimerIngreso").dialog("open");
}
```

**Content** (verbatim):
```html
<div id="idMensajePrimerIngreso" class="ui-dialog-content ui-widget-content">
  <p align="center"></p>
  <h2>Aviso Importante</h2>
  <p>Alumnos de <strong>primer ingreso procedentes de instituciones ajenas a la UANL
     (nacionales y extranjeras)</strong>, se les informa que la entrega de documentos
     será de manera digital, consulte la fecha programada para la carga de documentos
     en su Instructivo de Inscripción.</p>
  <p>Dar clic para ver tutorial:
     <a href="https://youtu.be/vPk3YjfTx4I">https://youtu.be/vPk3YjfTx4I</a>
  </p>
  <p>ATENTAMENTE</p>
  <p>DEPARTAMENTO ESCOLAR Y DE ARCHIVO DE LA UANL</p>
  <p>División de Inscripciones y Credencialización</p>
</div>
```

**Server control variable:** `vlgPrimerIngreso` — when the server sets this to `'no'`, the dialog auto-opens. When `'yes'`, it stays closed. This is a **server-side flag** embedded in inline JavaScript.

### Dialog 2 — `#idMensajePass`

```javascript
$("#idMensajePass").dialog({
    autoOpen: false,
    show: "fade",
    hide: "fade",
    width: 700,
    modal: true,
    buttons: {
        Aceptar: function() { $(this).dialog("close"); }
    }
});
vlgMensajePass = 'yes';  // 'no' = open; 'yes' = closed
if (vlgMensajePass == 'no') {
    $("#idMensajePass").dialog("open");
}
```

**Content** (verbatim):
```html
<div id="idMensajePass" class="ui-dialog-content ui-widget-content">
  <h2>Problemas para integrar con Outlook y Teams</h2>
  <p>Su contraseña no cumple con los requisitos para Outlook y Teams, es necesario
     que la cambie a la brevedad para poder sincronizar su cuenta de correo
     institucional con las plataformas de Microsoft.</p>
  <p>Para realizar el cambio entre a la opción de cambio de contraseña en SIASE.</p>
  <p>Atte Dirección de Tecnologias de Información.</p>
</div>
```

**Server control variable:** `vlgMensajePass`

### Dialog Comparison: eselcarrera.htm vs maincenter.htm

| Property | `eselcarrera.htm` dialogs | `maincenter.htm` dialogs |
|---|---|---|
| Animation | `fade` / `fade` | `blind` / `blind` |
| Width | 700px | 600px |
| Modal | true | true |
| autoOpen | false (controlled by server flag) | commented out |
| Buttons | Single "Aceptar" button | Buttons commented out |
| closeOnEscape | not set (default true) | `false` |
| Purpose | Announcements & password alerts | Survey/form instructions |

---

## 13. JavaScript Behaviors

### `MensajeInicial()` Function

Defined in an inline script block. Triggered on page load (called from `<body onload="...">` or equivalent). Checks if the student's password meets complexity requirements and shows an alert:

```javascript
function MensajeInicial() {
    if ('' == "") {
        // The condition checks a server-rendered value against empty string.
        // When the server inserts a non-empty string (the flag value),
        // the alert fires informing the user their password is insecure.
        alert('Estimado Usuario: Su contraseña no cumple con los requisitos mínimos...');
    }
}
```

The `''` on the left side is a **server-rendered slot** — the ABL procedure inserts a value there. When the server inserts a non-empty string (e.g., `'required'`), the condition evaluates to false and the alert fires. When empty, no alert.

### `muestra(panel)` / `oculta(panel)` Functions

Control the tab-panel visibility system:

```javascript
// muestra — called on onmouseover of each icon button
function muestra(panelName) {
    // Hides all panels, shows the named one
    // Panels: 'siase', 'correo', 'nexus', 'codice'
}

// oculta — likely called on onmouseout
function oculta(panelName) {
    // Hides the named panel
}
```

The icons use `href="#"` (prevents navigation) with `onmouseover="muestra('...')"` to trigger panel switching. This is a pure hover-based tab system — **not click-based**.

### `DesMensajeMaestros()` Function

Controls the `#bloqueo` / `#Mensaje` overlay system:

```javascript
// Conceptual reconstruction:
function DesMensajeMaestros() {
    var bloqueo = document.getElementById('bloqueo');
    var mensaje = document.getElementById('Mensaje');
    if (bloqueo.style.visibility === 'visible') {
        // Close: hide overlay and message
        bloqueo.style.visibility = 'hidden';
        mensaje.style.visibility = 'hidden';
    } else {
        // Open: show overlay and message
        bloqueo.style.visibility = 'visible';
        mensaje.style.visibility = 'visible';
    }
}
```

The "Aceptar" button on the personal data reminder calls this function to dismiss the overlay. The same function both shows and hides the overlay (toggle pattern).

### Server-Controlled JS Flags Pattern

This page establishes a clear pattern used across SIASE sub-pages: **server-side ABL procedures embed control flags directly into inline JavaScript variable assignments**:

```javascript
// Pattern: var flagName = '[SERVER_VALUE]';
vlgPrimerIngreso = 'yes';   // 'yes' = don't show, 'no' = show
vlgMensajePass   = 'yes';   // 'yes' = don't show, 'no' = show
// MensajeInicial uses an anonymous value slot: if('[SERVER_VALUE]' == "")
```

> **Extension note:** Reading these variable values after `DOMContentLoaded` allows the extension to detect which modals the server intended to show, without waiting for them to appear visually.

```javascript
// In frame-center.js, on eselcarrera.htm:
if (typeof vlgPrimerIngreso !== 'undefined' && vlgPrimerIngreso === 'no') {
    // Student is a first-time entrant with pending document upload
}
if (typeof vlgMensajePass !== 'undefined' && vlgMensajePass === 'no') {
    // Student has a password compliance issue
}
```

---

## 14. Form Mechanics — SelCarrera Form

### Form Attributes

| Attribute | Value |
|---|---|
| `name` | `SelCarrera` |
| `action` | `https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/default.htm` |
| `method` | `post` |
| `target` | `_self` (replaces current frame/window) |

### Hidden Input Fields

These inputs are set via the JavaScript `href` on each career link **before** form submission:

| Field Name | Purpose | Example Value |
|---|---|---|
| `HTMLCve_Dependencia` | Faculty/school code | `02316` (FIME) |
| `HTMLCve_Unidad` | Unit code | `01` |
| `HTMLCve_Nivel_Academico` | Academic level code | `02` (university) |
| `HTMLCve_Grado_Academico` | Degree level code | `03` (bachelor's) |
| `HTMLCve_Modalidad` | Modality code | `1` (presencial) |
| `HTMLCve_Plan_Estudio` | Study plan code | `401` |
| `HTMLCve_Carrera` | Career/program code | `10` |
| `HTMLTipCve` | Type code | `01` |
| `HTMLUsuCve` | Student matricula | `1851265` |
| `HTMLCve_Tipo_Inscripcion` | Enrollment type | (set by server) |
| `HTMLProg` | Program code | (set by server) |
| `HTMLRI` | RI code | (set by server) |
| `HTMLUsuario` | Alternate user field | (set by server) |
| `HTMLtrim` | Trimester code | `39265