# Root frameset

## Live hierarchy

**Confirmed from live DOM** at an 814 × 666 viewport:

```html
<frameset rows="110,*">
  <frame name="top" src=".../maintop.htm" scrolling="no" noresize>
  <frameset cols="184,*">
    <frame name="left" src=".../mainleftdin01.htm" scrolling="yes" noresize>
    <frame name="center" src=".../maincenter.htm" scrolling="yes">
  </frameset>
</frameset>
```

| Frame | Live rectangle | Purpose | Native behavior to preserve |
| --- | ---: | --- | --- |
| `top` | x 0, y 0, 814 × 110 | Identity, institutional branding, top-level module switcher and logout entry | `target` behavior, full link URL, readable header |
| `left` | x 0, y 110, 184 × 556 | Active module menu and legacy schedule legend | Scrollability, original anchors, hidden session fields, menu ordering |
| `center` | x 184, y 110, 630 × 556 | Main notices and all normal service pages | Frame name, history, native forms/dialogs |

Frame attributes confirmed live: `frameborder="0"`, `marginwidth="0"`, and `marginheight="0"` on all three. `top` and `left` use `noresize`; `center` does not.

## Useful selectors

- **Confirmed from live DOM:** `frameset[rows="110,*"]`, nested `frameset[cols="184,*"]`.
- **Confirmed from live DOM:** `frame[name="top"]`, `frame[name="left"]`, `frame[name="center"]`.
- **Fragile:** positional selectors such as `frameset:nth-child(2)` or `frame:nth-child(3)`.

## Extension comparison

**Confirmed from repository code:** `single-view-layout.ts` changes the root rows to `1,*`, changes columns to `202,*` or `55,*`, forces borders/spacing to zero, changes scrolling, and reapplies the mutation on resize. `career-landing.ts:isolateSiaseCenterFrame()` separately changes rows and columns to `0,*` inside an embedded frameset.

This hides native context and creates two competing layout systems. The rebuild must not mutate native rows/columns until all native navigation is covered by tests.

