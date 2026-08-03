import { describe, expect, it } from 'vitest';
import { extractFormOverrides, selectPeriodValue } from '@/content/dashboard-data';

describe('selectPeriodValue', () => {
  it('skips the SIASE placeholder value 0', () => {
    document.body.innerHTML = `
      <select>
        <option value="0" selected>Selecciona</option>
        <option value="period-2026">Agosto-Diciembre 2026</option>
      </select>
    `;

    expect(selectPeriodValue(document.querySelector('select')!)).toBe('period-2026');
  });

  it('keeps an already selected valid period', () => {
    document.body.innerHTML = `
      <select>
        <option value="0">Selecciona</option>
        <option value="period-2026" selected>Agosto-Diciembre 2026</option>
      </select>
    `;

    expect(selectPeriodValue(document.querySelector('select')!)).toBe('period-2026');
  });
});

describe('extractFormOverrides', () => {
  it('reproduces the hidden value assigned by SIASE before submit', () => {
    document.body.innerHTML = `
      <form name="mi_forma">
        <input name="HTMLTrund" value="" />
        <button onclick="inicio();">Aceptar</button>
      </form>
      <script>function inicio(){ document.mi_forma.HTMLTrund.value="echalm02"; document.mi_forma.submit(); }</script>
    `;

    expect(extractFormOverrides(document)).toEqual({ HTMLTrund: 'echalm02' });
  });
});
