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
  totalCreditsCompleted: number;  // extraído del DIV "TOTAL...: 138 de 220"
  totalCreditsRequired: number;   // extraído del mismo DIV (normalmente 220)
  progressPercent: number;        // (completados / requeridos) * 100
  average: number | undefined;    // promedio simple de materias aprobadas
  capturedAt: string;             // ISO 8601
}
