import { enhanceAcademicCreditsPage } from './pages/academic-credits-page';
import { enhanceCareerSelectorPage } from './pages/career-selector-page';
import { enhanceDocumentUploadPage } from './pages/document-upload-page';

export type ServicePageKind = 'career-selector' | 'document-upload' | 'academic-credits';

const SERVICE_ROUTES: ReadonlyArray<{ kind: ServicePageKind; path: string }> = [
  { kind: 'career-selector', path: '/cgi-bin/wspd_cgi.sh/eselcarrera.htm' },
  { kind: 'document-upload', path: '/cgi-bin/deya.sh/ecCargaDocto01.htm' },
  { kind: 'academic-credits', path: '/cgi-bin/wspd_cgi.sh/esCreditoMaterias01.htm' }
];

export function detectServicePage(url: URL): ServicePageKind | null {
  return SERVICE_ROUTES.find(({ path }) => url.pathname === path)?.kind ?? null;
}

function markLegacyState(frameDocument: Document): void {
  const visibleText = frameDocument.body?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (/sesi[oó]n del formulario ha expirado|sesi[oó]n.*inv[aá]lida/i.test(visibleText)) {
    frameDocument.body.classList.add('siase-v2-service-page--session-expired');
  }
  if (/opci[oó]n no disponible|servicio no disponible/i.test(visibleText)) {
    frameDocument.body.classList.add('siase-v2-service-page--unavailable');
  }
}

export function enhanceServicePage(
  frameDocument: Document,
  url = new URL(frameDocument.location.href)
): ServicePageKind | null {
  const kind = detectServicePage(url);
  if (!kind || !frameDocument.body) return null;

  frameDocument.body.classList.add('siase-v2-service-page');
  frameDocument.body.dataset.siaseV2Service = kind;
  markLegacyState(frameDocument);

  if (kind === 'career-selector') enhanceCareerSelectorPage(frameDocument);
  if (kind === 'document-upload') enhanceDocumentUploadPage(frameDocument);
  if (kind === 'academic-credits') enhanceAcademicCreditsPage(frameDocument);
  return kind;
}

void enhanceServicePage(document, new URL(location.href));
