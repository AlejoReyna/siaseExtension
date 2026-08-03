# Schedule and grades

## Schedule

- The visible `Académico → Horario` link loads into the `center` frame while the top-level URL remains `default.htm`. The frame title is `SIASE - Horario`; the top tab title is `SIASE - Default`.
- The query form posts to `control.p`, not directly to an `echalm02.htm` address-bar URL. Its native `inicio()` handler sets `HTMLTrund = "echalm02"` and submits the form. The populated audit result was `Agosto-Diciembre 2026`.
- The live query form is `form[name="mi_forma"]` with `method="POST"`, a session-bearing `control.p` action, hidden `HTMLTrund`/`HTMLResill` inputs, and `select[name="HTMLPeriodo"]`. The newest valid option is the first option whose value is not `0`.
- At the audit time, the newest option was `0x00000000003b9471` (`Semestral Agosto-Diciembre 2026`); older options included Enero-Junio 2026 and previous semesters. Values are session/account data and must not be hard-coded.
- The populated result contains seven unclassified tables. The first is the schedule grid (9 rows × 7 columns), the second is the course catalog (10 rows × 13 columns), followed by totals and nomenclature tables. No stable table IDs or classes are available.
- The schedule grid header order is `[time], Lunes, Martes, Miercoles, Jueves, Viernes, Sabado`. Time cells use lowercase 12-hour Spanish notation such as `7:30 pm a` followed by a `<br>` and `8:20 pm`. Empty cells may contain `&nbsp;`.
- A populated course cell has three `<br>`-delimited lines: `phase / enrollment type`, subject abbreviation, and `group / classroom`. Slashes do not separate courses. The catalog maps `Abreviación de Materia` to `Materia` and contains the numeric course code.
- No teacher or literal campus field was present. The parser keeps the time-derived `slotCode` (`M1`–`N6`) and additionally captures phase, enrollment type, group, classroom, and catalog course code when available.
- The populated native actions are `regresar()` (sets `HTMLTrund = "echalm01"`) and `imprimir()` (temporarily hides the action panel and toggles the native shadow before printing). The extension keeps the form contract but supplies its own period control.
- **Confirmed from repository code:** schedule results are stored in `chrome.storage.local` under `scheduleSlots`. The schedule page now captures the period options in session storage, auto-submits the newest period, and renders the period selector above the populated schedule instead of exposing the period-only screen.
- The sanitized live fixture is kept at `src/tests/fixtures/schedule.html`; the full browser capture referenced in the audit is available outside the repository at `/Users/alexis/Documents/Codex/2026-08-03/you-are-operating-in-an-authenticated/outputs/siase-horario-sanitized-fixture.html`.

### Live parser rules

- Locate the grid semantically by its weekday headers, not by table position or ID.
- Preserve `<br>` boundaries before parsing course-cell fields and time ranges.
- Use the catalog header names to discover the `Materia`, `Abreviación de Materia`, and `Clave Materia` columns; do not hard-code column indexes.
- Do not assume contiguous time slots; the live grid contains gaps and duplicate courses across days.
- Preserve leading zeroes in group and classroom values.

## Grades

- Endpoint `/cgi-bin/wspd_cgi.sh/econcfs01.htm`; target `center` — **confirmed from live DOM navigation**.
- The current isolated audit response was the same jQuery UI `SIASE - Mensaje` pattern with `Opción no disponible.` — **confirmed from live DOM**; the populated grade table is **still needs verification**.
- **Confirmed from repository code:** `parseGrades()` scans all rows, treats the first 1–3 digit cell as a score, and the first four-letter cell as the subject. It may parse headers and unrelated tables.

## Existing side effects

**Confirmed from repository code:** schedule and grade results are written to `chrome.storage.local`; grades are also sent to the background for notifications. Schedule now has an anonymized live-structure fixture and a header-aware parser. Presentation remains additive and does not suppress native messages or the native form contract.

## UI v2 implementation

The schedule query state no longer remains visible: it remembers the available period options, selects the newest valid period, sets `HTMLTrund` to `echalm02`, and submits through the native POST form. The populated schedule view places a compact period selector at the top-left, preserves the native form/action/session parameters, and submits a new period through the same contract. Its grid, catalog, and reference tables receive scoped presentation styling while their DOM remains the source of truth.
