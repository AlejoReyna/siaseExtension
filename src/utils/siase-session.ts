import { extractPortalSession } from './siase-url';

const SIASE_ORIGIN = 'https://deimos.dgi.uanl.mx';

export function extractSiaseSessionParams(rootDocument: Document): Record<string, string> | undefined {
  const topFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="top"]');
  const src = topFrame?.src ?? topFrame?.getAttribute('src') ?? '';
  if (!src) return undefined;

  try {
    const params = extractPortalSession(new URL(src, SIASE_ORIGIN)).params;
    return params.HTMLtrim ? params : undefined;
  } catch {
    return undefined;
  }
}
