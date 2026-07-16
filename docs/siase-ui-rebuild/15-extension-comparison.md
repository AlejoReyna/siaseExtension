# Live SIASE versus existing extension

All extension statements are **confirmed from repository code**; native counterparts are **confirmed from live DOM** unless marked otherwise.

| Native element/behavior | Existing extension behavior | Impact |
| --- | --- | --- |
| Root rows `110,*` | Changes to `1,*` | Header effectively hidden |
| Root columns `184,*` | Changes to `202,*`/`55,*`; nested career flow changes to `0,*` | Native layout and responsive assumptions replaced |
| Header `table.MenuLink` | Globally restyled; nearly hidden by frame geometry | Native identity/module context inaccessible |
| `ul.menu.collapsible` and left `table.MenuLink` | CSS `display:none`; React `#siase-plus-sidebar` appended | Native menu/legend removed from view |
| Non-`center` menu targets | `parseMenuItems()` discards them | Scholarship `_new` and practices/volunteering `_top` flows disappear |
| Main-center notice carousel/dialog/iframes | New `#siase-plus-shell` prepended; all other main-center children hidden | Notices, PDFs, external links, and native dialogs hidden |
| Career first table | `remove()` | Native banner removed positionally |
| Career second table/layout | Tagged then removed | Native career/service layout removed |
| `#siase`, `#correo`, `#nexus`, `#codice` | Moved into injected quick-panel slot | Native ownership and ordering changed |
| Career form target | Reassigned to injected iframe and submitted programmatically | Native navigation/session behavior replaced |
| Center service pages | Broad `body`, `table`, and `a` styles applied | Legacy pages can be distorted globally |
| Personal-data body | Returned wholesale as a student `name` | Privacy and correctness bug |
| Hidden password | Copied to extension session storage | Must be removed |
| WebSpeed query bundle | Copied to persistent local storage and partly logged | Must be removed/redesigned |
| Kardex/grades/schedule data | Parsed and persisted; verbose console logs include academic data | Minimize, anonymize, and test parsers |

## Confirmed hiding/removal selectors

```css
body.siase-plus-left ul.menu.collapsible,
body.siase-plus-left table.MenuLink,
body.siase-plus-left > br,
body.siase-plus-left > center { display: none !important; }

body.siase-plus-center.siase-plus-main-center
  > :not(#siase-plus-shell):not(script):not(style) { display: none !important; }
```

The rebuild should feature-gate `frameset-injector.ts`, `single-view-layout.ts`, `left-frame.ts`, `center-ui.ts`, and `career-landing.ts` as one invasive layer before adding new UI.

