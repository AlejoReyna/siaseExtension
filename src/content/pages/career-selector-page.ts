import {
  extractLegacyAnnouncements,
  renderNotificationBell
} from '../legacy-announcements';

const CAREER_PANEL_IDS = ['siase', 'correo', 'nexus', 'codice'] as const;

function controlLabel(control: HTMLElement, index: number): string {
  return control.textContent?.replace(/\s+/g, ' ').trim() || `Carrera ${index + 1}`;
}

function originalCareerLinks(form: HTMLFormElement): HTMLAnchorElement[] {
  return Array.from(form.querySelectorAll<HTMLAnchorElement>('a[href]')).filter((anchor) =>
    (anchor.getAttribute('href') ?? '').trim().toLocaleLowerCase('es-MX').startsWith('javascript:')
  );
}

function activateCareerLink(
  source: HTMLAnchorElement,
  form: HTMLFormElement,
  trigger?: HTMLButtonElement
): void {
  const href = source.dataset.siaseCareerAction ?? '';
  const assignments = [...href.matchAll(/\.([A-Za-z0-9_]+)\.value\s*=\s*(['"])(.*?)\2/gs)];

  assignments.forEach(([, fieldName, , value]) => {
    const field = form.elements.namedItem(fieldName) as HTMLInputElement | HTMLSelectElement | null;
    if (field) field.value = value;
  });

  if (!assignments.length) return;

  const shell = trigger?.closest<HTMLElement>('.siase-v2-career-shell');
  if (!shell) {
    form.submit();
    return;
  }

  shell.classList.add('is-transitioning');
  trigger?.classList.add('is-selected');
  shell.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.disabled = true;
  });

  window.setTimeout(() => form.submit(), 280);
}

function markNativePanels(frameDocument: Document): void {
  CAREER_PANEL_IDS.forEach((id) => {
    const panel = frameDocument.getElementById(id);
    if (!panel) return;
    panel.classList.add('siase-v2-career-service-panel', `siase-v2-career-service-panel--${id}`);
    if (!panel.getAttribute('aria-label')) {
      panel.setAttribute('aria-label', id === 'siase' ? 'SIASE' : id.toLocaleUpperCase('es-MX'));
    }
  });

  frameDocument.getElementById('idfrNexus')?.classList.add('siase-v2-career-native-control');
  frameDocument.getElementById('linkNexus')?.classList.add('siase-v2-career-native-control');
  frameDocument.getElementById('idfrCodice')?.classList.add('siase-v2-career-native-control');
  frameDocument.getElementById('linkCodice')?.classList.add('siase-v2-career-native-control');
}

function replaceLegacyPortalLayout(frameDocument: Document): void {
  try {
    const rootDocument = frameDocument.defaultView?.top?.document;
    if (!rootDocument) return;

    rootDocument.documentElement.classList.add('siase-v2-career-selector-root');
    rootDocument.querySelectorAll<HTMLFrameSetElement>('frameset').forEach((frameset) => {
      if (frameset.hasAttribute('rows')) frameset.setAttribute('rows', '0,*');
      if (frameset.hasAttribute('cols')) frameset.setAttribute('cols', '0,*');
      frameset.setAttribute('border', '0');
      frameset.setAttribute('frameborder', '0');
      frameset.setAttribute('framespacing', '0');
    });
  } catch {
    // Cross-document access can be unavailable in unusual embedded contexts.
  }
}

export function enhanceCareerSelectorPage(frameDocument: Document): boolean {
  frameDocument.body.classList.add('siase-v2-career-selector-page');
  // Extract while the legacy nodes, hrefs, onclick handlers and forms are still intact.
  const legacyAnnouncements = extractLegacyAnnouncements(frameDocument);
  replaceLegacyPortalLayout(frameDocument);
  markNativePanels(frameDocument);

  const form = frameDocument.querySelector<HTMLFormElement>('form[name="SelCarrera"]');
  if (!form) return false;

  form.classList.add('siase-v2-career-native-form');
  const careerLinks = originalCareerLinks(form);
  careerLinks.forEach((link) => {
    link.dataset.siaseCareerAction = link.getAttribute('href') ?? '';
    link.removeAttribute('href');
    link.classList.add('siase-v2-career-native-option');
  });

  if (!careerLinks.length || frameDocument.querySelector('[data-siase-v2-career-selector]')) {
    return true;
  }

  const selector = frameDocument.createElement('section');
  selector.className = 'siase-v2-career-selector';
  selector.dataset.siaseV2CareerSelector = 'true';
  selector.setAttribute('aria-labelledby', 'siase-v2-career-title');

  const header = frameDocument.createElement('header');
  const eyebrow = frameDocument.createElement('p');
  eyebrow.className = 'siase-v2-service-eyebrow';
  eyebrow.textContent = 'SIASE · UANL';
  const title = frameDocument.createElement('h1');
  title.id = 'siase-v2-career-title';
  title.textContent = 'Selecciona tu carrera';
  const description = frameDocument.createElement('p');
  description.textContent = 'Elige el programa académico con el que deseas continuar.';
  header.append(eyebrow, title, description);

  const choices = frameDocument.createElement('div');
  choices.className = 'siase-v2-career-choices';
  const sidebarChoices = frameDocument.createElement('div');
  sidebarChoices.className = 'siase-v2-career-sidebar__choices';
  careerLinks.forEach((source, index) => {
    const button = frameDocument.createElement('button');
    button.type = 'button';
    button.className = 'siase-v2-career-choice';
    button.dataset.siaseCareerIndex = String(index);

    const icon = frameDocument.createElement('span');
    icon.className = 'siase-v2-career-choice__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M6 12.5v4.2c2.9 2.2 9.1 2.2 12 0v-4.2"/><path d="M21 10v6"/></svg>';
    const label = frameDocument.createElement('strong');
    label.textContent = controlLabel(source, index);
    const detail = frameDocument.createElement('span');
    detail.className = 'siase-v2-career-choice__detail';
    detail.textContent = 'Accede a tu información académica y servicios.';
    const badge = frameDocument.createElement('span');
    badge.className = 'siase-v2-career-choice__badge';
    badge.textContent = 'Carrera disponible';
    const copy = frameDocument.createElement('span');
    copy.className = 'siase-v2-career-choice__copy';
    copy.append(label, detail);
    const action = frameDocument.createElement('span');
    action.className = 'siase-v2-career-choice__action';
    action.textContent = 'Abrir →';
    button.append(icon, copy, badge, action);

    button.addEventListener('click', () => {
      if (source.isConnected) activateCareerLink(source, form, button);
    });
    choices.append(button);

    const sidebarButton = frameDocument.createElement('button');
    sidebarButton.type = 'button';
    sidebarButton.className = 'siase-v2-career-sidebar__choice';
    sidebarButton.textContent = `${String(index + 1).padStart(2, '0')} · ${controlLabel(source, index)}`;
    sidebarButton.addEventListener('click', () => {
      if (source.isConnected) activateCareerLink(source, form, sidebarButton);
    });
    sidebarChoices.append(sidebarButton);
  });

  selector.append(header, choices);
  const shell = frameDocument.createElement('div');
  shell.className = 'siase-v2-career-shell';
  shell.innerHTML = `
    <header class="siase-v2-career-shell__header">
      <div class="siase-v2-career-shell__brand"><span>U</span><strong>UANL<em>SIASE</em></strong></div>
      <nav aria-label="Módulos"><span class="is-active">Escolar</span><span>Tesorería</span><span>DGPPE</span><span>AFI</span></nav>
    </header>
    <aside class="siase-v2-career-sidebar">
      <section class="siase-v2-career-profile" aria-label="Perfil del estudiante">
        <span class="siase-v2-career-profile__avatar" aria-hidden="true">U</span>
        <div><strong>Portal estudiantil</strong><span>UANL · SIASE</span></div>
      </section>
      <div class="siase-v2-career-sidebar__home"><span aria-hidden="true">⌂</span> <strong>Inicio</strong></div>
      <p>Carreras disponibles</p>
    </aside>
    <main class="siase-v2-career-shell__main">
      <section class="siase-v2-career-announcement" aria-label="Aviso institucional">
        <span class="siase-v2-career-announcement__icon" aria-hidden="true">i</span>
        <div><strong>Bienvenido a SIASE</strong><p>Selecciona una carrera para consultar tu información académica.</p></div>
      </section>
    </main>
  `;
  shell.querySelector('.siase-v2-career-sidebar')?.append(sidebarChoices);
  const shellHeader = shell.querySelector('.siase-v2-career-shell__header');
  shellHeader?.append(renderNotificationBell(frameDocument, legacyAnnouncements));
  shell.querySelector('.siase-v2-career-shell__main')?.prepend(selector);
  frameDocument.body.append(shell);
  return true;
}
