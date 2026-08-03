# Prompt para implementar el banner de avisos dentro de una campana

Copia y pega todo el texto siguiente en GPT con acceso al navegador y al workspace de la extensión:

```text
Actúa como ingeniero senior de frontend y extensiones Chrome MV3. Necesito modificar una extensión TypeScript/Vite/React que moderniza el portal SIASE de la UANL.

## Objetivo funcional

En la pantalla de selección de carrera de SIASE (`eselcarrera.htm`) existe contenido legacy que incluye un banner/sección de “Avisos de interés” y varios bloques de acceso rápido. Quiero que la extensión:

1. Detecte y extraiga el banner de avisos de interés del DOM original antes de ocultar el contenido legacy.
2. No pierda ningún texto, imagen, enlace, `href`, `onclick`, formulario o navegación del banner.
3. Muestre esos avisos por separado dentro de un botón de campana de notificaciones en la cabecera del shell moderno.
4. La campana debe mostrar un contador si hay avisos, tener estado abierto/cerrado y funcionar con teclado.
5. Al abrirla, debe mostrar los avisos oficiales en tarjetas legibles. Si el banner original es un carrusel, conservar Previous/Next; si no lo es, mostrar todos los avisos encontrados.
6. Dentro del mismo panel de la campana deben aparecer los bloques originales de:
   - Transferencias
   - Becas
   - Facturación UANL
   - Correo
   - Becas, si es un bloque distinto en el DOM original
   - Dudas
   - Censo Nacional sobre Inteligencia Artificial Generativa
7. Los bloques deben conservar sus enlaces y acciones originales. No inventes URLs. Si dos elementos son clones exactos del mismo nodo, deduplica sólo esos clones; no deduzcas que dos elementos con el mismo texto son iguales sin comprobar su URL o acción.
8. El panel debe ser responsive y respetar los temas existentes de la extensión.
9. No mezcles estos avisos con la sección actual “Actualidad UANL” que consulta noticias externas. Esa sección puede permanecer separada.
10. No rompas el flujo original de selección de carrera ni los paneles `#siase`, `#correo`, `#nexus` y `#codice`.

## Contexto del problema visible

El contenido legacy que quiero extraer aparece aproximadamente así:

    Transferencias
    Becas
    Facturación UANL
    Correo
    Becas
    Dudas
    Censo Nacional sobre Inteligencia Artificial Generativa

Y el banner de avisos contiene textos como:

    Previous / Next
    Departamento Escolar y de Archivo
    ENCUESTA DE SEGURIDAD SOCIAL
    Favor de realizar el llenado de la Encuesta de Seguridad Social antes del 19 de junio de 2026, con el objetivo de integrar correctamente su expediente académico-administrativo en la UANL, y garantizar su protección en materia de salud durante su permanencia en la Universidad.

    División - Inscripciones y Credencialización
    AVISO IMPORTANTE
    A los estudiantes inscritos en el periodo escolar Agosto - Diciembre 2025 que fueron citados para la entrega de su credencial universitaria y no acudieron, se les informa que estarán siendo reprogramados durante la semana, teniendo como fecha límite el 12 de diciembre de 2025.
    Se les invita a revisar su programación y presentarse en la fecha indicada. Esto debido al término del periodo escolar.
    El servicio de entrega de credenciales se reanudará en el periodo Enero–Junio 2026, a partir del 26 de enero de 2026.

## Punto crítico: identifica el código activo

Primero verifica en el repositorio cuál es el flujo realmente cargado por `manifest.json`. No asumas que `src/content/career-landing.ts` es el archivo activo.

La configuración actual relevante es:

```json
{
  "content_scripts": [
    {
      "matches": [
        "https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/eselcarrera.htm*",
        "https://deimos.dgi.uanl.mx/cgi-bin/deya.sh/ecCargaDocto01.htm*",
        "https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/esCreditoMaterias01.htm*"
      ],
      "js": ["src/content/service-page.ts"],
      "css": ["src/content/styles/service-pages-v2.css"],
      "all_frames": true,
      "run_at": "document_idle"
    }
  ]
}
```

`src/content/service-page.ts` actualmente decide qué enhancer usar así:

```ts
const SERVICE_ROUTES: ReadonlyArray<{ kind: ServicePageKind; path: string }> = [
  { kind: 'career-selector', path: '/cgi-bin/wspd_cgi.sh/eselcarrera.htm' },
  { kind: 'document-upload', path: '/cgi-bin/deya.sh/ecCargaDocto01.htm' },
  { kind: 'academic-credits', path: '/cgi-bin/wspd_cgi.sh/esCreditoMaterias01.htm' }
];

export function enhanceServicePage(
  frameDocument: Document,
  url = new URL(frameDocument.location.href)
): ServicePageKind | null {
  const kind = detectServicePage(url);
  if (!kind || !frameDocument.body) return null;

  frameDocument.body.classList.add('siase-v2-service-page');
  frameDocument.body.dataset.siaseV2Service = kind;
  markLegacyState(frameDocument);

  if (kind === 'career-selector') enhanceCareerSelectorPage(frameDocument);
  if (kind === 'document-upload') enhanceDocumentUploadPage(frameDocument);
  if (kind === 'academic-credits') enhanceAcademicCreditsPage(frameDocument);
  return kind;
}
```

El archivo activo `src/content/pages/career-selector-page.ts` actualmente hace lo siguiente:

```ts
const CAREER_PANEL_IDS = ['siase', 'correo', 'nexus', 'codice'] as const;

function markNativePanels(frameDocument: Document): void {
  CAREER_PANEL_IDS.forEach((id) => {
    const panel = frameDocument.getElementById(id);
    if (!panel) return;
    panel.classList.add('siase-v2-career-service-panel', `siase-v2-career-service-panel--${id}`);
    if (!panel.getAttribute('aria-label')) {
      panel.setAttribute('aria-label', id === 'siase' ? 'SIASE' : id.toUpperCase());
    }
  });
}

export function enhanceCareerSelectorPage(frameDocument: Document): boolean {
  frameDocument.body.classList.add('siase-v2-career-selector-page');
  replaceLegacyPortalLayout(frameDocument);
  markNativePanels(frameDocument);

  const form = frameDocument.querySelector<HTMLFormElement>('form[name="SelCarrera"]');
  if (!form) return false;

  form.classList.add('siase-v2-career-native-form');
  const careerLinks = originalCareerLinks(form);
  careerLinks.forEach((link) => {
    link.dataset.siaseCareerAction = link.getAttribute('href') ?? '';
    link.removeAttribute('href');
    link.classList.add('siase-v2-career-native-option');
  });

  if (!careerLinks.length || frameDocument.querySelector('[data-siase-v2-career-selector]')) {
    return true;
  }

  // Aquí se crea el shell moderno y actualmente se agrega un aviso genérico:
  const shell = frameDocument.createElement('div');
  shell.className = 'siase-v2-career-shell';
  shell.innerHTML = `
    <header class="siase-v2-career-shell__header">
      <div class="siase-v2-career-shell__brand">
        <span>U</span><strong>UANL<em>SIASE</em></strong>
      </div>
      <nav aria-label="Módulos">
        <span class="is-active">Escolar</span>
        <span>Tesorería</span>
        <span>DGPPE</span>
        <span>AFI</span>
      </nav>
    </header>
    <aside class="siase-v2-career-sidebar">
      <section class="siase-v2-career-profile" aria-label="Perfil del estudiante">
        <span class="siase-v2-career-profile__avatar" aria-hidden="true">U</span>
        <div><strong>Portal estudiantil</strong><span>UANL · SIASE</span></div>
      </section>
      <div class="siase-v2-career-sidebar__home"><span aria-hidden="true">⌂</span> <strong>Inicio</strong></div>
      <p>Carreras disponibles</p>
    </aside>
    <main class="siase-v2-career-shell__main">
      <section class="siase-v2-career-announcement" aria-label="Aviso institucional">
        <span class="siase-v2-career-announcement__icon" aria-hidden="true">i</span>
        <div>
          <strong>Bienvenido a SIASE</strong>
          <p>Selecciona una carrera para consultar tu información académica.</p>
        </div>
      </section>
    </main>
  `;
  frameDocument.body.append(shell);
  return true;
}
```

La hoja de estilos activa oculta el contenido nativo con estas reglas:

```css
body.siase-v2-service-page .siase-v2-career-native-form,
body.siase-v2-service-page .siase-v2-career-service-panel {
  display: none !important;
}

body.siase-v2-service-page.siase-v2-career-selector-page > :not(.siase-v2-career-shell) {
  display: none !important;
}
```

## Implementación que necesito

Antes de escribir código, inspecciona el DOM real autenticado de `eselcarrera.htm` usando el navegador y determina:

- cuál tabla, contenedor o nodo corresponde al banner “Avisos de interés”;
- cuál es el contenedor de los bloques Transferencias/Becas/Facturación/Correo/Dudas/Censo;
- cómo están definidos sus enlaces, imágenes, eventos `onclick`, formularios o navegación;
- si el carrusel usa botones, enlaces, IDs, funciones globales o cambios de `style.visibility`;
- si el contenido aparece dentro de un frame o directamente en el documento de la ruta.

Después implementa la solución en el código activo, preferentemente separando responsabilidades en funciones pequeñas y testeables, por ejemplo:

- `extractLegacyAnnouncements(document)`;
- `extractLegacyQuickBlocks(document)`;
- `renderNotificationBell(document, data)`;
- `attachNotificationBellBehavior(...)`.

La extracción debe ejecutarse antes de quitar atributos, ocultar nodos o aplicar las reglas que esconden el contenido legacy. No uses sólo el texto visible como selector: combina estructura, clases, IDs, atributos, imágenes, URLs y texto normalizado. Usa `textContent` para leer texto, pero crea nuevos nodos de forma segura con `textContent`, `createElement` y `setAttribute`; no insertes texto del portal con `innerHTML` sin sanitizar.

Para conservar acciones originales, guarda referencias a los elementos originales mientras sigan conectados o reproduce la acción mediante `element.click()`/delegación segura. No evalúes strings arbitrarios de `javascript:`. Si una acción sólo puede ejecutarse por el elemento nativo original, deja ese elemento oculto pero conectado al DOM y activa su click desde el nuevo botón.

Coloca la campana dentro de `.siase-v2-career-shell__header`, preferentemente junto al `nav` y sin romper el layout responsive. Usa un SVG inline sencillo o un ícono CSS, sin depender de una biblioteca nueva. El panel debe usar `role="dialog"` o un popover accesible, `aria-expanded`, `aria-controls`, cierre con Escape y cierre al hacer click fuera. El botón debe tener `aria-label="Abrir avisos de interés"` y el contador debe tener texto accesible.

El panel debe mostrar:

- encabezado “Avisos de interés”;
- contador de avisos;
- navegación Previous/Next únicamente si el DOM original realmente tiene varios slides;
- departamento, título, cuerpo, imagen y enlace de cada aviso cuando existan;
- una sección de accesos rápidos para los bloques institucionales extraídos.

No hardcodees el contenido como fuente principal: los textos que escribí arriba son criterios de aceptación para comprobar la extracción. Si algún bloque no existe en la sesión actual, no inventes una tarjeta; muestra sólo los bloques que realmente existan y registra en consola, bajo un prefijo propio, qué elementos fueron encontrados.

## Compatibilidad y pruebas

Conserva la navegación actual de carreras y los paneles nativos. Evita cambios en `career-landing.ts` salvo que demuestres que también está activo en la ruta. Actualiza `manifest.json` sólo si es estrictamente necesario.

Agrega pruebas unitarias para:

1. extraer avisos de una estructura representativa del HTML legacy;
2. extraer los bloques rápidos y conservar sus URLs/acciones;
3. deduplicar clones exactos sin eliminar elementos legítimos;
4. manejar ausencia del banner sin romper la pantalla;
5. mantener el flujo de selección de carrera.

Ejecuta `npm test` y `npm run build`. Si tienes acceso a la sesión del portal, verifica visualmente la campana en escritorio y móvil, abre/cierra el panel, usa Escape, prueba Previous/Next y confirma que cada acceso rápido conserva su comportamiento original.

## Formato de tu respuesta

1. Explica primero qué nodo del DOM encontraste y por qué es el banner correcto.
2. Indica los archivos que vas a modificar.
3. Presenta el patch completo o realiza los cambios directamente en el workspace.
4. Explica cómo preservaste los `href`, `onclick`, formularios y clicks nativos.
5. Incluye el resultado de las pruebas y cualquier limitación causada por la sesión autenticada.
```

Nota: el prompt está diseñado para que GPT inspeccione primero el DOM real. Esto es importante porque el código actual reemplaza la pantalla de `eselcarrera.htm` y oculta el formulario legacy; si se selecciona el banner después de esa fase, ya se habrá perdido la fuente original.
