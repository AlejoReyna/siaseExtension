import { describe, expect, it } from 'vitest';
import { extractSiaseSessionParams } from '@/utils/siase-session';

describe('extractSiaseSessionParams', () => {
  it('extracts the WebSpeed session params from the top frame', () => {
    const frame = document.createElement('frame');
    frame.name = 'top';
    frame.src =
      '/cgi-bin/wspd_cgi.sh/maintop.htm?HTMLUsuario=1851265&HTMLtrim=39495922&HTMLCve_Carrera=10';
    document.body.replaceChildren(frame);

    expect(extractSiaseSessionParams(document)).toMatchObject({
      HTMLUsuario: '1851265',
      HTMLtrim: '39495922',
      HTMLCve_Carrera: '10'
    });
  });

  it('ignores frames without an authenticated session token', () => {
    const frame = document.createElement('frame');
    frame.name = 'top';
    frame.src = '/maintop.htm';
    document.body.replaceChildren(frame);
    expect(extractSiaseSessionParams(document)).toBeUndefined();
  });
});
