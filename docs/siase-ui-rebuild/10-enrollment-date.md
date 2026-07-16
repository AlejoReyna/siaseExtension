# Enrollment date

**Confirmed from live DOM:** endpoint `/cgi-bin/wspd_cgi.sh/ecohoinsint01.htm`, title `SIASE - Consulta Fecha Inscripcion`, frame `center`.

The DOM is a top-level `center` containing `h2`, `h3`, and one 500px-wide table with classed title cells. It exposes two values: `Dia de Inscripcion` and `Hora de Inscripcion`. No form was present.

**Data available for parsing:** a localized date string and time string. Parse labels and values separately and retain the original text as a fallback. **Must preserve:** timezone/local display and any unavailable state. **Safe to replace:** presentation, provided native values remain visible or recoverable. **Fragile:** fixed Spanish month abbreviations and relying on a specific table row position.

**Confirmed from repository code:** the current enhancer adds a class only, so no parser test exists.

