# Tesorería, DGPPE, AFI, and English UANL

The top links reload `left` using the same path (`mainleftdin01.htm`) with a different private query context. Reconstructing the path alone cannot select a module.

## Tesorería

**Confirmed from live DOM:** `Solicitud de Crédito` (`tcSolCredReq01.htm`), `Solicitud de Facturas` (`gensolfac01.htm`), `Sol. Cancelación Factura` (`gensolcanfac01.htm`), `Solicitud de Factura Dependencia` (`gensolfacdep01.htm`), `Solicitud Devolución Depend.` (`tdev_sol_01.htm`), and `Comercio Electronico TC` (`tc_eComerSrv.htm`). All are financial/stateful flows; only their landing links were inspected.

## DGPPE

**Confirmed from live DOM:** one `Encuestas` link to `plenc01a_2.htm`. No survey was submitted.

## AFI

**Confirmed from live DOM:** `Portada` (`delportada01.htm`), `Calendario de Eventos` (`delSavePrereg.htm`), and `Historial` (`delConsRegEven.htm`). The `delSavePrereg` name suggests a potentially stateful endpoint; do not replay it directly until its method/behavior is verified in-frame.

## English UANL

**Confirmed from live DOM:** `Consulta de Kardex` (`sac_kardex_01.htm`), `Consulta de Calificaciones` (`sac_calif_01.htm`), `Consulta de Horario` (`sac_horario_01.htm`), `Sol. de Convalidacion` (`sac_conv_01.htm`), `EXCI - Examen Intermedio` (`sacregexciInt01.htm`), and `EXCI - Examen Final` (`sacregexciFin01.htm`).

## Rebuild rules

Preserve top-link delegation and reload the native left menu. Do not merge these menus by synthesizing URLs. A replacement sidebar must retain module identity, original target, ordering, and unavailable/permission states.

