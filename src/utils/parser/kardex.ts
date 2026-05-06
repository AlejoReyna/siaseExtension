import type { KardexEntry, KardexSummary } from '@/types/kardex';
import { cellsFromRow } from './dom';

const TOTAL_CREDITS_REQUIRED = 220;
const LOG = '[SIASE Plus Kardex Parser]';

export function parseKardexSummary(document: Document): KardexSummary {
  const rows = Array.from(document.querySelectorAll('tr'));
  const entries: KardexEntry[] = [];
  let totalCreditsCompleted = 0;
  let average: number | undefined;

  console.log(LOG, `iniciando parse — ${rows.length} filas encontradas`);

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as HTMLTableRowElement;
    const cells = cellsFromRow(row);
    if (cells.length === 0) continue;

    const allText = cells.join(' ');

    // ── 1. Detectar promedio con label explícito (ej. "Promedio: 87.40")
    const promedioMatch = allText.match(/promedio[:\s]+(\d{2,3}[.,]\d{1,2})/i);
    if (promedioMatch) {
      average = parseFloat(promedioMatch[1].replace(',', '.'));
      console.log(LOG, `[fila ${index}] promedio detectado con label: ${average}`, { cells });
      continue;
    }

    // ── 1b. Detectar promedio como número decimal aislado en fila sin nombre de materia
    if (average === undefined) {
      const hasSubjectName = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(allText);
      if (!hasSubjectName) {
        const decimalCell = cells.find((c) => /^\d{2,3}[.,]\d{2}$/.test(c.trim()));
        if (decimalCell) {
          const candidate = parseFloat(decimalCell.replace(',', '.'));
          if (candidate >= 60 && candidate <= 100) {
            average = candidate;
            console.log(LOG, `[fila ${index}] promedio detectado como decimal aislado: ${average}`, { cells });
            continue;
          }
        }
      }
    }

    // ── 2. Detectar fila de TOTALES
    const firstCell = cells[0]?.trim() ?? '';
    const isTotalsRow =
      /total|suma|acumulado|cr[eé]ditos\s+total/i.test(firstCell) ||
      /total|suma|acumulado/i.test(allText);

    if (isTotalsRow) {
      const prevTotal = totalCreditsCompleted;
      for (const cell of cells) {
        const n = parseFloat(cell.replace(',', '.'));
        if (Number.isFinite(n) && n > 10 && n <= 300) {
          totalCreditsCompleted = n;
          break;
        }
      }
      console.log(LOG, `[fila ${index}] fila de TOTALES detectada`, {
        cells,
        totalCreditsCompleted,
        cambió: prevTotal !== totalCreditsCompleted,
      });
      continue;
    }

    // ── 3. Fila de materia normal
    const subject = cells.find((c) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(c));
    if (!subject) {
      // Log de filas que no matchearon nada — clave para ver qué se está ignorando
      if (cells.some((c) => c.trim().length > 0)) {
        console.log(LOG, `[fila ${index}] ignorada (sin materia, sin total, sin promedio)`, { cells });
      }
      continue;
    }

    const rawScore = cells.find((c) => /^\d{2,3}$/.test(c.trim()));
    const score = rawScore !== undefined ? Number(rawScore) : undefined;

    const rawCredits = cells.find(
      (c) =>
        /^\d{1,2}$/.test(c.trim()) &&
        Number(c) !== score &&
        Number(c) >= 1 &&
        Number(c) <= 20
    );
    const credits = rawCredits !== undefined ? Number(rawCredits) : undefined;

    console.log(LOG, `[fila ${index}] materia detectada`, { subject, score, credits, cells });

    entries.push({
      id: `${index}-${subject.substring(0, 20)}`,
      subject,
      credits,
      score,
      rawText: cells.join(' | '),
    });
  }

  // ── Fallback créditos: suma de materias aprobadas (score >= 70) con créditos conocidos
  if (totalCreditsCompleted === 0) {
    const fallback = entries
      .filter((e) => e.score !== undefined && e.score >= 70 && e.credits)
      .reduce((sum, e) => sum + (e.credits ?? 0), 0);
    console.log(LOG, 'totalCreditsCompleted=0 tras parse, aplicando fallback suma de aprobadas', {
      fallback,
      materiasConCreditos: entries.filter((e) => e.credits !== undefined).length,
      materiasAprobadas: entries.filter((e) => (e.score ?? 0) >= 70).length,
    });
    totalCreditsCompleted = fallback;
  }

  // ── Fallback promedio: promedio aritmético de calificaciones > 0
  if (average === undefined) {
    const withScores = entries.filter((e) => e.score !== undefined && (e.score ?? 0) > 0);
    if (withScores.length > 0) {
      const sum = withScores.reduce((acc, e) => acc + (e.score ?? 0), 0);
      average = Math.round((sum / withScores.length) * 100) / 100;
      console.log(LOG, `promedio calculado como fallback aritmético: ${average}`, { muestras: withScores.length });
    } else {
      console.warn(LOG, 'no se pudo calcular promedio — ninguna entrada con score');
    }
  }

  const progressPercent = Math.min(
    (totalCreditsCompleted / TOTAL_CREDITS_REQUIRED) * 100,
    100
  );

  console.log(LOG, 'resultado final', {
    entries: entries.length,
    totalCreditsCompleted,
    progressPercent,
    average,
  });

  return {
    entries,
    totalCreditsCompleted,
    totalCreditsRequired: TOTAL_CREDITS_REQUIRED,
    progressPercent,
    average,
    capturedAt: new Date().toISOString(),
  };
}
