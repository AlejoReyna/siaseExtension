import { describe, expect, it } from 'vitest';
import { enhanceKardexPresentation } from '@/content/pages/kardex-page';
import type { KardexSummary } from '@/types/kardex';
import kardexFixture from './fixtures/kardex.html?raw';

const summary: KardexSummary = {
  entries: [
    {
      id: '1',
      subjectKey: '001',
      subject: 'PROGRAMACIÓN',
      semesterInPlan: '1',
      score: 91,
      isLabSubject: true,
      passed: true,
      rawText: ''
    },
    {
      id: '2',
      subjectKey: '002',
      subject: 'BASES DE DATOS',
      semesterInPlan: '2',
      score: 83,
      labScore: 90,
      isLabSubject: false,
      passed: true,
      rawText: ''
    },
    {
      id: '3',
      subjectKey: '003',
      subject: 'REDES',
      semesterInPlan: '3',
      isLabSubject: true,
      passed: false,
      rawText: ''
    }
  ],
  totalCreditsCompleted: 150,
  totalCreditsRequired: 220,
  progressPercent: 68.1818181818,
  average: 87,
  capturedAt: '2026-07-16T00:00:00.000Z'
};

function mountFixture(): void {
  const parsed = new DOMParser().parseFromString(kardexFixture, 'text/html');
  document.body.className = '';
  document.body.innerHTML = parsed.body.innerHTML;
}

describe('Kardex v2 presentation', () => {
  it('adds an additive summary and retains the native form, table and print action', () => {
    mountFixture();
    const form = document.forms.namedItem('mi_forma') as HTMLFormElement;
    const table = document.querySelector('table') as HTMLTableElement;
    const print = document.querySelector<HTMLInputElement>('#btnImp input');

    expect(enhanceKardexPresentation(document, summary)).toBe(true);

    expect(document.body.classList.contains('siase-v2-kardex-page')).toBe(true);
    expect(document.forms.namedItem('mi_forma')).toBe(form);
    expect(form.method).toBe('post');
    expect(form.querySelector<HTMLInputElement>('input[name="HTMLTrund"]')?.value).toBe(
      '[redacted]'
    );
    expect(document.querySelector('.siase-v2-kardex-table-shell > table')).toBe(table);
    expect(table.classList.contains('siase-v2-kardex-table')).toBe(true);
    expect(print?.getAttribute('onclick')).toBe('imprimir()');
    expect(print?.classList.contains('siase-v2-kardex-print')).toBe(true);
    expect(document.querySelector('[data-siase-v2-kardex-summary]')).not.toBeNull();
    expect(document.querySelector('.siase-v2-kardex-progress')?.getAttribute('aria-valuenow')).toBe(
      '150'
    );
    expect(document.querySelector('.siase-v2-score--passed')?.textContent).toBe('91');
    expect(document.querySelector('.siase-v2-score--failed')?.textContent).toBe('65');
    expect(document.querySelector('.siase-v2-score--pending')?.textContent).toBe('NP');
  });

  it('does not duplicate the visual wrapper when the enhancer runs again', () => {
    mountFixture();
    enhanceKardexPresentation(document, summary);
    enhanceKardexPresentation(document, summary);

    expect(document.querySelectorAll('[data-siase-v2-kardex-summary]')).toHaveLength(1);
    expect(document.querySelectorAll('.siase-v2-kardex-table-shell')).toHaveLength(1);
  });
});
