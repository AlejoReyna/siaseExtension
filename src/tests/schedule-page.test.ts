import { afterEach, describe, expect, it, vi } from 'vitest';
import { enhanceSchedulePage, isScheduleResultDocument } from '@/content/pages/schedule-page';
import scheduleFixture from './fixtures/schedule.html?raw';

describe('schedule page flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('automatically submits the newest valid period from the query screen', async () => {
    document.body.innerHTML = `
      <form name="mi_forma" method="POST" action="/cgi-bin/wspd_cgi.sh/control.p">
        <input type="hidden" name="HTMLTrund" value="">
        <select name="HTMLPeriodo">
          <option value="0">Selecciona</option>
          <option value="latest">Semestral Agosto-Diciembre 2026</option>
          <option value="older">Semestral Enero-Junio 2026</option>
        </select>
      </form>
    `;
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => undefined);

    await enhanceSchedulePage(document);
    await new Promise((resolve) => window.setTimeout(resolve, 5));

    const form = document.forms.namedItem('mi_forma') as HTMLFormElement;
    expect(form.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]')?.value).toBe('latest');
    expect(form.querySelector<HTMLInputElement>('input[name="HTMLTrund"]')?.value).toBe('echalm02');
    expect(submit).toHaveBeenCalledOnce();
    expect(document.body.classList.contains('siase-v2-schedule-auto-loading')).toBe(true);
  });

  it('renders the period selector above a populated schedule result', async () => {
    const parsed = new DOMParser().parseFromString(scheduleFixture, 'text/html');
    document.body.innerHTML = parsed.body.innerHTML;
    document.body.insertAdjacentHTML(
      'beforeend',
      '<form name="mi_forma"><input type="hidden" name="HTMLPeriodo" value="latest"></form>'
    );
    sessionStorage.setItem(
      'siase-plus-schedule-periods',
      JSON.stringify([
        { value: 'latest', label: 'Semestral Agosto-Diciembre 2026' },
        { value: 'older', label: 'Semestral Enero-Junio 2026' }
      ])
    );

    await enhanceSchedulePage(document);

    const selector = document.querySelector<HTMLSelectElement>('[data-siase-v2-schedule-period] select');
    expect(document.querySelector('[data-siase-v2-schedule-period]')).not.toBeNull();
    expect(selector?.value).toBe('latest');
    expect(selector?.options).toHaveLength(2);
    expect(document.querySelector('.siase-v2-schedule-grid')).not.toBeNull();
    expect(document.body.classList.contains('siase-v2-schedule-page')).toBe(true);
    expect(isScheduleResultDocument(document)).toBe(true);
  });
});
