import type { GradeSnapshot } from '@/types/grades';
import type { KardexSummary } from '@/types/kardex';
import type { MenuItem } from '@/types/menu';
import type { ScheduleSlot, Weekday } from '@/types/schedule';
import type { StudentInfo, StudentStatus } from '@/types/student';
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  normalizeDashboardSectionOrder,
  type DashboardSectionId
} from '@/types/dashboard';
import { getStorageValue } from '@/utils/storage';
import { parseStudentInfo } from '@/utils/parser/student';
import { textContent } from '@/utils/parser/dom';
import { setStorageValue } from '@/utils/storage';
import { refreshDashboardData } from './dashboard-data';
import { scheduleDebug, scheduleDebugError } from '@/utils/debug';
import {
  extractLegacyAnnouncements,
  renderNotificationBell,
  type LegacyAnnouncements
} from './legacy-announcements';

type DashboardData = {
  studentInfo?: StudentInfo;
  studentStatus?: StudentStatus;
  menuItems: MenuItem[];
  schedule: ScheduleSlot[];
  grades?: GradeSnapshot;
  kardex?: KardexSummary;
  profilePhotoDataUrl?: string;
  dashboardSectionOrder: DashboardSectionId[];
};

type ProfileSyncResult = {
  changed: boolean;
  studentInfo?: StudentInfo;
  unavailable?: 'top' | 'profile';
};

type CenterFrameWindow = Window & {
  __SIASE_V2_STORAGE_LISTENER__?: boolean;
  __SIASE_V2_PROFILE_SYNC_CLEANUP__?: () => void;
};

let profileSyncInFlight: Promise<ProfileSyncResult> | undefined;

const DEBUG_OUTLINE_COLORS = ['#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];

function setDashboardLayoutDebug(shell: HTMLElement, enabled: boolean): void {
  shell.classList.toggle('siase-v2-layout-debug', enabled);

  shell.querySelectorAll<HTMLDivElement>('div').forEach((div) => {
    if (!enabled) {
      delete div.dataset.siaseV2DebugDepth;
      div.style.removeProperty('--siase-v2-debug-outline');
      return;
    }

    let depth = 0;
    let parent = div.parentElement;
    while (parent && parent !== shell) {
      if (parent.tagName === 'DIV') depth += 1;
      parent = parent.parentElement;
    }

    const color = DEBUG_OUTLINE_COLORS[Math.min(depth, DEBUG_OUTLINE_COLORS.length - 1)];
    div.dataset.siaseV2DebugDepth = String(depth);
    div.style.setProperty('--siase-v2-debug-outline', color);
  });
}

function firstName(student?: StudentInfo): string {
  const candidate = student?.name
    ?.replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .find((part) => part && !/^m?\d+$/i.test(part));
  if (!candidate) return 'Estudiante';
  const lower = candidate.toLocaleLowerCase('es-MX');
  return `${lower.charAt(0).toLocaleUpperCase('es-MX')}${lower.slice(1)}`;
}

function weekdayToday(): Weekday | undefined {
  const weekdays: Array<Weekday | undefined> = [
    undefined,
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  return weekdays[new Date().getDay()];
}

function findMenuItem(items: MenuItem[], matcher: RegExp): MenuItem | undefined {
  return items.find((item) => matcher.test(item.label));
}

function setProfileNavigationState(shell: HTMLElement, route: 'summary' | 'credits'): void {
  shell.querySelectorAll<HTMLElement>('[data-siase-v2-profile-route]').forEach((control) => {
    const active = control.dataset.siaseV2ProfileRoute === route;
    control.classList.toggle('is-active', active);
    if (active) control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  });
}

function showProfileSummary(shell: HTMLElement): void {
  const summary = shell.querySelector<HTMLElement>('[data-siase-v2-profile-summary]');
  const service = shell.querySelector<HTMLElement>('[data-siase-v2-inline-service]');
  if (!summary || !service) return;
  service.hidden = true;
  service.replaceChildren();
  summary.hidden = false;
  setProfileNavigationState(shell, 'summary');
}

function showInlineAcademicCredits(shell: HTMLElement, item: MenuItem): void {
  const summary = shell.querySelector<HTMLElement>('[data-siase-v2-profile-summary]');
  const service = shell.querySelector<HTMLElement>('[data-siase-v2-inline-service]');
  if (!summary || !service) return;

  summary.hidden = true;
  service.hidden = false;
  service.replaceChildren();

  const toolbar = shell.ownerDocument.createElement('div');
  toolbar.className = 'siase-v2-inline-service__toolbar';
  const back = shell.ownerDocument.createElement('button');
  back.type = 'button';
  back.className = 'siase-v2-inline-service__back';
  back.textContent = '← Volver al resumen';
  back.addEventListener('click', () => showProfileSummary(shell));
  const title = shell.ownerDocument.createElement('h1');
  title.textContent = 'Créditos académicos';
  toolbar.append(back, title);

  const frame = shell.ownerDocument.createElement('iframe');
  frame.className = 'siase-v2-inline-service__frame';
  frame.title = 'Créditos académicos';
  frame.loading = 'lazy';
  frame.src = item.href;
  service.append(toolbar, frame);
  setProfileNavigationState(shell, 'credits');
}

function studentInitials(student?: StudentInfo): string {
  const parts = student?.name?.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean) ?? [];
  if (!parts.length) return 'U';
  return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toLocaleUpperCase('es-MX');
}

function formatProfileText(value: string | undefined): string {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) return '';

  const corrected = normalized
    .toLocaleLowerCase('es-MX')
    .replace(/\btecnologia\b/g, 'tecnología')
    .replace(/\bacademico\b/g, 'académico')
    .replace(/\bingenieria\b/g, 'ingeniería');
  const minorWords = new Set(['a', 'al', 'de', 'del', 'en', 'la', 'las', 'los', 'y']);

  return corrected
    .split(' ')
    .map((word, index) => {
      if (/^[ivxlcdm]+\d*$/i.test(word)) return word.toLocaleUpperCase('es-MX');
      if (index > 0 && minorWords.has(word)) return word;
      return `${word.charAt(0).toLocaleUpperCase('es-MX')}${word.slice(1)}`;
    })
    .join(' ');
}

export function formatPlanCode(value: string | undefined): string {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) return '';

  const withoutPrefix = normalized.replace(
    /^(?:(?:de\s+)?estudios?|plan(?:\s+de\s+estudios)?|modelo(?:\s+acad[eé]mico)?)\s*:?\s*/i,
    ''
  );
  const labeled = normalized.match(
    /\b(?:plan(?:\s+de\s+estudios)?|modelo(?:\s+acad[eé]mico)?)\b\s*:?\s*([a-z0-9-]*\d[a-z0-9-]*)/i
  )?.[1];
  const standalone = withoutPrefix.match(/\b[a-z0-9-]*\d[a-z0-9-]*\b/i)?.[0];
  return (labeled ?? standalone ?? '').toLocaleUpperCase('es-MX');
}

function renderProfileNavigation(shell: HTMLElement, data: DashboardData): void {
  const host = shell.querySelector<HTMLElement>('[data-siase-v2-profile-nav]');
  if (!host) return;
  host.replaceChildren();

  const summaryControl = shell.querySelector<HTMLButtonElement>(
    '[data-siase-v2-profile-route="summary"]'
  );
  if (summaryControl) summaryControl.onclick = () => showProfileSummary(shell);

  const links = [
    { label: 'Cursos', matcher: /materias|cursos|horario/i, icon: '▤' },
    { label: 'Créditos', matcher: /cr[eé]dito/i, icon: '◎' },
    { label: 'Proyectos', matcher: /proyecto|servicio social|pr[aá]cticas/i, icon: '⌁' },
    { label: 'Documentos', matcher: /documentos|carga.*document/i, icon: '□' }
  ];

  links.forEach(({ label, matcher, icon }) => {
    const item = findMenuItem(data.menuItems, matcher);
    const control = shell.ownerDocument.createElement(item ? 'a' : 'span');
    control.className = 'siase-v2-profile-nav__item';
    control.dataset.siaseV2ProfileRoute = label === 'Créditos' ? 'credits' : label.toLocaleLowerCase();
    control.innerHTML = `<span aria-hidden="true">${icon}</span>${label}`;
    if (control instanceof HTMLAnchorElement && item) {
      control.href = item.href;
      control.target = item.target;
      if (item.target === '_blank' || item.target === '_new') {
        control.rel = 'noopener noreferrer';
      }
      if (label === 'Créditos') {
        control.addEventListener('click', (event) => {
          event.preventDefault();
          showInlineAcademicCredits(shell, item);
        });
      }
    } else {
      control.setAttribute('aria-disabled', 'true');
    }
    host.append(control);
  });

  const service = shell.querySelector<HTMLElement>('[data-siase-v2-inline-service]');
  setProfileNavigationState(shell, service && !service.hidden ? 'credits' : 'summary');
}

function renderProfile(shell: HTMLElement, data: DashboardData): void {
  const avatar = shell.querySelector<HTMLElement>('[data-siase-v2-profile-avatar]');
  const name = shell.querySelector<HTMLElement>('[data-siase-v2-profile-name]');
  const degree = shell.querySelector<HTMLElement>('[data-siase-v2-profile-degree]');
  const institutionRow = shell.querySelector<HTMLElement>(
    '[data-siase-v2-profile-institution-row]'
  );
  const institution = shell.querySelector<HTMLElement>('[data-siase-v2-profile-institution]');
  const matricula = shell.querySelector<HTMLElement>('[data-siase-v2-profile-matricula]');
  const planRow = shell.querySelector<HTMLElement>('[data-siase-v2-profile-plan-row]');
  const planName = shell.querySelector<HTMLElement>('[data-siase-v2-profile-plan]');
  const planProgress = shell.querySelector<HTMLElement>('[data-siase-v2-profile-plan-progress]');
  const planProgressLabel = shell.querySelector<HTMLElement>(
    '[data-siase-v2-profile-plan-progress-label]'
  );
  const planProgressBar = shell.querySelector<HTMLElement>(
    '[data-siase-v2-profile-plan-progress-bar]'
  );
  const rawText = shell.querySelector<HTMLElement>('[data-siase-v2-profile-raw]');
  const rawHelp = shell.querySelector<HTMLElement>('[data-siase-v2-profile-raw-help]');
  const photoRemove = shell.querySelector<HTMLButtonElement>('[data-siase-v2-profile-photo-remove]');

  const formattedName = formatProfileText(data.studentInfo?.name);
  const formattedProgram = formatProfileText(data.studentInfo?.program);
  const formattedInstitution = formatProfileText(data.studentInfo?.institution);
  if (avatar) {
    avatar.classList.toggle('has-photo', Boolean(data.profilePhotoDataUrl));
    avatar.style.backgroundImage = data.profilePhotoDataUrl
      ? `url("${data.profilePhotoDataUrl}")`
      : '';
    avatar.textContent = data.profilePhotoDataUrl ? '' : studentInitials(data.studentInfo);
  }
  if (photoRemove) photoRemove.hidden = !data.profilePhotoDataUrl;
  if (name) name.textContent = formattedName || 'Estudiante UANL';
  if (degree) degree.textContent = formattedProgram || 'Programa académico por sincronizar';
  if (institutionRow) institutionRow.hidden = !formattedInstitution;
  if (institution) institution.textContent = formattedInstitution;
  if (matricula) matricula.textContent = data.studentInfo?.matricula || 'Por sincronizar';
  const planCode = formatPlanCode(data.kardex?.planName);
  if (planRow) planRow.hidden = !planCode;
  if (planName) planName.textContent = planCode;
  const progress = data.kardex?.progressPercent;
  const hasProgress = progress !== undefined && Number.isFinite(progress);
  if (planProgressLabel) {
    planProgressLabel.textContent = hasProgress
      ? `Progreso del plan académico · ${progress}%`
      : 'Progreso por sincronizar';
  }
  if (planProgress) {
    planProgress.setAttribute('aria-label', planProgressLabel?.textContent ?? 'Progreso por sincronizar');
    if (hasProgress) {
      planProgress.setAttribute('role', 'progressbar');
      planProgress.setAttribute('aria-valuemin', '0');
      planProgress.setAttribute('aria-valuemax', '100');
      planProgress.setAttribute('aria-valuenow', String(progress));
    } else {
      planProgress.removeAttribute('role');
      planProgress.removeAttribute('aria-valuemin');
      planProgress.removeAttribute('aria-valuemax');
      planProgress.removeAttribute('aria-valuenow');
    }
  }
  if (planProgressBar) planProgressBar.style.width = hasProgress ? `${progress}%` : '0%';
  if (rawText) rawText.textContent = data.studentInfo?.rawProfileText || 'Sin texto extraído.';
  if (rawHelp) rawHelp.hidden = !data.studentInfo?.rawProfileText;
}

async function resizeProfilePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 640;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}

function attachProfilePhotoControls(shell: HTMLElement): void {
  const input = shell.querySelector<HTMLInputElement>('[data-siase-v2-profile-photo-input]');
  const add = shell.querySelector<HTMLButtonElement>('[data-siase-v2-profile-photo-add]');
  const remove = shell.querySelector<HTMLButtonElement>('[data-siase-v2-profile-photo-remove]');
  const status = shell.querySelector<HTMLElement>('[data-siase-v2-profile-photo-status]');
  const avatar = shell.querySelector<HTMLElement>('[data-siase-v2-profile-avatar]');
  if (!input || !add || !remove || !status || !avatar) return;

  add.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      status.textContent = 'Selecciona un archivo de imagen.';
      input.value = '';
      return;
    }

    status.textContent = 'Preparando imagen…';
    void resizeProfilePhoto(file)
      .then(async (dataUrl) => {
        await setStorageValue('profilePhotoDataUrl', dataUrl);
        avatar.classList.add('has-photo');
        avatar.style.backgroundImage = `url("${dataUrl}")`;
        avatar.textContent = '';
        remove.hidden = false;
        status.textContent = 'Foto guardada en este dispositivo.';
      })
      .catch((error) => {
        scheduleDebugError('dashboard:profile-photo:error', error);
        status.textContent = 'No se pudo guardar la imagen.';
      })
      .finally(() => {
        input.value = '';
      });
  });

  remove.addEventListener('click', () => {
    void chrome.storage.local.remove('profilePhotoDataUrl').then(() => {
      avatar.classList.remove('has-photo');
      avatar.style.backgroundImage = '';
      remove.hidden = true;
      status.textContent = 'Foto eliminada.';
      void getStorageValue('studentInfo').then((student) => {
        avatar.textContent = studentInitials(student);
      });
    });
  });
}

function createMenuLink(
  frameDocument: Document,
  item: MenuItem,
  className: string,
  helper?: string
): HTMLAnchorElement {
  const anchor = frameDocument.createElement('a');
  anchor.className = className;
  anchor.href = item.href;
  anchor.target = item.target;
  if (item.target === '_blank' || item.target === '_new') anchor.rel = 'noopener noreferrer';

  const label = frameDocument.createElement('strong');
  label.textContent = item.label;
  anchor.append(label);
  if (helper) {
    const description = frameDocument.createElement('span');
    description.textContent = helper;
    anchor.append(description);
  }
  const arrow = frameDocument.createElement('em');
  arrow.textContent = '→';
  anchor.append(arrow);
  return anchor;
}

function moveNativeContent(frameDocument: Document, host: HTMLElement): void {
  const nodes = Array.from(frameDocument.body.childNodes);
  nodes.forEach((node) => {
    if (node === host.closest('#siase-v2-dashboard')) return;
    if (node instanceof HTMLElement && ['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName)) return;
    if (node.nodeType === node.TEXT_NODE && !node.textContent?.trim()) return;
    host.append(node);
  });
}

function renderQuickActions(shell: HTMLElement, data: DashboardData): void {
  const host = shell.querySelector<HTMLElement>('[data-siase-v2-quick-actions]');
  if (!host) return;

  const actions = [
    { matcher: /horario/i, helper: 'Consulta tus clases y salones' },
    { matcher: /calificaciones/i, helper: 'Revisa tus resultados recientes' },
    { matcher: /kardex/i, helper: 'Consulta tu historial académico' },
    { matcher: /fecha.*inscrip|inscripci[oó]n/i, helper: 'Revisa fechas y requisitos' }
  ];

  actions.forEach(({ matcher, helper }) => {
    const item = findMenuItem(data.menuItems, matcher);
    if (item) host.append(createMenuLink(shell.ownerDocument, item, 'siase-v2-action', helper));
  });

  if (!host.children.length) {
    const empty = shell.ownerDocument.createElement('p');
    empty.className = 'siase-v2-empty';
    empty.textContent = 'Los accesos aparecerán cuando el menú de SIASE termine de cargar.';
    host.append(empty);
  }
}

function renderAttention(shell: HTMLElement, data: DashboardData): void {
  const host = shell.querySelector<HTMLElement>('[data-siase-v2-attention]');
  if (!host) return;
  const entries = [
    { matcher: /carga documentos pendientes/i, title: 'Documentos pendientes', tag: 'Revisar' },
    { matcher: /consulta fecha inscripci[oó]n/i, title: 'Fecha de inscripción', tag: 'Consultar' },
    { matcher: /recibo interno/i, title: 'Recibos académicos', tag: 'Abrir' }
  ];

  entries.forEach(({ matcher, title, tag }) => {
    const item = findMenuItem(data.menuItems, matcher);
    if (!item) return;
    const link = createMenuLink(shell.ownerDocument, item, 'siase-v2-attention-row');
    link.querySelector('strong')!.textContent = title;
    const badge = shell.ownerDocument.createElement('span');
    badge.className = 'siase-v2-badge';
    badge.textContent = tag;
    link.insertBefore(badge, link.lastElementChild);
    host.append(link);
  });

  if (!host.children.length) {
    const message = shell.ownerDocument.createElement('p');
    message.className = 'siase-v2-empty';
    message.textContent = 'Sin accesos administrativos disponibles por ahora.';
    host.append(message);
  }
}

function renderSchedule(shell: HTMLElement, schedule: ScheduleSlot[]): void {
  const host = shell.querySelector<HTMLElement>('[data-siase-v2-schedule]');
  if (!host) return;
  const weekday = weekdayToday();
  const today = weekday
    ? schedule
        .filter((slot) => slot.weekday === weekday)
        .sort((left, right) => left.startTime.localeCompare(right.startTime))
    : [];

  if (!today.length) {
    const empty = shell.ownerDocument.createElement('p');
    empty.className = 'siase-v2-profile-empty';
    empty.textContent = schedule.length
      ? 'No hay clases registradas para hoy.'
      : 'Abre Horario para sincronizar tus clases.';
    host.append(empty);
    return;
  }

  today.slice(0, 5).forEach((slot) => {
    const row = shell.ownerDocument.createElement('article');
    row.className = 'siase-v2-profile-event';
    const time = shell.ownerDocument.createElement('time');
    time.innerHTML = `<strong>${slot.startTime}</strong><span>${slot.slotCode}</span>`;
    const copy = shell.ownerDocument.createElement('span');
    const subject = shell.ownerDocument.createElement('strong');
    subject.textContent = slot.subject;
    const detail = shell.ownerDocument.createElement('em');
    detail.textContent = [slot.classroom, slot.teacher].filter(Boolean).join(' · ') || 'Sin detalles';
    copy.append(subject, detail);
    row.append(time, copy);
    host.append(row);
  });
}

function renderGrades(shell: HTMLElement, snapshot?: GradeSnapshot): void {
  const host = shell.querySelector<HTMLElement>('[data-siase-v2-grades]');
  if (!host) return;
  const grades = snapshot?.grades ?? [];
  if (!grades.length) {
    const empty = shell.ownerDocument.createElement('p');
    empty.className = 'siase-v2-profile-empty';
    empty.textContent = 'Abre Calificaciones para sincronizar resultados.';
    host.append(empty);
    return;
  }

  grades.slice(0, 4).forEach((grade) => {
    const row = shell.ownerDocument.createElement('article');
    row.className = 'siase-v2-profile-grade';
    const icon = shell.ownerDocument.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▱';
    const name = shell.ownerDocument.createElement('span');
    name.textContent = grade.subject;
    const opportunity = shell.ownerDocument.createElement('em');
    opportunity.textContent = grade.opportunity || 'Último periodo';
    const score = shell.ownerDocument.createElement('strong');
    score.textContent = grade.score === undefined ? '—' : String(grade.score);
    score.dataset.status = grade.status;
    row.append(icon, name, opportunity, score);
    host.append(row);
  });
}

function renderAcademicSummary(shell: HTMLElement, data: DashboardData): void {
  const snapshotProgress = data.kardex?.progressPercent;
  const progress =
    snapshotProgress === undefined ? undefined : Math.max(0, Math.min(snapshotProgress, 100));
  const creditsNode = shell.querySelector<HTMLElement>('[data-siase-v2-credits]');
  const averageNode = shell.querySelector<HTMLElement>('[data-siase-v2-average]');
  const statusNode = shell.querySelector<HTMLElement>('[data-siase-v2-status]');
  const activityNode = shell.querySelector<HTMLElement>('[data-siase-v2-activity-value]');

  if (creditsNode) {
    creditsNode.textContent =
      data.kardex?.approvedCredits !== undefined && data.kardex.totalCredits !== undefined
      ? `${data.kardex.approvedCredits} / ${data.kardex.totalCredits}`
      : 'Sin sincronizar';
  }
  if (averageNode) averageNode.textContent = data.kardex?.average?.toFixed(2) ?? '—';
  if (statusNode) statusNode.textContent = data.studentStatus?.label || 'Por consultar';
  if (activityNode) {
    activityNode.textContent =
      progress === undefined ? 'Sin sincronizar' : `${Math.round(progress)}% completado`;
  }
}

function sectionOrder(container: HTMLElement): DashboardSectionId[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(':scope > [data-dashboard-section-id]')
  )
    .map((section) => section.dataset.dashboardSectionId)
    .filter((id): id is DashboardSectionId =>
      DEFAULT_DASHBOARD_SECTION_ORDER.includes(id as DashboardSectionId)
    );
}

function applySectionOrder(container: HTMLElement, order: unknown): DashboardSectionId[] {
  const normalized = normalizeDashboardSectionOrder(order);
  normalized.forEach((id) => {
    const section = container.querySelector<HTMLElement>(
      `:scope > [data-dashboard-section-id="${id}"]`
    );
    if (section) container.append(section);
  });
  return normalized;
}

async function persistSectionOrder(container: HTMLElement): Promise<void> {
  const next = sectionOrder(container);
  const stored = await getStorageValue('dashboardSectionOrder');
  const current = stored ? normalizeDashboardSectionOrder(stored) : undefined;
  if (
    current &&
    current.length === next.length &&
    current.every((id, index) => id === next[index])
  ) {
    return;
  }
  await setStorageValue('dashboardSectionOrder', next);
}

function attachDashboardSectionReorder(shell: HTMLElement): void {
  const container = shell.querySelector<HTMLElement>('[data-siase-v2-dashboard-sections]');
  const live = shell.querySelector<HTMLElement>('[data-siase-v2-dashboard-order-status]');
  if (!container || container.dataset.siaseV2ReorderBound === 'true') return;
  container.dataset.siaseV2ReorderBound = 'true';

  let dragged: HTMLElement | undefined;
  let dropTarget: HTMLElement | undefined;
  let dropAfter = false;
  let keyboardSection: HTMLElement | undefined;
  let keyboardOriginal: DashboardSectionId[] | undefined;

  const titleOf = (section: HTMLElement): string =>
    section.dataset.dashboardSectionTitle || 'Sección';
  const announce = (message: string): void => {
    if (live) live.textContent = message;
  };
  const clearDropState = (): void => {
    container
      .querySelectorAll<HTMLElement>('.is-drop-before, .is-drop-after')
      .forEach((section) => section.classList.remove('is-drop-before', 'is-drop-after'));
    dragged?.classList.remove('is-dragging');
    dragged = undefined;
    dropTarget = undefined;
    dropAfter = false;
  };
  const move = (section: HTMLElement, direction: -1 | 1): boolean => {
    const sibling =
      direction < 0
        ? section.previousElementSibling
        : section.nextElementSibling;
    if (!(sibling instanceof HTMLElement)) return false;
    if (direction < 0) container.insertBefore(section, sibling);
    else container.insertBefore(sibling, section);
    return true;
  };

  container.addEventListener('dragstart', (event) => {
    const handle = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-siase-v2-dashboard-drag-handle]'
    );
    const section = handle?.closest<HTMLElement>('[data-dashboard-section-id]');
    if (!handle || !section) {
      event.preventDefault();
      return;
    }
    dragged = section;
    section.classList.add('is-dragging');
    event.dataTransfer?.setData('text/plain', section.dataset.dashboardSectionId ?? '');
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragover', (event) => {
    if (!dragged) return;
    const target = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-dashboard-section-id]'
    );
    if (!target || target === dragged || target.parentElement !== container) return;
    event.preventDefault();
    container
      .querySelectorAll<HTMLElement>('.is-drop-before, .is-drop-after')
      .forEach((section) => section.classList.remove('is-drop-before', 'is-drop-after'));
    dropTarget = target;
    dropAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    target.classList.add(dropAfter ? 'is-drop-after' : 'is-drop-before');
  });

  container.addEventListener('drop', (event) => {
    if (!dragged || !dropTarget) return;
    event.preventDefault();
    if (dropAfter) dropTarget.after(dragged);
    else dropTarget.before(dragged);
    announce(`${titleOf(dragged)} cambió de posición.`);
    void persistSectionOrder(container);
    clearDropState();
  });
  container.addEventListener('dragend', clearDropState);

  container.addEventListener('click', (event) => {
    const action = (event.target as Element | null)?.closest<HTMLButtonElement>(
      '[data-siase-v2-dashboard-move]'
    );
    const section = action?.closest<HTMLElement>('[data-dashboard-section-id]');
    if (!action || !section) return;
    const changed = move(section, action.dataset.siaseV2DashboardMove === 'up' ? -1 : 1);
    if (!changed) return;
    announce(`${titleOf(section)} cambió de posición.`);
    void persistSectionOrder(container);
  });

  container.addEventListener('keydown', (event) => {
    const handle = (event.target as Element | null)?.closest<HTMLButtonElement>(
      '[data-siase-v2-dashboard-drag-handle]'
    );
    const section = handle?.closest<HTMLElement>('[data-dashboard-section-id]');
    if (!handle || !section) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (keyboardSection === section) {
        keyboardSection.classList.remove('is-keyboard-reordering');
        handle.setAttribute('aria-pressed', 'false');
        keyboardSection = undefined;
        keyboardOriginal = undefined;
        announce(`${titleOf(section)} quedó en su nueva posición.`);
        void persistSectionOrder(container);
      } else {
        keyboardSection?.classList.remove('is-keyboard-reordering');
        keyboardSection = section;
        keyboardOriginal = sectionOrder(container);
        section.classList.add('is-keyboard-reordering');
        handle.setAttribute('aria-pressed', 'true');
        announce(`Reordenando ${titleOf(section)}. Usa las flechas arriba y abajo.`);
      }
      return;
    }

    if (keyboardSection !== section) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const changed = move(section, event.key === 'ArrowUp' ? -1 : 1);
      if (changed) announce(`${titleOf(section)} cambió de posición.`);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (keyboardOriginal) applySectionOrder(container, keyboardOriginal);
      section.classList.remove('is-keyboard-reordering');
      handle.setAttribute('aria-pressed', 'false');
      keyboardSection = undefined;
      keyboardOriginal = undefined;
      announce('Se restauró el orden anterior.');
    }
  });
}

function createDashboard(frameDocument: Document): HTMLElement {
  const shell = frameDocument.createElement('main');
  shell.id = 'siase-v2-dashboard';
  shell.className = 'siase-v2-profile-dashboard';
  shell.innerHTML = `
    <nav class="siase-v2-profile-nav" aria-label="Secciones de la carrera">
      <button class="siase-v2-profile-nav__item is-active" type="button" aria-current="page" data-siase-v2-profile-route="summary">
        <span aria-hidden="true">▣</span>Resumen
      </button>
      <div data-siase-v2-profile-nav></div>
    </nav>

    <div class="siase-v2-profile-layout">
      <aside class="siase-v2-profile-card" aria-label="Perfil del estudiante">
        <div class="siase-v2-profile-photo" data-siase-v2-profile-photo tabindex="0">
          <div class="siase-v2-profile-avatar" data-siase-v2-profile-avatar aria-label="Avatar del estudiante">U</div>
          <div class="siase-v2-profile-photo__overlay">
            <button type="button" data-siase-v2-profile-photo-add aria-label="Cambiar foto de perfil">Cambiar foto</button>
            <button type="button" data-siase-v2-profile-photo-remove aria-label="Eliminar foto de perfil" hidden>Eliminar</button>
          </div>
          <input type="file" accept="image/*" data-siase-v2-profile-photo-input hidden>
        </div>
        <p class="siase-v2-profile-photo__status" data-siase-v2-profile-photo-status aria-live="polite"></p>
        <h1 class="siase-v2-profile-name" data-siase-v2-profile-name>Estudiante UANL</h1>
        <div class="siase-v2-profile-program" aria-label="Carrera">
          <span>Carrera</span>
          <strong data-siase-v2-profile-degree>Programa académico por sincronizar</strong>
        </div>
        <div class="siase-v2-profile-meta">
          <div class="siase-v2-profile-row" data-siase-v2-profile-institution-row hidden>
            <div>
              <span>Institución</span>
              <strong data-siase-v2-profile-institution></strong>
            </div>
            <span class="siase-v2-profile-raw-help" data-siase-v2-profile-raw-help hidden>
              <button type="button" aria-label="Ver texto bruto extraído" aria-describedby="siase-v2-profile-raw-tooltip">?</button>
              <span id="siase-v2-profile-raw-tooltip" role="tooltip" data-siase-v2-profile-raw></span>
            </span>
          </div>
          <div class="siase-v2-profile-row">
            <div>
              <span>Matrícula</span>
              <strong data-siase-v2-profile-matricula>Por sincronizar</strong>
            </div>
          </div>
          <div class="siase-v2-profile-row" data-siase-v2-profile-plan-row hidden>
            <div>
              <span>Plan</span>
              <strong data-siase-v2-profile-plan></strong>
            </div>
          </div>
          <div class="siase-v2-profile-plan-progress" data-siase-v2-profile-plan-progress>
            <strong data-siase-v2-profile-plan-progress-label>Progreso por sincronizar</strong>
            <div class="siase-v2-profile-plan-progress__track">
              <span data-siase-v2-profile-plan-progress-bar></span>
            </div>
          </div>
        </div>
      </aside>

      <section class="siase-v2-profile-content" aria-label="Resumen académico">
        <div data-siase-v2-profile-summary>
          <p id="dashboard-section-instructions" class="siase-v2-sr-only">
            Presiona Enter o Espacio para reordenar, usa las flechas y confirma con Enter. Escape cancela.
          </p>
          <div class="siase-v2-dashboard-sections" data-siase-v2-dashboard-sections>
          <section class="siase-v2-profile-section siase-v2-dashboard-section" data-dashboard-section-id="upcoming-activities" data-dashboard-section-title="Actividades próximas">
            <header class="siase-v2-dashboard-section__header">
              <button class="siase-v2-dashboard-section__drag-handle" type="button" draggable="true" aria-label="Reordenar Actividades próximas" aria-describedby="dashboard-section-instructions" aria-pressed="false">⋮⋮</button>
              <h2>Actividades próximas</h2>
              <span class="siase-v2-dashboard-section__move-actions">
                <button type="button" data-siase-v2-dashboard-move="up" aria-label="Subir Actividades próximas">↑</button>
                <button type="button" data-siase-v2-dashboard-move="down" aria-label="Bajar Actividades próximas">↓</button>
              </span>
            </header>
            <div class="siase-v2-profile-events" data-siase-v2-schedule></div>
          </section>

          <section class="siase-v2-profile-section siase-v2-dashboard-section" data-dashboard-section-id="key-metrics" data-dashboard-section-title="Métricas clave">
            <header class="siase-v2-dashboard-section__header">
              <button class="siase-v2-dashboard-section__drag-handle" type="button" draggable="true" aria-label="Reordenar Métricas clave" aria-describedby="dashboard-section-instructions" aria-pressed="false">⋮⋮</button>
              <h2>Métricas clave</h2>
              <span class="siase-v2-dashboard-section__move-actions">
                <button type="button" data-siase-v2-dashboard-move="up" aria-label="Subir Métricas clave">↑</button>
                <button type="button" data-siase-v2-dashboard-move="down" aria-label="Bajar Métricas clave">↓</button>
              </span>
            </header>
            <div class="siase-v2-profile-metrics">
              <article>
                <header><span aria-hidden="true">◇</span><h3>Créditos</h3></header>
                <p>Progreso total del plan de estudios.</p>
                <strong class="siase-v2-profile-metric-value siase-v2-profile-metric-value--gold" data-siase-v2-credits>Sin sincronizar</strong>
              </article>
              <article>
                <header><span aria-hidden="true">☆</span><h3>Promedio</h3></header>
                <p>Calificación promedio acumulada.</p>
                <strong class="siase-v2-profile-metric-value siase-v2-profile-metric-value--blue" data-siase-v2-average>—</strong>
              </article>
              <article>
                <header><span aria-hidden="true">▣</span><h3>Actividad</h3></header>
                <p>Avance académico registrado.</p>
                <strong class="siase-v2-profile-metric-value siase-v2-profile-metric-value--yellow" data-siase-v2-activity-value>Sin sincronizar</strong>
              </article>
              <article>
                <header><span aria-hidden="true">◉</span><h3>Situación</h3></header>
                <p>Estado actual en la institución.</p>
                <strong class="siase-v2-profile-metric-value siase-v2-profile-metric-value--lightblue" data-siase-v2-status>Por consultar</strong>
              </article>
            </div>
          </section>

          <section class="siase-v2-profile-section siase-v2-dashboard-section" data-dashboard-section-id="recent-grades" data-dashboard-section-title="Calificaciones recientes">
            <header class="siase-v2-dashboard-section__header">
              <button class="siase-v2-dashboard-section__drag-handle" type="button" draggable="true" aria-label="Reordenar Calificaciones recientes" aria-describedby="dashboard-section-instructions" aria-pressed="false">⋮⋮</button>
              <h2>Calificaciones recientes</h2>
              <span class="siase-v2-dashboard-section__move-actions">
                <button type="button" data-siase-v2-dashboard-move="up" aria-label="Subir Calificaciones recientes">↑</button>
                <button type="button" data-siase-v2-dashboard-move="down" aria-label="Bajar Calificaciones recientes">↓</button>
              </span>
            </header>
            <div class="siase-v2-profile-table">
              <header><span>↶</span><strong>Último periodo</strong><em>Resultados registrados</em></header>
              <div data-siase-v2-grades></div>
            </div>
          </section>

          <section class="siase-v2-profile-section siase-v2-dashboard-section" data-dashboard-section-id="official-notices" data-dashboard-section-title="Avisos oficiales">
            <header class="siase-v2-dashboard-section__header">
              <button class="siase-v2-dashboard-section__drag-handle" type="button" draggable="true" aria-label="Reordenar Avisos oficiales" aria-describedby="dashboard-section-instructions" aria-pressed="false">⋮⋮</button>
              <h2>Avisos oficiales</h2>
              <span class="siase-v2-dashboard-section__move-actions">
                <button type="button" data-siase-v2-dashboard-move="up" aria-label="Subir Avisos oficiales">↑</button>
                <button type="button" data-siase-v2-dashboard-move="down" aria-label="Bajar Avisos oficiales">↓</button>
              </span>
            </header>
            <details class="siase-v2-native-notices" open>
              <summary>Contenido oficial de SIASE</summary>
              <div data-siase-v2-native-host></div>
            </details>
          </section>
          </div>
          <p class="siase-v2-sr-only" data-siase-v2-dashboard-order-status aria-live="polite"></p>
        </div>
        <div class="siase-v2-inline-service" data-siase-v2-inline-service hidden></div>
      </section>
    </div>
  `;
  return shell;
}

async function loadDashboardData(frameDocument: Document): Promise<DashboardData> {
  scheduleDebug('dashboard:load:start', { frame: window.name, pathname: location.pathname });
  await syncStudentInfoFromFrames(frameDocument);
  await refreshDashboardData();
  const [
    studentInfo,
    studentStatus,
    menuItems,
    schedule,
    grades,
    kardex,
    profilePhotoDataUrl,
    storedSectionOrder
  ] =
    await Promise.all([
    getStorageValue('studentInfo'),
    getStorageValue('studentStatus'),
    getStorageValue('menuItems'),
    getStorageValue('scheduleSlots'),
    getStorageValue('gradeSnapshot'),
    getStorageValue('kardexSnapshot'),
    getStorageValue('profilePhotoDataUrl'),
    getStorageValue('dashboardSectionOrder')
  ]);
  const dashboardSectionOrder = normalizeDashboardSectionOrder(storedSectionOrder);
  if (
    storedSectionOrder &&
    (storedSectionOrder.length !== dashboardSectionOrder.length ||
      storedSectionOrder.some((id, index) => id !== dashboardSectionOrder[index]))
  ) {
    await setStorageValue('dashboardSectionOrder', dashboardSectionOrder);
  }
  const data = {
    studentInfo,
    studentStatus,
    menuItems: menuItems ?? [],
    schedule: schedule ?? [],
    grades,
    kardex,
    profilePhotoDataUrl,
    dashboardSectionOrder
  };
  scheduleDebug('dashboard:load:stored', {
    scheduleSlots: data.schedule.length,
    grades: data.grades?.grades.length ?? 0,
    hasKardex: Boolean(data.kardex),
    menuItems: data.menuItems.length
  });
  return data;
}

function getRootFrames(frameDocument: Document): {
  topFrame?: HTMLFrameElement;
  leftFrame?: HTMLFrameElement;
  topDocument?: Document;
  leftDocument?: Document;
} {
  try {
    const rootDocument = frameDocument.defaultView?.top?.document;
    const topFrame =
      rootDocument?.querySelector<HTMLFrameElement>('frame[name="top"]') ?? undefined;
    const leftFrame =
      rootDocument?.querySelector<HTMLFrameElement>('frame[name="left"]') ?? undefined;
    return {
      topFrame,
      leftFrame,
      topDocument: topFrame?.contentDocument ?? undefined,
      leftDocument: leftFrame?.contentDocument ?? undefined
    };
  } catch {
    return {};
  }
}

function hasUsableTopDocument(topDocument: Document | undefined): topDocument is Document {
  if (!topDocument?.body) return false;
  const value =
    (topDocument.body as HTMLElement).innerText ?? textContent(topDocument.body);
  return value.replace(/\s+/g, ' ').trim().length > 0;
}

function sameStudentInfo(left: StudentInfo | undefined, right: StudentInfo): boolean {
  return (
    left?.name === right.name &&
    left?.matricula === right.matricula &&
    left?.program === right.program &&
    left?.faculty === right.faculty &&
    left?.plan === right.plan &&
    left?.institution === right.institution &&
    left?.rawProfileText === right.rawProfileText
  );
}

async function syncStudentInfoFromFrames(
  frameDocument: Document
): Promise<ProfileSyncResult> {
  if (profileSyncInFlight) return profileSyncInFlight;

  profileSyncInFlight = (async () => {
    const { topDocument, leftDocument } = getRootFrames(frameDocument);
    if (!hasUsableTopDocument(topDocument)) {
      return { changed: false, unavailable: 'top' };
    }

    const parsed = parseStudentInfo(topDocument, leftDocument);
    if (!parsed.name && !parsed.matricula && !parsed.program && !parsed.institution) {
      return { changed: false, unavailable: 'profile' };
    }

    const existing = await getStorageValue('studentInfo');
    const next: StudentInfo = {
      name: parsed.name || existing?.name || '',
      matricula: parsed.matricula || existing?.matricula || '',
      program: parsed.program || existing?.program,
      faculty: parsed.faculty || existing?.faculty,
      plan: parsed.plan || existing?.plan,
      institution: parsed.institution || existing?.institution,
      rawProfileText: parsed.rawProfileText || existing?.rawProfileText
    };

    if (sameStudentInfo(existing, next)) {
      return { changed: false, studentInfo: next };
    }

    await setStorageValue('studentInfo', next);
    return { changed: true, studentInfo: next };
  })();

  try {
    return await profileSyncInFlight;
  } finally {
    profileSyncInFlight = undefined;
  }
}

function installAutomaticProfileSync(frameDocument: Document): () => void {
  const { topFrame, leftFrame } = getRootFrames(frameDocument);
  const timerWindow = frameDocument.defaultView;
  let disposed = false;
  let retryTimer: number | undefined;
  let retries = 0;
  const maxRetries = 5;

  const clearRetry = (): void => {
    if (retryTimer !== undefined && timerWindow) {
      timerWindow.clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const attempt = (): void => {
    if (disposed) return;
    void syncStudentInfoFromFrames(frameDocument)
      .then((result) => {
        if (disposed || result.unavailable !== 'top' || !timerWindow) {
          clearRetry();
          return;
        }
        if (retries >= maxRetries) {
          clearRetry();
          return;
        }
        retries += 1;
        clearRetry();
        retryTimer = timerWindow.setTimeout(attempt, 250 * retries);
      })
      .catch((error) => scheduleDebugError('dashboard:profile-sync:auto-error', error));
  };

  topFrame?.addEventListener('load', attempt);
  leftFrame?.addEventListener('load', attempt);
  attempt();

  return () => {
    disposed = true;
    clearRetry();
    topFrame?.removeEventListener('load', attempt);
    leftFrame?.removeEventListener('load', attempt);
  };
}

function hydrateDashboard(shell: HTMLElement, data: DashboardData): void {
  const sections = shell.querySelector<HTMLElement>('[data-siase-v2-dashboard-sections]');
  if (sections) applySectionOrder(sections, data.dashboardSectionOrder);
  shell
    .querySelectorAll<HTMLElement>(
      '[data-siase-v2-schedule], [data-siase-v2-grades]'
    )
    .forEach((host) => host.replaceChildren());
  renderProfileNavigation(shell, data);
  renderProfile(shell, data);
  renderAcademicSummary(shell, data);
  renderSchedule(shell, data.schedule);
  renderGrades(shell, data.grades);
}

function mountLegacyAnnouncements(
  frameDocument: Document,
  dashboard: HTMLElement,
  data: LegacyAnnouncements
): void {
  const hasAnnouncements = Boolean(data.banners.length || data.notices.length || data.quickBlocks.length);
  if (!hasAnnouncements) return;

  const nativeNotices = frameDocument.querySelector<HTMLElement>('details.siase-v2-native-notices');
  if (nativeNotices) {
    nativeNotices.hidden = true;
    nativeNotices.dataset.siaseV2NativeNoticesExtracted = 'true';
  }

  dashboard.querySelector('.siase-v2-notification')?.remove();
  const mount =
    dashboard.querySelector<HTMLElement>('[data-siase-v2-profile-summary]') ??
    dashboard.querySelector<HTMLElement>('.siase-v2-profile-content') ??
    dashboard;
  const bell = renderNotificationBell(frameDocument, data);
  bell.id = 'siase-v2-center-notification';
  mount.prepend(bell);
}

export function initializeCenterGameUi(
  frameDocument: Document,
  url = new URL(location.href)
): void {
  const isMainCenter = url.pathname.toLocaleLowerCase().includes('maincenter.htm');
  frameDocument.body.classList.add('siase-v2-center');
  frameDocument.body.classList.toggle('siase-v2-main-center', isMainCenter);
  frameDocument.getElementById('siase-plus-shell')?.remove();

  if (!isMainCenter) return;
  if (frameDocument.getElementById('siase-v2-dashboard')) return;

  // Capture the legacy sources before moving them into the modern dashboard.
  // The old portal keeps the notice table beside #container and the carousel
  // controls inside the frame-local document.
  const legacyAnnouncements = extractLegacyAnnouncements(frameDocument);
  const dashboard = createDashboard(frameDocument);
  const nativeHost = dashboard.querySelector<HTMLElement>('[data-siase-v2-native-host]');
  frameDocument.body.prepend(dashboard);
  attachProfilePhotoControls(dashboard);
  attachDashboardSectionReorder(dashboard);
  const frameWindow = frameDocument.defaultView as CenterFrameWindow | null;
  frameWindow?.__SIASE_V2_PROFILE_SYNC_CLEANUP__?.();
  if (frameWindow) {
    frameWindow.__SIASE_V2_PROFILE_SYNC_CLEANUP__ =
      installAutomaticProfileSync(frameDocument);
  }
  if (nativeHost) moveNativeContent(frameDocument, nativeHost);
  mountLegacyAnnouncements(frameDocument, dashboard, legacyAnnouncements);
  let refreshInFlight = false;
  const refresh = (): void => {
    if (refreshInFlight) {
      scheduleDebug('dashboard:load:skip:already-running');
      return;
    }
    refreshInFlight = true;
    void loadDashboardData(frameDocument)
      .then((data) => hydrateDashboard(dashboard, data))
      .catch((error) => scheduleDebugError('dashboard:load:error', error))
      .finally(() => {
        refreshInFlight = false;
        scheduleDebug('dashboard:load:finished');
      });
  };
  refresh();

  if (frameWindow && !frameWindow.__SIASE_V2_STORAGE_LISTENER__) {
    frameWindow.__SIASE_V2_STORAGE_LISTENER__ = true;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      const relevantKeys = [
        'studentInfo',
        'studentStatus',
        'menuItems',
        'scheduleSlots',
        'gradeSnapshot',
        'kardexSnapshot',
        'siaseSessionParams',
        'profilePhotoDataUrl',
        'dashboardSectionOrder'
      ];
      if (relevantKeys.some((key) => key in changes)) {
        scheduleDebug('dashboard:storage-change', { keys: Object.keys(changes).join(',') });
        refresh();
      }
    });
  }
}
