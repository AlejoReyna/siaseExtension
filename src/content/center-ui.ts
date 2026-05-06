import type { MenuItem } from '@/types/menu';
import type { StudentInfo, StudentStatus } from '@/types/student';
import {
  centerLayoutDebugEnabled,
  exposeCenterLayoutDebug,
  logCenterLayoutSnapshot
} from './center-layout-debug';
import { getStorageValue } from '@/utils/storage';
import { applyTheme, getStoredTheme } from './theme';

function currentQuestLabel(pathname: string): string {
  const pageName = pathname.split('/').pop()?.toLowerCase() ?? '';
  if (pageName.includes('econcfs')) return 'Calificaciones';
  if (pageName.includes('echalm')) return 'Horario';
  if (pageName.includes('econkdx')) return 'Kardex';
  if (pageName.includes('edatal')) return 'Datos personales';
  if (pageName.includes('ecsitest')) return 'Situación estudiante';
  if (pageName.includes('ecohoinsint')) return 'Fecha de inscripción';
  return 'Dashboard';
}

const fallbackActions = [
  { label: 'Horario', href: '#' },
  { label: 'Calificaciones', href: '#' },
  { label: 'Kardex', href: '#' },
  { label: 'Recibo de Cuota Interna', href: '#' }
];

function displayName(studentInfo?: StudentInfo): string {
  if (!studentInfo?.name) return 'Estudiante UANL';
  return studentInfo.name.replace(/\s+/g, ' ').trim();
}

function normalizeFirstName(studentInfo?: StudentInfo): string {
  const firstName = displayName(studentInfo)
    .split(/\s+/)
    .find(
      (part) =>
        part &&
        !/^m\d+$/i.test(part) &&
        !/^\d+$/.test(part) &&
        !/^matr[ií]cula:?$/i.test(part) &&
        !/^uanl$/i.test(part)
    );
  const normalized = (firstName || 'Estudiante').toLocaleLowerCase('es-MX');
  return `${normalized.charAt(0).toLocaleUpperCase('es-MX')}${normalized.slice(1)}`;
}

function studentInitial(studentInfo?: StudentInfo): string {
  return normalizeFirstName(studentInfo).charAt(0).toLocaleUpperCase('es-MX') || 'U';
}

/** Same probes as career-landing (#correo), plus fallbacks still without dropping studentInfo merges. */
function resolveStudentEmailHint(frameDocument: Document, studentInfo?: StudentInfo): string {
  const fromLegacy = frameDocument.querySelector('#correo a.style3')?.textContent?.trim();
  if (fromLegacy?.includes('@')) return fromLegacy;

  const mailAnchor = frameDocument.querySelector<HTMLAnchorElement>('a[href^="mailto:"]');
  if (mailAnchor?.href) {
    try {
      const path = decodeURIComponent(new URL(mailAnchor.href).pathname);
      if (path.includes('@')) return path;
    } catch {
      /* ignore */
    }
  }

  const matricula = studentInfo?.matricula?.trim();
  if (matricula && /^\d{5,}$/u.test(matricula)) return `${matricula}@uanl.edu.mx`;
  return 'correo@uanl.edu.mx';
}

function actionIcon(label: string): string {
  const normalized = label.toLowerCase();
  if (/horario/.test(normalized)) return 'calendar';
  if (/calif/.test(normalized)) return 'grades';
  if (/kardex/.test(normalized)) return 'kardex';
  if (/recibo|cuota|pago/.test(normalized)) return 'receipt';
  return 'arrow';
}

function iconMarkup(name: string): string {
  const icons: Record<string, string> = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    calendar:
      '<path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
    money:
      '<path d="M3 7h18v10H3V7Z"/><path d="M7 7a4 4 0 0 1-4 4M21 11a4 4 0 0 1-4-4M7 17a4 4 0 0 0-4-4M21 13a4 4 0 0 0-4 4"/><circle cx="12" cy="12" r="2"/>',
    grades:
      '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z"/><path d="M8 7h6M8 11h8M8 15h5"/>',
    kardex:
      '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
    gear: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 1 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    receipt: '<path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>'
  };

  return `<svg class="siase-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] ?? icons.arrow}</svg>`;
}

function actionItems(menuItems: MenuItem[]): Array<Pick<MenuItem, 'href' | 'label' | 'category'>> {
  if (!menuItems.length) {
    return fallbackActions.map((item) => ({ ...item, category: 'academic' as const }));
  }

  const preferred = [
    { label: 'Horario', matcher: /horario/i, category: 'schedule' as const },
    { label: 'Calificaciones', matcher: /calif/i, category: 'academic' as const },
    { label: 'Kárdex Oficial', matcher: /kardex/i, category: 'academic' as const }
  ];

  return preferred.map((preferredItem) => {
    const found = menuItems.find((item) => preferredItem.matcher.test(item.label));
    return found ?? { label: preferredItem.label, href: '#', category: preferredItem.category };
  });
}

const FALLBACK_TOTAL_CREDITS = 220;

function currentCredits(studentStatus?: StudentStatus): number | undefined {
  const rawText = studentStatus?.rawText ?? '';
  const match = rawText.match(/cr[eé]ditos?\D{0,24}(\d{1,3})/i);
  return match?.[1] ? Number(match[1]) : undefined;
}

function creditsFromStatus(studentStatus?: StudentStatus): string {
  const credits = currentCredits(studentStatus);
  return credits === undefined ? 'No disponible' : String(credits);
}

function creditProgressPercent(studentStatus?: StudentStatus): number {
  const credits = currentCredits(studentStatus);
  if (credits === undefined) return 0;
  return Math.min(Math.round((credits / FALLBACK_TOTAL_CREDITS) * 100), 100);
}

function missingCreditsText(studentStatus?: StudentStatus): string {
  const credits = currentCredits(studentStatus);
  if (credits === undefined)
    return 'El progreso se actualizará cuando haya datos académicos disponibles.';
  const missingCredits = Math.max(FALLBACK_TOTAL_CREDITS - credits, 0);
  return `Faltan ${missingCredits} créditos para completar el plan de referencia actual.`;
}

function createShell(frameDocument: Document, questLabel: string): HTMLElement {
  const shell = frameDocument.createElement('section');
  shell.id = 'siase-plus-shell';
  shell.innerHTML = `
    <header class="siase-dashboard__header siase-entrance siase-entrance--header">
      <div class="siase-dashboard__header-main" aria-label="Accesos superiores del panel">
        <div class="siase-dashboard__header-lead">
          <div class="siase-dashboard__tools">
            <div class="siase-theme-picker">
              <button class="siase-theme-button" type="button" aria-label="Personalizar tema" aria-expanded="false">
                ${iconMarkup('gear')}
              </button>
              <div class="siase-theme-menu" hidden>
                <button type="button" data-theme-option="institutional">Institucional</button>
                <button type="button" data-theme-option="dark">Modo Oscuro</button>
                <button type="button" data-theme-option="minimal">Minimalista</button>
              </div>
            </div>
          </div>
        </div>
        <div class="siase-career-nav__actions siase-dashboard__header-actions">
          <div class="siase-career-user siase-dashboard__student-pill" aria-label="Cuenta institucional">
            <span class="siase-career-avatar" data-student-pill-avatar>U</span>
            <span>
              <strong>Estudiante UANL</strong>
              <em data-student-pill-email>correo@uanl.edu.mx</em>
            </span>
            ${iconMarkup('chevron')}
          </div>
        </div>
      </div>
      <div class="siase-dashboard__identity" hidden aria-hidden="true">
        <div class="siase-dashboard__identity-row">
          <h1 class="siase-dashboard__greeting">¡Hola! Estudiante</h1>
        </div>
        <div class="siase-dashboard__student-meta" aria-label="Información académica">
          <span><strong>Carrera</strong><em data-student-career>No disponible</em></span>
          <span><strong>Plan de estudios</strong><em data-student-plan>No disponible</em></span>
          <span><strong>Matrícula</strong><em data-student-matricula>Pendiente</em></span>
        </div>
      </div>
      <label class="siase-profile-photo" aria-label="Subir imagen de perfil">
        <span class="siase-profile-photo__avatar">U</span>
        <input data-profile-photo-input type="file" accept="image/*" />
      </label>
    </header>
    <main class="siase-dashboard__main">
      <section class="siase-dashboard__primary">
        <article class="siase-dashboard__section siase-global-progress siase-entrance siase-entrance--progress">
          <div class="siase-dashboard__section-heading">
            <div>
              <p class="siase-dashboard__eyebrow">Tu Avance Global</p>
              <h2>Progreso académico</h2>
            </div>
            <strong class="siase-progress-percent" data-academic-progress-percent>0%</strong>
          </div>
          <div class="siase-academic-progress" aria-label="Progreso de créditos">
            <div class="siase-academic-progress__header">
              <span>Créditos recorridos</span>
              <strong><em data-academic-credits>No disponible</em> / ${FALLBACK_TOTAL_CREDITS}</strong>
            </div>
            <div class="siase-academic-progress__track">
              <span data-academic-progress-bar style="width: 0%; --progress-width: 0%"></span>
            </div>
            <p class="siase-academic-progress__description" data-academic-missing-credits>
              El progreso se actualizará cuando haya datos académicos disponibles.
            </p>
            <div class="siase-academic-progress__footer">
              <span data-student-status>Situación: Por consultar</span>
            </div>
          </div>
        </article>
        <section class="siase-dashboard__section siase-events siase-entrance siase-entrance--events" aria-label="Próximos eventos">
          <div class="siase-dashboard__section-heading">
            <div>
              <p class="siase-dashboard__eyebrow">Próximos Eventos</p>
              <h2>Fechas importantes</h2>
            </div>
          </div>
          <div class="siase-events__list">
            <article class="siase-event" style="--entry-delay: 760ms">
              <span class="siase-event__icon">${iconMarkup('calendar')}</span>
              <span class="siase-event__copy">
                <strong>Revisar horario</strong>
                <em>Confirma cambios antes del inicio de semana.</em>
              </span>
              <span class="siase-event__date">Próximo</span>
            </article>
            <article class="siase-event" style="--entry-delay: 860ms">
              <span class="siase-event__icon">${iconMarkup('money')}</span>
              <span class="siase-event__copy">
                <strong>Recibo de cuota interna</strong>
                <em>Ten a la mano tu comprobante para trámites.</em>
              </span>
              <span class="siase-event__date">Pendiente</span>
            </article>
          </div>
        </section>
      </section>
      <aside class="siase-dashboard__section siase-quick-panel siase-entrance siase-entrance--quick" aria-label="Acciones rápidas">
        <div class="siase-dashboard__section-heading">
          <div>
            <p class="siase-dashboard__eyebrow">Acciones Rápidas</p>
            <h2>Servicios</h2>
          </div>
          <button class="siase-shortcuts-edit" type="button" aria-label="Modificar accesos directos visibles">
            ${iconMarkup('pencil')}
          </button>
        </div>
        <nav class="siase-dashboard__quick-actions" aria-label="Accesos directos"></nav>
      </aside>
    </main>
  `;
  return shell;
}

function getStoredProfilePhoto(frameDocument: Document): string | undefined {
  try {
    return (
      frameDocument.defaultView?.sessionStorage.getItem('siase-plus-profile-photo') ?? undefined
    );
  } catch {
    return undefined;
  }
}

function setStoredProfilePhoto(frameDocument: Document, photo: string): void {
  try {
    frameDocument.defaultView?.sessionStorage.setItem('siase-plus-profile-photo', photo);
  } catch {
    // The uploaded preview can still be shown for this render even when storage is blocked.
  }
}

function renderProfilePhoto(
  shell: HTMLElement,
  photo: string | undefined,
  fallbackInitial: string
): void {
  const avatar = shell.querySelector<HTMLElement>('.siase-profile-photo__avatar');
  if (!avatar) return;

  avatar.textContent = photo ? '' : fallbackInitial;
  avatar.style.backgroundImage = photo ? `url(${JSON.stringify(photo)})` : '';
}

function hydrateThemeControls(shell: HTMLElement, frameDocument: Document): void {
  const button = shell.querySelector<HTMLButtonElement>('.siase-theme-button');
  const menu = shell.querySelector<HTMLElement>('.siase-theme-menu');
  const storedTheme = getStoredTheme(frameDocument);

  applyTheme(frameDocument, storedTheme);
  if (shell.dataset.themeControlsReady === 'true') return;
  shell.dataset.themeControlsReady = 'true';

  button?.addEventListener('click', () => {
    if (!menu || !button) return;
    const isOpen = !menu.hidden;
    menu.hidden = isOpen;
    button.setAttribute('aria-expanded', String(!isOpen));
  });

  menu?.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((themeButton) => {
    themeButton.addEventListener('click', () => {
      const theme = themeButton.dataset.themeOption ?? 'institutional';
      applyTheme(frameDocument, theme);
      menu.hidden = true;
      button?.setAttribute('aria-expanded', 'false');
    });
  });
}

function hydrateProfilePhotoControls(
  shell: HTMLElement,
  frameDocument: Document,
  studentInfo: StudentInfo | undefined
): void {
  renderProfilePhoto(shell, getStoredProfilePhoto(frameDocument), studentInitial(studentInfo));

  if (shell.dataset.profilePhotoControlsReady === 'true') return;
  shell.dataset.profilePhotoControlsReady = 'true';

  const input = shell.querySelector<HTMLInputElement>('[data-profile-photo-input]');
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const photo = typeof reader.result === 'string' ? reader.result : undefined;
      if (!photo) return;
      setStoredProfilePhoto(frameDocument, photo);
      renderProfilePhoto(shell, photo, studentInitial(studentInfo));
    });
    reader.readAsDataURL(file);
  });
}

function renderShellData(
  shell: HTMLElement,
  studentInfo: StudentInfo | undefined,
  studentStatus: StudentStatus | undefined,
  menuItems: MenuItem[]
): void {
  const frameDocument = shell.ownerDocument;
  const identityBlock = shell.querySelector<HTMLElement>('.siase-dashboard__identity');
  if (identityBlock) {
    identityBlock.hidden = true;
    identityBlock.setAttribute('hidden', '');
    identityBlock.setAttribute('aria-hidden', 'true');
  }

  const pillEmail = shell.querySelector<HTMLElement>('[data-student-pill-email]');
  const pillAvatar = shell.querySelector<HTMLElement>('[data-student-pill-avatar]');
  if (pillEmail) {
    pillEmail.textContent = resolveStudentEmailHint(frameDocument, studentInfo);
  }
  if (pillAvatar) {
    pillAvatar.textContent = studentInitial(studentInfo);
  }

  const career = shell.querySelector<HTMLElement>('[data-student-career]');
  const plan = shell.querySelector<HTMLElement>('[data-student-plan]');
  const matricula = shell.querySelector<HTMLElement>('[data-student-matricula]');
  const actions = shell.querySelector<HTMLElement>('.siase-dashboard__quick-actions');
  const credits = shell.querySelector<HTMLElement>('[data-academic-credits]');
  const progressBar = shell.querySelector<HTMLElement>('[data-academic-progress-bar]');
  const progressLabel = shell.querySelector<HTMLElement>('[data-academic-progress-label]');
  const progressPercentNode = shell.querySelector<HTMLElement>('[data-academic-progress-percent]');
  const missingCredits = shell.querySelector<HTMLElement>('[data-academic-missing-credits]');
  const status = shell.querySelector<HTMLElement>('[data-student-status]');

  hydrateProfilePhotoControls(shell, frameDocument, studentInfo);

  if (career) {
    career.textContent = studentInfo?.program || 'No disponible';
  }

  if (plan) {
    plan.textContent = studentInfo?.plan || 'No disponible';
  }

  if (matricula) {
    matricula.textContent = studentInfo?.matricula || 'Pendiente';
  }

  if (centerLayoutDebugEnabled(shell.ownerDocument)) {
    const idNode = shell.querySelector<HTMLElement>('.siase-dashboard__identity');
    const idDisplay = idNode ? shell.ownerDocument.defaultView?.getComputedStyle(idNode).display : null;
    const idRect = idNode?.getBoundingClientRect();
    console.info('[SIASE Plus][center-layout] renderShellData identity check', {
      identityDisplay: idDisplay,
      identityRect: idRect ? { w: idRect.width, h: idRect.height } : null,
      hiddenAttr: idNode?.hasAttribute('hidden') ?? null,
      careerTextLen: shell.querySelector('[data-student-career]')?.textContent?.length ?? null
    });
  }

  if (credits) {
    credits.textContent = creditsFromStatus(studentStatus);
  }

  const progressPercent = creditProgressPercent(studentStatus);
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
    progressBar.style.setProperty('--progress-width', `${progressPercent}%`);
  }

  if (progressLabel) {
    progressLabel.textContent = `${progressPercent}% completado`;
  }

  if (progressPercentNode) {
    progressPercentNode.textContent = `${progressPercent}%`;
  }

  if (missingCredits) {
    missingCredits.textContent = missingCreditsText(studentStatus);
  }

  if (status) {
    status.textContent = `Situación: ${studentStatus?.label || 'Por consultar'}`;
  }

  if (!actions) return;
  actions.replaceChildren();

  actionItems(menuItems).forEach((item, index) => {
    const link = actions.ownerDocument.createElement('a');
    link.href = item.href;
    link.target = 'center';
    link.className = `siase-dashboard__quick-card siase-dashboard__quick-card--${item.category}`;
    link.style.setProperty('--entry-delay', `${940 + index * 90}ms`);

    const icon = actions.ownerDocument.createElement('span');
    icon.className = 'siase-dashboard__quick-icon';
    icon.innerHTML = iconMarkup(actionIcon(item.label));

    const label = actions.ownerDocument.createElement('strong');
    label.textContent = item.label;

    const helper = actions.ownerDocument.createElement('span');
    helper.textContent = 'Abrir servicio';

    const arrow = actions.ownerDocument.createElement('span');
    arrow.className = 'siase-dashboard__quick-arrow';
    arrow.innerHTML = iconMarkup('arrow');

    link.append(icon, label, helper, arrow);
    actions.append(link);
  });
}

async function hydrateShell(shell: HTMLElement): Promise<void> {
  const [studentInfo, studentStatus, menuItems] = await Promise.all([
    getStorageValue('studentInfo'),
    getStorageValue('studentStatus'),
    getStorageValue('menuItems')
  ]);
  renderShellData(shell, studentInfo, studentStatus, menuItems ?? []);
}

export function initializeCenterGameUi(
  frameDocument: Document,
  url = new URL(location.href)
): void {
  exposeCenterLayoutDebug(frameDocument);

  frameDocument.body.classList.add('siase-plus-center', 'siase-plus-single-view');
  frameDocument.body.classList.toggle(
    'siase-plus-main-center',
    url.pathname.toLowerCase().includes('maincenter.htm')
  );

  logCenterLayoutSnapshot(frameDocument, 'initializeCenterGameUi (after body classes, before shell)');

  const questLabel = currentQuestLabel(url.pathname);
  const existingShell = frameDocument.getElementById('siase-plus-shell');
  if (existingShell) {
    const questNode = existingShell.querySelector<HTMLElement>('[data-quest-label]');
    if (questNode) questNode.textContent = questLabel;
    hydrateThemeControls(existingShell, frameDocument);
    void hydrateShell(existingShell).finally(() => {
      logCenterLayoutSnapshot(frameDocument, 'initializeCenterGameUi (after hydrate, existing shell)');
      try {
        const msg =
          '[SIASE Plus][center-layout] Frameset resize + geometry logs: top window localStorage.siase-plus-debug-layout = "1" → reload.';
        if (!sessionStorage.getItem('siase-plus-debug-layout-tip')) {
          sessionStorage.setItem('siase-plus-debug-layout-tip', '1');
          console.info(msg);
        } else if (centerLayoutDebugEnabled(frameDocument)) {
          console.info(msg);
        }
      } catch {
        /* ignore */
      }
    });
    return;
  }

  const shell = createShell(frameDocument, questLabel);
  frameDocument.body.prepend(shell);
  hydrateThemeControls(shell, frameDocument);
  void hydrateShell(shell).finally(() => {
    logCenterLayoutSnapshot(frameDocument, 'initializeCenterGameUi (after hydrate, new shell)');
    try {
      const msg =
        '[SIASE Plus][center-layout] Frameset resize + geometry logs: top window localStorage.siase-plus-debug-layout = "1" → reload.';
      if (!sessionStorage.getItem('siase-plus-debug-layout-tip')) {
        sessionStorage.setItem('siase-plus-debug-layout-tip', '1');
        console.info(msg);
      } else if (centerLayoutDebugEnabled(frameDocument)) {
        console.info(msg);
      }
    } catch {
      /* ignore */
    }
  });
}
