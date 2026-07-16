import { createElement } from 'react';
import { SmartSidebar } from '@/components/SmartSidebar';
import { injectReactRoot } from '@/shadow-dom/inject-react-root';
import { parseMenuItems } from '@/utils/parser/menu';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import { collapseLegacyFrames } from './single-view-layout';

export async function initializeLeftFrame(frameDocument: Document): Promise<void> {
  if (window.name !== 'left') return;

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

  injectReactRoot(
    createElement(SmartSidebar, {
      items,
      query: '',
      pinnedIds,
      onQueryChange: () => undefined,
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

void initializeLeftFrame(document);
