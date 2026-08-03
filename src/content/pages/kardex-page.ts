import type { KardexSummary } from '@/types/kardex';
import { parseKardexSummary } from '@/utils/parser/kardex';
import { setStorageValue } from '@/utils/storage';

const OPPORTUNITY_START_INDEX = 4;
const OPPORTUNITY_END_INDEX = 9;

function normalizedText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-MX');
}

function isKardexHeaderRow(row: HTMLTableRowElement): boolean {
  const cells = Array.from(row.cells).map((cell) => normalizedText(cell.textContent));
  return /^(sem\.?|semestre)$/.test(cells[0] ?? '') && cells.some((cell) => cell === 'materia');
}

function findKardexTable(frameDocument: Document): HTMLTableElement | null {
  return (
    Array.from(frameDocument.querySelectorAll<HTMLTableElement>('table')).find((table) =>
      Array.from(table.rows).some(isKardexHeaderRow)
    ) ?? null
  );
}

function ensureTableShell(table: HTMLTableElement): HTMLElement {
  const parent = table.parentElement;
  if (parent?.classList.contains('siase-v2-kardex-table-shell')) return parent;

  const shell = table.ownerDocument.createElement('div');
  shell.className = 'siase-v2-kardex-table-shell';
  table.before(shell);
  shell.append(table);
  return shell;
}

function decorateScores(table: HTMLTableElement): void {
  Array.from(table.rows).forEach((row) => {
    if (isKardexHeaderRow(row)) {
      row.classList.add('siase-v2-kardex-table__header');
      return;
    }
    const cells = Array.from(row.cells);
    if (!/^\d+$/.test(cells[0]?.textContent?.trim() ?? '')) return;
    row.classList.add('siase-v2-kardex-table__subject');

    cells.slice(OPPORTUNITY_START_INDEX, OPPORTUNITY_END_INDEX + 1).forEach((cell) => {
      const value = cell.textContent?.trim() ?? '';
      const score = Number(value);
      cell.classList.remove(
        'siase-v2-score--passed',
        'siase-v2-score--failed',
        'siase-v2-score--pending'
      );
      if (value && Number.isFinite(score)) {
        cell.classList.add(score >= 70 ? 'siase-v2-score--passed' : 'siase-v2-score--failed');
      } else if (/^(np|nc|sd)$/i.test(value)) {
        cell.classList.add('siase-v2-score--pending');
      }
    });
  });
}

function addSummary(
  frameDocument: Document,
  tableShell: HTMLElement,
  summary: KardexSummary
): void {
  const existing = frameDocument.querySelector<HTMLElement>('[data-siase-v2-kardex-summary]');
  if (existing) return;

  const passedSubjects = summary.entries.filter((entry) => entry.passed).length;
  const progress =
    summary.progressPercent === undefined
      ? undefined
      : Math.min(100, Math.max(0, summary.progressPercent));
  const hasCreditTotals =
    summary.approvedCredits !== undefined && summary.totalCredits !== undefined;
  const section = frameDocument.createElement('section');
  section.className = 'siase-v2-kardex-summary';
  section.dataset.siaseV2KardexSummary = 'true';
  section.setAttribute('aria-label', 'Resumen de Kardex');

  const studentCard = frameDocument.createElement('article');
  studentCard.className = 'siase-v2-kardex-student';
  const studentEyebrow = frameDocument.createElement('p');
  studentEyebrow.className = 'siase-v2-eyebrow';
  studentEyebrow.textContent = 'Información del alumno';
  const studentTitle = frameDocument.createElement('h2');
  studentTitle.textContent = 'Datos académicos';
  const studentCopy = frameDocument.createElement('div');
  studentCopy.className = 'siase-v2-kardex-student__copy';
  const nativeHeader = frameDocument.getElementById('noof');
  studentCopy.textContent = nativeHeader?.textContent?.replace(/\s+/g, ' ').trim() || 'Información del alumno';
  studentCard.append(studentEyebrow, studentTitle, studentCopy);
  nativeHeader?.classList.add('siase-v2-kardex-native-header--relocated');

  const header = frameDocument.createElement('header');
  const copy = frameDocument.createElement('div');
  const eyebrow = frameDocument.createElement('p');
  eyebrow.className = 'siase-v2-eyebrow';
  eyebrow.textContent = 'Historial académico';
  const title = frameDocument.createElement('h1');
  title.textContent = 'Kardex';
  const description = frameDocument.createElement('p');
  description.textContent = 'Consulta tus materias, oportunidades y avance del plan de estudios.';
  copy.append(eyebrow, title, description);

  const progressBlock = frameDocument.createElement('div');
  progressBlock.className = 'siase-v2-kardex-summary__progress';
  const progressLabel = frameDocument.createElement('span');
  progressLabel.textContent = hasCreditTotals
    ? `${summary.approvedCredits} de ${summary.totalCredits} créditos`
    : 'Progreso por sincronizar';
  const track = frameDocument.createElement('div');
  track.className = 'siase-v2-kardex-progress';
  if (hasCreditTotals) {
    track.setAttribute('role', 'progressbar');
    track.setAttribute(
      'aria-label',
      `Avance de créditos: ${summary.approvedCredits} de ${summary.totalCredits}`
    );
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(summary.totalCredits));
    track.setAttribute('aria-valuenow', String(summary.approvedCredits));
  }
  const fill = frameDocument.createElement('span');
  fill.style.width = progress === undefined ? '0%' : `${progress}%`;
  track.append(fill);
  progressBlock.append(progressLabel, track);
  header.append(copy, progressBlock);

  const metrics = frameDocument.createElement('dl');
  metrics.className = 'siase-v2-kardex-metrics';
  const values = [
    [
      'Créditos aprobados',
      hasCreditTotals ? `${summary.approvedCredits} / ${summary.totalCredits}` : 'No disponible'
    ],
    ['Materias aprobadas', String(passedSubjects)],
    ['Promedio', summary.average === undefined ? 'No disponible' : summary.average.toFixed(2)]
  ];
  values.forEach(([label, value]) => {
    const metric = frameDocument.createElement('div');
    const term = frameDocument.createElement('dt');
    term.textContent = label;
    const detail = frameDocument.createElement('dd');
    detail.textContent = value;
    metric.append(term, detail);
    metrics.append(metric);
  });

  const statsCard = frameDocument.createElement('div');
  statsCard.className = 'siase-v2-kardex-stats';
  statsCard.append(header, metrics);
  section.append(studentCard, statsCard);
  tableShell.before(section);
}

export function enhanceKardexPresentation(
  frameDocument: Document,
  summary?: KardexSummary
): boolean {
  const body = frameDocument.body;
  const record = frameDocument.getElementById('kdx');
  const table = findKardexTable(frameDocument);
  if (!body || !record || !table) return false;

  body.classList.add('siase-v2-kardex-page');
  frameDocument
    .querySelector<HTMLFormElement>('form[name="mi_forma"]')
    ?.classList.add('siase-v2-kardex-form');
  record.classList.add('siase-v2-kardex-record');
  frameDocument.getElementById('noof')?.classList.add('siase-v2-kardex-native-header');
  frameDocument.getElementById('btnImp')?.classList.add('siase-v2-kardex-print-action');
  frameDocument
    .querySelector<HTMLInputElement>('#btnImp input[type="button"][value="Imprimir"]')
    ?.classList.add('siase-v2-kardex-print');

  table.classList.add('siase-v2-kardex-table');
  table.setAttribute('aria-label', 'Materias y oportunidades del Kardex');
  const shell = ensureTableShell(table);
  decorateScores(table);
  if (summary) addSummary(frameDocument, shell, summary);
  return true;
}

export async function enhanceKardexPage(frameDocument: Document): Promise<KardexSummary> {
  frameDocument.body.classList.add('siase-plus-kardex-page');
  const summary = parseKardexSummary(frameDocument);
  enhanceKardexPresentation(frameDocument, summary);
  await setStorageValue('kardexSnapshot', summary);
  // Fire-and-forget — igual que grades-page.ts con REFRESH_GRADES
  void chrome.runtime.sendMessage({ type: 'REFRESH_KARDEX', summary });
  return summary;
}
