# Personal data

**Confirmed from live DOM:** endpoint `/cgi-bin/wspd_cgi.sh/edatal01.htm`, title `SIASE - Datos Personales`, frame `center`.

## Native contract

- `form[name="mi_forma"][method="POST"]`.
- One hidden field named `HTMLResill`; value discarded.
- One `Imprimir` and five `Modificar` buttons, all `input.Boton01[type="button"]`.
- Edit destinations are invoked through `onclick="modificar('...')"` for `edatal02.htm`, `edatal04.htm`, `edatal05.htm`, `edatal06.htm`, `edatal07.htm`, and printing/detail via `edatal08.htm`.
- Main information table: 52 rows, up to four cells, followed by repeated one-row section tables using `bgcolor="#4A5194"`.

The page exposes highly sensitive personal, family, contact, health/IMSS, emergency, schedule, and address fields. A rebuild must not persist the body text or include real values in fixtures.

**Must preserve:** each original `Modificar` action, hidden form state, print action, section ordering, and field completeness. **Safe to enhance:** accessible section headings and a privacy warning. **Fragile:** inline destination strings, table position, and global body-text parsing.

**Confirmed from repository code:** `enhancePersonalDataPage()` returns the entire body text as `name`. This is incorrect and privacy-sensitive; remove that parser before enabling any UI here.

