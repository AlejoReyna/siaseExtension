export interface KardexEntry {
  id: string;
  subject: string;
  credits?: number;  // créditos de esta materia
  score?: number;    // calificación (0–100)
  period?: string;   // semestre/período (ej. "2024-1")
  rawText: string;
}

export interface KardexSummary {
  entries: KardexEntry[];
  totalCreditsCompleted: number; // extraído de fila de totales del DOM
  totalCreditsRequired: number;  // constante: 220
  progressPercent: number;       // Math.min((completados / 220) * 100, 100)
  average: number | undefined;   // promedio general del DOM; undefined si no se encontró
  capturedAt: string;            // ISO 8601
}
