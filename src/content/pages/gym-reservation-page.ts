import { applyStoredTheme } from '../theme';
import { enhancementsEnabled } from '@/utils/enhancements';

export function enhanceGymReservationPage(frameDocument: Document): void {
  frameDocument.body.classList.add('siase-plus-center', 'siase-plus-gym-reservation-page');
  applyStoredTheme(frameDocument);
}

void enhancementsEnabled().then((enabled) => {
  if (enabled) enhanceGymReservationPage(document);
});
