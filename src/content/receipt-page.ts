export type ReceiptPageKind =
  | 'internal-selection'
  | 'academic-receipt'
  | 'intersemester-receipt'
  | 'intersemester-internal';

const RECEIPT_ROUTES: ReadonlyArray<{ kind: ReceiptPageKind; path: string }> = [
  { kind: 'internal-selection', path: '/cgi-bin/wspd_cgi.sh/ecavpag01.htm' },
  { kind: 'academic-receipt', path: '/cgi-bin/wspd_cgi.sh/ecBolRec-v02.htm' },
  { kind: 'intersemester-receipt', path: '/cgi-bin/wspd_cgi.sh/ecBolRec-v03.htm' },
  { kind: 'intersemester-internal', path: '/cgi-bin/wspd_cgi.sh/EgenbolveranoV2.htm' }
];

const copyByKind: Record<
  Exclude<ReceiptPageKind, 'intersemester-internal'>,
  { eyebrow: string; title: string; description: string }
> = {
  'internal-selection': {
    eyebrow: 'Servicios escolares',
    title: 'Recibo interno',
    description: 'Selecciona una boleta para continuar con el flujo nativo de SIASE.'
  },
  'academic-receipt': {
    eyebrow: 'Servicios escolares',
    title: 'Recibo de servicios académicos y escolares',
    description:
      'Revisa la información del recibo. Las acciones financieras e impresión siguen siendo nativas de SIASE.'
  },
  'intersemester-receipt': {
    eyebrow: 'Servicios escolares',
    title: 'Recibo intersemestral',
    description:
      'Revisa la información del recibo intersemestral. Las acciones financieras e impresión siguen siendo nativas de SIASE.'
  }
};

export function detectReceiptPage(url: URL): ReceiptPageKind | null {
  return RECEIPT_ROUTES.find(({ path }) => url.pathname === path)?.kind ?? null;
}

function addReceiptIntro(
  frameDocument: Document,
  form: HTMLFormElement,
  kind: Exclude<ReceiptPageKind, 'intersemester-internal'>
): void {
  if (frameDocument.querySelector('[data-siase-v2-receipt-intro]')) return;

  const copy = copyByKind[kind];
  const intro = frameDocument.createElement('section');
  intro.className = 'siase-v2-receipt-intro';
  intro.dataset.siaseV2ReceiptIntro = kind;
  intro.setAttribute('aria-labelledby', `siase-v2-${kind}-title`);

  const eyebrow = frameDocument.createElement('p');
  eyebrow.className = 'siase-v2-receipt-eyebrow';
  eyebrow.textContent = copy.eyebrow;
  const title = frameDocument.createElement('h1');
  title.id = `siase-v2-${kind}-title`;
  title.textContent = copy.title;
  const description = frameDocument.createElement('p');
  description.textContent = copy.description;
  intro.append(eyebrow, title, description);
  form.before(intro);
}

function isNativeContentPresent(body: HTMLElement): boolean {
  return Array.from(body.childNodes).some((node) => {
    if (node.nodeType === 3) return Boolean(node.textContent?.trim());
    return node.nodeType === 1 && !(node as Element).matches('[data-siase-v2-receipt-empty]');
  });
}

function showEmptyState(frameDocument: Document): void {
  const body = frameDocument.body;
  if (!body) return;

  const update = (): void => {
    const hasNativeContent = isNativeContentPresent(body);
    body.classList.toggle('siase-v2-receipt-page--empty', !hasNativeContent);
    const existing = body.querySelector<HTMLElement>('[data-siase-v2-receipt-empty]');
    if (hasNativeContent) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const state = frameDocument.createElement('section');
    state.className = 'siase-v2-receipt-empty-state';
    state.dataset.siaseV2ReceiptEmpty = 'true';
    state.setAttribute('role', 'status');
    const title = frameDocument.createElement('h1');
    title.textContent = 'El servicio no devolvió contenido';
    const message = frameDocument.createElement('p');
    message.textContent =
      'SIASE no mostró información disponible para esta consulta. No se realizó ninguna acción adicional.';
    state.append(title, message);
    body.append(state);
  };

  update();
  const observer = new MutationObserver(() => update());
  observer.observe(body, { childList: true });
}

function enhanceReceiptDocument(
  frameDocument: Document,
  kind: Exclude<ReceiptPageKind, 'intersemester-internal'>
): boolean {
  const body = frameDocument.body;
  const form = frameDocument.querySelector<HTMLFormElement>('form[name="mi_forma"]');
  if (!body || !form) return false;

  body.classList.add('siase-v2-receipt-page', `siase-v2-receipt-page--${kind}`);
  form.classList.add('siase-v2-receipt-document');
  addReceiptIntro(frameDocument, form, kind);

  form.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
    table.classList.add('siase-v2-receipt-native-table');
  });
  form.querySelectorAll<HTMLElement>('dialog, [role="dialog"]').forEach((dialog) => {
    dialog.classList.add('siase-v2-receipt-dialog');
  });
  if (kind === 'internal-selection') {
    form.querySelector('table')?.classList.add('siase-v2-receipt-selection-table');
    form.querySelector<HTMLAnchorElement>('a')?.classList.add('siase-v2-receipt-history-link');
  }
  return true;
}

export function enhanceReceiptPage(
  frameDocument: Document,
  url = new URL(frameDocument.location.href)
): ReceiptPageKind | null {
  const kind = detectReceiptPage(url);
  if (!kind || !frameDocument.body) return null;

  if (kind === 'intersemester-internal') {
    frameDocument.body.classList.add(
      'siase-v2-receipt-page',
      'siase-v2-receipt-page--intersemester-internal'
    );
    showEmptyState(frameDocument);
    return kind;
  }

  enhanceReceiptDocument(frameDocument, kind);
  return kind;
}

void enhanceReceiptPage(document, new URL(location.href));
