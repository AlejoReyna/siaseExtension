import { describe, expect, it, vi } from 'vitest';
import {
  enhanceAcademicCreditsPage,
  parseVisibleCreditTotals
} from '@/content/pages/academic-credits-page';
import { enhanceCareerSelectorPage } from '@/content/pages/career-selector-page';
import { enhanceDocumentUploadPage } from '@/content/pages/document-upload-page';
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
  it('preserves the original form and delegates each new choice to its native anchor', () => {
    mountFixture('career-selector.html');
    const form = document.forms.namedItem('SelCarrera') as HTMLFormElement;
    const source = form.querySelector<HTMLAnchorElement>('a[href]') as HTMLAnchorElement;
    const sourceClick = vi.spyOn(source, 'click').mockImplementation(() => undefined);

    expect(enhanceCareerSelectorPage(document)).toBe(true);
    const choice = document.querySelector<HTMLButtonElement>('.siase-v2-career-choice');
    choice?.click();

    expect(sourceClick).toHaveBeenCalledOnce();
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
