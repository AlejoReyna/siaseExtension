# Widget Nexus: Proximas Actividades A Vencer

Este documento describe como esta implementado el widget de Nexus en SIASE Plus y que debe verificar un modelo/agente con acceso al navegador real. El objetivo es diagnosticar por que el widget inicia sesion en Nexus, pero no siempre muestra actividades proximas.

## Archivos Relevantes

- `src/content/career-landing.ts`
  - Monta el dashboard de `eselcarrera.htm`.
  - Inserta el widget `#siase-nexus-widget`.
  - Obtiene/captura sesion de Nexus.
  - Llama a la API de Nexus mediante el service worker.
  - Consulta cursos, estructuras y filtra actividades proximas.

- `src/content/nexus-session-capture.ts`
  - Content script que corre en `https://plataformanexus.uanl.mx/*`.
  - Lee `localStorage['UanlNexus7SesionStorage']` desde el origen real de Nexus.
  - Envia la sesion capturada al service worker.

- `src/background/service-worker.ts`
  - Recibe mensajes `NEXUS_API_REQUEST`.
  - Ejecuta `fetch` hacia `https://api.nexus.uanl.mx/WebApi/*`.
  - Evita CORS desde el content script.
  - Aplica timeout de 10 segundos a requests Nexus.
  - Guarda temporalmente la sesion capturada de Nexus en `chrome.storage.local`.

- `src/types/chrome-messages.ts`
  - Define mensajes internos:
    - `NEXUS_API_REQUEST`
    - `NEXUS_SESSION_CAPTURED`
    - `GET_CAPTURED_NEXUS_SESSION`
    - `NEXUS_PORTAL_REQUEST`

- `manifest.json`
  - Incluye permisos para:
    - `https://deimos.dgi.uanl.mx/*`
    - `https://api.nexus.uanl.mx/*`
    - `https://plataformanexus.uanl.mx/*`
  - Registra `nexus-session-capture.ts` como content script en Nexus.

## Flujo De Autenticacion Implementado

1. El widget arranca desde `initializeCareerLanding(document)` en `src/content/career-landing.ts`.

2. Se ejecuta `scheduleNexusWidget(frameDocument)`, que llama `iniciarWidgetNexusConCache()` con delay de 300 ms para no bloquear el render.

3. `iniciarWidgetNexus()` muestra estado de carga con skeleton.

4. `obtenerTokenNexus(frameDocument)` intenta obtener sesion en este orden:

   1. Leer `localStorage['UanlNexus7SesionStorage']` desde `deimos.dgi.uanl.mx`.
      - Esto normalmente no existe porque Nexus usa otro origen.

   2. Abrir Nexus mediante iframe oculto:
      - Se localiza el formulario legacy `#idfrNexus`.
      - Se crea un iframe oculto con nombre `siase-plus-nexus-auth-frame`.
      - Se cambia temporalmente `target` del formulario a ese iframe.
      - Se ejecuta `button.click()` sobre el boton real `btnNexus`.
      - Esto es importante: no se clona el form, porque el boton legacy ejecuta handlers que modifican el `action`.

   3. Al hacer click, el formulario cambia su `action` a algo como:

      ```text
      https://plataformanexus.uanl.mx/#/LoginSIASE?Usu=...&Token=...&HTMLUsuario=...&HTMLTipCve=...
      ```

   4. Al cargar Nexus en el iframe, el content script `nexus-session-capture.ts` corre dentro de `plataformanexus.uanl.mx`.

   5. `nexus-session-capture.ts` intenta leer:

      ```js
      localStorage.getItem('UanlNexus7SesionStorage')
      ```

   6. Si encuentra `Sesion.Token`, envia:

      ```js
      chrome.runtime.sendMessage({
        type: 'NEXUS_SESSION_CAPTURED',
        session
      })
      ```

   7. El service worker guarda esa sesion en `chrome.storage.local`.

   8. `career-landing.ts` consulta el service worker con:

      ```js
      { type: 'GET_CAPTURED_NEXUS_SESSION' }
      ```

   9. Si hay token, lo guarda en `localStorage['UanlNexus7SesionStorage']` del dashboard con `_cachedAt`.

## Flujo De API Implementado

Todas las llamadas a `api.nexus.uanl.mx` pasan por el service worker usando:

```js
chrome.runtime.sendMessage({
  type: 'NEXUS_API_REQUEST',
  url,
  method: 'POST',
  headers,
  body
})
```

El service worker hace el `fetch` real y responde:

```js
{
  ok,
  status,
  data,
  error,
  debug
}
```

Esto se hizo porque llamar directamente desde el content script en `deimos` puede fallar por CORS.

## Headers Usados Para Nexus

Una vez capturada la sesion, el widget usa:

```js
{
  Token: auth.token,
  AreaAcademicaId: String(auth.areaAcademicaId || '83'),
  RolId: String(auth.rolId || '5'),
  SistemaId: '1',
  'Content-Type': 'application/json',
  Accept: 'application/json'
}
```

## Consulta De Cursos

La llamada actual es:

```text
POST https://api.nexus.uanl.mx/WebApi/Curso/ConsultarCarpetaCursos
```

Body:

```json
{
  "CarpetaId": 0,
  "Pagina": 1,
  "Paginacion": 50
}
```

Originalmente se usaba `{}`, pero los logs de Nexus mostraron que la app real llama con:

```json
{"CarpetaId":0,"Pagina":1,"Paginacion":10}
```

El parser actual no depende de `data.Carpetas[0].Cursos`. En su lugar, recorre recursivamente toda la respuesta y detecta objetos con:

- `CursoId`, `Id` o `id`
- `Nombre`, `NombreCurso` o `Descripcion`

Funcion relevante:

```ts
extractCoursesFromNexusResponse(data)
```

## Consulta De Estructura

Para cada curso detectado se llama:

```text
POST https://api.nexus.uanl.mx/WebApi/Estructura/ConsultarEstructura
```

Body:

```json
{
  "CursoId": 123456
}
```

Cada request tiene timeout de 10 segundos en el service worker. Si un curso falla, no debe romper todo el widget. El codigo hace `.catch()` por curso y retorna `{}`.

## Extraccion De Actividades

Originalmente se analizaba solo:

```js
Estructura.Etapas[].Evidencias[]
```

Ahora se usa extraccion recursiva:

```ts
extractEvidencesFromStructure(data)
```

Busca cualquier objeto que tenga una fecha y una descripcion.

Campos de fecha aceptados:

- `FechaLimite`
- `FechaFin`
- `FechaCierre`
- `FechaVencimiento`

Campos de texto aceptados:

- `Descripcion`
- `Nombre`
- `Titulo`

Luego `filtrarActividades()` conserva solo actividades con fecha desde ahora hasta los siguientes 7 dias.

## Logs A Revisar

Filtrar consola por:

```text
SIASE Plus Nexus
```

### Autenticacion Exitosa

Se espera ver:

```text
[SIASE Plus Nexus] sin token Nexus cacheado en este origen
[SIASE Plus Nexus] submit Nexus oculto iniciado
[SIASE Plus Nexus] parametros LoginSIASE detectados
[SIASE Plus Nexus Capture] session found
[SIASE Plus Nexus] lectura sesion Nexus capturada
[SIASE Plus Nexus] sesion Nexus capturada via iframe
```

Si ya habia sesion cacheada:

```text
[SIASE Plus Nexus] usando token Nexus cacheado
```

### Cursos

Se espera ver:

```text
[SIASE Plus Nexus] api request
[SIASE Plus Nexus] api response
[SIASE Plus Nexus] unidades de aprendizaje detectadas
```

Abrir el objeto de `unidades de aprendizaje detectadas` y verificar:

- `total` debe ser mayor a 0.
- `cursos` debe listar `CursoId` y `Nombre`.

### Estructuras

Se espera ver por cada unidad:

```text
[SIASE Plus Nexus] consultando estructura de unidad
```

Luego una de estas:

```text
[SIASE Plus Nexus] estructura de unidad recibida
```

o:

```text
[SIASE Plus Nexus] fallo estructura de curso
```

Si aparece `fallo estructura de curso`, abrir el objeto y revisar:

- `CursoId`
- `Nombre`
- `message`

Si el mensaje es `Nexus request failed with 404`, `400`, `401`, `403` o `AbortError`, eso indica que `ConsultarEstructura` no es el endpoint correcto o requiere otro body/header.

### Actividades

Se espera ver:

```text
[SIASE Plus Nexus] estructura Nexus analizada
[SIASE Plus Nexus] actividades proximas filtradas
```

Abrir `actividades proximas filtradas` y revisar:

- `total`
- `hoy`
- `semana`

Si `estructura Nexus analizada` muestra `evidencias: 0` para todos los cursos, entonces el endpoint `Estructura/ConsultarEstructura` no esta devolviendo las tareas/evidencias esperadas.

## Qué Debe Verificar El Modelo Con Navegador

### 1. Confirmar Sesion Nexus Capturada

En consola de la pagina SIASE:

```js
localStorage.getItem('UanlNexus7SesionStorage')
```

Debe existir en `deimos` despues de la captura. Si no existe, revisar logs de:

```text
SIASE Plus Nexus Capture
```

### 2. Confirmar Datos De Sesion

Ejecutar en consola:

```js
JSON.parse(localStorage.getItem('UanlNexus7SesionStorage') || '{}')
```

Debe tener:

```js
{
  Sesion: {
    Token: '...',
    AreaAcademicaId: ...,
    RolId: 5,
    SistemaId: 1
  },
  _cachedAt: ...
}
```

### 3. Confirmar Respuesta De Cursos

En la consola, copiar el token y probar:

```js
const ses = JSON.parse(localStorage.getItem('UanlNexus7SesionStorage'));
fetch('https://api.nexus.uanl.mx/WebApi/Curso/ConsultarCarpetaCursos', {
  method: 'POST',
  headers: {
    Token: ses.Sesion.Token,
    AreaAcademicaId: String(ses.Sesion.AreaAcademicaId),
    RolId: String(ses.Sesion.RolId || 5),
    SistemaId: '1',
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  body: JSON.stringify({ CarpetaId: 0, Pagina: 1, Paginacion: 50 })
}).then(r => r.json()).then(console.log)
```

Si CORS bloquea desde consola, revisar el log `SIASE Plus Nexus SW response` en el service worker.

### 4. Confirmar Endpoint De Actividades Correcto

Abrir DevTools en el iframe/pagina de Nexus y filtrar Network por:

```text
Estructura
Evidencia
Actividad
Tarea
Consultar
```

Cuando Nexus muestra el curso o lista tareas, identificar los endpoints reales. El widget actualmente asume:

```text
Estructura/ConsultarEstructura
```

pero puede que las tareas proximas vengan de otro endpoint.

Buscar requests con bodies que contengan:

```json
{"CursoId": ...}
```

o respuestas que contengan:

```text
FechaLimite
FechaFin
EvidenciaId
Descripcion
```

### 5. Confirmar Shape Real De La Respuesta

Si `ConsultarEstructura` responde pero `evidencias: 0`, copiar un ejemplo de respuesta y revisar si:

- las evidencias tienen otro nombre de propiedad;
- estan dentro de otro nodo;
- las fechas usan otros nombres;
- el endpoint devuelve unidades sin actividades;
- se requiere otro endpoint por unidad/tema.

## Estado Actual Del Problema

La autenticacion ya funciona. Los logs recientes mostraron:

```text
[SIASE Plus Nexus Capture] session found
[SIASE Plus Nexus] sesion Nexus capturada via iframe
[SIASE Plus Nexus] unidades de aprendizaje detectadas
```

Por lo tanto, el problema actual ya no es login. El problema actual esta en una de estas partes:

1. `ConsultarEstructura` se queda colgado o falla para algunas unidades.
2. `ConsultarEstructura` responde, pero no contiene evidencias/tareas.
3. Las actividades proximas usan otro endpoint de Nexus.
4. Las fechas/descripciones usan nombres de campos no cubiertos por el extractor actual.

## Siguiente Paso Recomendado

El modelo con navegador debe abrir Network en Nexus y encontrar el endpoint que usa la app real para mostrar tareas/evidencias proximas. En cuanto se tenga endpoint + body + shape de respuesta, actualizar en `src/content/career-landing.ts` la seccion que consulta estructuras por curso.
