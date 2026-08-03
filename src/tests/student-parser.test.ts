import { describe, expect, it } from 'vitest';
import { parseStudentInfo } from '@/utils/parser/student';

describe('parseStudentInfo', () => {
  it('separates student fields when SIASE renders every label in one text run', () => {
    document.body.innerHTML = `
      <table class="MenuLink">
        <tr><td><span class="style1">ALEXIS ALBERTO REYNA SANCHEZ</span></td></tr>
      </table>
      <p>
        Nombre: ALEXIS ALBERTO REYNA SANCHEZ
        Carrera: INGENIERO EN TECNOLOGIA DE SOFTWARE
        Plan de Estudios: MODELO ACADEMICO V1
      </p>
      <p data-institution>Universidad Autónoma de Nuevo León</p>
    `;

    expect(parseStudentInfo(document)).toMatchObject({
      name: 'ALEXIS ALBERTO REYNA SANCHEZ',
      program: 'INGENIERO EN TECNOLOGIA DE SOFTWARE',
      plan: 'MODELO ACADEMICO V1',
      institution: 'Universidad Autónoma de Nuevo León',
      rawProfileText:
        'Nombre: ALEXIS ALBERTO REYNA SANCHEZ Carrera: INGENIERO EN TECNOLOGIA DE SOFTWARE Plan de Estudios: MODELO ACADEMICO V1'
    });
  });

  it('continues to parse fields separated by line breaks', () => {
    document.body.innerHTML = `
      <p>
        Nombre: ALEXIS ALBERTO REYNA SANCHEZ<br>
        Carrera: INGENIERO EN TECNOLOGIA DE SOFTWARE<br>
        Plan de Estudios: MODELO ACADEMICO V1
      </p>
    `;

    expect(parseStudentInfo(document)).toMatchObject({
      name: 'ALEXIS ALBERTO REYNA SANCHEZ',
      program: 'INGENIERO EN TECNOLOGIA DE SOFTWARE',
      plan: 'MODELO ACADEMICO V1'
    });
  });

  it('prefers the normalized HTMLUsuario value from the left frame', () => {
    const topDocument = document.implementation.createHTMLDocument();
    const leftDocument = document.implementation.createHTMLDocument();
    topDocument.body.innerHTML = `
      <p>Nombre: PERSONA DE PRUEBA Carrera: PROGRAMA DE PRUEBA Plan: PLAN V1</p>
    `;
    leftDocument.body.innerHTML = `
      <input name="HTMLUsuario" value=" TEST-2048 ">
      <p>Matrícula: FALLBACK-999</p>
    `;

    expect(parseStudentInfo(topDocument, leftDocument).matricula).toBe('TEST-2048');
  });

  it('falls back to a visible matrícula and removes it from raw profile text', () => {
    const topDocument = document.implementation.createHTMLDocument();
    const leftDocument = document.implementation.createHTMLDocument();
    topDocument.body.innerHTML = `
      <p>
        Nombre: PERSONA DE PRUEBA
        Carrera: PROGRAMA DE PRUEBA
        Plan: PLAN V1
        Matrícula: FALLBACK-2048
      </p>
    `;
    leftDocument.body.innerHTML = '<p>Matrícula: FALLBACK-2048</p>';

    const parsed = parseStudentInfo(topDocument, leftDocument);
    expect(parsed.matricula).toBe('FALLBACK-2048');
    expect(parsed.rawProfileText).not.toMatch(/matr[ií]cula|FALLBACK-2048/i);
  });

  it('rejects an invalid HTMLUsuario value when no visible fallback exists', () => {
    const topDocument = document.implementation.createHTMLDocument();
    const leftDocument = document.implementation.createHTMLDocument();
    topDocument.body.innerHTML = `
      <p>Nombre: PERSONA DE PRUEBA Carrera: PROGRAMA DE PRUEBA Plan: PLAN V1</p>
    `;
    leftDocument.body.innerHTML = '<input name="HTMLUsuario" value="x">';

    expect(parseStudentInfo(topDocument, leftDocument).matricula).toBe('');
  });
});
