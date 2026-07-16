# Schedule and grades

## Schedule

- Endpoint `/cgi-bin/wspd_cgi.sh/echalm01.htm`; target `center` — **confirmed from live DOM navigation**.
- The current isolated audit response was `SIASE - Mensaje` with `#idMensaje` and `Opción no disponible.` — **confirmed from live DOM**, but the full in-frame table is **still needs verification** for the active period.
- **Confirmed from repository code:** `parseSchedule()` scans every `tr`, finds an `M1–M6` or `V1–V8` token, chooses the first alphabetic cell as subject, and infers weekday from `rowIndex % 6`. This is fragile and can misassign headers/rows.

## Grades

- Endpoint `/cgi-bin/wspd_cgi.sh/econcfs01.htm`; target `center` — **confirmed from live DOM navigation**.
- The current isolated audit response was the same jQuery UI `SIASE - Mensaje` pattern with `Opción no disponible.` — **confirmed from live DOM**; the populated grade table is **still needs verification**.
- **Confirmed from repository code:** `parseGrades()` scans all rows, treats the first 1–3 digit cell as a score, and the first four-letter cell as the subject. It may parse headers and unrelated tables.

## Existing side effects

**Confirmed from repository code:** schedule and grade results are written to `chrome.storage.local`; grades are also sent to the background for notifications. These pages must first gain anonymized fixtures and header-aware parsers. Presentation should be additive and must not suppress the native unavailable/message dialog.

## UI v2 implementation

The query-state UI now uses only the audited `form[name="mi_forma"]`, `select[name="HTMLPeriodo"]`, and `input[type="button"][value="Aceptar"]` contracts. It adds a presentation header, scoped form styling, accessible labels, and neutral styling for native tables already rendered by SIASE. It does not select a period, click `Aceptar`, submit the POST form, reorder result cells, or suppress messages.
