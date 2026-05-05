import './theme';

const NEXUS_SESSION_KEY = 'UanlNexus7SesionStorage';
const NEXUS_CAPTURE_PREFIX = '[SIASE Plus Nexus Capture]';

function captureNexusSession(): boolean {
  try {
    const raw = localStorage.getItem(NEXUS_SESSION_KEY);
    if (!raw) return false;

    const session = JSON.parse(raw) as { Sesion?: { Token?: string } };
    if (!session.Sesion?.Token) return false;

    console.info(`${NEXUS_CAPTURE_PREFIX} session found`, {
      hasToken: true,
      keys: Object.keys(session.Sesion)
    });
    void chrome.runtime.sendMessage({ type: 'NEXUS_SESSION_CAPTURED', session });
    return true;
  } catch (error) {
    console.warn(`${NEXUS_CAPTURE_PREFIX} failed`, error);
    return false;
  }
}

let attempts = 0;
const timer = window.setInterval(() => {
  attempts += 1;
  if (captureNexusSession() || attempts >= 12) {
    window.clearInterval(timer);
  }
}, 500);

captureNexusSession();

export {};
