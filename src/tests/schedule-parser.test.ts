import { describe, expect, it } from 'vitest';
import { parseSchedule } from '@/utils/parser/schedule';
import scheduleFixture from './fixtures/schedule.html?raw';

describe('parseSchedule', () => {
  it('parses UANL time slot codes', () => {
    document.body.innerHTML = '<table><tr><td>M1</td><td>Programacion</td></tr></table>';
    expect(parseSchedule(document)[0]?.startTime).toBe('07:00');
  });

  it('parses the live SIASE schedule structure with br-delimited course cells', () => {
    const parsed = new DOMParser().parseFromString(scheduleFixture, 'text/html');

    expect(parseSchedule(parsed)).toEqual([
      expect.objectContaining({
        subject: 'INGENIERIA DE DISPOSITIVOS MOVILES',
        weekday: 'saturday',
        slotCode: 'M3',
        startTime: '08:40',
        endTime: '09:30',
        courseCode: '845',
        group: '602',
        phase: 'F-01',
        enrollmentType: 'LB',
        classroom: '4105',
        rawText: 'F-01 / LB\nDISMOV\n602 / 4105'
      }),
      expect.objectContaining({
        subject: 'TOPICOS SELECTOS DE CIENCIAS DE LA ING III',
        weekday: 'monday',
        slotCode: 'N2',
        startTime: '19:30',
        endTime: '20:20',
        courseCode: '860',
        group: '003',
        classroom: '3203'
      }),
      expect.objectContaining({
        subject: 'TOPICOS SELECTOS DE CIENCIAS DE LA ING III',
        weekday: 'wednesday',
        slotCode: 'N2',
        classroom: '3203'
      }),
      expect.objectContaining({
        subject: 'TOPICOS SEL. DE CIENCIAS DE LA INGENIERIA',
        weekday: 'thursday',
        slotCode: 'N2',
        courseCode: '854',
        classroom: '4208'
      })
    ]);
  });
});
