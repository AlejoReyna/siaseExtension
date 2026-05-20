const DEFAULT_THEME = 'institutional';
const KNOWN_THEMES = new Set(['institutional', 'dark', 'minimal']);

export function normalizeTheme(theme: string | null | undefined): string {
  return theme && KNOWN_THEMES.has(theme) ? theme : DEFAULT_THEME;
}

export function getStoredTheme(frameDocument: Document): string {
  try {
    return normalizeTheme(frameDocument.defaultView?.localStorage.getItem('siase-plus-theme'));
  } catch {
    return DEFAULT_THEME;
  }
}

export function setStoredTheme(frameDocument: Document, theme: string): void {
  try {
    frameDocument.defaultView?.localStorage.setItem('siase-plus-theme', theme);
  } catch {
    // Some portal contexts can disable localStorage; theme still applies for this view.
  }
}

export function applyTheme(frameDocument: Document, theme: string): void {
  const normalizedTheme = normalizeTheme(theme);
  frameDocument.body.dataset.siaseTheme = normalizedTheme;
  setStoredTheme(frameDocument, normalizedTheme);
}

export function applyStoredTheme(frameDocument: Document): void {
  applyTheme(frameDocument, getStoredTheme(frameDocument));
}
