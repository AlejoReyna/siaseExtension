import { centerLayoutDebugEnabled } from './center-layout-debug';

type FrameSetDebugInfo = {
  index: number;
  rows: string | null;
  cols: string | null;
  outerHTML: string;
};

type FrameDebugInfo = {
  index: number;
  name: string | null;
  src: string | null;
  scrolling: string | null;
};

function snapshotFrameset(rootDocument: Document): {
  url: string;
  framesets: FrameSetDebugInfo[];
  frames: FrameDebugInfo[];
} {
  return {
    url: rootDocument.location?.href ?? 'unknown',
    framesets: Array.from(rootDocument.querySelectorAll<HTMLFrameSetElement>('frameset')).map(
      (frameset, index) => ({
        index,
        rows: frameset.getAttribute('rows'),
        cols: frameset.getAttribute('cols'),
        outerHTML: frameset.outerHTML.slice(0, 240)
      })
    ),
    frames: Array.from(rootDocument.querySelectorAll<HTMLFrameElement>('frame')).map(
      (frame, index) => ({
        index,
        name: frame.getAttribute('name'),
        src: frame.getAttribute('src'),
        scrolling: frame.getAttribute('scrolling')
      })
    )
  };
}

function getFramesetDocument(): Document {
  try {
    return window.top?.document ?? document;
  } catch {
    return document;
  }
}

function sidebarCols(rootDocument: Document): string {
  const width = rootDocument.defaultView?.innerWidth ?? window.innerWidth;
  return width < 760 ? '76,*' : '280,*';
}

function applyFrameGeometry(
  rootDocument: Document,
  rows: string,
  cols: string,
  layout: string
): void {
  const framesets = Array.from(rootDocument.querySelectorAll<HTMLFrameSetElement>('frameset'));
  const topFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="top"]');
  const leftFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="left"]');
  const centerFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="center"]');

  framesets.forEach((frameset) => {
    if (frameset.hasAttribute('rows')) frameset.setAttribute('rows', rows);
    if (frameset.hasAttribute('cols')) frameset.setAttribute('cols', cols);
    frameset.setAttribute('border', '0');
    frameset.setAttribute('frameborder', '0');
    frameset.setAttribute('framespacing', '0');
  });

  topFrame?.setAttribute('scrolling', 'no');
  leftFrame?.setAttribute('scrolling', 'no');
  centerFrame?.setAttribute('scrolling', 'yes');
  rootDocument.documentElement.dataset.siasePlusLayout = layout;
  rootDocument.documentElement.dataset.siasePlusSidebar =
    cols === '76,*' ? 'collapsed' : 'expanded';

  if (centerLayoutDebugEnabled(rootDocument)) {
    try {
      const cw = centerFrame?.contentWindow;
      const cwDoc = centerFrame?.contentDocument;
      console.info('[SIASE Plus][frameset-layout] applyFrameGeometry', {
        layout,
        rows,
        cols,
        rootInnerWidth: rootDocument.defaultView?.innerWidth,
        centerFrameName: centerFrame?.getAttribute('name'),
        centerContentInnerWidth: cw?.innerWidth,
        centerContentInnerHeight: cw?.innerHeight,
        centerContentHasDocument: Boolean(cwDoc),
        datasetSidebar: rootDocument.documentElement.dataset.siasePlusSidebar
      });
    } catch (error) {
      console.warn('[SIASE Plus][frameset-layout] applyFrameGeometry log failed', error);
    }
  }
}

export function logFramesetState(context: string): void {
  let rootDocument: Document | undefined;
  let topAccessError: unknown;

  try {
    rootDocument = getFramesetDocument();
  } catch (error) {
    topAccessError = error;
    rootDocument = document;
  }

  const snapshot = snapshotFrameset(rootDocument);
  console.log(`[SIASE Plus] frameset snapshot: ${context}`, {
    windowName: window.name || '(root/no name)',
    currentHref: location.href,
    isTopWindow: window.top === window,
    topDocumentAccessible: !topAccessError,
    rootHref: snapshot.url,
    framesets: snapshot.framesets,
    frames: snapshot.frames
  });
  console.groupCollapsed(`[SIASE Plus] frameset debug: ${context}`);
  console.log('window.name:', window.name || '(root/no name)');
  console.log('current href:', location.href);
  console.log('is top window:', window.top === window);
  console.log('top document accessible:', !topAccessError);
  if (topAccessError) console.warn('top access error:', topAccessError);
  console.log('root document href:', snapshot.url);
  console.table(snapshot.framesets);
  console.table(snapshot.frames);
  console.groupEnd();
}

function applySafeSingleView(rootDocument: Document): void {
  logFramesetState('before applySafeSingleView');
  applyFrameGeometry(rootDocument, '1,*', sidebarCols(rootDocument), 'single-view-safe');
  logFramesetState('after applySafeSingleView');
}

function trySingleViewOnce(): void {
  const rootDocument = getFramesetDocument();
  logFramesetState('before manual trySingleViewOnce');
  applyFrameGeometry(rootDocument, '1,*', '1,*', 'single-view-probe');
  logFramesetState('after manual trySingleViewOnce');
}

export function collapseLegacyFrames(): void {
  applySafeSingleView(getFramesetDocument());
  ensureResponsiveSidebar(getFramesetDocument());
}

export function keepSingleViewAlive(): void {
  const rootDocument = getFramesetDocument();
  logFramesetState('keepSingleViewAlive start');
  applySafeSingleView(rootDocument);
  ensureResponsiveSidebar(rootDocument);
}

function ensureResponsiveSidebar(rootDocument: Document): void {
  const rootWindow = rootDocument.defaultView;
  if (!rootWindow) return;

  const state = rootWindow as typeof rootWindow & { __SIASE_PLUS_RESPONSIVE_SIDEBAR__?: boolean };
  if (state.__SIASE_PLUS_RESPONSIVE_SIDEBAR__) return;
  state.__SIASE_PLUS_RESPONSIVE_SIDEBAR__ = true;
  rootWindow.addEventListener('resize', () => {
    applyFrameGeometry(rootDocument, '1,*', sidebarCols(rootDocument), 'single-view-safe');
  });
}

(globalThis as { __SIASE_PLUS_LOG_FRAMESET__?: () => void }).__SIASE_PLUS_LOG_FRAMESET__ = () =>
  logFramesetState('manual global debug');
(
  globalThis as { __SIASE_PLUS_TRY_SINGLE_VIEW_ONCE__?: () => void }
).__SIASE_PLUS_TRY_SINGLE_VIEW_ONCE__ = trySingleViewOnce;
