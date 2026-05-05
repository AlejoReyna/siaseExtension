import type {
  ChromeMessage,
  NexusApiRequestMessage,
  NexusApiResponseMessage,
  NexusPortalRequestMessage
} from '@/types/chrome-messages';
import { handleAlarm, registerGradeCheckAlarm } from './alarms';
import { handleGradeRefresh } from './grade-monitor';

const NEXUS_LOG_PREFIX = '[SIASE Plus Nexus SW]';
const NEXUS_REQUEST_TIMEOUT_MS = 10000;

function redactNexusLogValue(value: string): string {
  return value
    .replace(/("?(?:Token|Clave|Password|Contrasena|Contraseña)"?\s*[:=]\s*")([^"]+)/gi, '$1[redacted]')
    .replace(/((?:Token|Clave|Password|Contrasena|Contraseña)=)([^&\s]+)/gi, '$1[redacted]')
    .slice(0, 600);
}

async function handleNexusApiRequest(
  message: NexusApiRequestMessage,
  sendResponse: (response: NexusApiResponseMessage) => void
): Promise<void> {
  const requestDebug = {
    url: message.url,
    method: message.method,
    headerKeys: Object.keys(message.headers),
    bodyKeys: Object.keys(message.body)
  };
  console.info(`${NEXUS_LOG_PREFIX} request`, requestDebug);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NEXUS_REQUEST_TIMEOUT_MS);
    const response = await fetch(message.url, {
      method: message.method,
      headers: message.headers,
      body: JSON.stringify(message.body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    const bodyPreview = redactNexusLogValue(text);
    const responseDebug = {
      url: message.url,
      ok: response.ok,
      status: response.status,
      responseType: response.headers.get('content-type') || 'unknown',
      bodyPreview: response.ok ? '[ok body hidden]' : bodyPreview
    };
    if (response.ok) {
      console.info(`${NEXUS_LOG_PREFIX} response`, responseDebug);
    } else {
      console.warn(`${NEXUS_LOG_PREFIX} response`, responseDebug);
    }

    sendResponse({
      ok: response.ok,
      status: response.status,
      data,
      debug: {
        bodyPreview,
        responseType: response.headers.get('content-type') || undefined
      }
    });
  } catch (error) {
    console.error(`${NEXUS_LOG_PREFIX} request failed`, {
      ...requestDebug,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    sendResponse({
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Nexus request failed',
      debug: {
        errorName: error instanceof Error ? error.name : 'UnknownError'
      }
    });
  }
}

async function handleNexusPortalRequest(
  message: NexusPortalRequestMessage,
  sendResponse: (response: NexusApiResponseMessage) => void
): Promise<void> {
  console.info(`${NEXUS_LOG_PREFIX} portal request`, {
    url: message.url,
    method: message.method,
    hasBody: Boolean(message.body)
  });

  try {
    const response = await fetch(message.url, {
      method: message.method,
      headers:
        message.method === 'POST'
          ? { 'Content-Type': 'application/x-www-form-urlencoded' }
          : undefined,
      body: message.method === 'POST' ? message.body : undefined,
      credentials: 'include',
      redirect: 'follow'
    });
    const text = await response.text();
    const bodyPreview = redactNexusLogValue(text);
    const debug = {
      bodyPreview,
      responseType: response.headers.get('content-type') || undefined
    };

    console.info(`${NEXUS_LOG_PREFIX} portal response`, {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      redirected: response.redirected,
      responseType: debug.responseType,
      bodyPreview
    });

    sendResponse({
      ok: response.ok,
      status: response.status,
      data: {
        url: response.url,
        redirected: response.redirected,
        body: text
      },
      debug
    });
  } catch (error) {
    console.error(`${NEXUS_LOG_PREFIX} portal request failed`, {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    sendResponse({
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Nexus portal request failed',
      debug: {
        errorName: error instanceof Error ? error.name : 'UnknownError'
      }
    });
  }
}

export function initializeServiceWorker(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void registerGradeCheckAlarm();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    void handleAlarm(alarm);
  });

  // Grades content script pushes fresh grades on every page load.
  // Diff here in the background so the content script stays stateless.
  chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
    if (message.type === 'REFRESH_GRADES') {
      void handleGradeRefresh(message.grades);
    }

    if (message.type === 'NEXUS_API_REQUEST') {
      void handleNexusApiRequest(message, sendResponse);
      return true;
    }

    if (message.type === 'NEXUS_PORTAL_REQUEST') {
      void handleNexusPortalRequest(message, sendResponse);
      return true;
    }

    if (message.type === 'NEXUS_SESSION_CAPTURED') {
      void chrome.storage.local.set({
        nexusSessionStorage: message.session,
        nexusSessionCapturedAt: Date.now()
      });
      console.info(`${NEXUS_LOG_PREFIX} session captured from Nexus page`);
      return false;
    }

    if (message.type === 'GET_CAPTURED_NEXUS_SESSION') {
      chrome.storage.local
        .get(['nexusSessionStorage', 'nexusSessionCapturedAt'])
        .then((data) => {
          sendResponse({
            ok: Boolean(data.nexusSessionStorage),
            status: 200,
            data
          });
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            status: 0,
            error: error instanceof Error ? error.message : 'Could not read captured Nexus session'
          });
        });
      return true;
    }

    return false;
  });
}

initializeServiceWorker();
