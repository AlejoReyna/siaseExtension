# Kardex

**Confirmed from live DOM:** endpoint `/cgi-bin/wspd_cgi.sh/econkdx01.htm`, title `SIASE - Kardex`, frame `center`.

## Native contract

- `form[name="mi_forma"][method="POST"]` posts to `/cgi-bin/wspd_cgi.sh/control.p`.
- Hidden inputs: `HTMLTrund` and `HTMLResill`; values are session/form state and were discarded.
- `div#kdx` contains the complete record.
- `div#noof` is an inner status/header region.
- `div#btnImp` contains `input[type="button"][value="Imprimir"][onclick="imprimir()"]`.
- The main result table had 61 rows and up to 11 cells. Additional summary/layout tables follow it.

**Data available for parsing:** plan semester, modality, subject key/name, six opportunity columns, laboratory marker/score, accumulated-credit text, and optional average text. The page uses `td` cells rather than reliable `th` markup.

**Must preserve:** the POST form and hidden fields, all opportunity columns, lab semantics, totals, average if present, and native print behavior. **Safe to enhance:** a read-only summary and accessible table headings. **Fragile:** selecting the largest table as a fallback, hard-coded cell indexes without a fixture, or replaying a previously captured URL outside the center frame.

**Confirmed from repository code:** `parseKardexSummary()` hard-codes columns 0, 2, 3, 4–9, and 10 and falls back to the table with most rows. It logs course names, scores, totals, and averages to the console and stores a detailed snapshot. Those logs and storage fields require a privacy review.

## UI v2 implementation

The current page enhancer is additive and only activates when all of these are present: `body`, `#kdx`, and a table with a `Sem.`/`Materia` header row. It keeps the native POST form, hidden fields, record rows, opportunity cells, laboratory column, and `imprimir()` control intact.

It adds a read-only progress summary from the existing parser, a responsive horizontal table shell, v2 table/score classes, and print-control styling. The summary is derived from the currently rendered record only; it never fetches or reconstructs a session URL. The live page still requires a visual check after reloading the extension, especially for the exact legacy header row and any print-specific stylesheet behavior.
