# Career selector (`eselcarrera.htm`)

## Confidence

The endpoint is **confirmed from repository code** and is present in the manifest. On 2026-07-16, direct navigation without the original career flow produced the native expired/invalid-session response. The authenticated account still entered an already-selected career and did not expose a safe return control. The live form details therefore remain **still needs verification**; no query bundle was copied, evaluated, or reconstructed to bypass that boundary.

## Repository contracts requiring live verification

- `form[name="SelCarrera"]`.
- Career choices: `form[name="SelCarrera"] a[href^="javascript:"]`.
- Legacy service panels: `#siase`, `#correo`, `#nexus`, `#codice`.
- Nexus/CODICE controls: `#idfrNexus`, `#linkNexus`, `#idfrCodice`, `#linkCodice`.
- Two body-level tables, assumed to be banner then layout.

## Existing extension behavior

**Confirmed from repository code:** the extension removes the first body table, tags the second as `.siase-plus-career-layout`, prepends `.siase-career-dashboard`, moves all four native panels into an injected slot, and removes the tagged legacy layout. Selecting a career parses assignments embedded in a `javascript:` href, writes them into the original form, changes `form.target`, calls `form.submit()`, creates a nested iframe, then hides that iframe's `top` and `left` frames.

It also fetches Kardex and Nexus data, captures credentials from form fields, URLs, cookies, window globals, and inline scripts, and adds a four-minute SIASE keepalive.

## Rebuild rule

`service-page.ts` now installs a conservative, feature-detected enhancer only when `form[name="SelCarrera"]` is actually present. It never reads hidden values, parses JavaScript assignments, changes the form target, or submits the form. Each new career card keeps only an in-memory reference to its source anchor and delegates the user's click with `source.click()`. The original form, career anchors, and `#siase`, `#correo`, `#nexus`, and `#codice` remain in place and visible as the fallback/source of truth. The old `career-landing.ts` is not restored to the manifest.

The anonymized fixture covers the known form/target/panel contract, but it is not promoted to live evidence. Re-audit action, method, field names, and native events when the legitimate login flow presents this page.
