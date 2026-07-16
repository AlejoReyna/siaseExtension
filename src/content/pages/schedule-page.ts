import type { ScheduleSlot } from '@/types/schedule';
import { parseSchedule } from '@/utils/parser/schedule';
import { setStorageValue } from '@/utils/storage';
import { enhanceQueryPage } from './query-page';

export async function enhanceSchedulePage(frameDocument: Document): Promise<ScheduleSlot[]> {
  frameDocument.body.classList.add('siase-plus-schedule-page');
  enhanceQueryPage(frameDocument, 'schedule');
  const slots = parseSchedule(frameDocument);
  await setStorageValue('scheduleSlots', slots);
  return slots;
}
