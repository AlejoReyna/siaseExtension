type PortalLayout = {
  rows: string;
  cols: string;
};

function getRootDocument(): Document {
  try {
    return window.top?.document ?? document;
  } catch {
    return document;
  }
}

function getLayout(rootDocument: Document): PortalLayout {
  const width = rootDocument.defaultView?.innerWidth ?? window.innerWidth;
  return {
    rows: '68,*',
    cols: width < 900 ? '220,*' : '264,*'
  };
}

function applyLayout(rootDocument: Document): void {
  const { rows, cols } = getLayout(rootDocument);
  const framesets = Array.from(rootDocument.querySelectorAll<HTMLFrameSetElement>('frameset'));

  framesets.forEach((frameset) => {
    if (frameset.hasAttribute('rows')) frameset.setAttribute('rows', rows);
    if (frameset.hasAttribute('cols')) frameset.setAttribute('cols', cols);
    frameset.setAttribute('border', '0');
    frameset.setAttribute('frameborder', '0');
    frameset.setAttribute('framespacing', '0');
  });

  rootDocument.querySelector<HTMLFrameElement>('frame[name="top"]')?.setAttribute('scrolling', 'no');
  rootDocument.querySelector<HTMLFrameElement>('frame[name="left"]')?.setAttribute('scrolling', 'yes');
  rootDocument.querySelector<HTMLFrameElement>('frame[name="center"]')?.setAttribute('scrolling', 'yes');
  rootDocument.documentElement.dataset.siaseUi = 'v2';
}

function ensureResponsiveLayout(rootDocument: Document): void {
  const rootWindow = rootDocument.defaultView;
  if (!rootWindow) return;

  const state = rootWindow as typeof rootWindow & { __SIASE_V2_LAYOUT__?: boolean };
  if (state.__SIASE_V2_LAYOUT__) return;
  state.__SIASE_V2_LAYOUT__ = true;
  rootWindow.addEventListener('resize', () => applyLayout(rootDocument));
}

export function collapseLegacyFrames(): void {
  const rootDocument = getRootDocument();
  applyLayout(rootDocument);
  ensureResponsiveLayout(rootDocument);
}

export function keepSingleViewAlive(): void {
  collapseLegacyFrames();
}

export function logFramesetState(_context: string): void {
  // Kept as a compatibility export while the old UI modules are retired.
}
