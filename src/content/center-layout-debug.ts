/**
 * Layout / visibility diagnostics for the center frame SIASE Plus shell.
 * Greppable prefix: `[SIASE Plus][center-layout]`.
 *
 * Call from DevTools inside the center frame after setting:
 *   localStorage.setItem('siase-plus-debug-layout', '1')
 * Logs run every time snapshots fire; omit the key or set to anything else to reduce noise (see callers).
 */

const PREFIX = '[SIASE Plus][center-layout]';

function legacyGreetingSnippet(doc: Document, maxLen = 200): string {
  try {
    const tree = doc.body?.innerText ?? '';
    const match = tree.match(/¡\s*hola[^\n]{0,80}/iu);
    if (match)
      return `matched in body.innerText: ${match[0].slice(0, maxLen)}`;
    if (/hola/i.test(tree)) return 'contains "hola" somewhere in body.innerText (no exact ¡Hola match)';
    return 'no obvious Hola greeting in body.innerText';
  } catch {
    return '(could not read body.innerText)';
  }
}

export function centerLayoutDebugEnabled(doc: Document): boolean {
  try {
    const w = doc.defaultView;
    return (
      w?.localStorage?.getItem('siase-plus-debug-layout') === '1' ||
      w?.sessionStorage?.getItem('siase-plus-debug-layout') === '1'
    );
  } catch {
    return false;
  }
}

export function logCenterLayoutSnapshot(frameDocument: Document, phase: string): void {
  const win = frameDocument.defaultView;
  if (!win) return;

  const body = frameDocument.body;
  const shell = frameDocument.getElementById('siase-plus-shell');
  const identity = shell?.querySelector<HTMLElement>('.siase-dashboard__identity');
  const greeting = shell?.querySelector<HTMLElement>('.siase-dashboard__greeting');
  const main = shell?.querySelector<HTMLElement>('.siase-dashboard__main');
  const quick = shell?.querySelector<HTMLElement>('.siase-quick-panel');
  const primary = shell?.querySelector<HTMLElement>('.siase-dashboard__primary');

  const identityStyle = identity ? win.getComputedStyle(identity) : null;
  const identityRect = identity?.getBoundingClientRect();

  const bodyChildren = Array.from(body.children)
    .filter((n): n is HTMLElement => n instanceof HTMLElement)
    .map((el, index) => {
      const cs = win.getComputedStyle(el);
      return {
        index,
        tag: el.tagName,
        id: el.id || '(none)',
        class: (el.className?.toString() ?? '').slice(0, 140),
        display: cs.display,
        visibility: cs.visibility,
        offsetHeight: el.offsetHeight,
        offsetWidth: el.offsetWidth,
        offsetTop: el.offsetTop,
        isShell: el.id === 'siase-plus-shell'
      };
    });

  console.info(`${PREFIX} snapshot — ${phase}`, {
    phase,
    href: win.location.href,
    pathname: win.location.pathname,
    windowName: win.name || '(empty)',
    innerWidth: win.innerWidth,
    innerHeight: win.innerHeight,
    bodyClass: body.className,
    mainCenterMode: body.classList.contains('siase-plus-main-center'),
    mainCenterHidesLegacySiblings:
      'body.siase-plus-center.siase-plus-main-center > :not(#siase-plus-shell) { display:none }',
    shell: shell
      ? {
          overflow: win.getComputedStyle(shell).overflow,
          overflowY: win.getComputedStyle(shell).overflowY,
          flexDirection: win.getComputedStyle(shell).flexDirection,
          clientHeight: shell.clientHeight,
          scrollHeight: shell.scrollHeight,
          offsetHeight: shell.offsetHeight,
          rect: shell.getBoundingClientRect()
        }
      : null,
    dashboardMain: main
      ? {
          display: win.getComputedStyle(main).display,
          gridTemplateColumns: win.getComputedStyle(main).gridTemplateColumns,
          columnGap: win.getComputedStyle(main).columnGap,
          clientHeight: main.clientHeight,
          scrollHeight: main.scrollHeight,
          rect: main.getBoundingClientRect()
        }
      : null,
    quickPanel: quick
      ? {
          display: win.getComputedStyle(quick).display,
          clientHeight: quick.clientHeight,
          scrollHeight: quick.scrollHeight,
          rect: quick.getBoundingClientRect()
        }
      : null,
    primaryColumn: primary
      ? {
          display: win.getComputedStyle(primary).display,
          clientHeight: primary.clientHeight,
          rect: primary.getBoundingClientRect()
        }
      : null,
    identityInShell: identity
      ? {
          display: identityStyle?.display,
          visibility: identityStyle?.visibility,
          opacity: identityStyle?.opacity,
          hiddenAttr: identity.hasAttribute('hidden'),
          hiddenProp: identity.hidden,
          rect: { w: identityRect?.width, h: identityRect?.height, top: identityRect?.top },
          textPreview: identity.innerText.replace(/\s+/g, ' ').trim().slice(0, 160)
        }
      : null,
    greetingHeading: greeting
      ? {
          display: win.getComputedStyle(greeting).display,
          visibility: win.getComputedStyle(greeting).visibility,
          text: (greeting.textContent ?? '').trim().slice(0, 80)
        }
      : null,
    bodyChildSummaries: bodyChildren,
    legacyVisibilityNote: legacyGreetingSnippet(frameDocument)
  });

  console.groupCollapsed(`${PREFIX} body children (${phase})`);
  console.table(bodyChildren);
  console.groupEnd();
}

/** Manual hook: in the center frame console run `window.__SIASE_PLUS_LOG_LAYOUT__()`. */
export function exposeCenterLayoutDebug(frameDocument: Document): void {
  const w = frameDocument.defaultView as
    | (Window & {
        __SIASE_PLUS_LOG_LAYOUT__?: () => void;
      })
    | null;
  if (!w) return;
  if (typeof w.__SIASE_PLUS_LOG_LAYOUT__ === 'function') return;
  w.__SIASE_PLUS_LOG_LAYOUT__ = (): void =>
    logCenterLayoutSnapshot(frameDocument, 'manual __SIASE_PLUS_LOG_LAYOUT__');
}
