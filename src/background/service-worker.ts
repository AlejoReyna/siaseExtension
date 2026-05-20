import type {
  ChromeMessage,
  NexusApiRequestMessage,
  NexusApiResponseMessage,
  NexusPortalRequestMessage,
  UanlNewsRequestMessage
} from '@/types/chrome-messages';
import { handleAlarm, registerGradeCheckAlarm } from './alarms';
import { handleGradeRefresh } from './grade-monitor';

const NEXUS_LOG_PREFIX = '[SIASE Plus Nexus SW]';
const NEXUS_REQUEST_TIMEOUT_MS = 10000;
const UANL_NEWS_URL = 'https://www.uanl.mx/noticias/';

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

async function handleUanlNewsRequest(
  _message: UanlNewsRequestMessage,
  sendResponse: (response: NexusApiResponseMessage) => void
): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NEXUS_REQUEST_TIMEOUT_MS);
    const response = await fetch(UANL_NEWS_URL, {
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    const text = await response.text();
    sendResponse({
      ok: response.ok,
      status: response.status,
      data: {
        body: text,
        url: response.url
      },
      debug: {
        responseType: response.headers.get('content-type') || undefined
      }
    });
  } catch (error) {
    sendResponse({
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Could not load UANL news',
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

    if (message.type === 'UANL_NEWS_REQUEST') {
      void handleUanlNewsRequest(message, sendResponse);
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
          const session = data.nexusSessionStorage as
            | { Sesion?: { FechaInicio?: string; TiempoRestante?: number } }
            | undefined;

          // Validar el TTL real de la sesión antes de devolverla.
          // Sin este chequeo, el SW devuelve sesiones expiradas con los mismos campos
          // que una sesión válida, haciendo que career-landing.ts las acepte y falle
          // al llamar a la API con un token caducado.
          if (session?.Sesion?.FechaInicio && typeof session.Sesion.TiempoRestante === 'number') {
            const expiry =
              new Date(session.Sesion.FechaInicio).getTime() +
              session.Sesion.TiempoRestante * 1000;
            const MARGIN_MS = 2 * 60 * 1000;
            if (Date.now() > expiry - MARGIN_MS) {
              console.info(`${NEXUS_LOG_PREFIX} cached session expired in SW; discarding`);
              void chrome.storage.local.remove(['nexusSessionStorage', 'nexusSessionCapturedAt']);
              sendResponse({ ok: false, status: 200, data: { nexusSessionStorage: null } });
              return;
            }
          }

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

    if (message.type === 'CLEAR_NEXUS_SESSION') {
      void chrome.storage.local.remove(['nexusSessionStorage', 'nexusSessionCapturedAt']);
      console.info(`${NEXUS_LOG_PREFIX} nexus session cleared by content script request`);
      return false;
    }

    return false;
  });
}

initializeServiceWorker();
