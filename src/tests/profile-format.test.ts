import { describe, expect, it } from 'vitest';
import { formatPlanCode } from '@/content/center-ui';

describe('formatPlanCode', () => {
  it.each([
    ['Plan de Estudios: 401', '401'],
    ['Plan: A-401', 'A-401'],
    ['De Estudio: 401', '401'],
    ['MODELO ACADEMICO V1', 'V1'],
    ['401', '401']
  ])('normalizes %s to %s', (input, expected) => {
    expect(formatPlanCode(input)).toBe(expected);
  });

  it('rejects text without a plan code', () => {
    expect(formatPlanCode('Plan de Estudios')).toBe('');
    expect(formatPlanCode(undefined)).toBe('');
  });
});
