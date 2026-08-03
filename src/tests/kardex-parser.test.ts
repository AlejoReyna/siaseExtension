import { describe, expect, it } from 'vitest';
import { parseKardexSummary } from '@/utils/parser/kardex';

function kardexDocument(extra: string): Document {
  return new DOMParser().parseFromString(
    `
      <html><body>
        ${extra}
        <table>
          <tr><td>Sem.</td><td>Mod.</td><td>Clave</td><td>Materia</td></tr>
          <tr>
            <td>1</td><td>1</td><td>001</td><td>PROGRAMACIÓN</td>
            <td>90</td><td></td><td></td><td></td><td></td><td></td><td>L</td>
          </tr>
        </table>
      </body></html>
    `,
    'text/html'
  );
}

describe('parseKardexSummary plan progress', () => {
  it('extracts the visible Kardex plan and rounds credit progress', () => {
    const summary = parseKardexSummary(
      kardexDocument(`
        <div id="noof">Plan de Estudios: MODELO ACADEMICO V1</div>
        <div>TOTAL..............: 93 de 220</div>
      `)
    );

    expect(summary).toMatchObject({
      planName: 'MODELO ACADEMICO V1',
      approvedCredits: 93,
      totalCredits: 220,
      progressPercent: 42
    });
  });

  it('extracts an unlabeled model name from the legacy table header', () => {
    const summary = parseKardexSummary(
      kardexDocument(`
        <table>
          <tr><td>MODELO ACADEMICO V1</td></tr>
        </table>
        <div>TOTAL..............: 93 de 220</div>
      `)
    );

    expect(summary.planName).toBe('MODELO ACADEMICO V1');
    expect(summary.progressPercent).toBe(42);
  });

  it('extracts a plan code from the sibling cell of a legacy table label', () => {
    const summary = parseKardexSummary(
      kardexDocument(`
        <table>
          <tr>
            <td>Plan de estudios</td>
            <td>401</td>
          </tr>
        </table>
        <div>TOTAL..............: 152 de 220</div>
      `)
    );

    expect(summary.planName).toBe('401');
    expect(summary.progressPercent).toBe(69);
  });

  it('uses explicit subject totals only when credit totals are absent', () => {
    const summary = parseKardexSummary(
      kardexDocument(`
        <div id="noof">Plan: PLAN DINAMICO</div>
        <div>Materias aprobadas: 21 de 50</div>
      `)
    );

    expect(summary).toMatchObject({
      approvedSubjects: 21,
      totalSubjects: 50,
      progressPercent: 42
    });
    expect(summary.approvedCredits).toBeUndefined();
  });

  it('does not invent a percentage or credit total when the Kardex omits totals', () => {
    const summary = parseKardexSummary(
      kardexDocument('<div id="noof">Kardex de licenciatura</div>')
    );

    expect(summary.planName).toBeUndefined();
    expect(summary.progressPercent).toBeUndefined();
    expect(summary.approvedCredits).toBeUndefined();
    expect(summary.totalCreditsRequired).toBe(0);
  });
});
