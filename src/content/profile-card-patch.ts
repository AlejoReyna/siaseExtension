type StoredStudentInfo = {
  name?: string;
};

function formatStudentName(value: string | undefined): string {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) return 'Estudiante UANL';

  return normalized
    .toLocaleLowerCase('es-MX')
    .split(' ')
    .map((part) => `${part.charAt(0).toLocaleUpperCase('es-MX')}${part.slice(1)}`)
    .join(' ');
}

function upgradeProfileCard(frameDocument: Document, student: StoredStudentInfo | undefined): boolean {
  const card = frameDocument.querySelector<HTMLElement>('.siase-v2-profile-card');
  const legacyProgram = card?.querySelector<HTMLHeadingElement>('h1[data-siase-v2-profile-degree]');
  if (!card || !legacyProgram) return Boolean(card?.querySelector('[data-siase-v2-profile-name]'));

  const program = legacyProgram.textContent?.replace(/\s+/g, ' ').trim() || 'Programa académico por sincronizar';
  const name = frameDocument.createElement('h1');
  name.className = 'siase-v2-profile-name';
  name.dataset.siaseV2ProfileName = 'true';
  name.textContent = formatStudentName(student?.name);

  const programCard = frameDocument.createElement('div');
  programCard.className = 'siase-v2-profile-program';
  programCard.setAttribute('aria-label', 'Carrera');
  const label = frameDocument.createElement('span');
  label.textContent = 'Carrera';
  const value = frameDocument.createElement('strong');
  value.dataset.siaseV2ProfileDegree = 'true';
  value.textContent = program;
  programCard.append(label, value);

  legacyProgram.replaceWith(name, programCard);
  return true;
}

function startProfileCardPatch(frameDocument: Document): void {
  let attempts = 0;
  const apply = (): void => {
    attempts += 1;
    void chrome.storage.local.get('studentInfo').then(({ studentInfo }) => {
      if (upgradeProfileCard(frameDocument, studentInfo as StoredStudentInfo | undefined)) return;
      if (attempts < 12) frameDocument.defaultView?.setTimeout(apply, 250);
    });
  };

  apply();
}

if (window.name === 'center') startProfileCardPatch(document);
