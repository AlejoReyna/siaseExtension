# Main center notices

**Confirmed from live DOM:** title `SIASE - Central`, endpoint `/cgi-bin/wspd_cgi.sh/maincenter.htm`, frame `center`.

## DOM hierarchy and selectors

```text
body
├── div#container
│   ├── div#header > h1 "Avisos de Interés"
│   ├── div#slider[align=center] > ul > notice items
│   ├── span#prevBtn > a (javascript navigation)
│   └── span#nextBtn > a (javascript navigation)
├── table.auto-style8
├── iframe#aviso[name=aviso]
├── div#idMensajeEncDti[title="Aviso Importante"]
└── div.ui-dialog[role=dialog]
    ├── title bar + close button
    └── div#Instrucciones > iframe
```

The carousel exposes notice images and external/PDF links. `Previous` and `Next` use JavaScript pseudo-links. The `aviso` iframe is 100% × 100% and initially loads a blank server resource. A jQuery UI dialog can contain another notice iframe.

**Data available for parsing:** notice image `alt`, safe destination path/origin, ordering, and optional dialog content. **Must preserve:** external/PDF targets, carousel operation, notice dialog close action, and `iframe#aviso`. **Safe to replace:** carousel presentation after delegating to original links. **Fragile:** `nullvoid(0);`/JavaScript hrefs, positional notice items, and global jQuery UI ids such as `ui-id-1`.

**Confirmed from repository code:** `center-ui.ts` prepends `#siase-plus-shell`; `center.css` then applies `display:none` to every main-center child except the injected shell and scripts/styles. This hides the entire native structure above.

