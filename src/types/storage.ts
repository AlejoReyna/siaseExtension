import type { GradeSnapshot } from './grades';
import type { KardexSummary } from './kardex';
import type { MenuItem } from './menu';
import type { ScheduleSlot } from './schedule';
import type { StudentInfo, StudentStatus } from './student';
import type { SiaseDebugLog } from './debug';
import type { DashboardSectionId } from './dashboard';

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
  /** ISO timestamp for the last successful SIASE keep-alive ping. */
  siaseKeepAliveAt: string;
  /** Short persistent trace used to debug multi-frame SIASE synchronization. */
  siaseDebugLogs: SiaseDebugLog[];
  /** Locally selected profile picture, resized before being stored as a data URL. */
  profilePhotoDataUrl: string;
  /** User-defined order for the main dashboard sections. */
  dashboardSectionOrder: DashboardSectionId[];
  /** Enables the enhanced SIASE presentation; false restores the native portal on reload. */
  siaseEnhancementsEnabled: boolean;
}

export type StorageKey = keyof StorageSchema;
