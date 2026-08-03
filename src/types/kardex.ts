export interface KardexEntry {
  id: string;
  subjectKey: string;       // j=2: clave de materia (ej. "605")
  subject: string;          // j=3: nombre de materia
  semesterInPlan: string;   // j=0: semestre del plan ("1"–"9")
  score?: number;           // primera calificación aprobatoria (≥70) en j=4..j=9
  labScore?: number;        // calificación de laboratorio en j=10 (si es número)
  isLabSubject: boolean;    // true si j=10 === "L" (la materia ES laboratorio)
  passed: boolean;          // true si score !== undefined
  rawText: string;
}

export interface KardexSummary {
  entries: KardexEntry[];
  /** Nombre extraído del encabezado visible del Kardex. */
  planName?: string;
  approvedCredits?: number;
  totalCredits?: number;
  approvedSubjects?: number;
  totalSubjects?: number;
  /** Porcentaje redondeado y limitado a 0–100; ausente si no hay totales suficientes. */
  progressPercent?: number;
  /** Campos legacy conservados para las vistas existentes. */
  totalCreditsCompleted: number;
  totalCreditsRequired: number;
  average: number | undefined;    // promedio simple de materias aprobadas
  capturedAt: string;             // ISO 8601
  sessionKey?: string;             // usuario/sesión SIASE usada para evitar snapshots cruzados
}
