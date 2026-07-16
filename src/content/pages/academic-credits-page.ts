export interface VisibleCreditTotals {
  approved: number;
  total: number;
}

function parseNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

export function parseVisibleCreditTotals(text: string): VisibleCreditTotals | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const patterns = [
    /cr[eé]ditos?\s+(?:aprobados?|acreditados?)\D{0,20}(\d+(?:[.,]\d+)?)\s*(?:de|\/)\s*(\d+(?:[.,]\d+)?)/i,
    /(?:aprobados?|acreditados?)\D{0,16}(\d+(?:[.,]\d+)?)\s*(?:de|\/)\s*(\d+(?:[.,]\d+)?)/i,
    /cr[eé]ditos?\D{0,20}(\d+(?:[.,]\d+)?)\s*(?:de|\/)\s*(\d+(?:[.,]\d+)?)/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const approved = parseNumber(match[1]);
    const total = parseNumber(match[2]);
    if (Number.isFinite(approved) && Number.isFinite(total) && approved >= 0 && total > 0) {
      return { approved, total };
    }
  }
  return null;
}

function normalizedHeader(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-MX');
}

function isCreditsTable(table: HTMLTableElement): boolean {
  const firstRow = table.rows.item(0);
  if (!firstRow) return false;
  const headers = Array.from(firstRow.cells).map((cell) =>
    normalizedHeader(cell.textContent ?? '')
  );
  return ['semestre', 'materia', 'creditos', 'situacion'].every((header) =>
    headers.some((candidate) => candidate === header)
  );
}

function findVisibleTotals(frameDocument: Document): VisibleCreditTotals | null {
  const sources = [
    frameDocument.getElementById('ResCred'),
    frameDocument.getElementById('Contenedor')
  ];
  for (const source of sources) {
    const totals = parseVisibleCreditTotals(source?.textContent ?? '');
    if (totals) return totals;
  }
  return null;
}

function addReadOnlyProgress(
  frameDocument: Document,
  accordion: HTMLElement,
  totals: VisibleCreditTotals
): void {
  if (frameDocument.querySelector('[data-siase-v2-credit-summary]')) return;

  const percentage = Math.min(100, Math.max(0, (totals.approved / totals.total) * 100));
  const summary = frameDocument.createElement('section');
  summary.className = 'siase-v2-credit-summary';
  summary.dataset.siaseV2CreditSummary = 'true';
  summary.setAttribute('aria-label', 'Resumen de créditos');

  const copy = frameDocument.createElement('div');
  const eyebrow = frameDocument.createElement('p');
  eyebrow.className = 'siase-v2-service-eyebrow';
  eyebrow.textContent = 'Avance académico';
  const title = frameDocument.createElement('strong');
  title.textContent = `Créditos aprobados ${totals.approved} de ${totals.total}`;
  const detail = frameDocument.createElement('span');
  detail.textContent = `${Math.round(percentage)}% del plan visible`;
  copy.append(eyebrow, title, detail);

  const track = frameDocument.createElement('div');
  track.className = 'siase-v2-credit-progress';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', `Créditos aprobados ${totals.approved} de ${totals.total}`);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(totals.total));
  track.setAttribute('aria-valuenow', String(totals.approved));
  const fill = frameDocument.createElement('span');
  fill.style.width = `${percentage}%`;
  track.append(fill);

  summary.append(copy, track);
  accordion.before(summary);
}

export function enhanceAcademicCreditsPage(frameDocument: Document): boolean {
  frameDocument.body.classList.add('siase-v2-academic-credits-page');
  frameDocument.getElementById('ResCred')?.classList.add('siase-v2-credit-result');
  frameDocument.getElementById('Contenedor')?.classList.add('siase-v2-credit-container');

  const accordion = frameDocument.getElementById('accordion');
  if (!accordion) return false;
  accordion.classList.add('siase-v2-credit-accordion');

  Array.from(accordion.children).forEach((child) => {
    if (child.tagName === 'H3') child.classList.add('siase-v2-credit-heading');
    if (child.tagName === 'DIV') child.classList.add('siase-v2-credit-panel');
  });

  Array.from(accordion.querySelectorAll<HTMLTableElement>('table')).forEach((table) => {
    if (isCreditsTable(table)) table.classList.add('siase-v2-credit-table');
  });

  const totals = findVisibleTotals(frameDocument);
  if (totals) addReadOnlyProgress(frameDocument, accordion, totals);
  return true;
}
