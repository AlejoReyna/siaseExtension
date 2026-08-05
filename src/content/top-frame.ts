import { parseStudentInfo } from '@/utils/parser/student';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import { enhancementsEnabled, setEnhancementsEnabled } from '@/utils/enhancements';
import { collapseLegacyFrames, restoreLegacyFrames } from './single-view-layout';

function ensureStyleComparisonToggle(frameDocument: Document, enabled: boolean): void {
  let button = frameDocument.getElementById(
    'siase-v2-style-comparison-toggle'
  ) as HTMLButtonElement | null;
  if (!button) {
    button = frameDocument.createElement('button');
    button.id = 'siase-v2-style-comparison-toggle';
    button.type = 'button';
    button.innerHTML = '<span aria-hidden="true">◐</span>';
    button.addEventListener('click', () => {
      const next = button?.dataset.enabled !== 'true';
      if (button) button.disabled = true;
      void setEnhancementsEnabled(next).then(() => window.top?.location.reload());
    });
    frameDocument.body.append(button);
  }
  button.dataset.enabled = String(enabled);
  button.setAttribute('aria-pressed', String(!enabled));
  button.setAttribute(
    'aria-label',
    enabled ? 'Comparar con la versión original de SIASE' : 'Activar estilos de Oh My SIASE'
  );
  button.title = enabled ? 'Ver versión original' : 'Activar Oh My SIASE';
}

function cleanLabel(anchor: HTMLAnchorElement): string {
  return (anchor.textContent ?? anchor.getAttribute('title') ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createHeader(frameDocument: Document, studentName: string): HTMLElement {
  const nativeAnchors = Array.from(
    frameDocument.querySelectorAll<HTMLAnchorElement>('table.MenuLink a[href]')
  );
  const moduleLinks = nativeAnchors.filter(
    (anchor) => anchor.target === 'left' && !/salir|cerrar\s+sesi[oó]n/i.test(cleanLabel(anchor))
  );
  const utilityLinks = nativeAnchors.filter((anchor) => {
    const label = cleanLabel(anchor);
    return label && anchor.target !== 'left' && !/salir|cerrar\s+sesi[oó]n/i.test(label);
  });
  const logoutLink = nativeAnchors.find((anchor) =>
    /salir|cerrar\s+sesi[oó]n/i.test(cleanLabel(anchor))
  );

  const shell = frameDocument.createElement('header');
  shell.id = 'siase-v2-header';
  shell.innerHTML = `
    <nav class="siase-v2-module-nav" aria-label="Módulos de SIASE"></nav>
    <div class="siase-v2-header-actions">
      <nav class="siase-v2-utility-nav" aria-label="Cuenta y servicios"></nav>
      <span class="siase-v2-user" title="${studentName || 'Estudiante UANL'}">
        ${studentName || 'Estudiante UANL'}
      </span>
    </div>
  `;

  const moduleNav = shell.querySelector<HTMLElement>('.siase-v2-module-nav');
  const utilityNav = shell.querySelector<HTMLElement>('.siase-v2-utility-nav');

  moduleLinks.forEach((anchor, index) => {
    const link = anchor.cloneNode(true) as HTMLAnchorElement;
    link.className = index === 0 ? 'is-active' : '';
    link.removeAttribute('style');
    link.addEventListener('click', () => {
      moduleNav?.querySelectorAll('a').forEach((candidate) => candidate.classList.remove('is-active'));
      link.classList.add('is-active');
    });
    moduleNav?.append(link);
  });

  utilityLinks.slice(0, 4).forEach((anchor) => {
    const link = anchor.cloneNode(true) as HTMLAnchorElement;
    link.removeAttribute('style');
    utilityNav?.append(link);
  });

  if (logoutLink) {
    const link = logoutLink.cloneNode(true) as HTMLAnchorElement;
    link.className = 'siase-v2-logout';
    link.textContent = 'Salir';
    link.removeAttribute('style');
    utilityNav?.append(link);
  }

  return shell;
}

export async function initializeTopFrame(frameDocument: Document): Promise<void> {
  if (window.name !== 'top') return;

  const enabled = await enhancementsEnabled();
  ensureStyleComparisonToggle(frameDocument, enabled);
  if (!enabled) {
    restoreLegacyFrames();
    return;
  }

  collapseLegacyFrames();
  const parsed = parseStudentInfo(frameDocument);
  const existing = await getStorageValue('studentInfo');
  const studentInfo = {
    ...existing,
    ...parsed,
    matricula: existing?.matricula || parsed.matricula
  };
  await setStorageValue('studentInfo', studentInfo);

  frameDocument.body.classList.add('siase-v2-top');
  frameDocument.querySelectorAll('table.MenuLink').forEach((table) => {
    table.classList.add('siase-v2-native-header');
  });
  frameDocument.getElementById('siase-v2-header')?.remove();
  frameDocument.body.prepend(createHeader(frameDocument, studentInfo.name));
}

void initializeTopFrame(document);
