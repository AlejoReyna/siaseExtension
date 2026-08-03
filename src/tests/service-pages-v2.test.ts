import { describe, expect, it, vi } from 'vitest';
import {
  enhanceAcademicCreditsPage,
  parseVisibleCreditTotals
} from '@/content/pages/academic-credits-page';
import { enhanceCareerSelectorPage } from '@/content/pages/career-selector-page';
import { enhanceDocumentUploadPage } from '@/content/pages/document-upload-page';
import {
  extractLegacyAnnouncements,
  renderNotificationBell
} from '@/content/legacy-announcements';
import { detectServicePage, enhanceServicePage } from '@/content/service-page';
import academicCreditsFixture from './fixtures/academic-credits.html?raw';
import careerSelectorFixture from './fixtures/career-selector.html?raw';
import documentUploadFixture from './fixtures/document-upload.html?raw';
import sessionExpiredFixture from './fixtures/session-expired.html?raw';

const fixtures: Record<string, string> = {
  'academic-credits.html': academicCreditsFixture,
  'career-selector.html': careerSelectorFixture,
  'document-upload.html': documentUploadFixture,
  'session-expired.html': sessionExpiredFixture
};

function mountFixture(name: string): void {
  const html = fixtures[name];
  if (!html) throw new Error(`Unknown fixture: ${name}`);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.className = parsed.body.className;
  document.body.innerHTML = parsed.body.innerHTML;
}

describe('service page routing', () => {
  it('classifies only audited endpoints', () => {
    expect(
      detectServicePage(new URL('https://deimos.test/cgi-bin/deya.sh/ecCargaDocto01.htm'))
    ).toBe('document-upload');
    expect(
      detectServicePage(new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/esCreditoMaterias01.htm'))
    ).toBe('academic-credits');
    expect(
      detectServicePage(new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/unknown.htm'))
    ).toBeNull();
  });

  it('marks an expired response without replacing its native dialog', () => {
    mountFixture('session-expired.html');
    const dialog = document.querySelector('[role="dialog"]');
    enhanceServicePage(
      document,
      new URL('https://deimos.test/cgi-bin/wspd_cgi.sh/eselcarrera.htm')
    );
    expect(document.body.classList.contains('siase-v2-service-page--session-expired')).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
  });
});

describe('career selector enhancer', () => {
  it('extracts banners, official notices and quick blocks before legacy content is hidden', () => {
    mountFixture('career-selector.html');
    const data = extractLegacyAnnouncements(document);

    expect(data.banners).toHaveLength(3);
    expect(data.banners.map((banner) => banner.label)).toEqual([
      'Transferencias',
      'Transferencias',
      'Censo Nacional sobre Inteligencia Artificial Generativa'
    ]);
    expect(data.banners[0]?.href).toBe('/docs/transferencias.pdf');
    expect(data.banners[0]?.onclick).toContain('transferencias');
    expect(data.notices).toHaveLength(2);
    expect(data.notices[0]?.department).toBe('Departamento Escolar y de Archivo');
    expect(data.notices[0]?.title).toBe('ENCUESTA DE SEGURIDAD SOCIAL');
    expect(data.hasCarousel).toBe(true);
    expect(data.previousSource?.textContent).toBe('Previous');
    expect(data.nextSource?.textContent).toBe('Next');
    expect(data.quickBlocks.map((block) => block.label)).toEqual(
      expect.arrayContaining([
        'Transferencias',
        'Becas',
        'Facturación UANL',
        'Correo',
        'Dudas',
        'Censo Nacional sobre Inteligencia Artificial Generativa'
      ])
    );
    expect(data.quickBlocks.find((block) => block.href === '/facturacion')?.href).toBe('/facturacion');
  });

  it('keeps original actions connected and provides accessible open, close and carousel behavior', () => {
    mountFixture('career-selector.html');
    const data = extractLegacyAnnouncements(document);
    const originalTransfer = data.quickBlocks.find((block) => block.href === '/docs/transferencias.pdf');
    const originalClick = vi.spyOn(originalTransfer!.source, 'click');
    const nextClick = vi.spyOn(data.nextSource!, 'click');
    const root = renderNotificationBell(document, data);
    document.body.append(root);

    const bell = root.querySelector<HTMLButtonElement>('.siase-v2-notification__button');
    const panel = root.querySelector<HTMLElement>('[role="dialog"]');
    expect(bell?.getAttribute('aria-label')).toBe('Abrir avisos de interés');
    expect(bell?.getAttribute('aria-expanded')).toBe('false');
    bell?.click();
    expect(panel?.hidden).toBe(false);

    const quickAction = root.querySelector<HTMLAnchorElement>(
      '.siase-v2-notification-quick-block a[data-siase-original-href="/docs/transferencias.pdf"]'
    );
    quickAction?.click();
    expect(originalClick).toHaveBeenCalledOnce();

    root.querySelector<HTMLElement>('[data-siase-notification-next]')?.click();
    expect(nextClick).toHaveBeenCalledOnce();
    expect(root.querySelector('[data-siase-slide="1"]')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel?.hidden).toBe(true);
  });

  it('renders an empty but usable bell when the legacy banner is absent', () => {
    const parsed = new DOMParser().parseFromString(
      '<!doctype html><html><body><form name="SelCarrera"><a href="javascript:void(0)">Carrera</a></form></body></html>',
      'text/html'
    );
    document.head.innerHTML = '';
    document.body.className = '';
    document.body.innerHTML = parsed.body.innerHTML;
    const data = extractLegacyAnnouncements(document);
    expect(data.root).toBeNull();
    expect(data.banners).toHaveLength(0);
    expect(data.notices).toHaveLength(0);
    expect(() => document.body.append(renderNotificationBell(document, data))).not.toThrow();
    expect(document.querySelector('.siase-v2-notification__button')).toBeTruthy();
  });

  it('preserves the original form and submits career data without javascript URLs', () => {
    vi.useFakeTimers();
    mountFixture('career-selector.html');
    const form = document.forms.namedItem('SelCarrera') as HTMLFormElement;
    const source = form.querySelector<HTMLAnchorElement>('a[href]') as HTMLAnchorElement;
    source.setAttribute(
      'href',
      "javascript:self.document.SelCarrera.HTMLCve_Carrera.value='01'; self.document.SelCarrera.submit()"
    );
    const submit = vi.spyOn(form, 'submit').mockImplementation(() => undefined);

    expect(enhanceCareerSelectorPage(document)).toBe(true);
    const choice = document.querySelector<HTMLButtonElement>('.siase-v2-career-choice');
    expect(choice?.querySelector('.siase-v2-career-choice__icon')).toBeTruthy();
    expect(choice?.querySelector('.siase-v2-career-choice__badge')?.textContent).toBe(
      'Carrera disponible'
    );
    expect(document.querySelector('.siase-v2-career-profile')).toBeTruthy();
    expect(document.querySelector('.siase-v2-career-announcement')).toBeTruthy();
    choice?.click();
    vi.runAllTimers();

    expect(submit).toHaveBeenCalledOnce();
    expect(form.elements.namedItem('HTMLCve_Carrera')).toBeTruthy();
    expect(document.forms.namedItem('SelCarrera')).toBe(form);
    expect(form.action).toContain('/cgi-bin/wspd_cgi.sh/eselcarrera.htm');
    expect(form.method).toBe('post');
    expect(form.target).toBe('center');
    expect(form.querySelector<HTMLInputElement>('input[name="HTMLtrim"]')?.value).toBe(
      '[redacted]'
    );
    expect(
      document.getElementById('siase')?.classList.contains('siase-v2-career-service-panel')
    ).toBe(true);
    vi.useRealTimers();
  });
});

describe('document upload enhancer', () => {
  it('styles native DataTables, file, progress and dialog contracts without submitting', () => {
    mountFixture('document-upload.html');
    const form = document.forms.namedItem('mi_forma') as HTMLFormElement;
    const submit = vi.spyOn(form, 'submit').mockImplementation(() => undefined);
    const file = document.querySelector<HTMLInputElement>('#HTMLArchivo');

    expect(enhanceDocumentUploadPage(document)).toBe(true);

    expect(document.forms.namedItem('mi_forma')).toBe(form);
    expect(file?.type).toBe('file');
    expect(file?.files?.length).toBe(0);
    expect(submit).not.toHaveBeenCalled();
    expect(
      document.getElementById('idListado')?.classList.contains('siase-v2-document-table')
    ).toBe(true);
    expect(document.getElementById('idbarra')?.getAttribute('aria-valuenow')).toBe('10');
    expect(document.querySelectorAll('.siase-v2-service-dialog')).toHaveLength(2);
  });
});

describe('academic credits enhancer', () => {
  it('uses visible totals and stable accordion/table contracts', () => {
    mountFixture('academic-credits.html');
    const heading = document.querySelector<HTMLHeadingElement>('#accordion > h3');
    const headingClick = vi.fn();
    heading?.addEventListener('click', headingClick);

    expect(parseVisibleCreditTotals('Créditos aprobados 180 de 220')).toEqual({
      approved: 180,
      total: 220
    });
    expect(enhanceAcademicCreditsPage(document)).toBe(true);
    heading?.click();

    const progress = document.querySelector<HTMLElement>('.siase-v2-credit-progress');
    expect(progress?.getAttribute('aria-valuenow')).toBe('180');
    expect(progress?.getAttribute('aria-valuemax')).toBe('220');
    expect(progress?.querySelector<HTMLElement>('span')?.style.width).toBe('81.81818181818183%');
    expect(document.querySelectorAll('.siase-v2-credit-table')).toHaveLength(2);
    expect(headingClick).toHaveBeenCalledOnce();
    expect(document.querySelector('#ui-id-1')).toBe(heading);
  });
});
