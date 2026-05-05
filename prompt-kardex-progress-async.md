# Prompt de implementación: Promedio, Progreso de Créditos y Actividades Próximas

> **Este prompt es autocontenido.** No necesitas acceso al filesystem local — todo el código relevante está embebido aquí. Eres un agente con acceso al navegador (Claude in Chrome) trabajando sobre la extensión Chrome `UANLextension` para el portal SIASE de la UANL.

---

## Contexto del proyecto

Es una extensión Chrome que intercepta las páginas del portal estudiantil SIASE (UANL) y las reemplaza con un dashboard moderno. El portal original es HTML4 legacy servido desde `https://deimos.dgi.uanl.mx`. La extensión inyecta content scripts en cada frame del portal.

**Stack:** TypeScript + React (popup) + Vite + Zustand + `chrome.storage.local`.

**Flujo de datos establecido:**
1. El alumno navega a una página del portal (ej. kardex).
2. El content script de esa página parsea el DOM y persiste datos en `chrome.storage.local`.
3. El dashboard (`eselcarrera.htm`) lee esos datos de storage al inicializarse — nunca espera scraping en tiempo real.

---

## Código actual de los archivos relevantes

### `src/utils/parser/dom.ts`
```ts
export function textContent(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
export function rowsFromTable(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.querySelectorAll('tr'));
}
export function cellsFromRow(row: HTMLTableRowElement): string[] {
  return Array.from(row.cells).map((cell) => textContent(cell));
}
```

### `src/utils/parser/kardex.ts` ← **MODIFICAR**
```ts
import { cellsFromRow } from './dom';

export interface KardexEntry {
  id: string;
  subject: string;
  score?: number;
  rawText: string;
}

export function parseKardex(document: Document): KardexEntry[] {
  return Array.from(document.querySelectorAll('tr'))
    .map((row, index): KardexEntry | null => {
      const cells = cellsFromRow(row as HTMLTableRowElement);
      const subject = cells.find((cell) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(cell));
      if (!subject) return null;
      const rawScore = Number(cells.find((cell) => /^\d{1,3}$/.test(cell)));
      return {
        id: `${index}-${subject}`,
        subject,
        score: Number.isFinite(rawScore) && rawScore > 0 ? rawScore : undefined,
        rawText: cells.join(' | '),
      };
    })
    .filter((entry): entry is KardexEntry => entry !== null);
}
```

### `src/content/pages/kardex-page.ts` ← **MODIFICAR**
```ts
import { parseKardex } from '@/utils/parser/kardex';

export async function enhanceKardexPage(frameDocument: Document): Promise<void> {
  frameDocument.body.classList.add('siase-plus-kardex-page');
  parseKardex(frameDocument);
  // BUG: no persiste nada, no envía nada al dashboard
}
```

### `src/types/grades.ts`
```ts
export type GradeStatus = 'passed' | 'failed' | 'pending' | 'unknown';

export interface Grade {
  id: string;
  subject: string;
  group?: string;
  teacher?: string;
  opportunity?: string;
  score?: number;
  status: GradeStatus;
  rawText: string;
}

export interface GradeChange {
  id: string;
  subject: string;
  previousScore?: number;
  nextScore?: number;
  previousStatus?: GradeStatus;
  nextStatus: GradeStatus;
}

export interface GradeSnapshot {
  grades: Grade[];
  capturedAt: string;
}
```

### `src/types/storage.ts` ← **MODIFICAR**
```ts
import type { GradeSnapshot } from './grades';
import type { MenuItem } from './menu';
import type { ScheduleSlot } from './schedule';
import type { StudentInfo, StudentStatus } from './student';

export interface StorageSchema {
  studentInfo: StudentInfo;
  studentStatus: StudentStatus;
  gradeSnapshot: GradeSnapshot;
  scheduleSlots: ScheduleSlot[];
  menuItems: MenuItem[];
  pinnedMenuIds: string[];
  // FALTA: kardexSnapshot
}

export type StorageKey = keyof StorageSchema;
```

### `src/types/student.ts`
```ts
export interface StudentInfo {
  name: string;
  matricula: string;
  program?: string;
  faculty?: string;
  plan?: string;
}

export interface StudentStatus {
  label: string;
  rawText: string;
  updatedAt: string;
}
```

### `src/utils/storage.ts`
```ts
import type { StorageKey, StorageSchema } from '@/types/storage';

export async function getStorageValue<K extends StorageKey>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageSchema[K] | undefined;
}

export async function setStorageValue<K extends StorageKey>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
```

### `src/utils/siase-url.ts`
```ts
import type { PortalSession, SiaseEndpoint, SiasePage } from '@/types/siase';

export const SIASE_ENDPOINTS: SiaseEndpoint[] = [
  { page: 'grades',          broker: 'wspd_cgi.sh', path: '/cgi-bin/wspd_cgi.sh/econcfs01.htm' },
  { page: 'schedule',        broker: 'wspd_cgi.sh', path: '/cgi-bin/wspd_cgi.sh/echalm01.htm' },
  { page: 'kardex',          broker: 'wspd_cgi.sh', path: '/cgi-bin/wspd_cgi.sh/econkdx01.htm' },
  { page: 'personalData',    broker: 'wspd_cgi.sh', path: '/cgi-bin/wspd_cgi.sh/edatal01.htm' },
  { page: 'enrollmentDates', broker: 'wspd_cgi.sh', path: '/cgi-bin/wspd_cgi.sh/ecohoinsint01.htm' },
  { page: 'studentStatus',   broker: 'wspd_cgi.sh', path: '/cgi-bin/wspd_cgi.sh/ecSitEst01.htm' },
];

export function detectSiasePage(url: URL): SiasePage | null {
  return SIASE_ENDPOINTS.find((e) => url.pathname.endsWith(e.path))?.page ?? null;
}
```

### `src/content/router.ts`
```ts
import { initializeCenterGameUi } from './center-ui';
import { enhanceEnrollmentDatesPage } from './pages/enrollment-dates-page';
import { enhanceGradesPage } from './pages/grades-page';
import { enhanceKardexPage } from './pages/kardex-page';
import { enhancePersonalDataPage } from './pages/personal-data-page';
import { enhanceSchedulePage } from './pages/schedule-page';
import { enhanceStudentStatusPage } from './pages/student-status-page';
import { detectSiasePage } from '@/utils/siase-url';

export async function routeSiasePage(url: URL, frameDocument: Document): Promise<void> {
  if (window.name === 'center') initializeCenterGameUi(frameDocument, url);
  const page = detectSiasePage(url);
  if (page === 'grades')          await enhanceGradesPage(frameDocument);
  if (page === 'schedule')        await enhanceSchedulePage(frameDocument);
  if (page === 'kardex')          await enhanceKardexPage(frameDocument);
  if (page === 'personalData')    await enhancePersonalDataPage(frameDocument);
  if (page === 'enrollmentDates') await enhanceEnrollmentDatesPage(frameDocument);
  if (page === 'studentStatus')   await enhanceStudentStatusPage(frameDocument);
}

void routeSiasePage(new URL(location.href), document);
```

### `src/content/pages/grades-page.ts` ← patrón de referencia a seguir
```ts
import type { Grade } from '@/types/grades';
import { parseGrades } from '@/utils/parser/grades';
import { setStorageValue } from '@/utils/storage';

export async function enhanceGradesPage(frameDocument: Document): Promise<Grade[]> {
  frameDocument.body.classList.add('siase-plus-grades-page');
  const grades = parseGrades(frameDocument);
  await setStorageValue('gradeSnapshot', { grades, capturedAt: new Date().toISOString() });
  void chrome.runtime.sendMessage({ type: 'REFRESH_GRADES', grades });
  return grades;
}
```

---

## Feature 1 — Promedio y progreso de créditos desde el kardex

### Qué falta

El kardex (`econkdx01.htm`) renderiza una tabla HTML4 legacy con:
- Una fila por materia cursada: clave, nombre, créditos, calificación, período.
- Una o más filas de **totales** al final con el acumulado de créditos.
- Una celda con el **promedio general** (texto tipo `"Promedio: 87.40"` o celda numérica decimal).

El total de créditos del plan de estudios es **220** (constante fija).

### Tarea 1.A — Inspeccionar el DOM del kardex con el navegador

Navega a `https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/econkdx01.htm` en una sesión autenticada.

Ejecuta en la consola del navegador:

```js
// Ver todas las filas de la tabla y sus celdas
Array.from(document.querySelectorAll('tr')).map((tr, i) => ({
  i,
  cells: Array.from(tr.cells).map(td => td.textContent?.replace(/\s+/g,' ').trim())
}))
```

Identifica:
- ¿Qué índice de columna tiene los créditos? ¿Y la calificación?
- ¿Cómo se ve la fila de totales? ¿Qué texto tiene su primera celda?
- ¿Dónde aparece el promedio? ¿Es una celda aislada o viene con label?

Con esa información, implementa lo siguiente.

### Tarea 1.B — Extender el parser del kardex

**Archivo a modificar: `src/utils/parser/kardex.ts`**

Reemplaza el contenido con:

```ts
import { cellsFromRow } from './dom';

export interface KardexEntry {
  id: string;
  subject: string;
  credits?: number;   // créditos de esta materia
  score?: number;     // calificación
  period?: string;    // semestre/período
  rawText: string;
}

export interface KardexSummary {
  entries: KardexEntry[];
  totalCreditsCompleted: number;   // extraído de la fila de totales del DOM
  totalCreditsRequired: number;    // constante: 220
  progressPercent: number;         // Math.min((completados / 220) * 100, 100)
  average: number | undefined;     // promedio general del DOM; undefined si no se pudo extraer
  capturedAt: string;              // ISO 8601
}

const TOTAL_CREDITS_REQUIRED = 220;

export function parseKardexSummary(document: Document): KardexSummary {
  const rows = Array.from(document.querySelectorAll('tr'));
  const entries: KardexEntry[] = [];
  let totalCreditsCompleted = 0;
  let average: number | undefined;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as HTMLTableRowElement;
    const cells = cellsFromRow(row);

    // --- Detectar fila de totales ---
    // Ajusta este patrón según lo que veas en el DOM real
    const firstCell = cells[0] ?? '';
    if (/total|sum/i.test(firstCell)) {
      // Buscar el número más grande en la fila como créditos totales
      for (const cell of cells) {
        const n = Number(cell.replace(',', '.'));
        if (Number.isFinite(n) && n > 10 && n <= 300) {
          totalCreditsCompleted = n;
          break;
        }
      }
      continue;
    }

    // --- Detectar promedio ---
    // Ajusta según la forma en que aparece en el DOM real
    const promedioMatch = cells.join(' ').match(/promedio[:\s]+(\d{2,3}[.,]\d{1,2})/i);
    if (promedioMatch) {
      average = parseFloat(promedioMatch[1].replace(',', '.'));
      continue;
    }

    // --- Fila de materia normal ---
    const subject = cells.find((cell) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(cell));
    if (!subject) continue;

    // Calificación: número entero 1–100
    const rawScore = cells.find((cell) => /^\d{2,3}$/.test(cell.trim()));
    const score = rawScore ? Number(rawScore) : undefined;

    // Créditos: número pequeño (1–20), diferente columna a la calificación
    // AJUSTA el índice de columna según lo que veas en el DOM real
    const rawCredits = cells.find(
      (cell) => /^\d{1,2}$/.test(cell.trim()) && Number(cell) !== score && Number(cell) > 0
    );
    const credits = rawCredits ? Number(rawCredits) : undefined;

    entries.push({
      id: `${index}-${subject}`,
      subject,
      credits,
      score,
      rawText: cells.join(' | '),
    });
  }

  // Fallback: si no encontramos totales en una fila dedicada,
  // suma los créditos de materias aprobadas (score >= 70)
  if (totalCreditsCompleted === 0 && entries.some((e) => e.credits)) {
    totalCreditsCompleted = entries
      .filter((e) => e.score !== undefined && e.score >= 70 && e.credits)
      .reduce((sum, e) => sum + (e.credits ?? 0), 0);
  }

  // Fallback: si no encontramos promedio en el DOM, calcularlo
  if (average === undefined) {
    const withScores = entries.filter((e) => e.score !== undefined);
    if (withScores.length > 0) {
      average = withScores.reduce((sum, e) => sum + (e.score ?? 0), 0) / withScores.length;
      average = Math.round(average * 100) / 100;
    }
  }

  const progressPercent = Math.min(
    (totalCreditsCompleted / TOTAL_CREDITS_REQUIRED) * 100,
    100
  );

  return {
    entries,
    totalCreditsCompleted,
    totalCreditsRequired: TOTAL_CREDITS_REQUIRED,
    progressPercent,
    average,
    capturedAt: new Date().toISOString(),
  };
}
```

> **Importante:** Los comentarios `AJUSTA` son los puntos donde necesitarás calibrar los índices/patrones según lo que hayas observado en el DOM real en el paso 1.A.

### Tarea 1.C — Agregar `kardexSnapshot` al StorageSchema

**Archivo a modificar: `src/types/storage.ts`**

```ts
import type { GradeSnapshot } from './grades';
import type { KardexSummary } from './parser/kardex'; // ajusta el import path si mueves el tipo
import type { MenuItem } from './menu';
import type { ScheduleSlot } from './schedule';
import type { StudentInfo, StudentStatus } from './student';

export interface StorageSchema {
  studentInfo: StudentInfo;
  studentStatus: StudentStatus;
  gradeSnapshot: GradeSnapshot;
  scheduleSlots: ScheduleSlot[];
  menuItems: MenuItem[];
  pinnedMenuIds: string[];
  kardexSnapshot: KardexSummary;  // ← NUEVO
}

export type StorageKey = keyof StorageSchema;
```

> Si TypeScript se queja del import circular (porque `KardexSummary` está en `utils/parser/kardex.ts` pero `storage.ts` ya es importado desde ahí), mueve `KardexSummary` e `KardexEntry` a `src/types/kardex.ts` y ajusta los imports en ambos archivos.

### Tarea 1.D — Actualizar el page handler del kardex

**Archivo a modificar: `src/content/pages/kardex-page.ts`**

```ts
import type { KardexSummary } from '@/utils/parser/kardex';
import { parseKardexSummary } from '@/utils/parser/kardex';
import { setStorageValue } from '@/utils/storage';

export async function enhanceKardexPage(frameDocument: Document): Promise<KardexSummary> {
  frameDocument.body.classList.add('siase-plus-kardex-page');
  const summary = parseKardexSummary(frameDocument);
  await setStorageValue('kardexSnapshot', summary);
  // Fire-and-forget — igual que grades-page.ts con REFRESH_GRADES
  void chrome.runtime.sendMessage({ type: 'REFRESH_KARDEX', summary });
  return summary;
}
```

### Tarea 1.E — Conectar el dashboard al storage de forma asíncrona

**Archivo a modificar: `src/content/career-landing.ts`**

En la función de inicialización del dashboard (busca `initializeCareerLanding` o el equivalente que monta el dashboard en `eselcarrera.htm`), agrega una lectura asíncrona de storage al arrancar:

```ts
import { getStorageValue } from '@/utils/storage';

// Dentro de la función de inicialización del dashboard:
async function loadKardexData() {
  const snapshot = await getStorageValue('kardexSnapshot');
  if (!snapshot) {
    // Primera visita: el alumno no ha navegado al kardex aún
    updateCreditProgressUI({
      progressPercent: 0,
      totalCreditsCompleted: 0,
      totalCreditsRequired: 220,
      average: undefined,
      isEmpty: true,
    });
    return;
  }
  updateCreditProgressUI({
    progressPercent: snapshot.progressPercent,
    totalCreditsCompleted: snapshot.totalCreditsCompleted,
    totalCreditsRequired: snapshot.totalCreditsRequired,
    average: snapshot.average,
    isEmpty: false,
  });
}

// Llamar sin await para no bloquear el render inicial del dashboard
void loadKardexData();
```

La función `updateCreditProgressUI` debe actualizar los elementos del DOM del dashboard que ya existen:
- La barra de progreso de créditos (busca el elemento con el porcentaje hardcodeado actual).
- El texto de créditos (`"108 / 220 créditos"` o `"Visita tu kardex para ver tu progreso"` si `isEmpty`).
- El promedio si está disponible (`"Promedio: 87.4"`).

---

## Feature 2 — Diagnóstico de actividades próximas de Nexus

### Contexto

El flujo de autenticación de Nexus **ya funciona**. El problema está en que el widget a veces no muestra actividades aunque el token se captura correctamente.

Los últimos logs confirmaron que llega hasta:
```
[SIASE Plus Nexus] sesion Nexus capturada via iframe
[SIASE Plus Nexus] unidades de aprendizaje detectadas
```

El fallo ocurre después: en `ConsultarEstructura` o en el extractor de evidencias.

### Flujo completo implementado (referencia)

1. Dashboard carga → `scheduleNexusWidget()` con delay 300ms.
2. `obtenerTokenNexus()` abre Nexus en iframe oculto via `#idfrNexus`.
3. `nexus-session-capture.ts` captura `localStorage['UanlNexus7SesionStorage']` desde `plataformanexus.uanl.mx` y envía `NEXUS_SESSION_CAPTURED` al service worker.
4. Dashboard consulta `GET_CAPTURED_NEXUS_SESSION` → obtiene token.
5. `POST api.nexus.uanl.mx/WebApi/Curso/ConsultarCarpetaCursos` con body `{"CarpetaId":0,"Pagina":1,"Paginacion":50}`.
6. Por cada curso, `POST api.nexus.uanl.mx/WebApi/Estructura/ConsultarEstructura` con `{"CursoId": n}`.
7. Extractor recursivo `extractEvidencesFromStructure()` busca objetos con campos de fecha (`FechaLimite`, `FechaFin`, `FechaCierre`, `FechaVencimiento`) y descripción (`Descripcion`, `Nombre`, `Titulo`).
8. `filtrarActividades()` conserva las de los próximos **7 días**.

### Tarea 2.A — Inspeccionar el Network de Nexus con el navegador

Abre DevTools → Network en la página `eselcarrera.htm` y filtra por `nexus.uanl.mx`. Espera a que el widget intente cargar actividades.

Busca:
- La respuesta de `ConsultarCarpetaCursos`: ¿cuántos cursos retorna? ¿Tiene la estructura `Carpetas[].Cursos[]` o es plana?
- Las respuestas de `ConsultarEstructura`: ¿retornan 200 o 404/500? ¿El body tiene evidencias/tareas?
- Si `ConsultarEstructura` no tiene actividades, filtra el Network de Nexus real (abre `plataformanexus.uanl.mx` en otra pestaña) y busca qué endpoint usa la app para mostrar tareas pendientes.

### Tarea 2.B — Aplicar correcciones según el diagnóstico

**Caso A: `ConsultarEstructura` responde pero `evidencias: 0`**

En `career-landing.ts`, localiza `extractEvidencesFromStructure` y amplía los nombres de campos aceptados:

```ts
// Campos de fecha — agregar todos los que veas en la respuesta real:
const DATE_FIELDS = [
  'FechaLimite', 'FechaFin', 'FechaCierre', 'FechaVencimiento',
  'FechaEntrega', 'Fecha', 'DueDate', 'deadline'
];

// Campos de texto — agregar los que veas:
const TEXT_FIELDS = [
  'Descripcion', 'Nombre', 'Titulo', 'Title', 'nombre', 'titulo'
];
```

**Caso B: La ventana de 7 días es muy estrecha**

Localiza `filtrarActividades` y amplía a 21 días:

```ts
const UPCOMING_DAYS = 21;
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() + UPCOMING_DAYS);
return actividades.filter((a) => new Date(a.deadline) <= cutoff);
```

**Caso C: El endpoint real de actividades es diferente**

Si en el Network de Nexus encuentras un endpoint diferente (ej. `Evidencia/ConsultarEvidenciasPendientes` o `Tarea/ObtenerTareasPorCurso`), reemplaza la llamada a `ConsultarEstructura` en `career-landing.ts` con el endpoint correcto, usando el mismo patrón de `NEXUS_API_REQUEST` al service worker.

**Caso D: El widget se queda en skeleton sin mostrar "sin actividades"**

Localiza el render del widget en `career-landing.ts` y asegúrate de que el estado vacío se muestra explícitamente:

```ts
// Después de filtrar actividades:
if (actividades.length === 0) {
  widgetEl.innerHTML = `
    <div class="nexus-empty">
      <span>Sin actividades próximas en Nexus</span>
    </div>
  `;
  return;
}
```

---

## Reglas del proyecto a respetar

1. **No bloquees el render** del dashboard esperando datos — usa `void loadKardexData()` y actualiza el DOM cuando lleguen.
2. **Los parsers son funciones puras** sobre `Document` — no hacen fetch, no tocan storage, no envían mensajes. Solo DOM → datos.
3. **`try/catch` en parsers** al acceder estructuras DOM de SIASE — son frágiles, nunca lanzar errores no manejados.
4. **Total de créditos = 220** es una constante. Defínela una sola vez en el parser.
5. **TypeScript estricto** — sin `any`, sin supresiones sin comentario justificado.
6. **Después de cada cambio de archivo**, corre `npm run build` en la raíz del proyecto y confirma que no hay errores de TypeScript ni de Vite.
7. Si mueves tipos a un archivo nuevo (`src/types/kardex.ts`), actualiza todos los imports que los referencien.

---

## Orden de implementación sugerido

1. Navegar al kardex en el navegador e inspeccionar el DOM (Tarea 1.A).
2. Reescribir `src/utils/parser/kardex.ts` con los patrones reales observados (Tarea 1.B).
3. Actualizar `src/types/storage.ts` con `kardexSnapshot` (Tarea 1.C).
4. Actualizar `src/content/pages/kardex-page.ts` (Tarea 1.D).
5. Conectar el dashboard en `career-landing.ts` (Tarea 1.E).
6. `npm run build` — verificar que compila limpio.
7. Inspeccionar el Network de Nexus (Tarea 2.A).
8. Aplicar la corrección de Nexus correspondiente (Tarea 2.B).
9. `npm run build` final.
