import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';
import type { ScheduleExportOptions, ScheduleSlot, Weekday } from '@/types/schedule';
import { UANL_TIME_SLOTS } from './time-slots';

/** UANL class period duration in minutes (M1→7:00, M2→7:50 = 50 min). */
const CLASS_DURATION_MINUTES = 50;

/** Maps our Weekday type to the iCal BYDAY abbreviation. */
const WEEKDAY_TO_ICAL: Record<Weekday, ICalWeekday> = {
  monday: ICalWeekday.MO,
  tuesday: ICalWeekday.TU,
  wednesday: ICalWeekday.WE,
  thursday: ICalWeekday.TH,
  friday: ICalWeekday.FR,
  saturday: ICalWeekday.SA,
};

/** JS Date.getDay() value for each Weekday (0 = Sunday). */
const WEEKDAY_TO_JS_DAY: Record<Weekday, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Returns the first date on or after `from` that falls on `weekday`,
 * with hours and minutes set to `HH:MM` from `timeStr`.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function firstOccurrence(from: Date, weekday: Weekday, timeStr: string): Date {
  const [hh = 0, mm = 0] = timeStr.split(':').map(Number);
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const targetDay = WEEKDAY_TO_JS_DAY[weekday];
  const delta = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  date.setHours(hh, mm, 0, 0);
  return date;
}

/**
 * Generates a valid .ics string for a list of schedule slots.
 *
 * Each slot becomes a WEEKLY recurring VEVENT from the first matching
 * weekday on/after `semesterStart` until `semesterEnd`.
 * Duration is one 50-minute UANL class period per slot.
 */
export function generateScheduleIcs(slots: ScheduleSlot[], options: ScheduleExportOptions): string {
  const calendar = ical({ name: options.calendarName, timezone: options.timezone });
  const semesterEnd = parseLocalDate(options.semesterEnd);
  semesterEnd.setHours(23, 59, 59, 999);
  const semesterStart = parseLocalDate(options.semesterStart);

  slots.forEach((slot) => {
    const startTime = UANL_TIME_SLOTS[slot.slotCode];
    const eventStart = firstOccurrence(semesterStart, slot.weekday, startTime);
    const eventEnd = new Date(eventStart.getTime() + CLASS_DURATION_MINUTES * 60 * 1000);

    calendar.createEvent({
      id: slot.id,
      start: eventStart,
      end: eventEnd,
      summary: slot.subject,
      location: slot.classroom,
      description: [slot.teacher, slot.slotCode].filter(Boolean).join(' | '),
      repeating: {
        freq: ICalEventRepeatingFreq.WEEKLY,
        until: semesterEnd,
        byDay: [WEEKDAY_TO_ICAL[slot.weekday]],
      },
    });
  });

  return calendar.toString();
}
