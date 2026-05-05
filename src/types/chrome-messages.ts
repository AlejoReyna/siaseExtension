import type { Grade } from './grades';
import type { ScheduleExportOptions, ScheduleSlot } from './schedule';
export interface RefreshGradesMessage { type: 'REFRESH_GRADES'; grades: Grade[]; }
export interface ExportScheduleMessage { type: 'EXPORT_SCHEDULE'; slots: ScheduleSlot[]; options: ScheduleExportOptions; }
export interface OpenSiasePageMessage { type: 'OPEN_SIASE_PAGE'; path: string; }
export interface NexusApiRequestMessage {
  type: 'NEXUS_API_REQUEST';
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: Record<string, unknown>;
}
export interface NexusPortalRequestMessage {
  type: 'NEXUS_PORTAL_REQUEST';
  url: string;
  method: 'GET' | 'POST';
  body?: string;
}
export interface NexusSessionCapturedMessage {
  type: 'NEXUS_SESSION_CAPTURED';
  session: unknown;
}
export interface GetCapturedNexusSessionMessage {
  type: 'GET_CAPTURED_NEXUS_SESSION';
}
export interface NexusApiResponseMessage {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
  debug?: {
    bodyPreview?: string;
    errorName?: string;
    responseType?: string;
  };
}
export type ChromeMessage =
  | RefreshGradesMessage
  | ExportScheduleMessage
  | OpenSiasePageMessage
  | NexusApiRequestMessage
  | NexusPortalRequestMessage
  | NexusSessionCapturedMessage
  | GetCapturedNexusSessionMessage;
