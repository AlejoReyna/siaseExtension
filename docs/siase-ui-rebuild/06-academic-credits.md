# Academic credits

**Confirmed from live DOM:** endpoint `/cgi-bin/wspd_cgi.sh/esCreditoMaterias01.htm`, title `Consulta de Creditos`, frame `center`.

## Structure

- `div#ResCred` and `div#Contenedor` wrap the page.
- `div#accordion.ui-accordion` contains eight semester/area panels.
- Generated panel ids alternate `ui-id-1` through `ui-id-16` between `h3` headers and content `div`s.
- Eight data tables were present. Each has four columns; the repeated headers are `Semestre`, `Materia`, `Creditos`, and `Situación`.

The audited tables had varying row counts and include optional-course rows. Course names, completion state, credits, and grouping are available for parsing. Do not use generated `ui-id-*` values as durable selectors; scope by `#accordion` and table/header text.

**Must preserve:** accordion grouping, all course rows, optional-course variants, and the exact situation semantics. **Safe to enhance:** totals, filters, and progress visuals derived read-only. **Fragile:** generated jQuery ids and assuming every semester table has the same row count.

## UI v2 implementation

`service-page.ts` applies `siase-v2-service-page` and dispatches to `academic-credits-page.ts`. The enhancer uses `#accordion`, its direct `h3`/panel children, table first-row labels, and visible credit-summary text. It does not query `ui-id-*`, replace headings, attach accordion behavior, or alter rows. When visible text contains an approved/required total, it adds a separate ARIA read-only progress bar; otherwise no derived total is invented.

The stylesheet turns accordion headings and panels into cards while leaving jQuery UI's classes and handlers intact. The anonymized fixture includes two differently sized groups and generated ids only to prove the enhancer does not depend on them.
