import { applyStoredTheme } from '../theme';

export function enhanceGymReservationPage(frameDocument: Document): void {
  frameDocument.body.classList.add('siase-plus-center', 'siase-plus-gym-reservation-page');
  applyStoredTheme(frameDocument);
}

enhanceGymReservationPage(document);
