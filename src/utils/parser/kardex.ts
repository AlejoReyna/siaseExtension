import type { KardexEntry, KardexSummary } from '@/types/kardex';

const LOG = '[SIASE Plus Kardex Parser]';

// Índices de columna reales, verificados por inspección de DOM en sesión autenticada
const COL = {
  semesterInPlan: 0,  // "1"–"9" (semestre del plan de estudios)
  // j=1: modalidad, siempre "1", se ignora
  subjectKey:     2,  // clave de materia, ej. "605", "843"
  subject:        3,  // nombre de materia en mayúsculas
  opp:            [4, 5, 6, 7, 8, 9],  // oportunidades 1ª–6ª
  labs:           10, // número = calificación de lab; "L" = es materia de laboratorio
} as const;

// Los créditos por materia NO están en la tabla del kardex.
// Solo el total acumulado aparece en un <DIV> al final del documento con este patrón:
// "TOTAL..............: 138 de 220"
const CREDIT_TOTAL_PATTERN = /TOTAL[.\s]+:\s*(\d+)\s*de\s*(\d+)/i;
const SUBJECT_TOTAL_PATTERN =
  /materias?(?:\s+aprobadas?)?[.\s:]+(\d+)\s+de\s+(\d+)/i;
const AVERAGE_PATTERN = /promedio(?:\s+general)?[.\s:]*([6-9]\d|100)(?:[.,](\d{1,2}))?/i;

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function extractPlanName(document: Document): string | undefined {
  for (const row of Array.from(document.querySelectorAll<HTMLTableRowElement>('tr'))) {
    const cells = Array.from(row.cells)
      .map((cell) => cleanText(cell.textContent))
      .filter(Boolean);
    const labelIndex = cells.findIndex((value) =>
      /^(?:plan|plan\s+de\s+estudios|modelo\s+acad[eé]mico)\s*:?\s*$/i.test(value)
    );
    if (labelIndex === -1) continue;

    const value = cells
      .slice(labelIndex + 1)
      .find(
        (candidate) =>
          candidate.length <= 120 &&
          !/\b(?:matr[ií]cula|promedio|total|materia)\b/i.test(candidate)
      );
    if (value) return value;
  }

  const headerText = Array.from(
    document.querySelectorAll<HTMLElement>(
      '#noof, [data-plan], [data-plan-name], table td, table th, font, b, strong, div'
    )
  )
    .slice(0, 80)
    .map((element) => cleanText(element.textContent))
    .filter((value) => value.length >= 4 && value.length <= 120);

  for (const value of headerText) {
    const labeled = value.match(/\bplan(?:\s+de\s+estudios)?\b\s*:?\s*(.+)$/i)?.[1];
    const candidate = cleanText(labeled);
    if (
      candidate &&
      candidate.length <= 120 &&
      !/\b(?:matr[ií]cula|promedio|total|materia)\b/i.test(candidate)
    ) {
      return candidate;
    }
  }

  for (const value of headerText) {
    const candidate = cleanText(value);
    if (
      /(?:modelo|plan)\b/i.test(candidate) &&
      !/\b(?:matr[ií]cula|promedio|total|materia)\b/i.test(candidate) &&
      !/^(?:de\s+estudios|acad[eé]mico)?$/i.test(candidate)
    ) {
      return candidate;
    }
  }
  return undefined;
}

function parseScore(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'NP' || trimmed === 'NC' || trimmed === 'SD') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function isHeaderRow(cells: string[]): boolean {
  // La fila de encabezado tiene "Sem." en j=0 y "Materia" en j=3
  return cells[0]?.trim() === 'Sem.' || cells[3]?.trim() === 'Materia';
}

function isSubjectRow(cells: string[]): boolean {
  // Una fila de materia válida tiene un número en j=0 (semestre) y texto en j=3 (nombre)
  const sem = cells[COL.semesterInPlan]?.trim();
  const name = cells[COL.subject]?.trim();
  return /^\d+$/.test(sem ?? '') && (name?.length ?? 0) > 0;
}

function extractCreditsFromBody(bodyText: string): { completed: number; required: number } | null {
  const match = bodyText.match(CREDIT_TOTAL_PATTERN);
  if (!match) return null;
  const completed = parseInt(match[1], 10);
  const required = parseInt(match[2], 10);
  if (!Number.isFinite(completed) || !Number.isFinite(required) || required === 0) return null;
  return { completed, required };
}

function extractAverageFromBody(bodyText: string): number | undefined {
  const match = bodyText.match(AVERAGE_PATTERN);
  if (!match) return undefined;

  const decimal = match[2] ? `.${match[2]}` : '';
  const value = Number(`${match[1]}${decimal}`);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined;
}

export function parseKardexSummary(document: Document): KardexSummary {
  // ── 1. Extraer créditos del body (fuera de las tablas, en DIVs al final)
  const bodyText = document.body?.innerText ?? document.body?.textContent ?? '';
  const credits = extractCreditsFromBody(bodyText);
  const subjectTotalsMatch = bodyText.match(SUBJECT_TOTAL_PATTERN);
  const subjectTotals = subjectTotalsMatch
    ? {
        approved: Number(subjectTotalsMatch[1]),
        total: Number(subjectTotalsMatch[2])
      }
    : undefined;
  const domAverage = extractAverageFromBody(bodyText);
  const planName = extractPlanName(document);

  console.log(LOG, 'créditos extraídos del body', {
    raw: bodyText.match(/TOTAL.{0,30}/i)?.[0],
    resultado: credits,
  });
  console.log(LOG, 'promedio extraído del body', { resultado: domAverage });

  // ── 2. Parsear filas de materias de la tabla principal
  // Estrategia: buscar la tabla que contiene una fila con "Sem." en j=0 (encabezado del kardex).
  // Si no la encuentra, usar la tabla con más filas <tr> como fallback.
  const tables = Array.from(document.querySelectorAll('table'));
  let mainTable: Element | null = null;

  for (const tbl of tables) {
    const headerRow = tbl.querySelector('tr');
    if (!headerRow) continue;
    const firstCell = (headerRow as HTMLTableRowElement).cells[0]?.textContent?.trim() ?? '';
    if (firstCell === 'Sem.' || firstCell === 'Sem') {
      mainTable = tbl;
      break;
    }
  }

  if (!mainTable && tables.length > 0) {
    // Fallback: la tabla con más filas
    mainTable = tables.reduce((best, tbl) =>
      tbl.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? tbl : best
    );
  }

  console.log(LOG, `tabla principal seleccionada: ${mainTable ? mainTable.querySelectorAll('tr').length : 0} filas (de ${tables.length} tablas)`);

  const rows = mainTable
    ? Array.from(mainTable.querySelectorAll('tr'))
    : Array.from(document.querySelectorAll('tr'));

  console.log(LOG, `tabla principal: ${rows.length} filas`);

  const entries: KardexEntry[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as HTMLTableRowElement;
    const cells = Array.from(row.cells).map(
      (td) => td.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    );

    if (isHeaderRow(cells)) continue;
    if (!isSubjectRow(cells)) {
      if (cells.some((c) => c.length > 0)) {
        console.log(LOG, `[fila ${index}] ignorada`, { cells });
      }
      continue;
    }

    const semesterInPlan = cells[COL.semesterInPlan]?.trim() ?? '';
    const subjectKey = cells[COL.subjectKey]?.trim() ?? '';
    const subject = cells[COL.subject]?.trim() ?? '';

    // ── Calificación final: primera oportunidad aprobatoria (≥70) de izquierda a derecha
    let score: number | undefined;
    for (const oppIdx of COL.opp) {
      const raw = cells[oppIdx] ?? '';
      const n = parseScore(raw);
      if (n !== undefined && n >= 70) {
        score = n;
        break;
      }
    }

    // ── Laboratorio (j=10)
    const labRaw = cells[COL.labs]?.trim() ?? '';
    const isLabSubject = labRaw === 'L';
    const labScoreParsed = isLabSubject ? undefined : parseScore(labRaw);
    const labScore = labScoreParsed !== undefined ? labScoreParsed : undefined;

    const entry: KardexEntry = {
      id: `${index}-${subjectKey}-${subject.substring(0, 15)}`,
      subjectKey,
      subject,
      semesterInPlan,
      score,
      labScore,
      isLabSubject,
      passed: score !== undefined,
      rawText: cells.join(' | '),
    };

    console.log(LOG, `[fila ${index}] materia`, {
      subjectKey,
      subject,
      semesterInPlan,
      score,
      labScore,
      isLabSubject,
      passed: entry.passed,
    });

    entries.push(entry);
  }

  // ── 3. Promedio simple de materias aprobadas
  const passed = entries.filter((e) => e.passed && e.score !== undefined);

  // Log de todos los scores para diagnosticar valores fuera de rango
  console.log(LOG, 'scores de materias aprobadas', {
    count: passed.length,
    scores: passed.map((e) => ({ key: e.subjectKey, subject: e.subject.slice(0, 20), score: e.score })),
  });

  const rawSum = passed.reduce((sum, e) => sum + (e.score ?? 0), 0);
  const rawAverage = passed.length > 0 ? rawSum / passed.length : undefined;

  // Guard: el promedio debe estar entre 0 y 100; si no, hay un error de parsing
  const calculatedAverage =
    rawAverage !== undefined && rawAverage >= 0 && rawAverage <= 100
      ? Math.round(rawAverage * 100) / 100
      : undefined;
  const average = domAverage ?? calculatedAverage;

  if (rawAverage !== undefined && (rawAverage < 0 || rawAverage > 100)) {
    console.error(LOG, `promedio fuera de rango (${rawAverage}) — error de parsing`, {
      rawSum,
      count: passed.length,
      scores: passed.map((e) => e.score),
    });
  }

  // ── 4. Totales
  const totalCreditsCompleted = credits?.completed ?? 0;
  const totalCreditsRequired = credits?.required ?? 0;
  const approvedSubjects =
    subjectTotals &&
    Number.isFinite(subjectTotals.approved) &&
    subjectTotals.approved >= 0
      ? subjectTotals.approved
      : undefined;
  const totalSubjects =
    subjectTotals && Number.isFinite(subjectTotals.total) && subjectTotals.total > 0
      ? subjectTotals.total
      : undefined;
  const rawProgress =
    credits && credits.required > 0
      ? (credits.completed / credits.required) * 100
      : approvedSubjects !== undefined && totalSubjects !== undefined
        ? (approvedSubjects / totalSubjects) * 100
        : undefined;
  const progressPercent =
    rawProgress === undefined
      ? undefined
      : Math.max(0, Math.min(100, Math.round(rawProgress)));

  console.log(LOG, 'resultado final', {
    entries: entries.length,
    passed: passed.length,
    totalCreditsCompleted,
    totalCreditsRequired,
    progressPercent,
    average,
  });

  return {
    entries,
    planName,
    approvedCredits: credits?.completed,
    totalCredits: credits?.required,
    approvedSubjects,
    totalSubjects,
    totalCreditsCompleted,
    totalCreditsRequired,
    progressPercent,
    average,
    capturedAt: new Date().toISOString(),
  };
}
