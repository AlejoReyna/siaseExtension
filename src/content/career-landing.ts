import type {
  NexusApiRequestMessage,
  NexusApiResponseMessage,
  NexusPortalRequestMessage
} from '@/types/chrome-messages';
import type { MenuItem } from '@/types/menu';
import { parseMenuItems } from '@/utils/parser/menu';
import { parseKardexSummary } from '@/utils/parser/kardex';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import { applyStoredTheme } from './theme';

const PANEL_IDS = ['siase', 'correo', 'nexus', 'codice'] as const;
type PanelId = (typeof PANEL_IDS)[number];
const SIASE_CONTENT_FRAME_NAME = 'siase-career-content-frame';

const NEXUS_API_BASE = 'https://api.nexus.uanl.mx/WebApi';
const NEXUS_CACHE_KEY = 'siase_nexus_widget_cache';
const NEXUS_CACHE_TTL = 60 * 60 * 1000;

const KARDEX_URL = 'https://deimos.dgi.uanl.mx/cgi-bin/wspd_cgi.sh/econkdx01.htm';
const KARDEX_BG_FRAME_NAME = 'siase-plus-kardex-bg-frame';
const KARDEX_CACHE_TTL = 60 * 60 * 1000; // 1 hora
const KARDEX_LOAD_TIMEOUT_MS = 15_000;

/** Margen de seguridad: invalidar 2 min antes de que Nexus expire la sesión */
const NEXUS_TOKEN_EXPIRY_MARGIN_MS = 2 * 60 * 1000;
/** Fallback conservador cuando la sesión no trae FechaInicio/TiempoRestante */
const NEXUS_TOKEN_TTL_FALLBACK = 4 * 60 * 60 * 1000;
const NEXUS_LOG_PREFIX = '[SIASE Plus Nexus]';

interface NexusSessionStorage {
  Sesion?: {
    Token?: string;
    AreaAcademicaId?: string | number;
    RolId?: string | number;
    SistemaId?: string | number;
    /** Campos que Nexus incluye en la sesión y nos permiten calcular el TTL exacto */
    FechaInicio?: string;
    TiempoRestante?: number;
  };
  _cachedAt?: number;
}

type NexusSession = NonNullable<NexusSessionStorage['Sesion']>;
type SiaseCredentialMap = Record<string, string>;
type SiasePayload = Record<string, string | number>;
interface SiasePayloadCandidate {
  label: string;
  payload: SiasePayload;
}
interface NexusPortalLaunchResponse {
  url?: string;
  redirected?: boolean;
  body?: string;
}
interface CapturedNexusSessionResponse {
  nexusSessionStorage?: NexusSessionStorage;
  nexusSessionCapturedAt?: number;
}

interface NexusAuthResult {
  token: string;
  areaAcademicaId?: string | number;
  rolId: string | number;
}

interface NexusCourse {
  CursoId?: number;
  Id?: number;
  id?: number;
  Nombre?: string;
  NombreCurso?: string;
  Descripcion?: string;
}

interface NexusCoursesResponse {
  Carpetas?: Array<{
    Cursos?: NexusCourse[];
  }>;
  /** Código de error de aplicación que Nexus devuelve con HTTP 200 cuando la sesión expiró */
  Code?: number;
  Message?: string;
}

interface NexusEvidence {
  EvidenciaId?: number;
  Id?: number;
  Descripcion?: string;
  Nombre?: string;
  Titulo?: string;
  FechaFin?: string;
  FechaLimite?: string;
  FechaCierre?: string;
  FechaVencimiento?: string;
  Valor?: number;
}

interface NexusStructureResponse {
  Estructura?: {
    Etapas?: Array<{
      Evidencias?: NexusEvidence[];
    }>;
  };
}

interface NexusActivity {
  materia: string;
  actividad: string;
  fechaLimite: Date;
  valor?: number;
  evidenciaId?: number;
  diasRestantes: number;
  esHoy: boolean;
}

type NexusCachedActivity = Omit<NexusActivity, 'fechaLimite'> & { fechaLimite: string };

class NexusAuthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NexusAuthError';
    this.status = status;
  }
}

function iconMarkup(name: string): string {
  const icons: Record<string, string> = {
    badge: '<path d="M8.6 14.2 11 16.6l4.8-5.2"/><path d="m12 2 2.4 2.1 3.2-.3.7 3.1 2.7 1.7-1.3 2.9 1.3 2.9-2.7 1.7-.7 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.7-3.1L3 15.4l1.3-2.9L3 9.6l2.7-1.7.7-3.1 3.2.3L12 2Z"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z"/><path d="M8 7h6M8 11h8"/>',
    calendar:
      '<path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 13h.01M12 13h.01M16 13h.01"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m14 18-6-6 6-6"/>',
    chevronRight: '<path d="m10 18 6-6-6-6"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    mail: '<path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6M13 21h6a2 2 0 0 0 2-2"/>',
    receipt: '<path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    services:
      '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/>',
    shield: '<path d="M12 3 5 6v5c0 4.4 2.8 8.3 7 10 4.2-1.7 7-5.6 7-10V6l-7-3Z"/><path d="m8 12 3 3 5-6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    video: '<path d="M15 10 21 6v12l-6-4"/><rect x="3" y="6" width="12" height="12" rx="2"/>'
  };

  return `<svg class="siase-career-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] ?? icons.services}</svg>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function logNexus(level: 'debug' | 'info' | 'warn' | 'error', message: string, details?: unknown): void {
  const logger = console[level] ?? console.log;
  if (details === undefined) {
    logger(`${NEXUS_LOG_PREFIX} ${message}`);
    return;
  }

  logger(`${NEXUS_LOG_PREFIX} ${message}`, details);
}

function summarizePayload(payload: SiasePayload): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (/token|clave|password|contrasena|contraseña/i.test(key)) {
        return [key, '[redacted]'];
      }

      return [key, value];
    })
  );
}

function endpointName(url: string): string {
  return url.replace(NEXUS_API_BASE, '').replace(/^\//, '');
}

function normalizedKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function firstCredential(credentials: SiaseCredentialMap, patterns: RegExp[]): string | undefined {
  const entry = Object.entries(credentials).find(([key, value]) => {
    const normalized = normalizedKey(key);
    return Boolean(value) && patterns.some((pattern) => pattern.test(normalized));
  });

  return entry?.[1];
}

function rememberCredential(
  credentials: SiaseCredentialMap,
  key: string | null | undefined,
  value: string | null | undefined
): void {
  const cleanKey = key?.trim();
  const cleanValue = value?.trim();
  if (!cleanKey || !cleanValue || cleanValue.length > 500) return;
  credentials[cleanKey] = cleanValue;
}

function collectWindowCredentials(frameWindow: Window, credentials: SiaseCredentialMap): void {
  Object.keys(frameWindow)
    .filter((key) => /vlg|token|siase|matricula|clave|password|area/i.test(key))
    .forEach((key) => {
      const value = (frameWindow as unknown as Record<string, unknown>)[key];
      if (['string', 'number'].includes(typeof value)) {
        rememberCredential(credentials, key, String(value));
      }
    });
}

function collectFormCredentials(frameDocument: Document, credentials: SiaseCredentialMap): void {
  frameDocument
    .querySelectorAll<HTMLInputElement>(
      '#idfrNexus input, form input[type="hidden"], form input[name], form textarea[name], form select[name]'
    )
    .forEach((input) => {
      rememberCredential(credentials, input.name || input.id, input.value);
    });

  frameDocument.querySelectorAll<HTMLFormElement>('form').forEach((form) => {
    const action = form.getAttribute('action');
    if (!action) return;

    try {
      const url = new URL(action, frameDocument.location.href);
      url.searchParams.forEach((value, key) => rememberCredential(credentials, key, value));
    } catch {
      // Los actions legacy pueden no ser URLs completas; simplemente se ignoran.
    }
  });
}

function collectCookieCredentials(frameDocument: Document, credentials: SiaseCredentialMap): void {
  frameDocument.cookie.split(';').forEach((cookie) => {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) return;
    const key = cookie.slice(0, separatorIndex).trim();
    const value = decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
    if (/token|siase|matricula|clave|session|sesion/i.test(key)) {
      rememberCredential(credentials, key, value);
    }
  });
}

function collectInlineScriptCredentials(frameDocument: Document, credentials: SiaseCredentialMap): void {
  const assignmentPattern =
    /\b((?:vlg)?[A-Za-z_$][\w$]*(?:Token|SIASE|Siase|Matricula|Clave|Password|Area|Sesion|Session)[\w$]*)\s*=\s*(['"])(.*?)\2/gi;
  const objectPropertyPattern =
    /['"]?([A-Za-z_$][\w$]*(?:Token|SIASE|Siase|Matricula|Clave|Password|Area|Sesion|Session)[\w$]*)['"]?\s*:\s*(['"])(.*?)\2/gi;

  frameDocument.querySelectorAll<HTMLScriptElement>('script:not([src])').forEach((script) => {
    const source = script.textContent ?? '';
    [assignmentPattern, objectPropertyPattern].forEach((pattern) => {
      pattern.lastIndex = 0;
      let match = pattern.exec(source);
      while (match) {
        rememberCredential(credentials, match[1], match[3]);
        match = pattern.exec(source);
      }
    });
  });
}

function collectCredentialsFromText(source: string, credentials: SiaseCredentialMap): void {
  const urlPattern = /[?&]([^=&#\s]+)=([^&#\s]+)/g;
  const assignmentPattern =
    /\b((?:vlg)?[A-Za-z_$][\w$]*(?:Token|SIASE|Siase|Matricula|Clave|Password|Area|Sesion|Session)[\w$]*)\s*[:=]\s*(['"])(.*?)\2/gi;

  let urlMatch = urlPattern.exec(source);
  while (urlMatch) {
    try {
      rememberCredential(credentials, decodeURIComponent(urlMatch[1]), decodeURIComponent(urlMatch[2]));
    } catch {
      rememberCredential(credentials, urlMatch[1], urlMatch[2]);
    }
    urlMatch = urlPattern.exec(source);
  }

  let assignmentMatch = assignmentPattern.exec(source);
  while (assignmentMatch) {
    rememberCredential(credentials, assignmentMatch[1], assignmentMatch[3]);
    assignmentMatch = assignmentPattern.exec(source);
  }
}

function buildPayloadCandidatesFromCredentials(
  credentials: SiaseCredentialMap,
  sourceLabel: string
): SiasePayloadCandidate[] {
  const token = firstCredential(credentials, [
    /token.*siase/,
    /siase.*token/,
    /^vlgtoken/,
    /^token$/,
    /token/
  ]);
  const matricula = firstCredential(credentials, [/matricula/, /^vlgmat/, /^mat$/]);
  const clave = firstCredential(credentials, [/clave/, /password/, /contrasena/, /passwd/, /^vlgcla/]);
  const candidates: SiasePayloadCandidate[] = [];

  if (token) candidates.push({ label: `${sourceLabel}:token-siase`, payload: { Token: token, SistemaId: 1 } });
  if (matricula && clave) {
    candidates.push({
      label: `${sourceLabel}:matricula-clave`,
      payload: { Matricula: matricula, Clave: clave, SistemaId: 1 }
    });
  }

  return candidates;
}

function parseNexusLoginParams(action: string): URLSearchParams {
  const params = new URLSearchParams();

  try {
    const url = new URL(action);
    url.searchParams.forEach((value, key) => params.set(key, value));

    const hashQueryIndex = url.hash.indexOf('?');
    if (hashQueryIndex >= 0) {
      const hashParams = new URLSearchParams(url.hash.slice(hashQueryIndex + 1));
      hashParams.forEach((value, key) => params.set(key, value));
    }
  } catch {
    const queryIndex = action.indexOf('?');
    if (queryIndex >= 0) {
      new URLSearchParams(action.slice(queryIndex + 1)).forEach((value, key) =>
        params.set(key, value)
      );
    }
  }

  return params;
}

function buildPayloadCandidatesFromNexusLoginAction(
  action: string,
  sourceLabel: string
): SiasePayloadCandidate[] {
  const params = parseNexusLoginParams(action);
  const token =
    params.get('Token') ||
    params.get('HTMLToken') ||
    params.get('token') ||
    params.get('HTMLTokenSIASE');
  const usuario = params.get('Usu') || params.get('Usuario') || params.get('HTMLUsu');
  const nombreUsuario = params.get('HTMLUsuario') || params.get('NombreUsuario');
  const tipoClave = params.get('HTMLTipCve') || params.get('TipoClave');
  const candidates: SiasePayloadCandidate[] = [];

  logNexus('info', 'parametros LoginSIASE detectados', {
    sourceLabel,
    keys: Array.from(params.keys()),
    hasToken: Boolean(token),
    hasUsuario: Boolean(usuario),
    hasNombreUsuario: Boolean(nombreUsuario),
    hasTipoClave: Boolean(tipoClave)
  });

  if (!token) return candidates;

  if (usuario || nombreUsuario || tipoClave) {
    candidates.push({
      label: `${sourceLabel}:login-siase-nexus`,
      payload: {
        Token: token,
        Usuario: usuario || '',
        NombreUsuario: nombreUsuario || '',
        TipoClave: tipoClave || '',
        SistemaId: 1
      }
    });
    candidates.push({
      label: `${sourceLabel}:login-siase-html`,
      payload: {
        Token: token,
        Usu: usuario || '',
        HTMLUsuario: nombreUsuario || '',
        HTMLTipCve: tipoClave || '',
        SistemaId: 1
      }
    });
  }

  candidates.push({ label: `${sourceLabel}:token-siase`, payload: { Token: token, SistemaId: 1 } });
  return candidates;
}

function nexusPortalRequestUrl(frameDocument: Document): { url: string; method: 'GET' | 'POST'; body?: string } | null {
  const form = frameDocument.querySelector<HTMLFormElement>('#idfrNexus');
  if (!form) {
    logNexus('warn', 'no se encontro form #idfrNexus');
    return null;
  }

  const action = new URL(form.getAttribute('action') || frameDocument.location.href, frameDocument.location.href);
  const method = (form.getAttribute('method') || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET';
  const params = new URLSearchParams();

  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name], select[name], textarea[name]').forEach((input) => {
    const value = input instanceof HTMLInputElement && input.type === 'button' ? input.value : input.value;
    params.set(input.name, value);
  });

  if (!params.has('btnNexus')) params.set('btnNexus', 'Ingresar');

  logNexus('info', 'form #idfrNexus detectado', {
    action: action.toString(),
    method,
    target: form.getAttribute('target'),
    paramKeys: Array.from(params.keys())
  });

  if (method === 'GET') {
    params.forEach((value, key) => action.searchParams.set(key, value));
    return { url: action.toString(), method };
  }

  return { url: action.toString(), method, body: params.toString() };
}

function submitNexusFormInHiddenFrame(frameDocument: Document): void {
  const form = frameDocument.querySelector<HTMLFormElement>('#idfrNexus');
  if (!form) {
    logNexus('warn', 'no se puede abrir Nexus oculto: falta #idfrNexus');
    return;
  }
  const button = form.querySelector<HTMLInputElement | HTMLButtonElement>('[name="btnNexus"]');
  if (!button) {
    logNexus('warn', 'no se puede abrir Nexus oculto: falta boton btnNexus');
    return;
  }

  const frameWindow = frameDocument.defaultView ?? window;
  const iframeName = 'siase-plus-nexus-auth-frame';
  let iframe = frameDocument.querySelector<HTMLIFrameElement>(`iframe[name="${iframeName}"]`);
  if (!iframe) {
    iframe = frameDocument.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:0;';
    iframe.setAttribute('aria-hidden', 'true');
    frameDocument.body.append(iframe);
  }

  const previousTarget = form.getAttribute('target');
  logNexus('info', 'submit Nexus oculto iniciado', {
    action: form.action,
    method: form.method,
    previousTarget,
    target: iframeName,
    buttonType: 'type' in button ? button.type : 'button',
    hasInlineOnclick: Boolean(button.getAttribute('onclick')),
    fieldNames: Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name], select[name], textarea[name]')).map(
      (input) => input.name
    )
  });

  form.setAttribute('target', iframeName);
  button.click();

  const loginActionPayloads = buildPayloadCandidatesFromNexusLoginAction(
    form.action,
    'form-action-after-click'
  );
  if (loginActionPayloads.length) {
    frameWindow.sessionStorage.setItem(
      'siase_nexus_login_payload_candidates',
      JSON.stringify(loginActionPayloads)
    );
    logNexus(
      'info',
      'payloads detectados desde action Nexus despues del click',
      loginActionPayloads.map((candidate) => ({
        label: candidate.label,
        body: summarizePayload(candidate.payload)
      }))
    );
  }

  frameWindow.setTimeout(() => {
    if (previousTarget === null) {
      form.removeAttribute('target');
    } else {
      form.setAttribute('target', previousTarget);
    }
  }, 1500);
}

function readNexusLoginPayloadCandidates(frameWindow: Window): SiasePayloadCandidate[] {
  const raw = frameWindow.sessionStorage.getItem('siase_nexus_login_payload_candidates');
  if (!raw) return [];

  try {
    const candidates = JSON.parse(raw) as SiasePayloadCandidate[];
    return candidates.filter((candidate) => candidate.label && candidate.payload);
  } catch {
    return [];
  }
}

async function leerSesionNexusCapturada(): Promise<NexusSessionStorage | null> {
  if (!chrome.runtime?.id) return null;

  const response = (await chrome.runtime.sendMessage({
    type: 'GET_CAPTURED_NEXUS_SESSION'
  })) as NexusApiResponseMessage;
  const data = response.data as CapturedNexusSessionResponse | undefined;
  const session = data?.nexusSessionStorage;
  const token = session?.Sesion?.Token;

  logNexus(response.ok ? 'info' : 'debug', 'lectura sesion Nexus capturada', {
    ok: response.ok,
    capturedAt: data?.nexusSessionCapturedAt,
    hasToken: Boolean(token)
  });

  return token ? session : null;
}

async function obtenerSesionDesdeIframeNexus(frameDocument: Document): Promise<NexusAuthResult | null> {
  const frameWindow = frameDocument.defaultView ?? window;
  submitNexusFormInHiddenFrame(frameDocument);

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    await new Promise((resolve) => frameWindow.setTimeout(resolve, 750));
    const session = await leerSesionNexusCapturada();
    if (!session?.Sesion?.Token) continue;

    guardarSesionNexus(frameWindow, session.Sesion);
    logNexus('info', 'sesion Nexus capturada via iframe', {
      attempt,
      areaAcademicaId: session.Sesion.AreaAcademicaId,
      rolId: session.Sesion.RolId ?? 5,
      token: '[redacted]'
    });

    return {
      token: session.Sesion.Token,
      areaAcademicaId: session.Sesion.AreaAcademicaId,
      rolId: session.Sesion.RolId ?? 5
    };
  }

  logNexus('warn', 'no se capturo sesion Nexus despues del iframe oculto');
  return null;
}

async function obtenerPayloadsDesdePortalNexus(frameDocument: Document): Promise<SiasePayloadCandidate[]> {
  const launch = nexusPortalRequestUrl(frameDocument);
  if (!launch || !chrome.runtime?.id) return [];

  const message: NexusPortalRequestMessage = {
    type: 'NEXUS_PORTAL_REQUEST',
    ...launch
  };
  const response = (await chrome.runtime.sendMessage(message)) as NexusApiResponseMessage;

  logNexus(response.ok ? 'info' : 'warn', 'respuesta portal Nexus', {
    ok: response.ok,
    status: response.status,
    error: response.error,
    debug: response.debug
  });

  const data = response.data as NexusPortalLaunchResponse | undefined;
  const credentials: SiaseCredentialMap = {};
  if (data?.url) collectCredentialsFromText(data.url, credentials);
  if (data?.body) collectCredentialsFromText(data.body, credentials);

  logNexus('info', 'credenciales detectadas en salto portal Nexus', {
    finalUrl: data?.url,
    redirected: data?.redirected,
    keys: Object.keys(credentials)
  });

  return buildPayloadCandidatesFromCredentials(credentials, 'portal-nexus');
}

function construirPayloadSIASE(frameDocument: Document): SiasePayloadCandidate[] {
  const credentials: SiaseCredentialMap = {};
  const frameWindow = frameDocument.defaultView ?? window;

  collectWindowCredentials(frameWindow, credentials);
  collectFormCredentials(frameDocument, credentials);
  collectCookieCredentials(frameDocument, credentials);
  collectInlineScriptCredentials(frameDocument, credentials);

  const credentialPayloads = buildPayloadCandidatesFromCredentials(credentials, 'cgi');

  logNexus('info', 'credenciales CGI detectadas', {
    keys: Object.keys(credentials),
    hasToken: credentialPayloads.some((candidate) => candidate.label.includes('token-siase')),
    hasMatriculaClave: credentialPayloads.some((candidate) => candidate.label.includes('matricula-clave'))
  });

  const payloads: SiasePayloadCandidate[] = [...credentialPayloads, { label: 'empty-body', payload: {} }];

  logNexus(
    'info',
    'payloads de auth preparados',
    payloads.map((candidate) => ({
      label: candidate.label,
      body: summarizePayload(candidate.payload)
    }))
  );

  return payloads;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numericId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function extractCoursesFromNexusResponse(data: unknown): NexusCourse[] {
  const found = new Map<number, NexusCourse>();

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isRecord(value)) return;

    const cursoId = numericId(value.CursoId ?? value.Id ?? value.id);
    const nombre = stringValue(value.Nombre ?? value.NombreCurso ?? value.Descripcion);
    if (cursoId && nombre) {
      found.set(cursoId, { CursoId: cursoId, Nombre: nombre });
    }

    Object.values(value).forEach(visit);
  }

  visit(data);
  return Array.from(found.values());
}

function extractEvidencesFromStructure(data: unknown): NexusEvidence[] {
  const evidencias: NexusEvidence[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isRecord(value)) return;

    const fecha =
      stringValue(value.FechaLimite) ||
      stringValue(value.FechaFin) ||
      stringValue(value.FechaCierre) ||
      stringValue(value.FechaVencimiento);
    const descripcion =
      stringValue(value.Descripcion) || stringValue(value.Nombre) || stringValue(value.Titulo);

    if (fecha && descripcion) {
      evidencias.push({
        EvidenciaId: numericId(value.EvidenciaId ?? value.Id),
        Descripcion: descripcion,
        Nombre: stringValue(value.Nombre),
        Titulo: stringValue(value.Titulo),
        FechaLimite: stringValue(value.FechaLimite),
        FechaFin: stringValue(value.FechaFin),
        FechaCierre: stringValue(value.FechaCierre),
        FechaVencimiento: stringValue(value.FechaVencimiento),
        Valor: typeof value.Valor === 'number' ? value.Valor : numericId(value.Valor)
      });
    }

    Object.values(value).forEach(visit);
  }

  visit(data);
  return evidencias;
}

function filtrarActividades(
  estructuras: NexusStructureResponse[],
  nombresCursos: string[]
): NexusActivity[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // Usar el fin del día +7 (23:59:59.999) en lugar de "ahora + 7*24h".
  // El enfoque anterior excluía actividades con FechaLimite=23:59 del día 7
  // porque la hora exacta "ahora + 168h" quedaba antes de las 23:59 de ese día.
  const en7 = new Date(hoy);
  en7.setDate(en7.getDate() + 7);
  en7.setHours(23, 59, 59, 999);
  const ahora = new Date();
  const actividades: NexusActivity[] = [];

  estructuras.forEach((est, index) => {
    const evidencias = extractEvidencesFromStructure(est);

    logNexus('info', 'estructura Nexus analizada', {
      curso: nombresCursos[index] || 'Sin nombre',
      evidencias: evidencias.length
    });

    evidencias.forEach((ev) => {
      const fechaRaw = ev.FechaLimite || ev.FechaFin || ev.FechaCierre || ev.FechaVencimiento;
      if (!fechaRaw) return;

      const fecha = new Date(fechaRaw);
      if (Number.isNaN(fecha.getTime()) || fecha < ahora || fecha > en7) return;

      const diasRestantes = Math.max(
        0,
        Math.ceil((fecha.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      );

      actividades.push({
        materia: nombresCursos[index] || 'Sin nombre',
        actividad: ev.Descripcion || ev.Nombre || ev.Titulo || 'Actividad sin descripcion',
        fechaLimite: fecha,
        valor: ev.Valor,
        evidenciaId: ev.EvidenciaId || ev.Id,
        diasRestantes,
        esHoy: isSameCalendarDay(fecha, ahora)
      });
    });
  });

  actividades.sort((a, b) => a.fechaLimite.getTime() - b.fechaLimite.getTime());

  logNexus('info', 'actividades proximas filtradas', {
    total: actividades.length,
    hoy: actividades.filter((actividad) => actividad.esHoy).length,
    semana: actividades.filter((actividad) => !actividad.esHoy).length
  });

  return actividades;
}

function abreviarNombre(nombre: string): string {
  let palabras = nombre.replace(/\s+ENE-JUN\s+\d+.*$/i, '').replace(/\s+\(.*\)/, '');
  if (palabras.length > 35) {
    palabras = `${palabras.substring(0, 33)}...`;
  }
  return palabras;
}

function replaceNexusWidget(frameDocument: Document, html: string): void {
  frameDocument.getElementById('siase-nexus-widget')?.remove();

  const template = frameDocument.createElement('template');
  template.innerHTML = html.trim();
  const widget = template.content.firstElementChild;
  if (!widget) return;

  const mainPanel = frameDocument.querySelector('.siase-career-main');
  if (mainPanel) {
    mainPanel.prepend(widget);
    return;
  }

  frameDocument.querySelector('.siase-career-dashboard')?.append(widget);
}

function renderizarItem(act: NexusActivity, esUrgente: boolean): string {
  const fecha = act.fechaLimite;
  const fechaStr = fecha.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const urgente = esUrgente || act.esHoy || act.diasRestantes <= 1;
  const badge = act.esHoy
    ? 'Hoy'
    : `En ${act.diasRestantes} dia${act.diasRestantes !== 1 ? 's' : ''}`;
  const puntos = typeof act.valor === 'number' ? `${act.valor} pts` : 'Sin puntaje';

  return `
    <article class="siase-nexus-widget__item${urgente ? ' siase-nexus-widget__item--urgente' : ''}">
      <div class="siase-nexus-widget__item-header">
        <span class="siase-nexus-widget__materia">${escapeHtml(abreviarNombre(act.materia))}</span>
        <span class="siase-nexus-widget__badge${urgente ? ' siase-nexus-widget__badge--urgente' : ''}">
          ${escapeHtml(badge)}
        </span>
      </div>
      <strong class="siase-nexus-widget__titulo">${escapeHtml(act.actividad)}</strong>
      <div class="siase-nexus-widget__meta">
        <span>${escapeHtml(fechaStr)}</span>
        <span>${escapeHtml(puntos)}</span>
      </div>
    </article>
  `;
}

function renderizarWidget(frameDocument: Document, actividades: NexusActivity[]): void {
  const hoy = actividades.filter((actividad) => actividad.esHoy);
  const semana = actividades.filter((actividad) => !actividad.esHoy);
  let html = '<section class="siase-career-section siase-nexus-widget" id="siase-nexus-widget">';

  html += '<div class="siase-career-section__header">';
  html += '<div class="siase-nexus-widget__title">';
  html += '<span class="siase-nexus-widget__icon">';
  html +=
    '<svg class="siase-career-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="8" cy="14" r="1" fill="currentColor"/><circle cx="12" cy="14" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/></svg>';
  html += '</span>';
  html += '<h2>Proximas a vencer</h2>';
  html += '</div>';
  html += '<span>Esta semana - Nexus</span>';
  html += '</div>';

  html += '<div class="siase-nexus-widget__group">';
  html += '<p class="siase-dashboard__eyebrow">Hoy</p>';
  if (hoy.length === 0) {
    html += '<div class="siase-nexus-widget__empty">No hay actividades para hoy</div>';
  } else {
    hoy.forEach((act) => {
      html += renderizarItem(act, true);
    });
  }
  html += '</div>';

  html += '<div class="siase-nexus-widget__group siase-nexus-widget__group--week">';
  html += '<p class="siase-dashboard__eyebrow">Esta semana</p>';
  if (semana.length === 0) {
    html += '<div class="siase-nexus-widget__empty">No hay actividades proximas esta semana</div>';
  } else {
    semana.forEach((act) => {
      html += renderizarItem(act, false);
    });
  }
  html += '</div>';
  html += '</section>';

  replaceNexusWidget(frameDocument, html);
}

function mostrarWidgetCargando(frameDocument: Document): void {
  replaceNexusWidget(
    frameDocument,
    `
      <section class="siase-career-section siase-nexus-widget" id="siase-nexus-widget">
        <div class="siase-career-section__header">
          <h2>Proximas a vencer</h2>
          <span>Cargando...</span>
        </div>
        <div class="siase-nexus-widget__skeleton" aria-label="Cargando actividades de Nexus">
          <div class="siase-nexus-widget__skeleton-item"></div>
          <div class="siase-nexus-widget__skeleton-item"></div>
          <div class="siase-nexus-widget__skeleton-item"></div>
        </div>
      </section>
    `
  );
}

function mostrarWidgetError(frameDocument: Document, mensaje: string): void {
  replaceNexusWidget(
    frameDocument,
    `
      <section class="siase-career-section siase-nexus-widget" id="siase-nexus-widget">
        <div class="siase-career-section__header">
          <h2>Proximas a vencer</h2>
        </div>
        <div class="siase-nexus-widget__empty">${escapeHtml(mensaje)}</div>
      </section>
    `
  );
}

function mostrarWidgetVacio(frameDocument: Document): void {
  mostrarWidgetError(frameDocument, 'No tienes cursos activos en Nexus.');
}

function guardarCache(frameWindow: Window, actividades: NexusActivity[]): void {
  try {
    const data: NexusCachedActivity[] = actividades.map((actividad) => ({
      ...actividad,
      fechaLimite: actividad.fechaLimite.toISOString()
    }));
    frameWindow.sessionStorage.setItem(NEXUS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // El widget sigue funcionando aunque el navegador bloquee sessionStorage.
  }
}

function leerCache(frameWindow: Window): NexusActivity[] | null {
  try {
    const raw = frameWindow.sessionStorage.getItem(NEXUS_CACHE_KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw) as { ts?: number; data?: NexusCachedActivity[] };
    if (!entry.ts || Date.now() - entry.ts > NEXUS_CACHE_TTL) {
      frameWindow.sessionStorage.removeItem(NEXUS_CACHE_KEY);
      return null;
    }

    return (entry.data ?? []).map((actividad) => ({
      ...actividad,
      fechaLimite: new Date(actividad.fechaLimite)
    }));
  } catch {
    return null;
  }
}

function leerSesionNexus(frameWindow: Window): NexusAuthResult | null {
  try {
    const cached = parseJson<NexusSessionStorage>(
      frameWindow.localStorage.getItem('UanlNexus7SesionStorage'),
      {}
    );
    const token = cached.Sesion?.Token;
    if (!token) {
      logNexus('info', 'sin token Nexus cacheado en este origen');
      return null;
    }

    // Calcular expiración real usando los campos que Nexus incluye en la propia sesión.
    // Esto evita el bug de usar un TTL fijo (8h) mayor que el TTL real del servidor (≈5h 20min).
    const sesion = cached.Sesion;
    if (sesion?.FechaInicio && typeof sesion.TiempoRestante === 'number') {
      const expiry = new Date(sesion.FechaInicio).getTime() + sesion.TiempoRestante * 1000;
      if (Date.now() > expiry - NEXUS_TOKEN_EXPIRY_MARGIN_MS) {
        frameWindow.localStorage.removeItem('UanlNexus7SesionStorage');
        logNexus('info', 'token Nexus expirado segun FechaInicio+TiempoRestante; se renovara', {
          FechaInicio: sesion.FechaInicio,
          TiempoRestante: sesion.TiempoRestante,
          expiry: new Date(expiry).toISOString()
        });
        return null;
      }
    } else {
      // Fallback conservador (4 h) cuando la sesión no trae los campos de TTL exactos.
      const cachedAt = cached._cachedAt || 0;
      if (Date.now() - cachedAt > NEXUS_TOKEN_TTL_FALLBACK) {
        frameWindow.localStorage.removeItem('UanlNexus7SesionStorage');
        logNexus('info', 'token Nexus cacheado expirado (fallback 4h); se intentara renovar', {
          ageMs: Date.now() - cachedAt
        });
        return null;
      }
    }

    logNexus('info', 'usando token Nexus cacheado', {
      ageMs: Date.now() - (cached._cachedAt || 0),
      areaAcademicaId: cached.Sesion?.AreaAcademicaId,
      rolId: cached.Sesion?.RolId ?? 5,
      token: '[redacted]'
    });

    return {
      token,
      areaAcademicaId: cached.Sesion?.AreaAcademicaId,
      rolId: cached.Sesion?.RolId ?? 5
    };
  } catch {
    return null;
  }
}

function guardarSesionNexus(frameWindow: Window, sesion: NexusSessionStorage['Sesion']): void {
  if (!sesion?.Token) return;

  try {
    frameWindow.localStorage.setItem(
      'UanlNexus7SesionStorage',
      JSON.stringify({
        Sesion: {
          ...sesion,
          RolId: sesion.RolId ?? 5,
          SistemaId: sesion.SistemaId ?? 1
        },
        _cachedAt: Date.now()
      })
    );
  } catch {
    // La sesión sólo se cachea como optimización; si falla, se puede volver a solicitar.
  }
}

function authErrorMessage(error: unknown): string {
  if (error instanceof NexusAuthError) {
    if (error.status === 401) return 'Tu sesion ha expirado. Recarga la pagina.';
    if (error.status === 403) return 'No se pudo autenticar con Nexus automaticamente.';
  }

  return 'Nexus no disponible en este momento.';
}

async function requestNexusApi<T>(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data?: T; error?: string; debug?: NexusApiResponseMessage['debug'] }> {
  logNexus('info', 'api request', {
    endpoint: endpointName(url),
    headerKeys: Object.keys(headers),
    body: summarizePayload(body as SiasePayload)
  });

  if (chrome.runtime?.id) {
    const message: NexusApiRequestMessage = {
      type: 'NEXUS_API_REQUEST',
      url,
      method: 'POST',
      headers,
      body
    };
    const response = (await chrome.runtime.sendMessage(message)) as NexusApiResponseMessage;

    logNexus(response.ok ? 'info' : 'warn', 'api response', {
      endpoint: endpointName(url),
      ok: response.ok,
      status: response.status,
      error: response.error,
      debug: response.debug
    });

    return {
      ok: response.ok,
      status: response.status,
      data: response.data as T | undefined,
      error: response.error,
      debug: response.debug
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = (await response.json()) as T;

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

async function crearSesionSIASE(candidate: SiasePayloadCandidate): Promise<NexusAuthResult> {
  logNexus('info', 'intentando auth CrearSesionSIASE', {
    label: candidate.label,
    body: summarizePayload(candidate.payload)
  });

  const response = await requestNexusApi<NexusSessionStorage | (NexusSession & { Sesion?: NexusSession })>(
    `${NEXUS_API_BASE}/Seguridad/CrearSesionSIASE`,
    {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    candidate.payload
  );

  if (!response.ok) {
    throw new NexusAuthError(
      response.error ||
        response.debug?.bodyPreview ||
        `Nexus auth failed with ${response.status} using ${candidate.label}`,
      response.status
    );
  }

  const resp = response.data as (NexusSession & { Sesion?: NexusSession }) | null | undefined;
  const sesion = resp?.Sesion ?? resp ?? undefined;
  const token = sesion?.Token;

  if (!token) {
    logNexus('warn', 'CrearSesionSIASE respondio sin token', {
      label: candidate.label,
      responseKeys: resp ? Object.keys(resp) : []
    });
    throw new NexusAuthError('Nexus auth response did not include a token');
  }

  logNexus('info', 'auth Nexus obtenida', {
    label: candidate.label,
    areaAcademicaId: sesion.AreaAcademicaId,
    rolId: sesion.RolId ?? 5,
    token: '[redacted]'
  });

  return {
    token,
    areaAcademicaId: sesion.AreaAcademicaId,
    rolId: sesion.RolId ?? 5
  };
}

async function obtenerTokenNexus(frameDocument: Document): Promise<NexusAuthResult | null> {
  const frameWindow = frameDocument.defaultView ?? window;
  const cached = leerSesionNexus(frameWindow);
  if (cached) return cached;

  const iframeSession = await obtenerSesionDesdeIframeNexus(frameDocument);
  if (iframeSession) return iframeSession;

  const loginActionPayloads = readNexusLoginPayloadCandidates(frameWindow);
  const payloads = [...loginActionPayloads, ...construirPayloadSIASE(frameDocument)];
  const hasCgiCredentials = payloads.some((candidate) => candidate.label !== 'empty-body');
  if (!hasCgiCredentials) {
    const portalPayloads = await obtenerPayloadsDesdePortalNexus(frameDocument);
    payloads.unshift(...portalPayloads);
    logNexus(
      'info',
      'payloads tras inspeccionar portal Nexus',
      payloads.map((candidate) => ({
        label: candidate.label,
        body: summarizePayload(candidate.payload)
      }))
    );
  }

  let lastError: unknown = null;
  let firstAuthError: NexusAuthError | null = null;

  for (const candidate of payloads) {
    try {
      const auth = await crearSesionSIASE(candidate);
      guardarSesionNexus(frameWindow, {
        Token: auth.token,
        AreaAcademicaId: auth.areaAcademicaId,
        RolId: auth.rolId,
        SistemaId: 1
      });
      return auth;
    } catch (error) {
      lastError = error;
      logNexus('warn', 'fallo auth CrearSesionSIASE', {
        label: candidate.label,
        status: error instanceof NexusAuthError ? error.status : undefined,
        message: error instanceof Error ? error.message : String(error)
      });
      if (error instanceof NexusAuthError && [401, 403].includes(error.status ?? 0)) {
        firstAuthError = firstAuthError ?? error;
      }
    }
  }

  throw firstAuthError ?? lastError ?? new NexusAuthError('Nexus auth failed');
}

async function postNexus<T>(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<T> {
  const response = await requestNexusApi<T>(url, headers, body);

  if (!response.ok) {
    throw new Error(`Nexus request failed with ${response.status}`);
  }

  return response.data as T;
}

async function iniciarWidgetNexus(frameDocument: Document): Promise<void> {
  const frameWindow = frameDocument.defaultView ?? window;
  mostrarWidgetCargando(frameDocument);

  let auth: NexusAuthResult | null = null;
  try {
    auth = await obtenerTokenNexus(frameDocument);
  } catch (error) {
    logNexus('error', 'auth Nexus agotada', {
      status: error instanceof NexusAuthError ? error.status : undefined,
      message: error instanceof Error ? error.message : String(error)
    });
    mostrarWidgetError(frameDocument, authErrorMessage(error));
    return;
  }

  if (!auth?.token) {
    mostrarWidgetError(
      frameDocument,
      'No se pudo conectar con Nexus. Ingresa a Nexus al menos una vez.'
    );
    return;
  }

  const headers = {
    Token: auth.token,
    AreaAcademicaId: String(auth.areaAcademicaId || '83'),
    RolId: String(auth.rolId || '5'),
    SistemaId: '1',
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  try {
    const data = await postNexus<NexusCoursesResponse>(
      `${NEXUS_API_BASE}/Curso/ConsultarCarpetaCursos`,
      headers,
      { CarpetaId: 0, Pagina: 1, Paginacion: 50 }
    );

    // Nexus devuelve Code:2004 (sesión expirada) o Code:2011 (token inválido) con HTTP 200.
    // Sin este chequeo, el extractor interpreta la respuesta de error como "0 cursos"
    // y el widget muestra "No tienes cursos activos" en lugar de un error de autenticación.
    if (data?.Code === 2004 || data?.Code === 2011) {
      logNexus('warn', 'token rechazado por Nexus; limpiando cache y notificando al SW', {
        Code: data.Code,
        Message: data.Message
      });
      frameWindow.localStorage.removeItem('UanlNexus7SesionStorage');
      if (chrome.runtime?.id) {
        void chrome.runtime.sendMessage({ type: 'CLEAR_NEXUS_SESSION' });
      }
      mostrarWidgetError(frameDocument, 'Sesion de Nexus expirada. Recarga la pagina para reconectar.');
      return;
    }

    const cursos = extractCoursesFromNexusResponse(data).filter((curso) => curso.CursoId);

    logNexus('info', 'unidades de aprendizaje detectadas', {
      total: cursos.length,
      cursos: cursos.map((curso) => ({
        CursoId: curso.CursoId,
        Nombre: curso.Nombre
      }))
    });

    if (!cursos.length) {
      mostrarWidgetVacio(frameDocument);
      return;
    }

    const estructuras = await Promise.all(
      cursos.map(async (curso) => {
        logNexus('info', 'consultando estructura de unidad', {
          CursoId: curso.CursoId,
          Nombre: curso.Nombre
        });

        return postNexus<NexusStructureResponse>(
          `${NEXUS_API_BASE}/Estructura/ConsultarEstructura`,
          headers,
          { CursoId: curso.CursoId }
        )
          .then((estructura) => {
            logNexus('info', 'estructura de unidad recibida', {
              CursoId: curso.CursoId,
              Nombre: curso.Nombre,
              rootKeys: isRecord(estructura) ? Object.keys(estructura) : []
            });
            return estructura;
          })
          .catch((error) => {
          logNexus('warn', 'fallo estructura de curso', {
            CursoId: curso.CursoId,
            Nombre: curso.Nombre,
            message: error instanceof Error ? error.message : String(error)
          });
          return {};
        });
      })
    );
    const nombresCursos = cursos.map((curso) => curso.Nombre || 'Sin nombre');
    const actividades = filtrarActividades(estructuras, nombresCursos);

    guardarCache(frameWindow, actividades);
    renderizarWidget(frameDocument, actividades);
  } catch (error) {
    logNexus('error', 'fallo carga de actividades', {
      message: error instanceof Error ? error.message : String(error)
    });
    mostrarWidgetError(frameDocument, 'No se pudo conectar con Nexus.');
  }
}

function iniciarWidgetNexusConCache(frameDocument: Document): void {
  const frameWindow = frameDocument.defaultView ?? window;
  const cached = leerCache(frameWindow);
  if (cached) {
    renderizarWidget(frameDocument, cached);
    return;
  }

  void iniciarWidgetNexus(frameDocument);
}

function scheduleNexusWidget(frameDocument: Document): void {
  if (frameDocument.body.dataset.siaseNexusWidgetMounted === 'true') return;
  frameDocument.body.dataset.siaseNexusWidgetMounted = 'true';
  const frameWindow = frameDocument.defaultView ?? window;

  frameWindow.setTimeout(() => {
    iniciarWidgetNexusConCache(frameDocument);
  }, 300);
}

function shouldEnhanceCareerLanding(): boolean {
  return window.name === 'center' || window.top === window;
}

function findStudentEmail(frameDocument: Document): string {
  return frameDocument.querySelector('#correo a.style3')?.textContent?.trim() || 'correo@uanl.edu.mx';
}

function getCareerLinks(frameDocument: Document): HTMLAnchorElement[] {
  return Array.from(
    frameDocument.querySelectorAll<HTMLAnchorElement>("form[name='SelCarrera'] a[href^='javascript:']")
  );
}

function findCareerCount(frameDocument: Document): number {
  return getCareerLinks(frameDocument).length;
}

function menuIconName(item: Pick<MenuItem, 'label' | 'category'>): string {
  const normalized = item.label.toLowerCase();
  if (/horario|clase/.test(normalized)) return 'calendar';
  if (/calif|kardex|materia|acad|promedio|avance/.test(normalized)) return 'book';
  if (/recibo|cuota|pago|adeudo|beca|finanza/.test(normalized)) return 'receipt';
  if (/dato|personal|perfil|foto|situaci|estatus/.test(normalized)) return 'user';
  if (/inscrip|tramite|solicitud|constancia|servicio|voluntariado/.test(normalized))
    return 'badge';
  if (item.category === 'schedule') return 'calendar';
  if (item.category === 'payments') return 'receipt';
  if (item.category === 'profile') return 'user';
  if (item.category === 'services') return 'badge';
  return 'services';
}

function ensureSiaseContentFrame(wrapper: HTMLElement): HTMLIFrameElement | null {
  const host = wrapper.querySelector<HTMLElement>('[data-siase-career-content-host]');
  if (!host) return null;

  let frame = host.querySelector<HTMLIFrameElement>(`iframe[name="${SIASE_CONTENT_FRAME_NAME}"]`);
  if (frame) return frame;

  frame = host.ownerDocument.createElement('iframe');
  frame.className = 'siase-career-content-frame';
  frame.name = SIASE_CONTENT_FRAME_NAME;
  frame.title = 'Contenido de SIASE';
  frame.addEventListener('load', () => handleSiaseFrameLoad(wrapper, frame));
  host.replaceChildren(frame);
  return frame;
}

function setSiaseMode(wrapper: HTMLElement): void {
  wrapper.ownerDocument.body.classList.add('siase-career-siase-mode');
  wrapper.classList.add('is-siase-mode');
}

function getCareerForm(frameDocument: Document): HTMLFormElement | null {
  return frameDocument.querySelector<HTMLFormElement>("form[name='SelCarrera']");
}

function setCareerFormValue(form: HTMLFormElement, name: string, value: string): void {
  const control = form.elements.namedItem(name);
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  ) {
    control.value = value;
  }
}

function applyLegacyCareerHref(
  frameDocument: Document,
  careerLink: HTMLAnchorElement,
  wrapper: HTMLElement
): boolean {
  const form = getCareerForm(frameDocument);
  const href = careerLink.getAttribute('href') ?? '';
  if (!form || !href.toLowerCase().startsWith('javascript:')) return false;

  const script = href.slice('javascript:'.length);
  const assignmentPattern =
    /(?:document(?:\.forms\[['"]SelCarrera['"]\]|\.SelCarrera)|SelCarrera)\.([A-Za-z0-9_]+)\.value\s*=\s*(['"])(.*?)\2/g;
  let hasAssignments = false;
  let match: RegExpExecArray | null;

  while ((match = assignmentPattern.exec(script))) {
    setCareerFormValue(form, match[1], match[3]);
    hasAssignments = true;
  }

  if (!hasAssignments) return false;

  const frame = ensureSiaseContentFrame(wrapper);
  if (!frame) return false;

  setSiaseMode(wrapper);
  form.target = SIASE_CONTENT_FRAME_NAME;
  form.submit();
  return true;
}

function selectCareerByIndex(frameDocument: Document, wrapper: HTMLElement, index: number): boolean {
  const careerLink = getCareerLinks(frameDocument)[index];
  if (!careerLink) return false;

  if (applyLegacyCareerHref(frameDocument, careerLink, wrapper)) return true;
  careerLink.click();
  return true;
}

function closeCareerListModal(wrapper: HTMLElement): void {
  const modal = wrapper.querySelector<HTMLElement>('[data-siase-career-modal]');
  if (modal) modal.hidden = true;
}

function getSiaseFrameDocument(frame: HTMLIFrameElement): Document | null {
  try {
    return frame.contentDocument;
  } catch {
    return null;
  }
}

function getNamedFrameDocument(rootDocument: Document, name: string): Document | null {
  const frame = rootDocument.querySelector<HTMLFrameElement>(`frame[name="${name}"]`);
  try {
    return frame?.contentDocument ?? null;
  } catch {
    return null;
  }
}

function getSiaseCenterFrame(rootDocument: Document): HTMLFrameElement | null {
  return rootDocument.querySelector<HTMLFrameElement>('frame[name="center"]');
}

function isolateSiaseCenterFrame(rootDocument: Document): void {
  const topFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="top"]');
  const leftFrame = rootDocument.querySelector<HTMLFrameElement>('frame[name="left"]');
  const centerFrame = getSiaseCenterFrame(rootDocument);

  [topFrame, leftFrame].forEach((frame) => {
    frame?.setAttribute('scrolling', 'no');
  });
  centerFrame?.setAttribute('scrolling', 'yes');

  const topFrameset = topFrame?.closest('frameset');
  if (topFrameset?.hasAttribute('rows')) topFrameset.setAttribute('rows', '0,*');

  const leftFrameset = leftFrame?.closest('frameset');
  if (leftFrameset?.hasAttribute('cols')) leftFrameset.setAttribute('cols', '0,*');
}

function renderSiaseMenu(wrapper: HTMLElement, items: MenuItem[]): void {
  const grid = wrapper.querySelector<HTMLElement>('[data-siase-career-rail-menu]');
  if (!grid || !items.length) return;

  grid.replaceChildren(
    ...items.map((item) => {
      const button = grid.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `siase-career-quick-card siase-career-menu-card siase-career-menu-card--${item.category}`;
      button.dataset.siaseMenuHref = item.href;
      button.title = item.label;
      button.setAttribute('aria-label', item.label);

      const icon = grid.ownerDocument.createElement('span');
      icon.className = 'siase-career-quick-card__icon';
      icon.innerHTML = iconMarkup(menuIconName(item));

      const label = grid.ownerDocument.createElement('strong');
      label.textContent = item.label;

      button.append(icon, label);
      return button;
    })
  );
}

function navigateSiaseCenter(wrapper: HTMLElement, href: string): void {
  const frame = wrapper.querySelector<HTMLIFrameElement>(`iframe[name="${SIASE_CONTENT_FRAME_NAME}"]`);
  const rootDocument = frame ? getSiaseFrameDocument(frame) : null;
  const centerFrame = rootDocument ? getSiaseCenterFrame(rootDocument) : null;
  if (!centerFrame) return;

  centerFrame.src = href;
  wrapper.querySelectorAll<HTMLElement>('[data-siase-menu-href]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.siaseMenuHref === href);
  });
}

function hydrateSiaseShellFromFrame(wrapper: HTMLElement, frame: HTMLIFrameElement): boolean {
  const rootDocument = getSiaseFrameDocument(frame);
  if (!rootDocument) return false;

  isolateSiaseCenterFrame(rootDocument);

  const leftDocument = getNamedFrameDocument(rootDocument, 'left');
  if (!leftDocument) return false;

  const menuItems = parseMenuItems(leftDocument);
  if (!menuItems.length) return false;

  renderSiaseMenu(wrapper, menuItems);
  return true;
}

function handleSiaseFrameLoad(wrapper: HTMLElement, frame: HTMLIFrameElement): void {
  setSiaseMode(wrapper);

  let attempts = 0;
  const maxAttempts = 40;
  const interval = window.setInterval(() => {
    attempts += 1;
    const hydrated = hydrateSiaseShellFromFrame(wrapper, frame);
    if (hydrated || attempts >= maxAttempts) window.clearInterval(interval);
  }, 250);
}

function showPanel(frameDocument: Document, panelId: PanelId): void {
  const portalWindow = frameDocument.defaultView as (Window & { muestra?: (panel: string) => void }) | null;
  if (typeof portalWindow?.muestra === 'function') {
    portalWindow.muestra(panelId);
  } else {
    PANEL_IDS.forEach((id) => {
      const panel = frameDocument.getElementById(id);
      if (panel) panel.style.visibility = id === panelId ? 'visible' : 'hidden';
    });
  }

  frameDocument.querySelectorAll<HTMLElement>('[data-siase-career-panel]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.siaseCareerPanel === panelId);
  });

  PANEL_IDS.forEach((id) => {
    frameDocument.getElementById(id)?.classList.toggle('is-active', id === panelId);
  });
}

function classifyLegacyStructure(frameDocument: Document): void {
  const [bannerTable, layoutTable] = Array.from(frameDocument.body.querySelectorAll('table'));

  bannerTable?.classList.add('siase-plus-career-banner', 'siase-plus-career-footer');
  layoutTable?.classList.add('siase-plus-career-layout');

  if (bannerTable && bannerTable.parentElement === frameDocument.body) {
    frameDocument.body.append(bannerTable);
  }

  PANEL_IDS.forEach((panelId) => {
    frameDocument.getElementById(panelId)?.classList.add('siase-plus-career-panel');
  });
}

function buildCareerChoiceButtonsHtml(careerLinks: HTMLAnchorElement[], optionClass: string): string {
  if (!careerLinks.length) return '';
  return careerLinks
    .map((link, index) => {
      const label = link.textContent?.replace(/\s+/g, ' ').trim() || `Carrera ${index + 1}`;
      return `
        <button type="button" class="${optionClass}" data-siase-career-index="${index}">
          <span>${iconMarkup('book')}</span>
          <strong>${escapeHtml(label)}</strong>
        </button>
      `;
    })
    .join('');
}

function attachCareerCarouselNavigation(wrapper: HTMLElement, careerLinks: HTMLAnchorElement[]): void {
  const labels = careerLinks.map((link, index) => {
    return link.textContent?.replace(/\s+/g, ' ').trim() || `Carrera ${index + 1}`;
  });
  const careerCount = labels.length;
  const root = wrapper.querySelector<HTMLElement>('[data-siase-career-carousel-root]');
  if (!root || careerCount < 1) return;

  const prev = root.querySelector<HTMLButtonElement>('[data-siase-career-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-siase-career-carousel-next]');
  const titleEl = root.querySelector<HTMLElement>('[data-siase-career-carousel-title]');
  const counter = root.querySelector<HTMLElement>('[data-siase-career-carousel-counter]');
  const accessBtn = wrapper.querySelector<HTMLButtonElement>(
    '[data-siase-career-access-from-progress]'
  );

  let idx = 0;

  const sync = (): void => {
    const label = labels[idx];
    if (titleEl) titleEl.textContent = label;
    titleEl?.setAttribute('title', label);
    if (counter) counter.textContent = `${idx + 1} / ${careerCount}`;
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx >= careerCount - 1;
    if (accessBtn) {
      accessBtn.dataset.siaseCareerIndex = String(idx);
      accessBtn.hidden = false;
    }
  };

  prev?.addEventListener('click', () => {
    idx = Math.max(0, idx - 1);
    sync();
  });
  next?.addEventListener('click', () => {
    idx = Math.min(careerCount - 1, idx + 1);
    sync();
  });

  sync();
}

function handleCareerLogout(frameDocument: Document): void {
  const logoutControl = Array.from(
    frameDocument.querySelectorAll<HTMLAnchorElement | HTMLButtonElement | HTMLInputElement>(
      'a, button, input[type="button"], input[type="submit"]'
    )
  ).find((element) => {
    const label = element instanceof HTMLInputElement ? element.value : element.textContent;
    return /salir|cerrar\s+sesi[oó]n|logout/i.test(label ?? '');
  });

  if (logoutControl instanceof HTMLAnchorElement && logoutControl.href) {
    window.top?.location.assign(logoutControl.href);
    return;
  }

  if (logoutControl) {
    logoutControl.click();
    return;
  }

  window.top?.location.assign('/');
}

function createDashboardChrome(frameDocument: Document): HTMLElement {
  const careerLinks = getCareerLinks(frameDocument);
  const careerCount = careerLinks.length;
  const careerListHtml = buildCareerChoiceButtonsHtml(careerLinks, 'siase-career-modal__option');
  const firstCareerTitle =
    careerLinks[0]?.textContent?.replace(/\s+/g, ' ').trim() || 'Carrera';
  const email = findStudentEmail(frameDocument);
  const wrapper = frameDocument.createElement('section');
  wrapper.className = 'siase-career-dashboard';
  wrapper.innerHTML = `
    <nav class="siase-career-nav" aria-label="Resumen">
      <div class="siase-career-brand">
        <p class="siase-career-nav-brand-title">Resumen</p>
      </div>
      <div class="siase-career-nav__actions">
        <div class="siase-career-user">
          <span class="siase-career-avatar">U</span>
          <span><strong>Estudiante UANL</strong><em>${email}</em></span>
          ${iconMarkup('chevron')}
        </div>
      </div>
    </nav>
    <div class="siase-career-modal" data-siase-career-modal role="dialog" aria-modal="true" aria-labelledby="siase-career-modal-title" hidden>
      <div class="siase-career-modal__backdrop" data-siase-career-modal-close></div>
      <section class="siase-career-modal__card">
        <div class="siase-career-modal__header">
          <div>
            <p class="siase-dashboard__eyebrow">SIASE</p>
            <h2 id="siase-career-modal-title">Selecciona tu carrera</h2>
          </div>
          <button type="button" class="siase-career-modal__close" data-siase-career-modal-close aria-label="Cerrar listado de carreras">Cerrar</button>
        </div>
        <div class="siase-career-modal__list">
          ${
            careerListHtml ||
            '<p class="siase-career-modal__empty">No se encontraron carreras disponibles en esta sesion.</p>'
          }
        </div>
      </section>
    </div>
    <aside class="siase-career-system-sidebar" aria-label="Acceso rapido del sistema">
      <section class="siase-career-section siase-career-quick-panel siase-career-quick-panel--sidebar siase-entrance">
        <div class="siase-career-quick-grid" data-siase-career-rail-menu>
          <button type="button" data-siase-career-panel="siase" class="siase-career-quick-card is-active" aria-label="Ir a resumen y seleccion de carrera">
            <span class="siase-career-quick-card__icon siase-career-quick-card__icon--blue">${iconMarkup('book')}</span>
            <strong>Mi carrera</strong>
            <em>${careerCount || 1} disponibles</em>
          </button>
          <button type="button" data-siase-career-panel="correo" class="siase-career-quick-card" aria-label="Correo universitario">
            <span class="siase-career-quick-card__icon siase-career-quick-card__icon--yellow">${iconMarkup('mail')}</span>
            <strong>Correo</strong>
            <em>Universitario</em>
          </button>
          <button type="button" data-siase-career-panel="nexus" class="siase-career-quick-card" aria-label="Nexus">
            <span class="siase-career-quick-card__icon siase-career-quick-card__icon--green">${iconMarkup('video')}</span>
            <strong>Nexus</strong>
            <em>Clases en linea</em>
          </button>
          <button type="button" data-siase-career-panel="codice" class="siase-career-quick-card" aria-label="CODICE">
            <span class="siase-career-quick-card__icon siase-career-quick-card__icon--cyan">${iconMarkup('services')}</span>
            <strong>CODICE</strong>
            <em>Biblioteca digital</em>
          </button>
        </div>
        <div class="siase-career-legacy-slot" data-siase-career-legacy-slot></div>
        <button type="button" class="siase-career-rail-logout" data-siase-career-logout aria-label="Cerrar sesion">
          ${iconMarkup('logout')}
        </button>
      </section>
    </aside>
    <div class="siase-career-grid">
      <div class="siase-career-grid__primary">
        <section class="siase-career-insight-card siase-career-insight-wide" aria-label="Resumen academico y carrera">
          <div class="siase-career-insight-wide__split" data-siase-career-carousel-root aria-live="polite">
            <div class="siase-career-insight-wide__career-block" aria-labelledby="siase-inline-career-title">
              <h3 id="siase-inline-career-title" class="siase-career-inline-careers__title">Selecciona tu carrera</h3>
              ${
                careerCount === 0
                  ? '<p class="siase-career-inline-careers__empty">No se encontraron carreras disponibles en esta sesion.</p>'
                  : `
              <div class="siase-career-carousel siase-career-carousel--title-row">
                <button type="button" class="siase-career-carousel__arrow siase-career-carousel__arrow--sm" data-siase-career-carousel-prev aria-label="Carrera anterior">
                  ${iconMarkup('chevronLeft')}
                </button>
                <p class="siase-career-carousel__title" data-siase-career-carousel-title>${escapeHtml(firstCareerTitle)}</p>
              </div>
              <p class="siase-career-carousel__counter" data-siase-career-carousel-counter aria-live="polite">1 / ${careerCount}</p>
              `
              }
            </div>
            <div class="siase-career-insight-wide__metrics">
              <div class="siase-career-insight-wide__panel-stack">
                <div class="siase-career-insight-wide__tabs-rail">
                  <div class="siase-career-insight-card__tabs siase-career-insight-card__tabs--compact" role="tablist" aria-label="Cambiar resumen academico">
                    <button type="button" id="siase-insight-tab-progress" class="is-active" data-siase-insight-tab="progress" role="tab" aria-controls="siase-insight-panel-progress" aria-selected="true">
                      Progreso
                    </button>
                    <button type="button" id="siase-insight-tab-average" data-siase-insight-tab="average" role="tab" aria-controls="siase-insight-panel-average" aria-selected="false">
                      Mi promedio
                    </button>
                  </div>
                </div>
                <div class="siase-career-insight-card__panel is-active" id="siase-insight-panel-progress" data-siase-insight-panel="progress" role="tabpanel" aria-labelledby="siase-insight-tab-progress">
                  <strong class="siase-career-insight-wide__progress-percent">64%</strong>
                  <p class="siase-career-insight-wide__progress-footnote">Progreso estimado del plan académico actual.</p>
                  <div class="siase-career-insight-progress" aria-hidden="true">
                    <span style="width: 64%"></span>
                  </div>
                  <button
                    type="button"
                    class="siase-career-insight-wide__access-career"
                    data-siase-career-access-from-progress
                    data-siase-career-index="0"
                    ${careerCount === 0 ? 'hidden' : ''}
                  >
                    Acceder a esta carrera
                  </button>
                </div>
                <div class="siase-career-insight-card__panel" id="siase-insight-panel-average" data-siase-insight-panel="average" role="tabpanel" aria-labelledby="siase-insight-tab-average" hidden>
                  <p class="siase-dashboard__eyebrow">Mi promedio</p>
                  <div class="siase-career-average-display">
                    <strong>92.4</strong>
                    <span>Promedio general</span>
                  </div>
                  <p>Vista preparada para mostrar el promedio académico cuando esté disponible.</p>
                </div>
              </div>
            </div>
            ${
              careerCount === 0
                ? ''
                : `
            <button type="button" class="siase-career-carousel__arrow siase-career-carousel__arrow--sm siase-career-carousel__arrow--trail" data-siase-career-carousel-next aria-label="Carrera siguiente">
              ${iconMarkup('chevronRight')}
            </button>
            `
            }
          </div>
        </section>
        <div class="siase-career-columns">
          <main class="siase-career-main" aria-label="Proximas a vencer">
            <section class="siase-career-content-host" data-siase-career-content-host aria-label="Contenido de SIASE"></section>
          </main>
          <aside class="siase-career-sidebar">
            <section class="siase-career-news-card">
              <div class="siase-career-news-card__header">
                <span>${iconMarkup('message')}</span>
                <div>
                  <p class="siase-dashboard__eyebrow">Noticias</p>
                  <h2>Actualidad UANL</h2>
                </div>
              </div>
              <article>
                <strong>Consulta avisos institucionales</strong>
                <em>Mantente atento a comunicados de Escolar y Archivo.</em>
              </article>
              <article>
                <strong>Servicios digitales disponibles</strong>
                <em>Correo universitario, Nexus y CODICE permanecen accesibles desde esta landing.</em>
              </article>
            </section>
          </aside>
        </div>
      </div>
    </div>
  `;

  wrapper.querySelectorAll<HTMLElement>('[data-siase-career-panel]').forEach((button) => {
    button.addEventListener('click', () => {
      const panelId = button.dataset.siaseCareerPanel as PanelId | undefined;
      if (!panelId || !PANEL_IDS.includes(panelId)) return;
      if (panelId === 'siase') {
        showPanel(frameDocument, panelId);
        wrapper.querySelector('.siase-career-insight-wide')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }
      showPanel(frameDocument, panelId);
    });
  });

  wrapper.addEventListener('click', (event) => {
    const careerButton = (event.target as Element | null)?.closest<HTMLButtonElement>(
      '[data-siase-career-index]'
    );
    if (careerButton && wrapper.contains(careerButton)) {
      const index = Number(careerButton.dataset.siaseCareerIndex);
      if (Number.isInteger(index) && selectCareerByIndex(frameDocument, wrapper, index))
        closeCareerListModal(wrapper);
    }
  });

  wrapper.querySelector<HTMLElement>('[data-siase-career-modal]')?.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest('[data-siase-career-modal-close]')) closeCareerListModal(wrapper);
  });

  wrapper.querySelector<HTMLElement>('[data-siase-career-rail-menu]')?.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
      '[data-siase-menu-href]'
    );
    const href = button?.dataset.siaseMenuHref;
    if (!href) return;

    navigateSiaseCenter(wrapper, href);
  });

  wrapper
    .querySelector<HTMLButtonElement>('[data-siase-career-logout]')
    ?.addEventListener('click', () => handleCareerLogout(frameDocument));

  const insightCard = wrapper.querySelector<HTMLElement>('.siase-career-insight-card');
  insightCard?.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
      '[data-siase-insight-tab]'
    );
    const target = button?.dataset.siaseInsightTab;
    if (!target) return;

    insightCard.querySelectorAll<HTMLButtonElement>('[data-siase-insight-tab]').forEach((tab) => {
      const isActive = tab.dataset.siaseInsightTab === target;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    insightCard.querySelectorAll<HTMLElement>('[data-siase-insight-panel]').forEach((panel) => {
      const isActive = panel.dataset.siaseInsightPanel === target;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  });

  attachCareerCarouselNavigation(wrapper, careerLinks);

  return wrapper;
}

function moveLegacyPanelsIntoQuickPanel(frameDocument: Document): void {
  const slot = frameDocument.querySelector<HTMLElement>('[data-siase-career-legacy-slot]');
  if (!slot) return;

  PANEL_IDS.forEach((panelId) => {
    const panel = frameDocument.getElementById(panelId);
    if (panel && panel.parentElement !== slot) slot.append(panel);
  });

  frameDocument.querySelector('.siase-plus-career-layout')?.remove();
  showPanel(frameDocument, 'siase');
}

function injectDashboardChrome(frameDocument: Document): void {
  if (frameDocument.querySelector('.siase-career-dashboard')) return;
  frameDocument.body.prepend(createDashboardChrome(frameDocument));
  moveLegacyPanelsIntoQuickPanel(frameDocument);
}

// ── Kardex snapshot → dashboard ───────────────────────────────────────────────

interface CreditProgressUIData {
  progressPercent: number;
  totalCreditsCompleted: number;
  totalCreditsRequired: number;
  average: number | undefined;
  isEmpty: boolean;
}

function updateCreditProgressUI(data: CreditProgressUIData): void {
  // ── Panel de PROGRESO
  const progressPanel = document.querySelector('#siase-insight-panel-progress');
  if (progressPanel) {
    const progressStrong =
      progressPanel.querySelector<HTMLElement>('.siase-career-insight-wide__progress-percent') ??
      progressPanel.querySelector<HTMLElement>('.siase-career-insight-card__heading strong');

    if (progressStrong) {
      progressStrong.textContent = data.isEmpty
        ? '—'
        : `${Math.round(data.progressPercent)}%`;
    }

    const progressBar = progressPanel.querySelector(
      '.siase-career-insight-progress span'
    );
    if (progressBar instanceof HTMLElement) {
      progressBar.style.width = data.isEmpty
        ? '0%'
        : `${Math.min(Math.round(data.progressPercent), 100)}%`;
    }
  }

  // ── Panel de PROMEDIO
  const averagePanel = document.querySelector('#siase-insight-panel-average');
  if (averagePanel) {
    const averageStrong = averagePanel.querySelector(
      '.siase-career-average-display strong'
    );
    if (averageStrong) {
      averageStrong.textContent =
        data.isEmpty || data.average === undefined
          ? '—'
          : data.average.toFixed(1);
    }

    const averageDesc = averagePanel.querySelector('p:last-of-type');
    if (averageDesc) {
      averageDesc.textContent = data.isEmpty
        ? 'Visita tu kardex para ver tu promedio académico.'
        : 'Promedio general calculado desde tu kardex.';
    }
  }
}

const KARDEX_LOG = '[SIASE Plus Kardex]';

async function fetchKardexInBackground(frameDocument: Document): Promise<void> {
  // Fast path: servir desde cache si es reciente
  const cached = await getStorageValue('kardexSnapshot');
  if (cached) {
    const ageMs = Date.now() - new Date(cached.capturedAt).getTime();
    const isUsable = cached.totalCreditsCompleted > 0 || cached.average !== undefined;
    if (ageMs < KARDEX_CACHE_TTL && isUsable) {
      console.log(KARDEX_LOG, 'usando snapshot cacheado', {
        ageMs,
        capturedAt: cached.capturedAt,
        totalCreditsCompleted: cached.totalCreditsCompleted,
        progressPercent: cached.progressPercent,
        average: cached.average,
      });
      updateCreditProgressUI({ ...cached, isEmpty: false });
      return;
    }
    if (!isUsable) {
      console.warn(KARDEX_LOG, 'snapshot cacheado inválido (sin datos), forzando recarga', {
        totalCreditsCompleted: cached.totalCreditsCompleted,
        average: cached.average,
      });
    } else {
      console.log(KARDEX_LOG, 'snapshot expirado, recargando', { ageMs });
    }
  } else {
    console.log(KARDEX_LOG, 'sin snapshot previo, cargando kardex en background');
  }

  // Slow path: cargar el kardex en un iframe oculto (mismo origen → acceso directo al DOM)
  await new Promise<void>((resolve) => {
    let iframe = frameDocument.querySelector<HTMLIFrameElement>(
      `iframe[name="${KARDEX_BG_FRAME_NAME}"]`
    );
    if (!iframe) {
      iframe = frameDocument.createElement('iframe');
      iframe.name = KARDEX_BG_FRAME_NAME;
      iframe.style.cssText =
        'position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:0;';
      iframe.setAttribute('aria-hidden', 'true');
      // allow-same-origin: acceso a cookies de sesión de SIASE
      // allow-scripts: JS del kardex corre normalmente
      // Sin allow-modals: alert/confirm/prompt quedan suprimidos silenciosamente
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
      frameDocument.body.append(iframe);
    }

    console.log(KARDEX_LOG, 'iframe oculto creado, cargando URL', { url: KARDEX_URL });

    const cleanup = (iframeEl: HTMLIFrameElement): void => {
      iframeEl.remove();
      resolve();
    };

    const timer = setTimeout(() => {
      console.warn(KARDEX_LOG, 'timeout: el iframe no cargó en', KARDEX_LOAD_TIMEOUT_MS, 'ms');
      cleanup(iframe!);
    }, KARDEX_LOAD_TIMEOUT_MS);

    iframe.addEventListener(
      'load',
      () => {
        clearTimeout(timer);
        try {
          const iframeDoc = iframe!.contentDocument;
          const iframeUrl = iframe!.contentWindow?.location.href ?? '(no acceso)';
          const iframeTitle = iframeDoc?.title ?? '(sin título)';
          const bodyText = iframeDoc?.body?.innerText?.slice(0, 300) ?? '(sin body)';
          const rowCount = iframeDoc?.querySelectorAll('tr').length ?? 0;

          console.log(KARDEX_LOG, 'iframe load event', {
            url: iframeUrl,
            title: iframeTitle,
            rowCount,
            bodyPreview: bodyText,
          });

          if (!iframeDoc || rowCount === 0) {
            console.warn(KARDEX_LOG, 'documento vacío o sin filas — sesión expirada o error de servidor');
            cleanup(iframe!);
            return;
          }

          const summary = parseKardexSummary(iframeDoc);
          console.log(KARDEX_LOG, 'kardex parseado', {
            entries: summary.entries.length,
            totalCreditsCompleted: summary.totalCreditsCompleted,
            progressPercent: summary.progressPercent,
            average: summary.average,
            primerEntrada: summary.entries[0],
            ultimaEntrada: summary.entries[summary.entries.length - 1],
          });

          void setStorageValue('kardexSnapshot', summary).then(() => {
            console.log(KARDEX_LOG, 'snapshot guardado en storage, actualizando UI');
            updateCreditProgressUI({ ...summary, isEmpty: false });
          });
        } catch (err) {
          console.error(KARDEX_LOG, 'error al acceder al iframe o parsear', err);
        } finally {
          cleanup(iframe!);
        }
      },
      { once: true }
    );

    iframe.src = KARDEX_URL;
  });
}

// ──────────────────────────────────────────────────────────────────────────────

export function initializeCareerLanding(frameDocument: Document): void {
  if (!shouldEnhanceCareerLanding()) return;

  frameDocument.body.classList.add(
    'siase-plus-center',
    'siase-plus-single-view',
    'siase-plus-career-landing'
  );
  applyStoredTheme(frameDocument);
  classifyLegacyStructure(frameDocument);
  injectDashboardChrome(frameDocument);
  scheduleNexusWidget(frameDocument);
  // Carga el kardex en background (iframe oculto, mismo origen) — no bloquea el render
  void fetchKardexInBackground(frameDocument);
}

initializeCareerLanding(document);
