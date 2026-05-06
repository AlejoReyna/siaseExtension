# Prompt de diagnóstico: Alert "Tipo de usuario no disponible" en carga de kardex

## Contexto del problema

Estás trabajando en una extensión Chrome para el portal SIASE de la UANL (`deimos.dgi.uanl.mx`). El portal es una aplicación HTML4 legacy basada en Progress WebSpeed (ABL). La extensión inyecta un dashboard moderno en `eselcarrera.htm` (página de selección de carrera).

## Qué hace la extensión actualmente

Al cargar `eselcarrera.htm`, la extensión ejecuta `fetchKardexInBackground()`, que crea un **iframe oculto** apuntando directamente a la URL del kardex:

```
https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/econkdx01.htm
```

El iframe se crea con estas propiedades:
```js
iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:0;';
iframe.src = 'https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/econkdx01.htm';
```

Cuando carga, la extensión accede a `iframe.contentDocument`, parsea la tabla de materias y extrae créditos completados y promedio. **Esto funciona** — ya se ve el 64% en el dashboard.

## El problema

Aparece un `alert()` nativo del navegador con el mensaje:

> **deimos.dgi.uanl.mx says**
> Tipo de usuario no disponible, intentar más tarde

Este alert bloquea la UI completamente hasta que el usuario lo acepta. Viene del **script de `econkdx01.htm`** cargado dentro del iframe oculto.

## Tu tarea

Tienes acceso al navegador. Necesitas:

### 1. Identificar exactamente qué script dispara el alert

Navega a `https://deimos.dgi.uanl.mx` en una sesión autenticada. Desde la consola de `eselcarrera.htm` (el frame principal), ejecuta:

```js
// Sobrescribir alert globalmente para capturar el stack trace
const origAlert = window.alert;
window.alert = function(...args) {
  console.error('[ALERT INTERCEPTADO]', args, new Error().stack);
  origAlert.apply(this, args);
};
```

Luego recarga la página y espera el alert. El stack trace en consola te mostrará qué script y qué línea lo dispara.

### 2. Inspeccionar los scripts de `econkdx01.htm`

Abre DevTools → Sources → busca `econkdx01.htm` dentro del iframe `siase-plus-kardex-bg-frame`. Revisa todos los `<script>` inline de esa página buscando:
- Llamadas a `alert()`
- Condiciones que evalúan tipo de usuario, sesión, o parámetros de entrada
- Variables del tipo `HTMLTipCve`, `TipoUsu`, `TipUsu`, `TipoCve` o similares

El patrón típico en SIASE es:
```js
// Ejemplo de lo que buscar:
if (TipoUsuario == '' || TipoUsuario == null) {
  alert('Tipo de usuario no disponible, intentar más tarde');
}
```

### 3. Determinar si el alert viene del iframe o del frame padre

Ejecuta en consola desde `eselcarrera.htm`:

```js
// Capturar el alert del iframe antes de que cargue
const iframeEl = document.querySelector('iframe[name="siase-plus-kardex-bg-frame"]');
if (iframeEl?.contentWindow) {
  iframeEl.contentWindow.alert = () => {};
}
```

Si después de esto el alert desaparece, confirma que viene del iframe y la solución es suprimir `window.alert` en el iframe antes de que cargue su JS.

### 4. Verificar si el alert requiere parámetros de sesión que no se están pasando

En el flujo normal del portal, el usuario llega al kardex a través de navegación del menú izquierdo, que carga el kardex con parámetros de sesión en la URL o como variables JS embebidas por el servidor (el patrón de SIASE es insertar variables inline en el HTML antes de servir la página).

Ejecuta esto en la consola del **iframe del kardex** (selecciona el contexto del iframe en el dropdown de consola):

```js
// Ver qué variables de sesión están definidas
['TipoUsuario', 'TipUsu', 'HTMLTipCve', 'TipoCve', 'HTMLCve_Tipo_Inscripcion',
 'HTMLUsuCve', 'HTMLUsuario', 'vTipoUsu'].forEach(v => {
  console.log(v, '=', window[v]);
});
```

Si alguna de estas sale `undefined` o vacía cuando debería tener un valor, esa es la causa del alert: el servidor sirve la página con variables de sesión vacías porque el iframe no llegó al kardex por el flujo normal (menú → center frame).

## Lo que debes reportar

1. **Stack trace del alert**: ¿qué archivo/línea lo dispara?
2. **Texto exacto de la condición**: ¿qué variable evalúa? ¿cuál es su valor cuando viene del iframe vs. cuando navega normalmente?
3. **¿Se puede suprimir `window.alert` en el iframe?**: ¿el alert desaparece si se sobrescribe antes de que cargue el JS?

## La solución esperada (para implementar después del diagnóstico)

La solución más limpia es suprimir el `alert` del iframe sin afectar el resto de la página. En la función `fetchKardexInBackground` de `src/content/career-landing.ts`, antes de asignar `iframe.src`, agregar:

```ts
// Opción A — suprimir alert en el iframe (si el iframe es mismo origen)
iframe.addEventListener('load', () => {
  // ya manejado
}, { once: true });

// Suprimir ANTES de cargar el src, en el primer load (about:blank):
const suppressAlert = (): void => {
  try {
    if (iframe!.contentWindow) {
      iframe!.contentWindow.alert = () => {};
    }
  } catch { /* cross-origin guard */ }
};
iframe.addEventListener('load', suppressAlert, { once: true });
iframe.src = KARDEX_URL;
```

Pero esto puede no funcionar si el alert se dispara durante la carga del documento (antes del segundo `load`). La alternativa es usar un `MutationObserver` o simplemente asignar `alert = () => {}` en el `srcdoc` inicial del iframe.

Reporta el diagnóstico y con eso definimos cuál de las opciones aplicar.
