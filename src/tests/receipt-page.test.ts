import { describe, expect, it } from 'vitest';
import { detectReceiptPage, enhanceReceiptPage } from '@/content/receipt-page';
import renderedFixture from './fixtures/receipt-rendered.html?raw';
import selectionFixture from './fixtures/receipt-selection.html?raw';

function mountFixture(html: string): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.className = '';
  document.body.innerHTML = parsed.body.innerHTML;
}

describe('receipt page v2 presentation', () => {
  it('detects only the audited receipt routes', () => {
    expect(
      detectReceiptPage(new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/ecBolRec-v02.htm'))
    ).toBe('academic-receipt');
    expect(
      detectReceiptPage(new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/unknown.htm'))
    ).toBeNull();
  });

  it('keeps the internal receipt selection form, table and native history link', () => {
    mountFixture(selectionFixture);
    const form = document.forms.namedItem('mi_forma') as HTMLFormElement;
    const history = document.querySelector<HTMLAnchorElement>('a');

    expect(
      enhanceReceiptPage(document, new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/ecavpag01.htm'))
    ).toBe('internal-selection');

    expect(document.forms.namedItem('mi_forma')).toBe(form);
    expect(form.method).toBe('post');
    expect(document.querySelector('.siase-v2-receipt-selection-table')).not.toBeNull();
    expect(history?.getAttribute('href')).toBe('javascript:consultarPagadas()');
    expect(history?.classList.contains('siase-v2-receipt-history-link')).toBe(true);
  });

  it('wraps a rendered receipt visually without changing its native controls', () => {
    mountFixture(renderedFixture);
    const form = document.forms.namedItem('mi_forma') as HTMLFormElement;
    const print = form.querySelector<HTMLInputElement>('input[value="Imprimir"]');

    enhanceReceiptPage(
      document,
      new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/ecBolRec-v02.htm')
    );

    expect(form.classList.contains('siase-v2-receipt-document')).toBe(true);
    expect(document.querySelector('[data-siase-v2-receipt-intro] h1')?.textContent).toBe(
      'Recibo de servicios académicos y escolares'
    );
    expect(document.querySelector('.siase-v2-receipt-native-table')).not.toBeNull();
    expect(document.querySelector('.siase-v2-receipt-dialog')).not.toBeNull();
    expect(print?.getAttribute('onclick')).toBe('imprimir()');
  });

  it('shows a non-financial empty state when the intersemester internal frame is empty', () => {
    document.body.className = '';
    document.body.innerHTML = '';

    expect(
      enhanceReceiptPage(
        document,
        new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/EgenbolveranoV2.htm')
      )
    ).toBe('intersemester-internal');

    expect(document.querySelector('[data-siase-v2-receipt-empty]')).not.toBeNull();
    expect(document.querySelector('form')).toBeNull();
  });
});
