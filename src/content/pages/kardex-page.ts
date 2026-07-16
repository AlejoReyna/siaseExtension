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
  const progress = Math.min(100, Math.max(0, summary.progressPercent));
  const section = frameDocument.createElement('section');
  section.className = 'siase-v2-kardex-summary';
  section.dataset.siaseV2KardexSummary = 'true';
  section.setAttribute('aria-label', 'Resumen de Kardex');

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
  progressLabel.textContent = `${summary.totalCreditsCompleted} de ${summary.totalCreditsRequired} créditos`;
  const track = frameDocument.createElement('div');
  track.className = 'siase-v2-kardex-progress';
  track.setAttribute('role', 'progressbar');
  track.setAttribute(
    'aria-label',
    `Avance de créditos: ${summary.totalCreditsCompleted} de ${summary.totalCreditsRequired}`
  );
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(summary.totalCreditsRequired));
  track.setAttribute('aria-valuenow', String(summary.totalCreditsCompleted));
  const fill = frameDocument.createElement('span');
  fill.style.width = `${progress}%`;
  track.append(fill);
  progressBlock.append(progressLabel, track);
  header.append(copy, progressBlock);

  const metrics = frameDocument.createElement('dl');
  metrics.className = 'siase-v2-kardex-metrics';
  const values = [
    ['Créditos aprobados', `${summary.totalCreditsCompleted} / ${summary.totalCreditsRequired}`],
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

  section.append(header, metrics);
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
