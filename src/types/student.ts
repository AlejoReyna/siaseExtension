export interface StudentInfo {
  name: string;
  matricula: string;
  program?: string;
  faculty?: string;
  plan?: string;
  institution?: string;
  /** Visible source block used only by the local development tooltip. */
  rawProfileText?: string;
}
export interface StudentStatus {
  label: string;
  rawText: string;
  updatedAt: string;
}
