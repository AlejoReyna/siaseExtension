# Student status

**Confirmed from live DOM:** endpoint `/cgi-bin/wspd_cgi.sh/ecSitEst01.htm`, title `SIASE - Situacion Estudiante UANL`, normally loaded in `center`.

## DOM and selectors

- Top-level `center` containing several informational `div` blocks and a two-row, three-column table.
- `div#idCredencial.Credencial` contains the temporary virtual credential presentation.
- `div#qrcode.CodQR` is populated by client-side code.
- A visible `input[name="Imprimir"][type="button"]` invokes printing.

The page exposes semester, student status, enrollment type, photo-acceptance state, and credential/QR content. Actual identity and credential values must never be cached or included in fixtures.

**Must preserve:** print behavior, status/enrollment labels, credential rendering, QR behavior, and photo-acceptance state. **Safe to enhance:** an adjacent read-only status summary with values read at render time. **Fragile:** free-text labels and assuming the QR node already contains its final child markup.

**Confirmed from repository code:** the route only adds `siase-plus-student-status-page`; the dashboard separately attempts to infer credits/status from broad text. That inference must not treat this credential page as a durable API.

