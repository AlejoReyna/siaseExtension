import { parseGrades } from '@/utils/parser/grades';
import { parseKardexSummary } from '@/utils/parser/kardex';
import { parseSchedule } from '@/utils/parser/schedule';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import type { GradeSnapshot } from '@/types/grades';
import type { KardexSummary } from '@/types/kardex';
import type { ScheduleSlot } from '@/types/schedule';
import { scheduleDebug, scheduleDebugError } from '@/utils/debug';

const SIASE_ORIGIN = 'https://deimos.dgi.uanl.mx';
const ENDPOINTS = {
  grades: '/cgi-bin/wspd_cgi.sh/econcfs01.htm',
  schedule: '/cgi-bin/wspd_cgi.sh/echalm01.htm',
  kardex: '/cgi-bin/wspd_cgi.sh/econkdx01.htm'
} as const;
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

function isFresh(value: { capturedAt?: string } | undefined): boolean {
  if (!value?.capturedAt) return false;
  const age = Date.now() - Date.parse(value.capturedAt);
  return Number.isFinite(age) && age >= 0 && age < REFRESH_WINDOW_MS;
}

function sessionUrl(path: string, params: Record<string, string>): string {
  return `${SIASE_ORIGIN}${path}?${new URLSearchParams(params).toString()}`;
}

export function selectPeriodValue(period: HTMLSelectElement): string | undefined {
  const current = period.value;
  if (current && current !== '0') return current;
  return Array.from(period.options).find((option) => option.value && option.value !== '0')?.value;
}

export function extractFormOverrides(document: Document): Record<string, string> {
  const sources = [
    ...Array.from(document.querySelectorAll<HTMLElement>('[onclick]')).map((element) =>
      element.getAttribute('onclick') ?? ''
    ),
    ...Array.from(document.scripts).map((script) => script.textContent ?? '')
  ];
  const overrides: Record<string, string> = {};
  sources.forEach((source) => {
    const match = source.match(/HTMLTrund\s*\.value\s*=\s*["']([^"']+)["']/i);
    if (match?.[1]) overrides.HTMLTrund = match[1];
  });
  return overrides;
}

async function fetchPeriodPage(
  path: string,
  params: Record<string, string>,
  label: 'calificaciones' | 'horario'
): Promise<Document | null> {
  scheduleDebug(`${label}:request:start`, {
    path,
    sessionKeys: Object.keys(params).join(','),
    hasHTMLtrim: Boolean(params.HTMLtrim),
    htmltrimLength: params.HTMLtrim?.length ?? 0
  });
  const response = await fetch(sessionUrl(path, params), { credentials: 'include', cache: 'no-store' });
  const html = await response.text();
  scheduleDebug(`${label}:request:response`, {
    status: response.status,
    ok: response.ok,
    bytes: html.length,
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
  });
  if (!response.ok) return null;
  const document = new DOMParser().parseFromString(html, 'text/html');
  const form = document.querySelector<HTMLFormElement>('form[name="mi_forma"]');
  const period = form?.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]');
  scheduleDebug(`${label}:period:discovery`, {
    hasForm: Boolean(form),
    hasPeriod: Boolean(period),
    optionCount: period?.options.length ?? 0,
    options: period
      ? Array.from(period.options)
          .slice(0, 5)
          .map((option) => `${option.value}:${option.textContent?.replace(/\s+/g, ' ').trim()}`)
          .join(' | ')
      : ''
  });
  if (!form || !period) {
    scheduleDebug(`${label}:period:already-result`, {
      tables: document.querySelectorAll('table').length,
      bodyText: document.body.textContent?.replace(/\s+/g, ' ').trim().slice(0, 240) ?? ''
    });
    return document;
  }

  const selected = selectPeriodValue(period);
  scheduleDebug(`${label}:period:selected`, { selected: selected ?? '', currentValue: period.value });
  if (!selected) return document;
  const body = new FormData(form);
  body.set('HTMLPeriodo', selected);
  const overrides = extractFormOverrides(document);
  Object.entries(overrides).forEach(([key, value]) => body.set(key, value));
  scheduleDebug(`${label}:period:form-data`, {
    fields: Array.from(body.keys()).join(','),
    htmlTrund: overrides.HTMLTrund ?? String(body.get('HTMLTrund') ?? ''),
    hasHTMLResill: body.has('HTMLResill')
  });
  const method = (form.method || 'post').toUpperCase();
  const actionUrl = new URL(form.getAttribute('action') || path, SIASE_ORIGIN);
  scheduleDebug(`${label}:period:submit`, {
    method,
    actionPath: actionUrl.pathname,
    actionKeys: Array.from(actionUrl.searchParams.keys()).join(','),
    submittedPeriod: selected
  });
  if (method === 'GET') {
    new URLSearchParams(Array.from(body.entries()).map(([key, value]) => [key, String(value)])).forEach(
      (value, key) => actionUrl.searchParams.set(key, value)
    );
  }
  const result = await fetch(actionUrl.href, {
    method,
    ...(method === 'GET' ? {} : { body }),
    credentials: 'include',
    cache: 'no-store'
  });
  const resultHtml = await result.text();
  scheduleDebug(`${label}:period:response`, {
    status: result.status,
    ok: result.ok,
    bytes: resultHtml.length,
    tables: (resultHtml.match(/<table\b/gi) ?? []).length,
    bodyText: resultHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
  });
  if (!result.ok) return null;
  return new DOMParser().parseFromString(resultHtml, 'text/html');
}

async function refreshKardex(params: Record<string, string>): Promise<KardexSummary | undefined> {
  const cached = await getStorageValue('kardexSnapshot');
  if (
    cached &&
    isFresh(cached) &&
    cached.planName &&
    (cached.entries.length > 0 || cached.average !== undefined)
  ) {
    return cached;
  }
  const response = await fetch(sessionUrl(ENDPOINTS.kardex, params), {
    credentials: 'include',
    cache: 'no-store'
  });
  if (!response.ok) return cached;
  const document = new DOMParser().parseFromString(await response.text(), 'text/html');
  const summary = parseKardexSummary(document);
  if (
    !summary.entries.length &&
    summary.average === undefined &&
    summary.approvedCredits === undefined
  ) {
    return cached;
  }
  await setStorageValue('kardexSnapshot', summary);
  return summary;
}

export async function refreshDashboardData(): Promise<void> {
  scheduleDebug('dashboard:refresh:start');
  const params = await getStorageValue('siaseSessionParams');
  scheduleDebug('dashboard:session:read', {
    found: Boolean(params),
    hasHTMLtrim: Boolean(params?.HTMLtrim),
    keys: Object.keys(params ?? {}).join(',')
  });
  if (!params?.HTMLtrim) {
    scheduleDebug('dashboard:refresh:stop:no-session');
    return;
  }

  const [gradesDocument, scheduleDocument] = await Promise.all([
    fetchPeriodPage(ENDPOINTS.grades, params, 'calificaciones').catch((error) => {
      scheduleDebugError('calificaciones:request:error', error);
      return null;
    }),
    fetchPeriodPage(ENDPOINTS.schedule, params, 'horario').catch((error) => {
      scheduleDebugError('horario:request:error', error);
      return null;
    })
  ]);

  if (gradesDocument) {
    const grades = parseGrades(gradesDocument);
    if (grades.length) await setStorageValue('gradeSnapshot', { grades, capturedAt: new Date().toISOString() });
  }
  if (scheduleDocument) {
    const schedule = parseSchedule(scheduleDocument);
    scheduleDebug('horario:parser:result', {
      slots: schedule.length,
      subjects: new Set(schedule.map((slot) => slot.subject)).size,
      days: new Set(schedule.map((slot) => slot.weekday)).size
    });
    if (schedule.length) await setStorageValue('scheduleSlots', schedule);
  }
  scheduleDebug('dashboard:refresh:done', {
    hasGradesDocument: Boolean(gradesDocument),
    hasScheduleDocument: Boolean(scheduleDocument)
  });
  await refreshKardex(params).catch(() => undefined);
}
