export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type TimeSlotCode =
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'N5'
  | 'N6';
export interface ScheduleSlot {
  id: string;
  subject: string;
  teacher?: string;
  classroom?: string;
  courseCode?: string;
  enrollmentType?: string;
  phase?: string;
  group?: string;
  weekday: Weekday;
  slotCode: TimeSlotCode;
  startTime: string;
  endTime?: string;
  rawText?: string;
}
export interface ScheduleExportOptions { calendarName: string; semesterStart: string; semesterEnd: string; timezone: string; }
