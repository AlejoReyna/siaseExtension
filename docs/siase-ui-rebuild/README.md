# SIASE UI rebuild — live structure index

Audit dates: 2026-07-15 and 2026-07-16. Source application: the authenticated SIASE frameset at `default.htm`; endpoint notes record whether the current UI v2 was active.

## Evidence labels

- **Confirmed from live DOM** — observed in the authenticated page, an authenticated page response, or visible frame state during this audit. Values that identify the student or session were discarded.
- **Confirmed from repository code** — read from `/Users/alexis/Documents/siaseExtension` without changing extension source.
- **Still needs verification** — present in live navigation but its complete rendered DOM could not be safely captured, or a result differed outside the native frame flow.

No password, cookie, token, hidden-input value, or query-string value is recorded in this folder. Endpoints intentionally omit query strings.

## Complete application map

| Area                                     | Native frame / target                     | Live endpoint                                  | Evidence                                                                                                           | Detail                                                           |
| ---------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Root shell                               | top-level frameset                        | `/cgi-bin/wspd_cgi.sh/default.htm`             | Confirmed from live DOM                                                                                            | [01-legacy-frames.md](01-legacy-frames.md)                       |
| Header                                   | `top`                                     | `/cgi-bin/wspd_cgi.sh/maintop.htm`             | Confirmed from live DOM                                                                                            | [02-shared-shell.md](02-shared-shell.md)                         |
| Module menu                              | `left`                                    | `/cgi-bin/wspd_cgi.sh/mainleftdin01.htm`       | Confirmed from live DOM                                                                                            | [02-shared-shell.md](02-shared-shell.md)                         |
| Main notices                             | `center`                                  | `/cgi-bin/wspd_cgi.sh/maincenter.htm`          | Confirmed from live DOM                                                                                            | [03-main-center.md](03-main-center.md)                           |
| Career selector                          | `center` or top level                     | `/cgi-bin/wspd_cgi.sh/eselcarrera.htm`         | Expiry response confirmed live; authenticated form still needs verification; conservative delegated enhancer added | [04-career-selector.md](04-career-selector.md)                   |
| Student status                           | `center`                                  | `/cgi-bin/wspd_cgi.sh/ecSitEst01.htm`          | Confirmed from live DOM                                                                                            | [05-student-status.md](05-student-status.md)                     |
| Academic credits                         | `center`                                  | `/cgi-bin/wspd_cgi.sh/esCreditoMaterias01.htm` | Confirmed from live DOM                                                                                            | [06-academic-credits.md](06-academic-credits.md)                 |
| Kardex                                   | `center`                                  | `/cgi-bin/wspd_cgi.sh/econkdx01.htm`           | Confirmed from live DOM                                                                                            | [07-kardex.md](07-kardex.md)                                     |
| Schedule                                 | `center`                                  | `/cgi-bin/wspd_cgi.sh/echalm01.htm`            | Live route confirmed; current response unavailable                                                                 | [08-schedule-and-grades.md](08-schedule-and-grades.md)           |
| Grades                                   | `center`                                  | `/cgi-bin/wspd_cgi.sh/econcfs01.htm`           | Live route confirmed; current response unavailable                                                                 | [08-schedule-and-grades.md](08-schedule-and-grades.md)           |
| Personal data                            | `center`                                  | `/cgi-bin/wspd_cgi.sh/edatal01.htm`            | Confirmed from live DOM                                                                                            | [09-personal-data.md](09-personal-data.md)                       |
| Enrollment date                          | `center`                                  | `/cgi-bin/wspd_cgi.sh/ecohoinsint01.htm`       | Confirmed from live DOM                                                                                            | [10-enrollment-date.md](10-enrollment-date.md)                   |
| Escolar services                         | mostly `center`; three `_new`, two `_top` | multiple                                       | Live links confirmed; Carga de Documentos audited and enhanced; other page-level confidence varies                 | [11-escolar-services.md](11-escolar-services.md)                 |
| Tesorería                                | `left` then `center`                      | multiple                                       | Confirmed from live DOM                                                                                            | [12-other-modules.md](12-other-modules.md)                       |
| DGPPE                                    | `left` then `center`                      | multiple                                       | Confirmed from live DOM                                                                                            | [12-other-modules.md](12-other-modules.md)                       |
| AFI                                      | `left` then `center`                      | multiple                                       | Confirmed from live DOM                                                                                            | [12-other-modules.md](12-other-modules.md)                       |
| English UANL                             | `left` then `center`                      | multiple                                       | Confirmed from live DOM                                                                                            | [12-other-modules.md](12-other-modules.md)                       |
| EXCI / password / security key / privacy | `center`                                  | multiple                                       | Routes confirmed from live DOM; forms not submitted                                                                | [13-account-and-header-pages.md](13-account-and-header-pages.md) |
| Session lifecycle                        | all frames                                | WebSpeed session bundle                        | Confirmed live and from repository code                                                                            | [14-session-and-relogin.md](14-session-and-relogin.md)           |
| Old extension effects                    | all frames                                | extension content scripts                      | Confirmed from repository code                                                                                     | [15-extension-comparison.md](15-extension-comparison.md)         |
| Rebuild boundaries/order                 | extension                                 | n/a                                            | Recommendation                                                                                                     | [16-rebuild-boundaries.md](16-rebuild-boundaries.md)             |
| UI inspiration and visual direction      | extension                                 | n/a                                            | Current product/case-study research                                                                                | [17-ui-inspiration.md](17-ui-inspiration.md)                     |

## Confirmed shared selectors

| Selector / contract                                                                | Purpose                                   | Confidence                                                                 |
| ---------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `frame[name="top"]`                                                                | Header and module switcher                | Confirmed from live DOM                                                    |
| `frame[name="left"]`                                                               | Current module navigation                 | Confirmed from live DOM                                                    |
| `frame[name="center"]`                                                             | Page destination for most services        | Confirmed from live DOM                                                    |
| `table.MenuLink`                                                                   | Header table and left footer/legend table | Confirmed from live DOM; not unique across frames                          |
| `ul.menu.collapsible`                                                              | Escolar menu container                    | Confirmed from live DOM                                                    |
| `ul.menu.collapsible li a[target="center"]`                                        | Center-target menu links                  | Confirmed live and from repository code                                    |
| `input[name="HTMLUsuario"]`, `input[name="HTMLpassword"]`, `input[name="custNum"]` | Hidden session/login fields in `left`     | Confirmed from live DOM; values must never be read into persistent storage |
| `#container`, `#header`, `#slider`, `#prevBtn`, `#nextBtn`                         | Main-center notice carousel               | Confirmed from live DOM                                                    |
| `iframe#aviso[name="aviso"]`                                                       | Main-center notice detail frame           | Confirmed from live DOM                                                    |
| `#idMensaje`, `.ui-dialog`, `.ui-widget-overlay`                                   | Common message/dialog pattern             | Confirmed from live DOM                                                    |

## Native navigation flow

```text
default.htm
├── top: maintop.htm
│   ├── Escolar/Tesoreria/DGPPE/AFI/English UANL → reload left
│   ├── EXCI/Contraseña/Clave/Aviso → load center
│   └── Salir → load left, beginning logout flow
├── left: mainleftdin01.htm
│   ├── target="center" → replace center document
│   ├── target="_new" → separate window/tab
│   └── target="_top" → replace the complete frameset
└── center: maincenter.htm → service/result/form pages
```

**Confirmed from live DOM:** the same visible endpoint path can carry a different private WebSpeed query bundle. Preserve the complete native `href` object in memory when delegating navigation; never reconstruct it from the path listed in these docs.

## Shared components and rebuild boundary

Keep native navigation, form actions, targets, hidden fields, dialogs, and frame names as the source of truth. Safe first-generation replacements are visual wrappers, read-only summaries, and accessible controls that call the original element. Do not copy session parameters into extension storage, do not submit a cloned form, and do not use a blanket selector that hides native siblings.

## Safe implementation order

1. Remove/feature-gate the old frame geometry and global hiding rules.
2. Add a session-state observer that detects expiry but stores no session values.
3. Add read-only parsers with anonymized fixtures for status, credits, Kardex, schedule, and grades.
4. Enhance the native left menu additively while retaining its original anchors and targets.
5. Add page-scoped presentation one endpoint at a time.
6. Keep the conservative career enhancer feature-detected; complete its audit when the native login flow presents the live form.
7. Add optional Nexus/news integrations last and isolate them from SIASE navigation.
