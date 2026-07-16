import { describe, expect, it } from 'vitest';
import { parseMenuItems } from '@/utils/parser/menu';

describe('parseMenuItems', () => {
  it('parses and categorizes center-targeted menu anchors', () => {
    document.body.innerHTML =
      '<ul class="menu collapsible"><li><a target="center" href="/x">Horario</a></li></ul>';
    expect(parseMenuItems(document)[0]?.category).toBe('schedule');
  });

  it('preserves non-center navigation targets', () => {
    document.body.innerHTML = `
      <ul class="menu collapsible">
        <li><a target="_new" href="/beca">Solicitud de Beca</a></li>
        <li><a target="_top" href="/practicas">Prácticas Profesionales</a></li>
      </ul>
    `;
    expect(parseMenuItems(document).map(({ label, target }) => ({ label, target }))).toEqual([
      { label: 'Solicitud de Beca', target: '_new' },
      { label: 'Prácticas Profesionales', target: '_top' }
    ]);
  });
});
