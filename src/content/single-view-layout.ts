type PortalLayout = {
  rows: string;
  cols: string;
};

type SiaseLayoutWindow = Window & {
  __SIASE_V2_LAYOUT__?: boolean;
  __SIASE_V2_SIDEBAR_ANIMATION__?: number;
};

const TOP_NAV_HEIGHT = 70;
const SIDEBAR_WIDTH = 264;
const COLLAPSED_SIDEBAR_WIDTH = 72;
const SIDEBAR_ANIMATION_DURATION = 260;

function getRootDocument(): Document {
  try {
    return window.top?.document ?? document;
  } catch {
    return document;
  }
}

function getSidebarWidth(rootDocument: Document): number {
  return rootDocument.documentElement.dataset.siaseSidebarCollapsed === 'true'
    ? COLLAPSED_SIDEBAR_WIDTH
    : SIDEBAR_WIDTH;
}

function getLayout(rootDocument: Document): PortalLayout {
  return {
    rows: `${TOP_NAV_HEIGHT},*`,
    cols: `${getSidebarWidth(rootDocument)},*`
  };
}

function applyLayout(rootDocument: Document): void {
  const { rows, cols } = getLayout(rootDocument);
  const framesets = Array.from(rootDocument.querySelectorAll<HTMLFrameSetElement>('frameset'));

  framesets.forEach((frameset) => {
    if (frameset.hasAttribute('rows') && !frameset.dataset.siaseV2OriginalRows) {
      frameset.dataset.siaseV2OriginalRows = frameset.getAttribute('rows') ?? '';
    }
    if (frameset.hasAttribute('cols') && !frameset.dataset.siaseV2OriginalCols) {
      frameset.dataset.siaseV2OriginalCols = frameset.getAttribute('cols') ?? '';
    }
    frameset.setAttribute('border', '0');
    frameset.setAttribute('frameborder', '0');
    frameset.setAttribute('framespacing', '0');
  });

  framesets.forEach((frameset) => {
    if (frameset.hasAttribute('rows')) frameset.setAttribute('rows', rows);
    if (frameset.hasAttribute('cols')) frameset.setAttribute('cols', cols);
  });

  rootDocument.querySelector<HTMLFrameElement>('frame[name="top"]')?.setAttribute('scrolling', 'no');
  rootDocument.querySelector<HTMLFrameElement>('frame[name="left"]')?.setAttribute('scrolling', 'yes');
  rootDocument.querySelector<HTMLFrameElement>('frame[name="center"]')?.setAttribute('scrolling', 'yes');
  rootDocument.documentElement.dataset.siaseUi = 'v2';
}

export function restoreLegacyFrames(): void {
  const rootDocument = getRootDocument();
  const framesets = Array.from(rootDocument.querySelectorAll<HTMLFrameSetElement>('frameset'));
  framesets.forEach((frameset) => {
    if (frameset.dataset.siaseV2OriginalRows !== undefined) {
      frameset.setAttribute('rows', frameset.dataset.siaseV2OriginalRows);
    }
    if (frameset.dataset.siaseV2OriginalCols !== undefined) {
      frameset.setAttribute('cols', frameset.dataset.siaseV2OriginalCols);
    }
  });
  delete rootDocument.documentElement.dataset.siaseUi;
  delete rootDocument.documentElement.dataset.siaseSidebarCollapsed;
  delete rootDocument.documentElement.dataset.siaseSidebarAnimating;
}

function ensureResponsiveLayout(rootDocument: Document): void {
  const rootWindow = rootDocument.defaultView;
  if (!rootWindow) return;

  const state = rootWindow as SiaseLayoutWindow;
  if (state.__SIASE_V2_LAYOUT__) return;
  state.__SIASE_V2_LAYOUT__ = true;
  rootWindow.addEventListener('resize', () => {
    if (state.__SIASE_V2_SIDEBAR_ANIMATION__ === undefined) applyLayout(rootDocument);
  });
}

export function collapseLegacyFrames(): void {
  const rootDocument = getRootDocument();
  rootDocument.documentElement.classList.remove('siase-v2-career-selector-root');
  if (!rootDocument.documentElement.dataset.siaseSidebarCollapsed) {
    rootDocument.documentElement.dataset.siaseSidebarCollapsed = 'true';
  }
  applyLayout(rootDocument);
  ensureResponsiveLayout(rootDocument);
}

export function setSidebarCollapsed(rootDocument: Document, collapsed: boolean): void {
  const rootWindow = rootDocument.defaultView as SiaseLayoutWindow | null;
  const leftFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="left"]');
  const columnFrameset =
    leftFrame?.closest<HTMLFrameSetElement>('frameset[cols]') ??
    rootDocument.querySelector<HTMLFrameSetElement>('frameset[cols]');
  const startWidth = leftFrame?.getBoundingClientRect().width ?? getSidebarWidth(rootDocument);

  rootDocument.documentElement.dataset.siaseSidebarCollapsed = String(collapsed);
  const targetWidth = getSidebarWidth(rootDocument);

  if (rootWindow?.__SIASE_V2_SIDEBAR_ANIMATION__ !== undefined) {
    rootWindow.cancelAnimationFrame(rootWindow.__SIASE_V2_SIDEBAR_ANIMATION__);
    rootWindow.__SIASE_V2_SIDEBAR_ANIMATION__ = undefined;
  }

  if (
    !rootWindow ||
    !columnFrameset ||
    Math.abs(targetWidth - startWidth) < 1 ||
    rootWindow.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    delete rootDocument.documentElement.dataset.siaseSidebarAnimating;
    applyLayout(rootDocument);
    return;
  }

  const startTime = rootWindow.performance.now();
  rootDocument.documentElement.dataset.siaseSidebarAnimating = 'true';

  const animate = (now: number): void => {
    const progress = Math.min((now - startTime) / SIDEBAR_ANIMATION_DURATION, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentWidth = startWidth + (targetWidth - startWidth) * easedProgress;
    columnFrameset.setAttribute('cols', `${Math.round(currentWidth)},*`);

    if (progress < 1) {
      rootWindow.__SIASE_V2_SIDEBAR_ANIMATION__ = rootWindow.requestAnimationFrame(animate);
      return;
    }

    rootWindow.__SIASE_V2_SIDEBAR_ANIMATION__ = undefined;
    delete rootDocument.documentElement.dataset.siaseSidebarAnimating;
    applyLayout(rootDocument);
  };

  rootWindow.__SIASE_V2_SIDEBAR_ANIMATION__ = rootWindow.requestAnimationFrame(animate);
}

export function keepSingleViewAlive(): void {
  collapseLegacyFrames();
}

export function logFramesetState(_context: string): void {
  // Kept as a compatibility export while the old UI modules are retired.
}
