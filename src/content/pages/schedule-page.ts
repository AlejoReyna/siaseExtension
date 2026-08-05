import type { ScheduleSlot } from '@/types/schedule';
import { parseSchedule } from '@/utils/parser/schedule';
import { setStorageValue } from '@/utils/storage';
import { scheduleDebug, scheduleDebugError } from '@/utils/debug';
import { enhanceQueryPage } from './query-page';

const PERIODS_STORAGE_KEY = 'siase-plus-schedule-periods';
const SCHEDULE_RESULT_TARGET = 'echalm02';

interface SchedulePeriodOption {
  value: string;
  label: string;
}

function normalize(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasScheduleGrid(frameDocument: Document): boolean {
  return Array.from(frameDocument.querySelectorAll<HTMLTableElement>('table')).some((table) => {
    const header = normalize(table.rows[0]?.textContent ?? '').toLocaleLowerCase('es-MX');
    return /lunes/.test(header) && /martes/.test(header) && /sábado|sabado/.test(header);
  });
}

function markScheduleTables(frameDocument: Document): void {
  const tables = Array.from(frameDocument.querySelectorAll<HTMLTableElement>('table'));
  const scheduleGrid = tables.find((table) => {
    const header = normalize(table.rows[0]?.textContent ?? '').toLocaleLowerCase('es-MX');
    return /lunes/.test(header) && /martes/.test(header) && /sábado|sabado/.test(header);
  });
  scheduleGrid?.classList.add('siase-v2-schedule-grid');

  const catalog = tables.find((table) => {
    const header = normalize(table.rows[0]?.textContent ?? '').toLocaleLowerCase('es-MX');
    return /materia/.test(header) && /abreviaci[oó]n/.test(header);
  });
  catalog?.classList.add('siase-v2-schedule-catalog');

  tables.filter((table) => table !== scheduleGrid && table !== catalog).forEach((table) => {
    table.classList.add('siase-v2-schedule-reference');
  });
}

function readPeriodOptions(frameDocument: Document): SchedulePeriodOption[] {
  const period = frameDocument.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]');
  if (!period) return [];
  return Array.from(period.options)
    .map((option) => ({ value: option.value.trim(), label: normalize(option.textContent ?? '') }))
    .filter((option) => option.value && option.value !== '0' && option.label);
}

function rememberPeriodOptions(frameDocument: Document, options: SchedulePeriodOption[]): void {
  if (!options.length) return;
  try {
    frameDocument.defaultView?.sessionStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(options));
  } catch (error) {
    scheduleDebugError('schedule-periods:remember:error', error);
  }
}

function getRememberedPeriodOptions(frameDocument: Document): SchedulePeriodOption[] {
  try {
    const raw = frameDocument.defaultView?.sessionStorage.getItem(PERIODS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (option): option is SchedulePeriodOption =>
        typeof option?.value === 'string' && typeof option?.label === 'string' && option.value.length > 0
    );
  } catch (error) {
    scheduleDebugError('schedule-periods:read:error', error);
    return [];
  }
}

function setFormValue(form: HTMLFormElement, name: string, value: string): void {
  const existing = form.elements.namedItem(name);
  if (existing instanceof HTMLInputElement || existing instanceof HTMLSelectElement) {
    existing.value = value;
    return;
  }
  const input = form.ownerDocument.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  form.append(input);
}

function submitScheduleForm(form: HTMLFormElement, periodValue: string): void {
  setFormValue(form, 'HTMLPeriodo', periodValue);
  setFormValue(form, 'HTMLTrund', SCHEDULE_RESULT_TARGET);
  scheduleDebug('schedule-periods:submit', { period: periodValue, target: SCHEDULE_RESULT_TARGET });
  HTMLFormElement.prototype.submit.call(form);
}

function selectLatestPeriod(frameDocument: Document, form: HTMLFormElement): boolean {
  const period = form.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]');
  if (!period) return false;
  const options = readPeriodOptions(frameDocument);
  rememberPeriodOptions(frameDocument, options);
  const latest = options[0];
  if (!latest) return false;

  period.value = latest.value;
  frameDocument.body.classList.add('siase-v2-schedule-auto-loading');
  scheduleDebug('schedule-periods:auto-select', { period: latest.value, label: latest.label });

  const submit = (): void => {
    try {
      submitScheduleForm(form, latest.value);
    } catch (error) {
      frameDocument.body.classList.remove('siase-v2-schedule-auto-loading');
      scheduleDebugError('schedule-periods:auto-submit:error', error);
      enhanceQueryPage(frameDocument, 'schedule');
    }
  };
  const timerWindow = frameDocument.defaultView;
  if (timerWindow) timerWindow.setTimeout(submit, 0);
  else submit();
  return true;
}

function currentPeriodLabel(frameDocument: Document): string {
  const bodyText = normalize(frameDocument.body?.textContent ?? '');
  return bodyText.match(/Periodo\s*:\s*([^\n]+?)(?:Alumno|Carrera|Plan de Estudio|$)/i)?.[1]?.trim() ?? 'Periodo actual';
}

function enhanceSchedulePeriodSelector(frameDocument: Document, form: HTMLFormElement): void {
  const mainContainer = frameDocument.querySelector<HTMLElement>('#main-container');
  const options = getRememberedPeriodOptions(frameDocument);
  const currentField = form.elements.namedItem('HTMLPeriodo');
  const currentValue = currentField instanceof HTMLInputElement || currentField instanceof HTMLSelectElement
    ? currentField.value
    : '';
  const currentLabel = currentPeriodLabel(frameDocument);
  const periodOptions = options.some((option) => option.value === currentValue)
    ? options
    : [{ value: currentValue || 'current', label: currentLabel }, ...options];

  const panel = frameDocument.createElement('section');
  panel.className = 'siase-v2-schedule-period';
  panel.dataset.siaseV2SchedulePeriod = 'true';
  panel.setAttribute('aria-labelledby', 'siase-v2-schedule-period-label');

  const copy = frameDocument.createElement('div');
  copy.className = 'siase-v2-schedule-period__copy';
  const eyebrow = frameDocument.createElement('p');
  eyebrow.className = 'siase-v2-schedule-period__eyebrow';
  eyebrow.textContent = 'Horario';
  const label = frameDocument.createElement('label');
  label.id = 'siase-v2-schedule-period-label';
  label.htmlFor = 'siase-v2-schedule-period-select';
  label.textContent = 'Periodo académico';
  copy.append(eyebrow, label);

  const select = frameDocument.createElement('select');
  select.id = 'siase-v2-schedule-period-select';
  select.className = 'siase-v2-schedule-period__select';
  select.name = 'HTMLPeriodo';
  periodOptions.forEach((option) => {
    const item = frameDocument.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === currentValue;
    select.append(item);
  });
  if (!select.value && periodOptions[0]) select.value = periodOptions[0].value;

  if (currentField instanceof HTMLInputElement || currentField instanceof HTMLSelectElement) {
    currentField.remove();
  }
  form.classList.add('siase-v2-schedule-period__form');
  form.dataset.siaseV2SchedulePeriodForm = 'true';
  form.append(select);
  select.addEventListener('change', () => submitScheduleForm(form, select.value));

  const hint = frameDocument.createElement('span');
  hint.className = 'siase-v2-schedule-period__hint';
  hint.textContent = 'Cambia el periodo para consultar otro horario.';
  panel.append(copy, form, hint);

  if (mainContainer?.parentElement) mainContainer.parentElement.insertBefore(panel, mainContainer);
  else frameDocument.body.prepend(panel);
}

function enhanceScheduleResult(frameDocument: Document, form: HTMLFormElement | null): void {
  frameDocument.body.classList.add('siase-v2-schedule-page');
  markScheduleTables(frameDocument);
  const mainContainer = frameDocument.querySelector<HTMLElement>('#main-container');
  mainContainer?.classList.add('siase-v2-schedule-surface');
  frameDocument.querySelector<HTMLElement>('#id_rpPnlEst')?.classList.add('siase-v2-schedule-actions');
  if (form && !frameDocument.querySelector('[data-siase-v2-schedule-period]')) {
    enhanceSchedulePeriodSelector(frameDocument, form);
  }
}

export async function enhanceSchedulePage(frameDocument: Document): Promise<ScheduleSlot[]> {
  const form = frameDocument.querySelector<HTMLFormElement>('form[name="mi_forma"]');
  const isQueryPage = Boolean(form?.querySelector('select[name="HTMLPeriodo"]')) && !hasScheduleGrid(frameDocument);
  if (isQueryPage && form && selectLatestPeriod(frameDocument, form)) return [];

  scheduleDebug('schedule-page:parse:start', {
    url: frameDocument.defaultView?.location.href ?? '',
    tables: frameDocument.querySelectorAll('table').length,
    bodyText: normalize(frameDocument.body?.textContent ?? '').slice(0, 240)
  });
  frameDocument.body.classList.add('siase-plus-schedule-page');
  const slots = parseSchedule(frameDocument);
  enhanceScheduleResult(frameDocument, form);
  scheduleDebug('schedule-page:parse:result', { slots: slots.length });
  try {
    if (slots.length) await setStorageValue('scheduleSlots', slots);
  } catch (error) {
    scheduleDebugError('schedule-page:save:error', error);
  }
  return slots;
}

export function isScheduleResultDocument(frameDocument: Document): boolean {
  return Boolean(frameDocument.querySelector('form[name="mi_forma"]')) &&
    /consulta\s+de\s+horario/i.test(frameDocument.body?.textContent ?? '') &&
    hasScheduleGrid(frameDocument);
}
