# Recibos — UI v2 implementation boundary

Source audit: authenticated, read-only navigation from the native left-menu links on 2026-07-16. All private and financial values remain redacted.

## Implemented boundary

- `ecavpag01.htm`: only the native `form[name="mi_forma"]`, its first selection table, and the existing history link receive presentation classes.
- `ecBolRec-v02.htm` and `ecBolRec-v03.htm`: the native receipt form, its already-rendered tables, and existing dialogs receive a visual document shell. No amounts, values, inputs, links, payment controls, or print handlers are read, copied, stored, or activated.
- `EgenbolveranoV2.htm`: if the native frame is empty, a non-financial status is shown. The status disappears if native content arrives; no replacement form or fallback financial action is created.

## Non-negotiable preservation rules

Keep native POST actions, links, dialogs, input controls, printing, payment behavior, table order, and all financial content as SIASE renders them. The v2 layer is visual and additive only.
