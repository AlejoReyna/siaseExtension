import type { ScheduleSlot, TimeSlotCode, Weekday } from '@/types/schedule';
import { UANL_TIME_SLOTS, resolveTimeSlot } from '@/utils/time-slots';
import { cellsFromRow, textContent } from './dom';
import { scheduleDebug } from '@/utils/debug';

const weekdayByIndex: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const slotPattern = /\b(M[1-6]|V[1-8]|N[1-6])\b/;
const timeRangePattern = /(\d{1,2}:\d{2})\s*(a\.?m\.?|p\.?m\.?)\s*a\s*(\d{1,2}:\d{2})\s*(a\.?m\.?|p\.?m\.?)/i;

interface CourseCatalogEntry {
  subject: string;
  courseCode?: string;
}

interface ParsedCourseCell {
  abbreviation: string;
  classroom?: string;
  enrollmentType?: string;
  group?: string;
  phase?: string;
  rawText: string;
}

function normalize(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function linesFromElement(element: Element | null): string[] {
  if (!element) return [];
  const lines: string[] = [];
  let current = '';

  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as Element;
    if (child.tagName.toLowerCase() === 'br') {
      lines.push(normalize(current));
      current = '';
      return;
    }
    child.childNodes.forEach(visit);
  };

  element.childNodes.forEach(visit);
  lines.push(normalize(current));
  return lines.filter(Boolean);
}

function textWithBreaks(element: Element | null): string {
  return linesFromElement(element).join('\n');
}

function parseClock(value: string, meridiem: string): string {
  const [hourText, minuteText] = value.split(':');
  let hour = Number(hourText);
  const minute = Number(minuteText);
  const isPm = meridiem.toLowerCase().startsWith('p');
  if (isPm && hour < 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTimeRange(value: string): { startTime: string; endTime: string } | undefined {
  const match = normalize(value).match(timeRangePattern);
  if (!match) return undefined;
  return {
    startTime: parseClock(match[1], match[2]),
    endTime: parseClock(match[3], match[4])
  };
}

function slotCodeForTime(startTime: string): TimeSlotCode | undefined {
  return (Object.entries(UANL_TIME_SLOTS) as Array<[TimeSlotCode, string]>).find(
    ([, time]) => time === startTime
  )?.[0];
}

function findScheduleGrid(document: Document): HTMLTableElement | undefined {
  return Array.from(document.querySelectorAll<HTMLTableElement>('table')).find((table) => {
    const header = normalize(textContent(table.querySelector('tr'))).toLocaleLowerCase('es-MX');
    return /lunes/.test(header) && /martes/.test(header) && /sábado|sabado/.test(header);
  });
}

function findCourseCatalog(document: Document): {
  table: HTMLTableElement;
  subjectIndex: number;
  abbreviationIndex: number;
  courseCodeIndex: number;
} | undefined {
  for (const table of Array.from(document.querySelectorAll<HTMLTableElement>('table'))) {
    const headerRow = table.rows[0];
    if (!headerRow) continue;
    const headers = Array.from(headerRow.cells).map((cell) => normalize(textContent(cell)).toLocaleLowerCase('es-MX'));
    const subjectIndex = headers.findIndex((header) => /^materia$/.test(header));
    const abbreviationIndex = headers.findIndex((header) => /abreviaci[oó]n.*materia/.test(header));
    const courseCodeIndex = headers.findIndex((header) => /clave.*materia/.test(header));
    if (subjectIndex >= 0 && abbreviationIndex >= 0) {
      return { table, subjectIndex, abbreviationIndex, courseCodeIndex };
    }
  }
  return undefined;
}

function findCourseNames(document: Document): Map<string, CourseCatalogEntry> {
  const catalog = findCourseCatalog(document);
  const names = new Map<string, CourseCatalogEntry>();
  if (!catalog) return names;

  Array.from(catalog.table.rows).slice(1).forEach((row) => {
    const cells = cellsFromRow(row);
    const abbreviation = cells[catalog.abbreviationIndex]?.toUpperCase();
    const subject = cells[catalog.subjectIndex];
    if (!abbreviation || !subject || /^totales$/i.test(abbreviation)) return;
    names.set(abbreviation, {
      subject,
      courseCode: catalog.courseCodeIndex >= 0 ? cells[catalog.courseCodeIndex] : undefined
    });
  });
  return names;
}

function parseCourseCell(cell: Element): ParsedCourseCell | undefined {
  const lines = linesFromElement(cell);
  if (lines.length < 2) return undefined;

  const firstLine = lines[0].split('/').map((part) => normalize(part));
  const lastLine = lines[lines.length - 1].split('/').map((part) => normalize(part));
  const abbreviation = normalize(lines[1]).toUpperCase();
  if (!abbreviation) return undefined;

  return {
    abbreviation,
    phase: firstLine[0] || undefined,
    enrollmentType: firstLine[1] || undefined,
    group: lastLine[0] || undefined,
    classroom: lastLine[1] || undefined,
    rawText: lines.join('\n')
  };
}

function parseGridSchedule(document: Document): ScheduleSlot[] {
  const table = findScheduleGrid(document);
  if (!table) {
    scheduleDebug('parser:grid:not-found', {
      tables: document.querySelectorAll('table').length,
      headers: Array.from(document.querySelectorAll<HTMLTableElement>('table'))
        .slice(0, 5)
        .map((candidate) => textContent(candidate.querySelector('tr')).slice(0, 160))
        .join(' || ')
    });
    return [];
  }
  const courseNames = findCourseNames(document);
  const slots: ScheduleSlot[] = [];
  let timeRows = 0;
  let courseCells = 0;

  Array.from(table.rows).slice(1).forEach((row) => {
    const cells = Array.from(row.cells);
    const range = parseTimeRange(textWithBreaks(cells[0]));
    if (!range) return;
    timeRows += 1;
    const slotCode = slotCodeForTime(range.startTime);
    if (!slotCode) return;

    cells.slice(1, 7).forEach((cell, dayIndex) => {
      const course = parseCourseCell(cell);
      if (!course) return;
      courseCells += 1;
      const catalogEntry = courseNames.get(course.abbreviation);
      const subject = catalogEntry?.subject ?? course.abbreviation;
      slots.push({
        id: `${weekdayByIndex[dayIndex]}-${range.startTime}-${course.abbreviation}-${course.classroom ?? ''}`,
        subject,
        courseCode: catalogEntry?.courseCode,
        enrollmentType: course.enrollmentType,
        phase: course.phase,
        group: course.group,
        weekday: weekdayByIndex[dayIndex],
        slotCode,
        startTime: range.startTime,
        endTime: range.endTime,
        classroom: course.classroom,
        rawText: course.rawText
      });
    });
  });

  scheduleDebug('parser:grid:result', {
    rows: table.rows.length,
    timeRows,
    courseCells,
    catalogEntries: courseNames.size,
    slots: slots.length
  });
  return slots;
}

function parseLegacySchedule(document: Document): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  Array.from(document.querySelectorAll('tr')).forEach((row, rowIndex) => {
    const cells = cellsFromRow(row as HTMLTableRowElement);
    const slotCell = cells.find((cell) => slotPattern.test(cell));
    const subject = cells.find((cell) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(cell));
    if (!slotCell || !subject) return;
    const slotCode = slotCell.match(slotPattern)?.[1] as TimeSlotCode | undefined;
    if (!slotCode) return;
    slots.push({
      id: `${rowIndex}-${slotCode}-${subject}`,
      subject,
      weekday: weekdayByIndex[rowIndex % weekdayByIndex.length],
      slotCode,
      startTime: resolveTimeSlot(slotCode),
      rawText: cells.join(' | ')
    });
  });
  return slots;
}

export function parseSchedule(document: Document): ScheduleSlot[] {
  const gridSlots = parseGridSchedule(document);
  if (gridSlots.length) return gridSlots;
  const legacySlots = parseLegacySchedule(document);
  scheduleDebug('parser:legacy:result', { slots: legacySlots.length });
  return legacySlots;
}
