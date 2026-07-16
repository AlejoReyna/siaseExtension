# Header and left navigation

## Top header

**Confirmed from live DOM:** title `SIASE - Menu`, endpoint `/cgi-bin/wspd_cgi.sh/maintop.htm`, loaded in `top`.

The body contains one `table.MenuLink` (`width="100%"`, three rows, maximum five cells). It holds institutional/student imagery and these anchors:

| Label | Endpoint | Target |
| --- | --- | --- |
| Escolar | `/cgi-bin/wspd_cgi.sh/mainleftdin01.htm` | `left` |
| Tesoreria | same path, different private query context | `left` |
| DGPPE | same path, different private query context | `left` |
| AFI | same path, different private query context | `left` |
| English UANL | same path, different private query context | `left` |
| EXCI | `/cgi-bin/wspd_cgi.sh/ceregexci02.htm` | `center` |
| Contraseña | `/cgi-bin/wspd_cgi.sh/pass01.htm` | `center` |
| Clave de Seguridad | `/cgi-bin/feria.sh/cveseg01.htm` | `center` |
| Aviso de Privacidad | `/cgi-bin/wspd_cgi.sh/avisopriv.htm` | `center` |
| Salir | `/cgi-bin/wspd_cgi.sh/cerrar.htm` | `left` |

There are also blank-text social anchors targeting `_blank`. No form or native input/select was present in the audited header.

**Must preserve:** the original `href` including its private query bundle, the `target`, the logout anchor, and the readable student/career context. **Safe to enhance:** visual layout, responsive wrapping, accessible labels for image-only social links. **Fragile:** parsing the first row or `span.style1`; it is a presentation selector and can contain identity text.

## Left menu

**Confirmed from live DOM:** Escolar uses `ul.menu.collapsible`; most entries are `li > a[target="center"]`. Many `li` elements use ids derived directly from labels, for example `li_Situacion estudiante UANL`; spaces, accents, and copy changes make those ids fragile.

The body also contains three hidden inputs named `HTMLUsuario`, `HTMLpassword`, and `custNum`. Values were not read or retained. They are session machinery, not UI state.

The visible menu may differ from the full DOM. A Becas subtree was present in the DOM but not visible in the audited viewport. Treat visibility and availability separately.

**Confirmed from repository code:** `parseMenuItems()` only keeps `ul.menu.collapsible li a[target="center"]`. It therefore drops `_new` scholarship flows, `_top` practices/volunteering flows, the empty Becas group trigger, and any future non-center target.

