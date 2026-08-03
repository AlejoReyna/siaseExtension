import type { SiaseDebugLog, SiaseDebugValue } from '@/types/debug';

const PREFIX = '[SIASE Plus][Horario]';
const STORAGE_KEY = 'siaseDebugLogs';
const MAX_LOGS = 150;

function printable(value: unknown): SiaseDebugValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Error) return value.message;
  return String(value);
}

export function scheduleDebug(
  message: string,
  details: Record<string, unknown> = {}
): void {
  const normalized = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, printable(value)])
  ) as Record<string, SiaseDebugValue>;
  const entry: SiaseDebugLog = { at: new Date().toISOString(), message, details: normalized };

  console.info(`${PREFIX} ${message}`, JSON.stringify(normalized));

  // Keep a short persistent trace because SIASE runs across several frames.
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  void chrome.storage.local
    .get(STORAGE_KEY)
    .then((result) => {
      const previous = result[STORAGE_KEY];
      const logs = Array.isArray(previous) ? previous.slice(-MAX_LOGS + 1) : [];
      return chrome.storage.local.set({ [STORAGE_KEY]: [...logs, entry] });
    })
    .catch(() => undefined);
}

export function scheduleDebugError(message: string, error: unknown): void {
  scheduleDebug(message, { error: printable(error) });
}
