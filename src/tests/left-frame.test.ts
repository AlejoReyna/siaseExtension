import { describe, expect, it } from 'vitest';
import { isBecasPageUrl } from '@/content/left-frame';

describe('isBecasPageUrl', () => {
  it('recognizes SIASE scholarship service pages', () => {
    expect(isBecasPageUrl('https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/bccosobe01.htm')).toBe(true);
    expect(isBecasPageUrl('https://deimos.dgi.uanl.mx/cgi-bin/fotos.sh/bcerCargaDocto05.htm')).toBe(true);
  });

  it('does not hide the sidebar on regular SIASE pages', () => {
    expect(isBecasPageUrl('https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/echalm01.htm')).toBe(false);
  });
});
