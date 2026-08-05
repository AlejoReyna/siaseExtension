import { createElement } from 'react';
import { SmartSidebar } from '@/components/SmartSidebar';
import { injectReactRoot } from '@/shadow-dom/inject-react-root';
import { parseMenuItems } from '@/utils/parser/menu';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import { collapseLegacyFrames, setSidebarCollapsed } from './single-view-layout';
import { enhancementsEnabled } from '@/utils/enhancements';

const BECAS_PATHS = [
  'bcreq01v2.htm',
  'bcercargadocto05.htm',
  'bccosobe01.htm'
];

function currentCenterUrl(frameDocument: Document): string {
  try {
    const rootDocument = frameDocument.defaultView?.top?.document;
    const centerFrame = rootDocument?.querySelector<HTMLFrameElement>('frame[name="center"]');
    return centerFrame?.contentWindow?.location.href || centerFrame?.src || '';
  } catch {
    return '';
  }
}

export function isBecasPageUrl(value: string): boolean {
  try {
    const pathname = new URL(value, location.origin).pathname.toLowerCase();
    return BECAS_PATHS.some((path) => pathname.endsWith(`/${path}`));
  } catch {
    return false;
  }
}

function removeSidebar(frameDocument: Document): void {
  frameDocument.getElementById('siase-v2-sidebar')?.remove();
}

function watchCenterNavigation(frameDocument: Document): void {
  const frameWindow = frameDocument.defaultView as
    | (Window & { __SIASE_BECAS_WATCHER__?: boolean })
    | null;
  if (!frameWindow || frameWindow.__SIASE_BECAS_WATCHER__) return;
  frameWindow.__SIASE_BECAS_WATCHER__ = true;

  const rootDocument = frameDocument.defaultView?.top?.document;
  const centerFrame = rootDocument?.querySelector<HTMLFrameElement>('frame[name="center"]');
  centerFrame?.addEventListener('load', () => {
    if (isBecasPageUrl(currentCenterUrl(frameDocument))) {
      removeSidebar(frameDocument);
    } else if (!frameDocument.getElementById('siase-v2-sidebar')) {
      void initializeLeftFrame(frameDocument);
    }
  });
}

async function mountSidebar(frameDocument: Document): Promise<void> {
  if (frameDocument.getElementById('siase-v2-sidebar')) return;

  collapseLegacyFrames();
  frameDocument.body.classList.add('siase-v2-left');

  const matricula =
    frameDocument.querySelector<HTMLInputElement>('input[name="HTMLUsuario"]')?.value ?? '';
  if (matricula) {
    const existing = await getStorageValue('studentInfo');
    if (existing?.matricula && existing.matricula !== matricula) {
      await chrome.storage.local.remove(['gradeSnapshot', 'scheduleSlots', 'kardexSnapshot']);
    }
    await setStorageValue('studentInfo', {
      name: existing?.name ?? '',
      ...existing,
      matricula
    });
  }

  const items = parseMenuItems(frameDocument);
  const pinnedIds = (await getStorageValue('pinnedMenuIds')) ?? [];
  await setStorageValue('menuItems', items);
  const rootDocument = frameDocument.defaultView?.top?.document ?? frameDocument;

  injectReactRoot(
    createElement(SmartSidebar, {
      items,
      query: '',
      pinnedIds,
      initialCollapsed: rootDocument.documentElement.dataset.siaseSidebarCollapsed === 'true',
      onQueryChange: () => undefined,
      onToggleCollapsed: (collapsed) => setSidebarCollapsed(rootDocument, collapsed),
      onTogglePinned: (id: string) => {
        void getStorageValue('pinnedMenuIds').then((stored = []) => {
          const next = stored.includes(id)
            ? stored.filter((storedId) => storedId !== id)
            : [...stored, id];
          return setStorageValue('pinnedMenuIds', next);
        });
      }
    }),
    { id: 'siase-v2-sidebar', document: frameDocument }
  );
}

export async function initializeLeftFrame(frameDocument: Document): Promise<void> {
  if (window.name !== 'left') return;
  if (!(await enhancementsEnabled())) return;
  watchCenterNavigation(frameDocument);
  if (isBecasPageUrl(currentCenterUrl(frameDocument))) {
    removeSidebar(frameDocument);
    return;
  }
  await mountSidebar(frameDocument);
}

void initializeLeftFrame(document);
