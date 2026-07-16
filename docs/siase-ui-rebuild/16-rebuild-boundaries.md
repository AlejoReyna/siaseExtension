# Recommended rebuild boundaries and order

## Boundaries

### Native session/navigation boundary

Owned by SIASE: root frameset, named frames, every original anchor `href`/`target`, forms/actions/hidden controls, dialogs, logout, and login. The extension may observe and delegate but must not synthesize or persist session state.

### Read-only adapter boundary

Owned by the extension: endpoint detection, page-scoped parsers, ephemeral view models, anonymized test fixtures, and availability/error classification. Adapters must return safe partial results and never mutate native DOM.

### Presentation boundary

Owned by the extension: a uniquely named, removable host per page; scoped styles; accessible summaries; filters/export actions that never hide the source until equivalence is proven.

### Optional integration boundary

Nexus, UANL news, calendar export, notifications, and profile imagery must fail independently and must not participate in SIASE authentication or navigation.

## Implementation order

1. Add feature flags and disable frame geometry, blanket hiding, career layout removal, and password/session capture.
2. Add privacy regression tests: no password read, no WebSpeed query persistence, no sensitive console logging.
3. Add route/error classifier tests for normal page, `Opción no disponible`, expired form, and login prompt.
4. Add anonymized live fixtures and robust parsers for status, credits, Kardex, enrollment date, then schedule/grades.
5. Add non-invasive page summaries with native content visible.
6. Rebuild the left menu using the original anchor elements or direct delegated clicks, including `_new` and `_top` entries.
7. Re-audit and rebuild career selection around the original form.
8. Add optional integrations last.

## Acceptance checklist

- Removing the extension host restores a fully usable native page.
- No global selector hides an unspecified native sibling.
- No query value, password, cookie, token, personal-data body, course list, or score is logged or stored without a documented necessity and retention policy.
- Back, module switching, `_new`, `_top`, message dialogs, print buttons, and logout retain native behavior.
- Each parser is page-scoped, fixture-tested, and handles unavailable/expired pages distinctly.
- All destructive, financial, enrollment, upload, survey, reservation, and account-changing actions remain user-initiated.

