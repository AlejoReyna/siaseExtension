export type QueryPageKind = 'schedule' | 'grades';

const copyByKind: Record<QueryPageKind, { eyebrow: string; title: string; description: string }> = {
  schedule: {
    eyebrow: 'Consulta académica',
    title: 'Horario',
    description: 'Selecciona un periodo para consultar el horario registrado por SIASE.'
  },
  grades: {
    eyebrow: 'Consulta académica',
    title: 'Calificaciones',
    description: 'Selecciona un periodo para consultar las calificaciones publicadas por SIASE.'
  }
};

function addQueryIntro(frameDocument: Document, form: HTMLFormElement, kind: QueryPageKind): void {
  if (frameDocument.querySelector('[data-siase-v2-query-intro]')) return;

  const copy = copyByKind[kind];
  const intro = frameDocument.createElement('section');
  intro.className = 'siase-v2-query-intro';
  intro.dataset.siaseV2QueryIntro = kind;
  intro.setAttribute('aria-labelledby', `siase-v2-${kind}-title`);

  const eyebrow = frameDocument.createElement('p');
  eyebrow.className = 'siase-v2-eyebrow';
  eyebrow.textContent = copy.eyebrow;
  const title = frameDocument.createElement('h1');
  title.id = `siase-v2-${kind}-title`;
  title.textContent = copy.title;
  const description = frameDocument.createElement('p');
  description.textContent = copy.description;
  intro.append(eyebrow, title, description);
  form.before(intro);
}

export function enhanceQueryPage(frameDocument: Document, kind: QueryPageKind): boolean {
  const form = frameDocument.querySelector<HTMLFormElement>('form[name="mi_forma"]');
  if (!frameDocument.body || !form) return false;

  frameDocument.body.classList.add('siase-v2-query-page', `siase-v2-query-page--${kind}`);
  form.classList.add('siase-v2-query-form');
  addQueryIntro(frameDocument, form, kind);

  const period = form.querySelector<HTMLSelectElement>('select[name="HTMLPeriodo"]');
  if (period) {
    period.classList.add('siase-v2-query-period');
    if (!period.getAttribute('aria-label'))
      period.setAttribute('aria-label', 'Periodo a consultar');
  }

  const submit = form.querySelector<HTMLInputElement>('input[type="button"][value="Aceptar"]');
  if (submit) {
    submit.classList.add('siase-v2-query-submit');
    if (!submit.getAttribute('aria-label'))
      submit.setAttribute('aria-label', 'Consultar periodo seleccionado');
  }

  form.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
    table.classList.add('siase-v2-query-native-table');
  });
  return true;
}
