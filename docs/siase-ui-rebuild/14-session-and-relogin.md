# Session lifecycle and forced re-login

## What is confirmed

### Live behavior

- Every authenticated frame/menu URL carries a private WebSpeed query bundle. The same public path can represent different modules or session/form contexts.
- Replaying a captured service URL outside the native frame flow can return `SIASE - Mensaje` with `#idMensaje` and `Opción no disponible.` even while `default.htm` remains authenticated.
- Page navigation can create JavaScript alerts/dialogs and long-running loads. Treat them as page state; do not reload the root frameset automatically.
- The left frame contains hidden `HTMLUsuario`, `HTMLpassword`, and `custNum`. Values were not retained.

### Repository behavior

- `career-landing.ts` treats `HTMLtrim` plus the other top-frame query fields as reusable session parameters.
- It writes the full parameter map to `chrome.storage.local` as `siaseSessionParams`.
- It logs `HTMLUsuario` and `HTMLtrim` to the console.
- It fetches `maincenter.htm` every four minutes as a keepalive and records a timestamp in local storage.
- `left-frame.ts` reads `HTMLpassword` and writes it to `chrome.storage.session` as `siasePwd`.
- Kardex background fetches reuse the stored query bundle and can confuse an empty/unavailable document with an expired session.

## Likely re-login / failure triggers

| Trigger | Evidence | Result | Mitigation |
| --- | --- | --- | --- |
| Actual server inactivity expiry | Repository code already matches the server phrase `La sesión del formulario ha expirado...` | Message page or login flow | Detect and notify; user performs a normal login. A keepalive is optional and must be server-approved. |
| Stale/replayed form URL | Confirmed live by out-of-flow `Opción no disponible.` | Page unavailable; not necessarily logged out | Navigate through the original live anchor/form; never cache/rebuild a service URL. |
| Dropping private query context | Confirmed from live module links sharing the same path but differing context | Wrong module, unavailable page, or login prompt | Preserve `href` and `target` in memory and click the original element. |
| `_top` destination | Confirmed live on Practices/Volunteering | Replaces frameset; back/history semantics change | Treat as intentional shell exit and offer explicit user-controlled return. |
| `_new` destination | Confirmed live on scholarship links | New browsing context may not share frame state assumptions | Preserve target; do not force into center without verification. |
| Automatic root/frame reload | Inferred from legacy WebSpeed form state and extension's competing frame mutations | Can discard current form/dialog state | Never reload `default.htm` to recover a child page. |
| Extension storage of stale parameters | Confirmed from repository code | Background requests continue with invalid context | Do not persist WebSpeed parameters; resolve live navigation at action time. |
| Password/session replay | Confirmed from repository code | Security exposure; may violate server expectations | Remove password capture and do not automate re-login. |

## Safe design

1. Model states as `healthy`, `service unavailable`, `form expired`, `login required`, and `unknown`; do not collapse them into one “session expired” state.
2. Detect expiry from the native message text/title/redirect while leaving the page visible.
3. Keep session material only in the native page. Extension UI stores route labels and public endpoint paths at most.
4. Delegate navigation to the current original anchor/form. If it is stale, refresh only the native `left` menu through the current top module anchor, not the whole root.
5. If a keepalive is retained, use no persistent parameters, stop when the tab is hidden/closed or the server reports expiry, add backoff, and document server policy. A keepalive cannot safely guarantee indefinite authentication.
6. Never store or replay passwords. User reauthentication must remain explicit.

