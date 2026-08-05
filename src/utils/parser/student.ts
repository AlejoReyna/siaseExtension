import type { StudentInfo } from '@/types/student';
import { textContent } from './dom';

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripUiTokens(value: string): string {
  return cleanText(value.replace(/\bm\d+\b/gi, '').replace(/\bmatr[ií]cula\b:?\s*\d*/gi, ''));
}

function labeledValue(text: string, label: RegExp): string | undefined {
  const normalized = cleanText(text);
  const source = label.source.replace(/^\^/, '');
  const boundary =
    '(?=\\s+(?:alumno|nombre|carrera|programa educativo|programa|plan(?: de estudios)?|matr[ií]cula)\\b\\s*:?|$)';
  const match = normalized.match(
    new RegExp(`(?:^|\\s)${source}\\s*:?\\s*(.*?)${boundary}`, label.ignoreCase ? 'i' : '')
  );
  const capturedValue = match?.[match.length - 1];
  const value = capturedValue ? cleanText(capturedValue) : '';
  return value || undefined;
}

function extractName(headerText: string, bodyText: string): string {
  const labeledName =
    labeledValue(bodyText, /^(alumno|nombre)\b/i) ??
    labeledValue(headerText, /^(alumno|nombre)\b/i);
  if (labeledName) return stripUiTokens(labeledName);

  const candidate = headerText
    .split(/\s+-\s+|\s+\|\s+|\n/)
    .map(stripUiTokens)
    .find((part) => /[a-záéíóúñ]/i.test(part) && !/^(matr[ií]cula|plan|carrera)\b/i.test(part));

  return candidate ?? '';
}

function extractMatricula(text: string, leftDocument?: Document): string {
  const normalizeMatricula = (value: string | undefined): string => {
    const normalized = value?.replace(/\s+/g, '').trim() ?? '';
    return /^[a-z0-9-]{4,24}$/i.test(normalized) ? normalized : '';
  };
  const hiddenValue = normalizeMatricula(
    leftDocument?.querySelector<HTMLInputElement>('input[name="HTMLUsuario"]')?.value
  );
  if (hiddenValue) return hiddenValue;

  const leftText =
    (leftDocument?.body as HTMLElement | null)?.innerText ??
    textContent(leftDocument?.body ?? null);
  const visiblePattern = /\bmatr[ií]cula\b\s*:?\s*([a-z0-9-]{4,24})\b/i;
  return normalizeMatricula(leftText.match(visiblePattern)?.[1]) ||
    normalizeMatricula(text.match(visiblePattern)?.[1]);
}

function isInstitutionCandidate(value: string): boolean {
  const normalized = cleanText(value);
  return (
    normalized.length >= 12 &&
    normalized.length <= 120 &&
    normalized.split(' ').length >= 3 &&
    /^universidad\b/i.test(normalized) &&
    !/\b(?:matr[ií]cula|plan|carrera|programa)\b/i.test(normalized)
  );
}

function extractInstitution(topDocument: Document, text: string): string | undefined {
  const labeled = labeledValue(text, /^instituci[oó]n\b/i);
  if (labeled) return labeled;

  const candidates = [
    ...Array.from(
      topDocument.querySelectorAll<HTMLElement>('[data-institution], [itemprop="affiliation"]')
    ).map((element) => textContent(element)),
    ...Array.from(topDocument.querySelectorAll<HTMLElement>('[title], img[alt]')).flatMap(
      (element) => [element.getAttribute('title') ?? '', element.getAttribute('alt') ?? '']
    ),
    ...text.split(/\n| {2,}/)
  ]
    .map(cleanText)
    .filter(Boolean);

  return candidates.find(isInstitutionCandidate);
}

function extractRawProfileText(topDocument: Document): string | undefined {
  const candidates = Array.from(
    topDocument.querySelectorAll<HTMLElement>('tr, td, div, p, section, article')
  )
    .map((element) => cleanText(textContent(element)))
    .filter(
      (value) =>
        /\b(?:nombre|alumno)\b\s*:/i.test(value) &&
        /\b(?:carrera|programa)\b\s*:/i.test(value) &&
        /\bplan(?: de estudios)?\b\s*:/i.test(value)
    )
    .sort((left, right) => left.length - right.length);

  const raw = candidates[0];
  return raw
    ? cleanText(raw.replace(/\bmatr[ií]cula\b\s*:?\s*[a-z0-9-]{4,24}\b/gi, ''))
    : undefined;
}

export function parseStudentInfo(topDocument: Document, leftDocument?: Document): StudentInfo {
  const headerText = textContent(
    topDocument.querySelector('table.MenuLink tr:first-child span.style1')
  );
  const bodyText =
    (topDocument.body as HTMLElement | null)?.innerText?.replace(/\r/g, '').trim() ??
    textContent(topDocument.body);
  const combinedText = `${headerText}\n${bodyText}`;
  const rawProfileText = extractRawProfileText(topDocument);
  const profileText = rawProfileText || combinedText;

  return {
    name: extractName(headerText, profileText),
    matricula: extractMatricula(combinedText, leftDocument),
    program: labeledValue(profileText, /^(carrera|programa educativo|programa)\b/i),
    plan: labeledValue(profileText, /^plan( de estudios)?\b/i),
    institution: extractInstitution(topDocument, combinedText),
    rawProfileText
  };
}
