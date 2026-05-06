import type { GradeSnapshot } from './grades';
import type { KardexSummary } from './kardex';
import type { MenuItem } from './menu';
import type { ScheduleSlot } from './schedule';
import type { StudentInfo, StudentStatus } from './student';

export interface StorageSchema {
  studentInfo: StudentInfo;
  studentStatus: StudentStatus;
  gradeSnapshot: GradeSnapshot;
  scheduleSlots: ScheduleSlot[];
  menuItems: MenuItem[];
  pinnedMenuIds: string[];
  kardexSnapshot: KardexSummary;
  /** Query params de sesión de WebSpeed capturados del frame top/left de default.htm */
  siaseSessionParams: Record<string, string>;
}

export type StorageKey = keyof StorageSchema;
