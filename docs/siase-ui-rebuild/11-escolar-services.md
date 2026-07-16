# Escolar service inventory

All rows below are **confirmed from live DOM navigation**. Endpoints omit private query strings. Unless noted, the target is `center`.

| Page                                                      | Endpoint                                                | Target | Page-level status                                                               |
| --------------------------------------------------------- | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Subir Foto del Alumno                                     | `/cgi-bin/fotos.sh/iaFoto01.htm` → `/cgi-bin/fotos.sh/` | center | Confirmed live: upload form described below                                     |
| Carga Documentos Pendientes                               | `/cgi-bin/deya.sh/ecCargaDocto01.htm`                   | center | Confirmed live on 2026-07-16; UI v2 implemented additively                      |
| Inscripcion                                               | `/cgi-bin/wspd_cgi.sh/eins01.htm`                       | center | Still needs verification; do not submit                                         |
| Solicitud de Beca                                         | `bcreq01V2.htm`                                         | `_new` | DOM-present/visually hidden subtree; still needs verification                   |
| Carga/seguimiento de beca                                 | `/cgi-bin/fotos.sh/bcerCargaDocto05.htm`                | `_new` | DOM-present/visually hidden subtree; still needs verification                   |
| Resultado de Beca                                         | `bccosobe01.htm`                                        | center | DOM-present/visually hidden subtree; still needs verification                   |
| Recibo Interno de Servicios Académicos y Escolares        | `/cgi-bin/wspd_cgi.sh/ecavpag01.htm`                    | center | Still needs verification; financial form not submitted                          |
| Consulta de Evaluacion                                    | `/cgi-bin/wspd_cgi.sh/econeva01.htm`                    | center | Still needs verification                                                        |
| Recibo de Servicios Académicos y Escolares                | `/cgi-bin/wspd_cgi.sh/ecBolRec-v02.htm`                 | center | Still needs verification; financial form not submitted                          |
| Encuestas                                                 | `/cgi-bin/wspd_cgi.sh/eenc01.htm`                       | center | Still needs verification; survey not submitted                                  |
| Encuesta de Verano                                        | `/cgi-bin/wspd_cgi.sh/eenve01.htm`                      | center | Still needs verification; survey not submitted                                  |
| Formato Inscripción Rectoría                              | `/cgi-bin/wspd_cgi.sh/ecinstreg01.htm`                  | center | Live navigation produced an `Advertencia` page/dialog; still needs verification |
| Intersemestral Recibo de Servicios Académicos y Escolares | `/cgi-bin/wspd_cgi.sh/ecBolRec-v03.htm`                 | center | Still needs verification                                                        |
| Trámites DEyA                                             | `/cgi-bin/wspd_cgi.sh/eccontram03.htm`                  | center | Still needs verification                                                        |
| Inscripción 1er. Ingreso Super                            | `/cgi-bin/wspd_cgi.sh/einssupaq01.htm`                  | center | Still needs verification; do not submit                                         |
| Genera Recibo de Cursos de Asesorías                      | `/cgi-bin/wspd_cgi.sh/Egenbolsabatino.htm`              | center | Still needs verification; financial form not submitted                          |
| Reservación Gimnasio                                      | `/cgi-bin/wspd_cgi.sh/CdGymins01.htm`                   | center | Route confirmed; do not reserve/submit                                          |
| Boleta Pago EXENS                                         | `/cgi-bin/wspd_cgi.sh/ceregexens01.htm`                 | center | Still needs verification; financial form not submitted                          |
| Inscripción PROVERICYT                                    | `/cgi-bin/wspd_cgi.sh/EscInv_01.htm`                    | center | Still needs verification; do not submit                                         |
| Intersemestral Recibo Interno                             | `/cgi-bin/wspd_cgi.sh/EgenbolveranoV2.htm`              | center | Still needs verification; financial form not submitted                          |
| Consulta Toma de Foto                                     | `/cgi-bin/wspd_cgi.sh/ecotofo01.htm`                    | center | Still needs verification                                                        |
| Programa Futbol Americano                                 | `/cgi-bin/wspd_cgi.sh/pfacue01.htm`                     | center | Still needs verification                                                        |
| Comercio Electronico                                      | `/cgi-bin/wspd_cgi.sh/eComerSrv_vr.htm`                 | center | Still needs verification; no purchase initiated                                 |
| Cuestionario Huella CO2                                   | `/cgi-bin/wspd_cgi.sh/DisCO2_00.htm`                    | center | Still needs verification; questionnaire not submitted                           |
| Registro IMSS                                             | `/cgi-bin/wspd_cgi.sh/ecSoImssV3_01.htm`                | center | Still needs verification; no registration submitted                             |
| Pre-Inscripcion                                           | `/cgi-bin/wspd_cgi.sh/epreins01.htm`                    | center | Still needs verification; do not submit                                         |
| Encuesta - CEV                                            | `/cgi-bin/wspd_cgi.sh/cemaenc01.htm`                    | center | Still needs verification; survey not submitted                                  |
| Solicitud de Baja Voluntaria                              | `/cgi-bin/wspd_cgi.sh/ecSolBajaVol00.htm`               | center | Route only; destructive flow not advanced                                       |
| Tramite Titulación Dependencia                            | `/cgi-bin/wspd_cgi.sh/tavpatit01.htm`                   | center | Still needs verification; no request submitted                                  |
| Registro Servicio Social                                  | `/cgi-bin/bt.sh/essc_rgal_00.htm`                       | center | Still needs verification; no registration submitted                             |
| Prácticas Profesionales                                   | `/cgi-bin/bt.sh/vr_dsp_inicio_01.htm`                   | `_top` | Route confirmed; native shell replacement behavior needs verification           |
| Voluntariado                                              | `/cgi-bin/bt.sh/ssc_default.htm`                        | `_top` | Route confirmed; native shell replacement behavior needs verification           |

## Photo upload page

**Confirmed from live DOM:** after its server redirect, title `ExpUnicoV2_Convt.htm`. `form[name="mi_forma"][method="post"]` contains hidden fields `HTML_RI`, `HTML_vUsuCve`, `HTML_vTipCve`, and `HTML_pcTpUsuario`; `input#HTMLArchivo[name="HTMLArchivo"][type="file"]`; and `input#btnArchivo[name="btnArchivo"][type="button"]` labeled `Adjuntar Fotografia`. Stable containers include `#dvContenedor`, `#dvTitulo`, `#ContDatPer`, `#dvImg`, `#idLineaArchivo`, `#idadjunta`, and `#dvRespuesta`.

Preserve the original upload form, file input, validation, response container, and hidden fields. Never clone or log hidden values. The upload button must not be clicked automatically.

## Carga de Documentos para Expediente

**Confirmed from live DOM on 2026-07-16:** title `Entrega de documentos`, endpoint `/cgi-bin/deya.sh/ecCargaDocto01.htm`, normally targeted to `center`.

- `form[name="mi_forma"]` uses `method="post"`, `enctype="multipart/form-data"`, and the same endpoint action. Its hidden controls were inventoried by name only; no values were read or retained.
- Stable upload controls: `select#idCve_Docto[name="HTMLCve_Docto"]` and `input#HTMLArchivo[name="HTMLArchivo"][type="file"]` inside `#idFormulario`.
- `table#idListado` is initialized by DataTables 1.10.19. Columns are `Documento`, `Fecha Carga`, `Estatus`, `Comentario`, plus an unlabeled action column. Live wrappers include `#idListado_wrapper`, `#idListado_length`, `#idListado_filter`, `#idListado_info`, and `#idListado_paginate`.
- The manual review control is `input#idTermina[name="Terminar"][type="button"]`, labelled `Enviar a Revisión`, inside `#idEnviarRevision`.
- Native jQuery UI dialogs wrap `#idRevision` (`Revisión de Documentos`) and `#idMensaje` (`Aviso Importante`). Generated dialog-title ids are fragile.
- The visible status paragraph is followed by `.progress > #idbarra[role="progressbar"]`; the audited state exposed ARIA min/max/current values.

`document-upload-page.ts` only adds classes/accessible labels to these known controls. It does not select a document type, touch hidden controls, set a file, invoke DataTables APIs, open a dialog, click review, or submit the form. `service-pages-v2.css` styles the native DataTable, search, page-length selector, pagination, dialogs, and progress semantics under `body.siase-v2-service-page`.
