import { initializeCenterGameUi } from './center-ui';
import { collapseLegacyFrames, logFramesetState } from './single-view-layout';
import { enhancementsEnabled } from '@/utils/enhancements';

export async function initializeCenterFrame(frameDocument: Document): Promise<void> {
  if (window.name !== 'center') return;
  if (!(await enhancementsEnabled())) return;
  logFramesetState('center-frame initialize');
  collapseLegacyFrames();
  initializeCenterGameUi(frameDocument);
}
void initializeCenterFrame(document);
