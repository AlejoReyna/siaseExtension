import { describe, expect, it } from 'vitest';
import { enhanceQueryPage } from '@/content/pages/query-page';
import queryFixture from './fixtures/query-page.html?raw';

function mountFixture(): void {
  const parsed = new DOMParser().parseFromString(queryFixture, 'text/html');
  document.body.className = '';
  document.body.innerHTML = parsed.body.innerHTML;
}

describe('query page v2 presentation', () => {
  it('styles the native period form without changing its POST contract', () => {
    mountFixture();
    const form = document.forms.namedItem('mi_forma') as HTMLFormElement;
    const select = form.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]');
    const submit = form.querySelector<HTMLInputElement>('input[value="Aceptar"]');

    expect(enhanceQueryPage(document, 'schedule')).toBe(true);

    expect(document.body.classList.contains('siase-v2-query-page--schedule')).toBe(true);
    expect(document.forms.namedItem('mi_forma')).toBe(form);
    expect(form.method).toBe('post');
    expect(form.querySelector<HTMLInputElement>('input[name="HTMLTrund"]')?.value).toBe(
      '[redacted]'
    );
    expect(select?.classList.contains('siase-v2-query-period')).toBe(true);
    expect(submit?.getAttribute('onclick')).toBe('consultar()');
    expect(document.querySelector('[data-siase-v2-query-intro] h1')?.textContent).toBe('Horario');
    expect(document.querySelector('.siase-v2-query-native-table')).not.toBeNull();
  });

  it('does not duplicate its intro when it runs again', () => {
    mountFixture();
    enhanceQueryPage(document, 'grades');
    enhanceQueryPage(document, 'grades');

    expect(document.querySelectorAll('[data-siase-v2-query-intro]')).toHaveLength(1);
    expect(document.body.classList.contains('siase-v2-query-page--grades')).toBe(true);
  });
});
