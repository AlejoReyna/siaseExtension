# Header account and policy pages

These routes are **confirmed from live DOM** in the `top` header. Their form internals remain **still needs verification** because no account-changing action was submitted.

| Page | Endpoint | Target | Safety boundary |
| --- | --- | --- | --- |
| EXCI | `/cgi-bin/wspd_cgi.sh/ceregexci02.htm` | center | Inspect/read only; do not register/pay |
| Contraseña | `/cgi-bin/wspd_cgi.sh/pass01.htm` | center | Never read, fill, copy, or submit password fields |
| Clave de Seguridad | `/cgi-bin/feria.sh/cveseg01.htm` | center | Never submit or reveal security answers/keys |
| Aviso de Privacidad | `/cgi-bin/wspd_cgi.sh/avisopriv.htm` | center | Safe read-only content |
| Salir | `/cgi-bin/wspd_cgi.sh/cerrar.htm` | left | Preserve as the sole intentional session termination path |

The old React sidebar searches the left document for a logout-looking control, then assigns its URL to `window.top`; if it cannot find one, it navigates the top window to `/`. **Confirmed from repository code:** that fallback is unsafe because it invents logout behavior. The rebuild must delegate specifically to the native `Salir` anchor and must not call it for session recovery.

