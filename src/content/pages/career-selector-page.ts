const CAREER_PANEL_IDS = ['siase', 'correo', 'nexus', 'codice'] as const;

function controlLabel(control: HTMLElement, index: number): string {
  return control.textContent?.replace(/\s+/g, ' ').trim() || `Carrera ${index + 1}`;
}

function originalCareerLinks(form: HTMLFormElement): HTMLAnchorElement[] {
  return Array.from(form.querySelectorAll<HTMLAnchorElement>('a[href]')).filter((anchor) =>
    (anchor.getAttribute('href') ?? '').trim().toLocaleLowerCase('es-MX').startsWith('javascript:')
  );
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

export function enhanceCareerSelectorPage(frameDocument: Document): boolean {
  frameDocument.body.classList.add('siase-v2-career-selector-page');
  markNativePanels(frameDocument);

  const form = frameDocument.querySelector<HTMLFormElement>('form[name="SelCarrera"]');
  if (!form) return false;

  form.classList.add('siase-v2-career-native-form');
  const careerLinks = originalCareerLinks(form);
  careerLinks.forEach((link) => link.classList.add('siase-v2-career-native-option'));

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
  careerLinks.forEach((source, index) => {
    const button = frameDocument.createElement('button');
    button.type = 'button';
    button.className = 'siase-v2-career-choice';
    button.dataset.siaseCareerIndex = String(index);

    const marker = frameDocument.createElement('span');
    marker.className = 'siase-v2-career-choice__marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = String(index + 1).padStart(2, '0');
    const label = frameDocument.createElement('strong');
    label.textContent = controlLabel(source, index);
    const action = frameDocument.createElement('span');
    action.textContent = 'Continuar';
    button.append(marker, label, action);

    button.addEventListener('click', () => {
      if (source.isConnected) source.click();
    });
    choices.append(button);
  });

  selector.append(header, choices);
  form.before(selector);
  return true;
}
