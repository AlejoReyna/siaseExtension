import { getStorageValue, setStorageValue } from '@/utils/storage';
import { extractSiaseSessionParams } from '@/utils/siase-session';
import { keepSingleViewAlive, logFramesetState } from './single-view-layout';
import { scheduleDebug, scheduleDebugError } from '@/utils/debug';
import { enhancementsEnabled } from '@/utils/enhancements';
import { restoreLegacyFrames } from './single-view-layout';

let lastSessionParamsSerialized = '';

async function captureSiaseSessionParams(): Promise<void> {
  const params = extractSiaseSessionParams(document);
  scheduleDebug('session:capture', {
    found: Boolean(params),
    hasHTMLtrim: Boolean(params?.HTMLtrim),
    keys: Object.keys(params ?? {}).join(',')
  });
  if (!params) return;
  try {
    const nextSerialized = JSON.stringify(Object.entries(params).sort());
    if (nextSerialized === lastSessionParamsSerialized) {
      scheduleDebug('session:capture:unchanged');
      return;
    }
    lastSessionParamsSerialized = nextSerialized;
    const previous = await getStorageValue('siaseSessionParams');
    const previousSerialized = JSON.stringify(Object.entries(previous ?? {}).sort());
    if (previousSerialized === nextSerialized) {
      scheduleDebug('session:capture:unchanged');
      return;
    }
    await setStorageValue('siaseSessionParams', params);
    scheduleDebug('session:save:changed', { keys: Object.keys(params).join(',') });
  } catch (error) {
    lastSessionParamsSerialized = '';
    scheduleDebugError('session:save:error', error);
  }
}

export async function initializeFramesetInjector(): Promise<void> {
  document.documentElement.dataset.siasePlus = 'ready';
  if (!(await enhancementsEnabled())) {
    restoreLegacyFrames();
    return;
  }
  logFramesetState('frameset-injector document_start');
  keepSingleViewAlive();
  void captureSiaseSessionParams();
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      logFramesetState('frameset-injector DOMContentLoaded');
      void captureSiaseSessionParams();
      keepSingleViewAlive();
    },
    { once: true },
  );
  window.addEventListener(
    'load',
    () => {
      logFramesetState('frameset-injector load');
      void captureSiaseSessionParams();
      keepSingleViewAlive();
    },
    { once: true },
  );
}
void initializeFramesetInjector();
