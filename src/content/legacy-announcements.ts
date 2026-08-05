export interface LegacyActionData {
  source: HTMLElement;
  href: string | null;
  onclick: string | null;
  formAction: string | null;
  imageSrc: string | null;
  imageAlt: string | null;
}

export interface LegacyBanner extends LegacyActionData {
  label: string;
  text: string;
}

export interface LegacyNotice extends LegacyActionData {
  department: string;
  title: string;
  body: string;
}

export interface LegacyQuickBlock extends LegacyActionData {
  label: string;
}

export interface LegacyAnnouncements {
  root: HTMLElement | null;
  banners: LegacyBanner[];
  notices: LegacyNotice[];
  quickBlocks: LegacyQuickBlock[];
  previousSource: HTMLElement | null;
  nextSource: HTMLElement | null;
  hasCarousel: boolean;
}

const QUICK_BLOCKS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'Transferencias', pattern: /transferencias?/i },
  { label: 'Becas', pattern: /becas?/i },
  { label: 'Facturación UANL', pattern: /facturaci[oó]n(?:\s+uanl)?/i },
  { label: 'Correo', pattern: /correo/i },
  { label: 'Dudas', pattern: /dudas?/i },
  { label: 'Censo Nacional sobre Inteligencia Artificial Generativa', pattern: /censo.*inteligencia artificial generativa/i }
];

let notificationId = 0;

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function firstAction(node: Element): HTMLElement {
  return (
    node.matches('a,button,input[type="button"],input[type="submit"],[onclick]')
      ? (node as HTMLElement)
      : node.querySelector<HTMLElement>('a,button,input[type="button"],input[type="submit"],[onclick]')) ??
    (node as HTMLElement);
}

function actionData(source: HTMLElement, documentRef: Document): LegacyActionData {
  const anchor = source.matches('a[href]')
    ? source
    : source.querySelector<HTMLAnchorElement>('a[href]') ?? source.closest<HTMLAnchorElement>('a[href]');
  const image = source.matches('img')
    ? source
    : source.querySelector<HTMLImageElement>('img') ?? source.closest<HTMLImageElement>('img');
  const form = source.closest<HTMLFormElement>('form');

  let formAction: string | null = null;
  const rawFormAction = form?.getAttribute('action');
  if (rawFormAction) {
    try {
      formAction = new URL(rawFormAction, documentRef.baseURI).href;
    } catch {
      formAction = rawFormAction;
    }
  }

  return {
    source,
    href: anchor?.getAttribute('href') ?? null,
    onclick: source.getAttribute('onclick') ?? anchor?.getAttribute('onclick') ?? null,
    formAction,
    imageSrc: image?.getAttribute('src') ?? null,
    imageAlt: image?.getAttribute('alt') ?? null
  };
}

function canonicalNode(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[style]').forEach((element) => element.removeAttribute('style'));
  clone.removeAttribute('style');
  return clone.outerHTML.replace(/\s+/g, ' ').trim();
}

function announcementRoot(documentRef: Document): HTMLElement | null {
  const container = documentRef.querySelector<HTMLElement>('#container');
  if (container && (/avisos?\s+de\s+inter[eé]s/i.test(container.textContent ?? '') || container.querySelector('#slider'))) {
    return container;
  }

  const heading = Array.from(documentRef.querySelectorAll<HTMLElement>('h1,h2,h3,[role="heading"]')).find((element) =>
    /avisos?\s+de\s+inter[eé]s/i.test(normalizeText(element.textContent))
  );
  if (heading) {
    let current: HTMLElement | null = heading.parentElement;
    while (current && current !== documentRef.body) {
      if (current.querySelector('img,li,#slider,[id*="prev" i],[id*="next" i]')) return current;
      current = current.parentElement;
    }
    return heading.parentElement;
  }

  const slider = documentRef.querySelector<HTMLElement>('#slider,[id*="slider" i],.slider,[class*="slider" i]');
  return slider?.parentElement ?? null;
}

function sliderElement(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  return root.matches('#slider,[id*="slider" i],.slider,[class*="slider" i]')
    ? root
    : root.querySelector<HTMLElement>('#slider,[id*="slider" i],.slider,[class*="slider" i]');
}

function matchingQuickBlock(label: string): string | null {
  return QUICK_BLOCKS.find(({ pattern }) => pattern.test(label))?.label ?? null;
}

function elementLabel(element: HTMLElement): string {
  const imageAlt = element.querySelector<HTMLImageElement>('img[alt]')?.alt ?? '';
  return normalizeText(
    [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      imageAlt,
      element.textContent
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function extractBanners(root: HTMLElement | null, documentRef: Document): LegacyBanner[] {
  const slider = sliderElement(root);
  if (!slider) return [];

  const items = Array.from(slider.querySelectorAll<HTMLElement>('li,[role="listitem"]')).filter((item) =>
    item.querySelector('img') || normalizeText(item.textContent)
  );
  const sources = items.length ? items : Array.from(slider.querySelectorAll<HTMLElement>('img'));
  const seen = new Set<string>();

  return sources.flatMap((item) => {
    const source = firstAction(item);
    const data = actionData(source, documentRef);
    const image = item.querySelector<HTMLImageElement>('img');
    const label = normalizeText(image?.alt || elementLabel(item) || 'Aviso de interés');
    const banner: LegacyBanner = { ...data, label, text: normalizeText(item.textContent) };
    const key = canonicalNode(item);
    if (seen.has(key)) return [];
    seen.add(key);
    return [banner];
  });
}

function extractNotice(cell: HTMLTableCellElement, documentRef: Document): LegacyNotice | null {
  const body = normalizeText(cell.textContent);
  if (!body) return null;

  const strongs = Array.from(cell.querySelectorAll<HTMLElement>('strong')).map((element) => normalizeText(element.textContent)).filter(Boolean);
  const titleNode = cell.querySelector<HTMLElement>('.auto-style6,[class*="titulo" i],h1,h2,h3');
  const title = normalizeText(titleNode?.textContent) || strongs[1] || strongs[0] || 'Aviso oficial';
  const department = strongs[0] && strongs[0] !== title ? strongs[0] : '';
  const source = firstAction(cell);
  return { ...actionData(source, documentRef), department, title, body };
}

function extractNotices(root: HTMLElement | null, documentRef: Document): LegacyNotice[] {
  if (!root) return [];
  const scope = root.querySelector('table') ? root : root.parentElement;
  const cells = Array.from(scope?.querySelectorAll<HTMLTableCellElement>('table td') ?? []).filter(
    (cell) =>
      !cell.closest('#slider,[id*="slider" i],.slider,[class*="slider" i]') &&
      /departamento|aviso|encuesta|credencial|seguridad social/i.test(cell.textContent ?? '')
  );
  const seen = new Set<string>();
  return cells.flatMap((cell) => {
    const notice = extractNotice(cell, documentRef);
    if (!notice) return [];
    const key = canonicalNode(cell);
    if (seen.has(key)) return [];
    seen.add(key);
    return [notice];
  });
}

function extractQuickBlocks(documentRef: Document): LegacyQuickBlock[] {
  const seenSources = new Set<HTMLElement>();
  const seenNodes = new Set<string>();
  const candidates = Array.from(
    documentRef.querySelectorAll<HTMLElement>('a,button,input[type="button"],input[type="submit"],[onclick]')
  );

  return candidates.flatMap((candidate) => {
    const source = firstAction(candidate);
    if (seenSources.has(source)) return [];
    seenSources.add(source);

    const label = elementLabel(source);
    const quickLabel = matchingQuickBlock(label);
    if (!quickLabel) return [];

    const key = canonicalNode(source);
    if (seenNodes.has(key)) return [];
    seenNodes.add(key);
    return [{ ...actionData(source, documentRef), label: quickLabel }];
  });
}

function findNavigationSource(root: HTMLElement | null, direction: 'previous' | 'next'): HTMLElement | null {
  if (!root) return null;
  const patterns = direction === 'previous' ? /previous|anterior/i : /next|siguiente/i;
  return (
    Array.from(root.querySelectorAll<HTMLElement>('a,button,[onclick]')).find((element) =>
      patterns.test(normalizeText(element.textContent) || element.getAttribute('aria-label') || '')
    ) ?? null
  );
}

export function extractLegacyAnnouncements(documentRef: Document): LegacyAnnouncements {
  const root = announcementRoot(documentRef);
  const banners = extractBanners(root, documentRef);
  const notices = extractNotices(root, documentRef);
  const quickBlocks = extractQuickBlocks(documentRef);
  const previousSource = findNavigationSource(root, 'previous');
  const nextSource = findNavigationSource(root, 'next');
  const result: LegacyAnnouncements = {
    root,
    banners,
    notices,
    quickBlocks,
    previousSource,
    nextSource,
    hasCarousel: banners.length > 1 && Boolean(previousSource || nextSource)
  };

  console.info('[SIASE avisos]', {
    root: root?.id || root?.className || null,
    banners: banners.map(({ label }) => label),
    notices: notices.length,
    quickBlocks: quickBlocks.map(({ label }) => label),
    hasCarousel: result.hasCarousel
  });
  return result;
}

function makeElement<K extends keyof HTMLElementTagNameMap>(documentRef: Document, tag: K, className?: string): HTMLElementTagNameMap[K] {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  return element;
}

function appendSvgBell(documentRef: Document, button: HTMLButtonElement): void {
  const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4');
  svg.append(path);
  button.append(svg);
}

function originalAction<K extends HTMLElementTagNameMap['a'] | HTMLElementTagNameMap['button']>(
  documentRef: Document,
  item: LegacyActionData,
  label: string,
  className: string
): K | null {
  const source = item.source;
  const hasAction = source.matches('a,button,input[type="button"],input[type="submit"],[onclick]') || Boolean(item.href || item.onclick || item.formAction);
  if (!hasAction) return null;

  const hasSafeHref = Boolean(item.href && !/^javascript:/i.test(item.href));
  const action = (hasSafeHref ? makeElement(documentRef, 'a', className) : makeElement(documentRef, 'button', className)) as K;
  if (action instanceof HTMLButtonElement) action.type = 'button';
  action.setAttribute('aria-label', label);
  if (item.href) action.dataset.siaseOriginalHref = item.href;
  if (hasSafeHref && item.href) action.setAttribute('href', item.href);

  action.addEventListener('click', (event) => {
    if (action instanceof HTMLAnchorElement) event.preventDefault();
    if (item.source.isConnected) item.source.click();
  });
  return action;
}

function appendActionContent(documentRef: Document, action: HTMLElement, item: LegacyActionData, label: string): void {
  if (item.imageSrc) {
    const image = makeElement(documentRef, 'img');
    image.setAttribute('src', item.imageSrc);
    image.setAttribute('alt', item.imageAlt || label);
    action.append(image);
  }
  const caption = makeElement(documentRef, 'span');
  caption.textContent = label;
  action.append(caption);
}

function renderBannerSlide(documentRef: Document, banner: LegacyBanner): HTMLElement {
  const wrapper = makeElement(documentRef, 'article', 'siase-v2-notification-banner');
  const action = originalAction(documentRef, banner, banner.label, 'siase-v2-notification-banner__action');
  const content = action ?? wrapper;
  if (action) wrapper.append(action);
  appendActionContent(documentRef, content, banner, banner.label);
  if (banner.text && banner.text !== banner.label) {
    const description = makeElement(documentRef, 'p');
    description.textContent = banner.text;
    content.append(description);
  }
  return wrapper;
}

function renderNotice(documentRef: Document, notice: LegacyNotice): HTMLElement {
  const card = makeElement(documentRef, 'article', 'siase-v2-notification-notice');
  if (notice.department) {
    const department = makeElement(documentRef, 'p', 'siase-v2-notification-notice__department');
    department.textContent = notice.department;
    card.append(department);
  }
  const title = makeElement(documentRef, 'h3');
  title.textContent = notice.title;
  card.append(title);
  const body = makeElement(documentRef, 'p');
  body.textContent = notice.body;
  card.append(body);
  if (notice.imageSrc) {
    const image = makeElement(documentRef, 'img');
    image.setAttribute('src', notice.imageSrc);
    image.setAttribute('alt', notice.imageAlt || notice.title);
    card.append(image);
  }
  if (notice.href || notice.onclick || notice.formAction) {
    const action = originalAction(documentRef, notice, 'Abrir aviso', 'siase-v2-notification-action');
    if (action) {
      appendActionContent(documentRef, action, notice, 'Abrir aviso');
      card.append(action);
    }
  }
  return card;
}

function renderQuickBlock(documentRef: Document, block: LegacyQuickBlock): HTMLElement {
  const card = makeElement(documentRef, 'article', 'siase-v2-notification-quick-block');
  const action = originalAction(documentRef, block, block.label, 'Abrir ' + block.label);
  if (action) {
    appendActionContent(documentRef, action, block, block.label);
    card.append(action);
  } else {
    const label = makeElement(documentRef, 'span');
    label.textContent = block.label;
    card.append(label);
  }
  return card;
}

export function attachNotificationBellBehavior(
  documentRef: Document,
  root: HTMLElement,
  data: LegacyAnnouncements,
  button: HTMLButtonElement,
  panel: HTMLElement,
  viewport: HTMLElement | null
): void {
  let open = false;
  let index = 0;
  const setOpen = (next: boolean) => {
    open = next;
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    root.classList.toggle('is-open', open);
    if (open) panel.focus({ preventScroll: true });
  };

  const showSlide = (nextIndex: number) => {
    if (!viewport || !data.banners.length) return;
    index = (nextIndex + data.banners.length) % data.banners.length;
    viewport.replaceChildren(renderBannerSlide(documentRef, data.banners[index]));
    viewport.dataset.siaseSlide = String(index);
  };

  button.addEventListener('click', () => setOpen(!open));
  panel.querySelector<HTMLElement>('[data-siase-notification-close]')?.addEventListener('click', () => setOpen(false));
  panel.querySelector<HTMLElement>('[data-siase-notification-previous]')?.addEventListener('click', () => {
    showSlide(index - 1);
    data.previousSource?.click();
  });
  panel.querySelector<HTMLElement>('[data-siase-notification-next]')?.addEventListener('click', () => {
    showSlide(index + 1);
    data.nextSource?.click();
  });
  documentRef.addEventListener('click', (event) => {
    if (open && !root.contains(event.target as Node)) setOpen(false);
  }, true);
  documentRef.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      button.focus();
    }
  });
  showSlide(0);
}

export function renderNotificationBell(documentRef: Document, data: LegacyAnnouncements): HTMLElement {
  const root = makeElement(documentRef, 'div', 'siase-v2-notification');
  const panelId = `siase-v2-notification-panel-${++notificationId}`;
  const count = data.notices.length || data.banners.length || data.quickBlocks.length;
  const button = makeElement(documentRef, 'button', 'siase-v2-notification__button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Abrir avisos de interés');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panelId);
  appendSvgBell(documentRef, button);
  const badge = makeElement(documentRef, 'span', 'siase-v2-notification__badge');
  badge.textContent = String(count);
  badge.setAttribute('aria-label', `${count} avisos`);
  button.append(badge);

  const panel = makeElement(documentRef, 'section', 'siase-v2-notification__panel');
  panel.id = panelId;
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', `${panelId}-title`);
  const header = makeElement(documentRef, 'header', 'siase-v2-notification__header');
  const heading = makeElement(documentRef, 'h2');
  heading.id = `${panelId}-title`;
  heading.textContent = 'Avisos de interés';
  const close = makeElement(documentRef, 'button', 'siase-v2-notification__close');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Cerrar avisos de interés');
  close.dataset.siaseNotificationClose = 'true';
  header.append(heading, close);
  panel.append(header);

  const content = makeElement(documentRef, 'div', 'siase-v2-notification__content');
  let carouselViewport: HTMLElement | null = null;
  if (data.banners.length) {
    const section = makeElement(documentRef, 'section', 'siase-v2-notification__section');
    const title = makeElement(documentRef, 'h3');
    title.textContent = 'Banners de interés';
    section.append(title);
    carouselViewport = data.hasCarousel
      ? makeElement(documentRef, 'div', 'siase-v2-notification__viewport')
      : null;
    if (carouselViewport) section.append(carouselViewport);
    if (data.hasCarousel) {
      const previous = makeElement(documentRef, 'button', 'siase-v2-notification__nav');
      previous.type = 'button';
      previous.textContent = 'Previous';
      previous.dataset.siaseNotificationPrevious = 'true';
      const next = makeElement(documentRef, 'button', 'siase-v2-notification__nav');
      next.type = 'button';
      next.textContent = 'Next';
      next.dataset.siaseNotificationNext = 'true';
      section.append(previous, next);
    } else {
      data.banners.forEach((banner) => section.append(renderBannerSlide(documentRef, banner)));
    }
    content.append(section);
  }
  if (data.notices.length) {
    const section = makeElement(documentRef, 'section', 'siase-v2-notification__section');
    const title = makeElement(documentRef, 'h3');
    title.textContent = 'Avisos oficiales';
    section.append(title);
    data.notices.forEach((notice) => section.append(renderNotice(documentRef, notice)));
    content.append(section);
  }
  if (data.quickBlocks.length) {
    const section = makeElement(documentRef, 'section', 'siase-v2-notification__section');
    const title = makeElement(documentRef, 'h3');
    title.textContent = 'Accesos rápidos';
    section.append(title);
    const grid = makeElement(documentRef, 'div', 'siase-v2-notification__quick-grid');
    data.quickBlocks.forEach((block) => grid.append(renderQuickBlock(documentRef, block)));
    section.append(grid);
    content.append(section);
  }
  panel.append(content);
  root.append(button, panel);
  attachNotificationBellBehavior(documentRef, root, data, button, panel, carouselViewport);
  return root;
}
