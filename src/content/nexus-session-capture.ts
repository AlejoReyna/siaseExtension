import './theme';

const NEXUS_SESSION_KEY = 'UanlNexus7SesionStorage';
const NEXUS_CAPTURE_PREFIX = '[SIASE Plus Nexus Capture]';
const NEXUS_DEEPLINK_PREFIX = '[SIASE Plus Nexus Deeplink]';

interface NexusDeepLinkTarget {
  course: string;
  activity: string;
}

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

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function visibleElement(element: Element): element is HTMLElement {
  const htmlElement = element as HTMLElement;
  const rect = htmlElement.getBoundingClientRect();
  const style = window.getComputedStyle(htmlElement);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function readDeepLinkTarget(): NexusDeepLinkTarget | null {
  const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?').slice(1).join('?') : '';
  const params = new URLSearchParams(hashQuery || window.location.search);
  const course = params.get('siasePlusCourse')?.trim();
  const activity = params.get('siasePlusActivity')?.trim();

  if (!course || !activity) return null;
  return { course, activity };
}

function bestTextMatch<T extends Element>(elements: T[], target: string): T | null {
  const normalizedTarget = normalizeText(target);
  const matches = elements
    .filter(visibleElement)
    .map((element) => ({
      element,
      text: normalizeText(element.textContent ?? '')
    }))
    .filter(({ text }) => text.length > 2 && (text.includes(normalizedTarget) || normalizedTarget.includes(text)))
    .sort((a, b) => a.text.length - b.text.length);

  return matches[0]?.element ?? null;
}

function clickElement(element: Element | null): boolean {
  const clickable = element?.closest<HTMLElement>('a, button, [role="button"], mat-list-item, .mat-list-item') ?? null;
  const target = clickable && visibleElement(clickable) ? clickable : element;
  if (!target || !visibleElement(target)) return false;

  target.click();
  return true;
}

function openCourse(target: NexusDeepLinkTarget): boolean {
  const courseElement = bestTextMatch(Array.from(document.querySelectorAll('body *')), target.course);
  if (!courseElement) return false;

  const courseContainer =
    courseElement.closest<HTMLElement>('mat-card, .mat-card, .card, tr, li, .row, div') ?? courseElement;
  const estructuraLink = courseContainer.querySelector<HTMLElement>(
    'a[href*="/App/UnidadesAprendizaje/UA/Estructura"]'
  );

  return clickElement(estructuraLink ?? courseElement);
}

function openStructureNav(): boolean {
  const estructuraLink =
    document.querySelector<HTMLElement>('a[href="#/App/UnidadesAprendizaje/UA/Estructura"]') ??
    bestTextMatch(Array.from(document.querySelectorAll<HTMLElement>('a, button')), 'Estructura');

  return clickElement(estructuraLink);
}

function openActivity(target: NexusDeepLinkTarget): boolean {
  const activityElement = bestTextMatch(
    Array.from(document.querySelectorAll<HTMLElement>('a, mat-list-item, .mat-list-item, button, div')),
    target.activity
  );

  return clickElement(activityElement);
}

function removeDeepLinkParams(): void {
  const hash = window.location.hash;
  if (!hash.includes('?siasePlus')) return;

  window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${hash.split('?')[0]}`);
}

function scheduleDeepLinkNavigation(target: NexusDeepLinkTarget): void {
  let deeplinkAttempts = 0;

  const timerId = window.setInterval(() => {
    deeplinkAttempts += 1;

    try {
      const normalizedBody = normalizeText(document.body.textContent ?? '');
      const normalizedCourse = normalizeText(target.course);
      const onTargetCourse = normalizedBody.includes(normalizedCourse);
      const hash = window.location.hash;

      if (/\/UA\/Estructura\/(Evidencia|ProductoIntegrador)\//.test(hash)) {
        removeDeepLinkParams();
        window.clearInterval(timerId);
        return;
      }

      if (hash.includes('/App/UnidadesAprendizaje/UA/Estructura')) {
        if (openActivity(target)) return;
      } else if (hash.includes('/App/UnidadesAprendizaje/UA/')) {
        if (onTargetCourse && openStructureNav()) return;
      } else {
        if (openCourse(target)) return;
      }
    } catch (error) {
      console.warn(`${NEXUS_DEEPLINK_PREFIX} navigation attempt failed`, error);
    }

    if (deeplinkAttempts >= 40) {
      console.warn(`${NEXUS_DEEPLINK_PREFIX} target not found`, {
        course: target.course,
        activity: target.activity
      });
      removeDeepLinkParams();
      window.clearInterval(timerId);
    }
  }, 750);
}

const deepLinkTarget = readDeepLinkTarget();
if (deepLinkTarget) {
  console.info(`${NEXUS_DEEPLINK_PREFIX} target received`, {
    course: deepLinkTarget.course,
    activity: deepLinkTarget.activity
  });
  scheduleDeepLinkNavigation(deepLinkTarget);
}

export {};
