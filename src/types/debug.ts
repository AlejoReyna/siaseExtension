export type SiaseDebugValue = string | number | boolean | null;

export interface SiaseDebugLog {
  at: string;
  message: string;
  details?: Record<string, SiaseDebugValue>;
}
