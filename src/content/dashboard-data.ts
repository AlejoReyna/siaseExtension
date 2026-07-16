import { parseGrades } from '@/utils/parser/grades';
import { parseKardexSummary } from '@/utils/parser/kardex';
import { parseSchedule } from '@/utils/parser/schedule';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import type { GradeSnapshot } from '@/types/grades';
import type { KardexSummary } from '@/types/kardex';
import type { ScheduleSlot } from '@/types/schedule';

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

async function fetchPeriodPage(
  path: string,
  params: Record<string, string>
): Promise<Document | null> {
  const response = await fetch(sessionUrl(path, params), { credentials: 'include', cache: 'no-store' });
  if (!response.ok) return null;
  const document = new DOMParser().parseFromString(await response.text(), 'text/html');
  const form = document.querySelector<HTMLFormElement>('form[name="mi_forma"]');
  const period = form?.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]');
  if (!form || !period) return document;

  const selected = period.value || period.querySelector<HTMLOptionElement>('option[value]')?.value;
  if (!selected) return document;
  const body = new FormData(form);
  body.set('HTMLPeriodo', selected);
  const method = (form.method || 'post').toUpperCase();
  const actionUrl = new URL(form.getAttribute('action') || path, SIASE_ORIGIN);
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
  if (!result.ok) return null;
  return new DOMParser().parseFromString(await result.text(), 'text/html');
}

async function refreshKardex(params: Record<string, string>): Promise<KardexSummary | undefined> {
  const cached = await getStorageValue('kardexSnapshot');
  if (cached && isFresh(cached) && (cached.entries.length > 0 || cached.average !== undefined)) return cached;
  const response = await fetch(sessionUrl(ENDPOINTS.kardex, params), {
    credentials: 'include',
    cache: 'no-store'
  });
  if (!response.ok) return cached;
  const document = new DOMParser().parseFromString(await response.text(), 'text/html');
  const summary = parseKardexSummary(document);
  if (!summary.entries.length && summary.average === undefined && summary.totalCreditsCompleted === 0) {
    return cached;
  }
  await setStorageValue('kardexSnapshot', summary);
  return summary;
}

export async function refreshDashboardData(): Promise<void> {
  const params = await getStorageValue('siaseSessionParams');
  if (!params?.HTMLtrim) return;

  const [gradesDocument, scheduleDocument] = await Promise.all([
    fetchPeriodPage(ENDPOINTS.grades, params).catch(() => null),
    fetchPeriodPage(ENDPOINTS.schedule, params).catch(() => null)
  ]);

  if (gradesDocument) {
    const grades = parseGrades(gradesDocument);
    if (grades.length) await setStorageValue('gradeSnapshot', { grades, capturedAt: new Date().toISOString() });
  }
  if (scheduleDocument) {
    const schedule = parseSchedule(scheduleDocument);
    if (schedule.length) await setStorageValue('scheduleSlots', schedule);
  }
  await refreshKardex(params).catch(() => undefined);
}
