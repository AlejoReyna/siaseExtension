import type { GradeSnapshot } from '@/types/grades';
import type { KardexSummary } from '@/types/kardex';
import type { MenuItem } from '@/types/menu';
import type { ScheduleSlot, Weekday } from '@/types/schedule';
import type { StudentInfo, StudentStatus } from '@/types/student';
import { getStorageValue } from '@/utils/storage';
import { parseStudentInfo } from '@/utils/parser/student';
import { setStorageValue } from '@/utils/storage';
import { refreshDashboardData } from './dashboard-data';

type DashboardData = {
  studentInfo?: StudentInfo;
  studentStatus?: StudentStatus;
  menuItems: MenuItem[];
  schedule: ScheduleSlot[];
  grades?: GradeSnapshot;
  kardex?: KardexSummary;
};

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
    empty.className = 'siase-v2-empty';
    empty.textContent = schedule.length
      ? 'No hay clases registradas para hoy.'
      : 'Abre Horario para sincronizar tus clases.';
    host.append(empty);
    return;
  }

  today.slice(0, 5).forEach((slot) => {
    const row = shell.ownerDocument.createElement('article');
    row.className = 'siase-v2-class-row';
    const time = shell.ownerDocument.createElement('time');
    time.textContent = slot.startTime;
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
    empty.className = 'siase-v2-empty';
    empty.textContent = 'Abre Calificaciones para sincronizar resultados.';
    host.append(empty);
    return;
  }

  grades.slice(0, 4).forEach((grade) => {
    const row = shell.ownerDocument.createElement('article');
    row.className = 'siase-v2-grade-row';
    const name = shell.ownerDocument.createElement('span');
    name.textContent = grade.subject;
    const score = shell.ownerDocument.createElement('strong');
    score.textContent = grade.score === undefined ? '—' : String(grade.score);
    score.dataset.status = grade.status;
    row.append(name, score);
    host.append(row);
  });
}

function renderAcademicSummary(shell: HTMLElement, data: DashboardData): void {
  const progress = Math.max(0, Math.min(data.kardex?.progressPercent ?? 0, 100));
  const progressNode = shell.querySelector<HTMLElement>('[data-siase-v2-progress]');
  const creditsNode = shell.querySelector<HTMLElement>('[data-siase-v2-credits]');
  const averageNode = shell.querySelector<HTMLElement>('[data-siase-v2-average]');
  const statusNode = shell.querySelector<HTMLElement>('[data-siase-v2-status]');
  const bar = shell.querySelector<HTMLElement>('[data-siase-v2-progress-bar]');

  if (progressNode) progressNode.textContent = data.kardex ? `${Math.round(progress)}%` : '—';
  if (creditsNode) {
    creditsNode.textContent = data.kardex
      ? `${data.kardex.totalCreditsCompleted} / ${data.kardex.totalCreditsRequired}`
      : 'Sin sincronizar';
  }
  if (averageNode) averageNode.textContent = data.kardex?.average?.toFixed(2) ?? '—';
  if (statusNode) statusNode.textContent = data.studentStatus?.label || 'Por consultar';
  if (bar) bar.style.width = `${progress}%`;
}

function createDashboard(frameDocument: Document): HTMLElement {
  const shell = frameDocument.createElement('main');
  shell.id = 'siase-v2-dashboard';
  shell.innerHTML = `
    <section class="siase-v2-welcome">
      <div>
        <p class="siase-v2-eyebrow">Portal académico</p>
        <h1>Hola, <span data-siase-v2-first-name>Estudiante</span></h1>
        <p data-siase-v2-program>Tu información académica en un solo lugar.</p>
      </div>
      <div class="siase-v2-session-state"><span></span>Sesión activa</div>
    </section>

    <section class="siase-v2-dashboard-grid">
      <article class="siase-v2-card siase-v2-card--attention">
        <header><div><p class="siase-v2-eyebrow">Prioridad</p><h2>Requiere tu atención</h2></div></header>
        <div class="siase-v2-stack" data-siase-v2-attention></div>
      </article>

      <article class="siase-v2-card siase-v2-card--academic">
        <header><div><p class="siase-v2-eyebrow">Resumen</p><h2>Avance académico</h2></div><strong data-siase-v2-progress>—</strong></header>
        <div class="siase-v2-progress"><span data-siase-v2-progress-bar></span></div>
        <dl class="siase-v2-metrics">
          <div><dt>Créditos</dt><dd data-siase-v2-credits>Sin sincronizar</dd></div>
          <div><dt>Promedio</dt><dd data-siase-v2-average>—</dd></div>
          <div><dt>Situación</dt><dd data-siase-v2-status>Por consultar</dd></div>
        </dl>
      </article>

      <article class="siase-v2-card siase-v2-card--schedule">
        <header><div><p class="siase-v2-eyebrow">Hoy</p><h2>Tu horario</h2></div></header>
        <div class="siase-v2-stack" data-siase-v2-schedule></div>
      </article>

      <article class="siase-v2-card siase-v2-card--grades">
        <header><div><p class="siase-v2-eyebrow">Reciente</p><h2>Calificaciones</h2></div></header>
        <div class="siase-v2-stack" data-siase-v2-grades></div>
      </article>
    </section>

    <section class="siase-v2-quick-section">
      <header><div><p class="siase-v2-eyebrow">Servicios</p><h2>Accesos frecuentes</h2></div></header>
      <nav class="siase-v2-quick-grid" data-siase-v2-quick-actions aria-label="Accesos frecuentes"></nav>
    </section>

    <details class="siase-v2-native-notices" open>
      <summary>Avisos oficiales de SIASE</summary>
      <div data-siase-v2-native-host></div>
    </details>
  `;
  return shell;
}

async function loadDashboardData(): Promise<DashboardData> {
  await refreshStudentInfoFromFrames();
  await refreshDashboardData();
  const [studentInfo, studentStatus, menuItems, schedule, grades, kardex] = await Promise.all([
    getStorageValue('studentInfo'),
    getStorageValue('studentStatus'),
    getStorageValue('menuItems'),
    getStorageValue('scheduleSlots'),
    getStorageValue('gradeSnapshot'),
    getStorageValue('kardexSnapshot')
  ]);
  return {
    studentInfo,
    studentStatus,
    menuItems: menuItems ?? [],
    schedule: schedule ?? [],
    grades,
    kardex
  };
}

async function refreshStudentInfoFromFrames(): Promise<void> {
  const parentDocument = window.parent?.document;
  const topFrame = parentDocument?.querySelector<HTMLFrameElement>('frame[name="top"]');
  const leftFrame = parentDocument?.querySelector<HTMLFrameElement>('frame[name="left"]');
  const topDocument = topFrame?.contentDocument;
  if (!topDocument) return;
  const parsed = parseStudentInfo(topDocument, leftFrame?.contentDocument ?? undefined);
  if (!parsed.name && !parsed.matricula && !parsed.program && !parsed.plan) return;
  const existing = await getStorageValue('studentInfo');
  await setStorageValue('studentInfo', {
    name: parsed.name || existing?.name || '',
    matricula: parsed.matricula || existing?.matricula || '',
    program: parsed.program || existing?.program,
    faculty: parsed.faculty || existing?.faculty,
    plan: parsed.plan || existing?.plan
  });
}

function hydrateDashboard(shell: HTMLElement, data: DashboardData): void {
  shell
    .querySelectorAll<HTMLElement>(
      '[data-siase-v2-attention], [data-siase-v2-schedule], [data-siase-v2-grades], [data-siase-v2-quick-actions]'
    )
    .forEach((host) => host.replaceChildren());
  const name = shell.querySelector<HTMLElement>('[data-siase-v2-first-name]');
  const program = shell.querySelector<HTMLElement>('[data-siase-v2-program]');
  if (name) name.textContent = firstName(data.studentInfo);
  if (program) {
    program.textContent =
      [data.studentInfo?.program, data.studentInfo?.plan ? `Plan ${data.studentInfo.plan}` : undefined]
        .filter(Boolean)
        .join(' · ') || 'Tu información académica en un solo lugar.';
  }
  renderAttention(shell, data);
  renderAcademicSummary(shell, data);
  renderSchedule(shell, data.schedule);
  renderGrades(shell, data.grades);
  renderQuickActions(shell, data);
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

  const dashboard = createDashboard(frameDocument);
  const nativeHost = dashboard.querySelector<HTMLElement>('[data-siase-v2-native-host]');
  frameDocument.body.prepend(dashboard);
  if (nativeHost) moveNativeContent(frameDocument, nativeHost);
  const refresh = (): void => {
    void loadDashboardData().then((data) => hydrateDashboard(dashboard, data));
  };
  refresh();

  const frameWindow = frameDocument.defaultView as
    | (Window & { __SIASE_V2_STORAGE_LISTENER__?: boolean })
    | null;
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
        'kardexSnapshot'
      ];
      if (relevantKeys.some((key) => key in changes)) refresh();
    });
  }
}
