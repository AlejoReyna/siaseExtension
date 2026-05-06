# Prompt: Extracción completa del kardex — promedio simple y promedio ponderado

> **Modo de ejecución: browser (Claude in Chrome).** Tienes acceso al navegador. Este prompt es autocontenido; no necesitas leer archivos del filesystem.

---

## Contexto del proyecto

Extensión Chrome (`UANLextension`) que moderniza el portal SIASE de la UANL (`deimos.dgi.uanl.mx`). El portal es HTML4 legacy servido por Progress WebSpeed. La extensión inyecta un dashboard en `eselcarrera.htm` y carga el kardex en un iframe oculto en background para mostrar el progreso académico sin que el alumno navegue manualmente.

---

## Estado actual del parser

### `src/types/kardex.ts` — tipos actuales

```ts
export interface KardexEntry {
  id: string;
  subject: string;
  credits?: number;   // créditos de esta materia (a veces no se detecta)
  score?: number;     // calificación (0–100)
  period?: string;    // semestre/período — actualmente NO se extrae
  rawText: string;
}

export interface KardexSummary {
  entries: KardexEntry[];
  totalCreditsCompleted: number;  // créditos acumulados
  totalCreditsRequired: number;   // constante 220
  progressPercent: number;        // (completados / 220) * 100
  average: number | undefined;    // promedio simple — a veces falla
  capturedAt: string;
}
```

### `src/utils/parser/kardex.ts` — lógica actual (resumida)

El parser recorre todos los `<tr>` del documento con `document.querySelectorAll('tr')` y clasifica cada fila por heurística:

- **Fila de promedio**: busca el patrón `/promedio[:\s]+(\d{2,3}[.,]\d{1,2})/i` en el texto de la fila, o un número decimal aislado entre 60 y 100 en una fila sin nombre de materia.
- **Fila de totales**: busca `total|suma|acumulado` en la primera celda o en toda la fila.
- **Fila de materia**: requiere al menos una palabra de 4+ letras; extrae calificación (2–3 dígitos enteros) y créditos (1–2 dígitos enteros distinto a la calificación).

**Problemas conocidos:**
- `period` nunca se extrae — el campo existe en el tipo pero siempre queda `undefined`.
- La heurística de créditos por materia puede confundir columnas si el kardex tiene un orden diferente al esperado.
- El promedio ponderado (`sum(score × credits) / sum(credits)`) no existe todavía.

---

## Tu tarea — Fase 1: Inspección del DOM real del kardex

Navega a `https://deimos.dgi.uanl.mx` en una sesión autenticada. Luego navega al kardex desde el menú del portal (normalmente llamado "Kardex" o "Historial Académico" en el menú izquierdo).

### 1.1 — Dump completo de todas las filas

Ejecuta esto en la consola del frame donde cargó el kardex:

```js
Array.from(document.querySelectorAll('tr')).map((tr, i) => ({
  i,
  celdas: Array.from(tr.cells).map((td, j) => ({
    j,
    texto: td.textContent?.replace(/\s+/g, ' ').trim(),
    colspan: td.colSpan > 1 ? td.colSpan : undefined,
  }))
})).filter(r => r.celdas.some(c => c.texto))
```

Copia el resultado completo. Necesito ver **todas** las filas, incluyendo encabezados, filas de períodos/semestres, materias, totales, y promedio.

### 1.2 — Identificar el índice exacto de cada columna

Con base en el dump anterior, identifica:

| Dato | Índice de columna (`j`) | Ejemplo de valor |
|------|------------------------|-----------------|
| Clave de materia | ? | `"CF1001"` |
| Nombre de materia | ? | `"CALCULO DIFERENCIAL"` |
| Créditos | ? | `"6"` |
| Calificación | ? | `"92"` |
| Período/Semestre | ? | `"ENE-JUN 2024"` o `"2024-1"` |
| Oportunidad | ? | `"ORD"`, `"EXT"`, etc. — si existe |

### 1.3 — Identificar filas especiales

Responde:
- ¿Hay filas de **encabezado de período** que separen semestres? (ej. una fila que solo diga `"ENE-JUN 2024"` sin datos de materia). Si sí, ¿cómo se ve en el dump?
- ¿Hay filas de **materias sin calificación** (cursando actualmente)? ¿Qué valor tiene la celda de calificación — vacía, guión, cero?
- ¿Hay materias con calificación **SD** (sin derecho), **NP** (no presentó), o similares?
- ¿Hay **equivalencias** o **convalidaciones**? ¿Se ven diferente a las materias normales?
- ¿La fila de totales tiene exactamente qué texto en su primera celda?
- ¿El promedio aparece en el HTML como un número en alguna celda, o solo está implícito?
- ¿El promedio que aparece en el HTML es el **promedio simple** (suma/cantidad) o el **promedio ponderado** (suma(cal×cred)/suma(cred))?

### 1.4 — Verificar cálculo manual del promedio ponderado

Toma las primeras 5 materias con calificación y créditos del dump. Calcula manualmente:

```
promedio_ponderado = sum(calificación × créditos) / sum(créditos)
```

Compara con el promedio que aparece en el HTML (si aparece). Esto confirma cuál fórmula usa SIASE.

---

## Tu tarea — Fase 2: Implementar el nuevo parser

Con los datos de la inspección, implementa lo siguiente. **Escribe el código directamente en los archivos del proyecto** (`src/types/kardex.ts` y `src/utils/parser/kardex.ts`).

### 2.1 — Actualizar `src/types/kardex.ts`

```ts
export interface KardexEntry {
  id: string;
  subjectKey?: string;   // clave de materia (ej. "CF1001")
  subject: string;       // nombre de la materia
  credits?: number;
  score?: number;
  scoreType?: 'ordinary' | 'extraordinary' | 'special' | 'equivalent' | 'no_show' | 'no_right';
  period?: string;       // semestre tal como aparece en el HTML
  rawText: string;
}

export interface KardexSummary {
  entries: KardexEntry[];
  totalCreditsCompleted: number;
  totalCreditsRequired: number;   // 220
  progressPercent: number;
  average: number | undefined;           // promedio simple del HTML (si existe) o calculado
  weightedAverage: number | undefined;   // promedio ponderado: sum(score×credits)/sum(credits)
  capturedAt: string;
}
```

### 2.2 — Reescribir `src/utils/parser/kardex.ts`

Reemplaza la heurística actual por **acceso directo a columnas por índice fijo**, usando los índices que encontraste en la Fase 1.

Estructura esperada:

```ts
const TOTAL_CREDITS_REQUIRED = 220;
const LOG = '[SIASE Plus Kardex Parser]';

// ← Llenar con los índices reales encontrados en el DOM
const COL = {
  subjectKey: 0,   // AJUSTAR
  subject:    1,   // AJUSTAR
  credits:    2,   // AJUSTAR
  score:      3,   // AJUSTAR
  period:     4,   // AJUSTAR — o -1 si viene de fila de encabezado, no de celda
};

export function parseKardexSummary(document: Document): KardexSummary {
  const rows = Array.from(document.querySelectorAll('tr'));
  const entries: KardexEntry[] = [];
  let totalCreditsCompleted = 0;
  let average: number | undefined;
  let currentPeriod: string | undefined; // se actualiza en filas de encabezado de período

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as HTMLTableRowElement;
    const cells = Array.from(row.cells).map(td => td.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    if (cells.every(c => !c)) continue;

    const allText = cells.join(' ');

    // Detectar fila de encabezado de período (si existe)
    // ← Ajustar condición según lo visto en el DOM
    // Detectar fila de totales
    // Detectar fila de promedio (si aparece en el HTML)
    // Detectar fila de materia normal usando COL indices

    // Para cada materia, detectar scoreType:
    // - SD / sin derecho → 'no_right'
    // - NP / no presentó → 'no_show'
    // - EQ / equivalencia → 'equivalent'
    // - número entero 0–100 con oportunidad = ORD → 'ordinary'
    // - número entero 0–100 con oportunidad = EXT → 'extraordinary'
  }

  // Calcular promedio ponderado con todas las materias que tienen score y credits
  const forWeighted = entries.filter(e => e.score !== undefined && e.credits !== undefined && e.credits > 0);
  const weightedAverage = forWeighted.length > 0
    ? Math.round(
        (forWeighted.reduce((sum, e) => sum + (e.score! * e.credits!), 0) /
         forWeighted.reduce((sum, e) => sum + e.credits!, 0)) * 100
      ) / 100
    : undefined;

  // Calcular promedio simple si no apareció en el HTML
  if (average === undefined) {
    const withScores = entries.filter(e => e.score !== undefined && e.score > 0);
    if (withScores.length > 0) {
      average = Math.round(
        (withScores.reduce((sum, e) => sum + e.score!, 0) / withScores.length) * 100
      ) / 100;
    }
  }

  // Fallback créditos completados si no hubo fila de totales
  if (totalCreditsCompleted === 0) {
    totalCreditsCompleted = entries
      .filter(e => (e.score ?? 0) >= 70 && e.credits)
      .reduce((sum, e) => sum + e.credits!, 0);
  }

  const progressPercent = Math.min((totalCreditsCompleted / TOTAL_CREDITS_REQUIRED) * 100, 100);

  console.log(LOG, 'resultado final', {
    entries: entries.length, totalCreditsCompleted, progressPercent, average, weightedAverage
  });

  return {
    entries, totalCreditsCompleted, totalCreditsRequired: TOTAL_CREDITS_REQUIRED,
    progressPercent, average, weightedAverage, capturedAt: new Date().toISOString(),
  };
}
```

### 2.3 — Actualizar `src/content/career-landing.ts`

En la función `updateCreditProgressUI`, agrega la actualización del promedio ponderado en el panel `#siase-insight-panel-average`. Si el promedio ponderado difiere del simple, muéstralos separados:

```ts
// En el panel de promedio:
// Línea principal → promedio ponderado (si existe)
// Subtexto → "Ponderado · X materias"
// Si no hay ponderado, caer al promedio simple con subtexto "Promedio simple"
```

### 2.4 — Verificar con `npx tsc --noEmit`

Después de escribir el código, corre el check de TypeScript para confirmar que no hay errores:

```bash
cd /Users/alexis/Documents/UANLextension && npx tsc --noEmit
```

---

## Reglas del proyecto

- Los parsers son funciones puras sobre `Document` — sin fetch, sin storage, sin mensajes.
- `try/catch` en accesos frágiles al DOM de SIASE.
- TypeScript estricto, sin `any`.
- `KardexSummary` vive en `src/types/kardex.ts` (no en el parser) para evitar imports circulares con `storage.ts`.
- El total de créditos requeridos = 220 es una constante en el parser, no un argumento.
