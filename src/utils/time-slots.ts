import type { TimeSlotCode } from '@/types/schedule';
export const UANL_TIME_SLOTS: Record<TimeSlotCode, string> = {
  M1: '07:00',
  M2: '07:50',
  M3: '08:40',
  M4: '09:30',
  M5: '10:20',
  M6: '11:10',
  V1: '12:00',
  V2: '12:50',
  V3: '13:40',
  V4: '14:30',
  V5: '15:20',
  V6: '16:10',
  V7: '17:00',
  V8: '17:50',
  N1: '18:40',
  N2: '19:30',
  N3: '20:20',
  N4: '21:10',
  N5: '22:00',
  N6: '22:50'
};
export function resolveTimeSlot(code: TimeSlotCode): string { return UANL_TIME_SLOTS[code]; }
