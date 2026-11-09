export type CoverageProposal = {
  employeeName: string; locationId: string; locationName: string; date: string;
  startTime: string; endTime: string; positionName: string | null; isDesignatedLead: boolean;
  scheduledHours: number; targetHours: number | null; publication: "DRAFT" | "PUBLISHED";
  review: string;
};
export type PeriodReview = {
  startDate: string; endDate: string; language: "en" | "es"; observedAt: string;
  readiness: "unverified"; partial: boolean;
  attendance: { state: "ready" | "unavailable"; total: number; employees: {
    name: string; state: string; revision: number; locations: string[]; issues: string[];
    historical: boolean;
  }[] };
  payroll: { state: "ready" | "disabled" | "unavailable"; runs: {
    id: string; revision: number; startDate: string; endDate: string; status: string;
    ruleRevision: number | null; superseded: boolean; coverageComplete: boolean; codes: string[];
  }[] };
};
export type WorkflowEvidence = { proposals?: CoverageProposal[]; periodReview?: PeriodReview; coveragePlans?: import("./coverage-plan-contracts").CoveragePlans };
export const issueLabels: Record<string, [string, string]> = {
  period_open: ["The period has not ended.", "El período no ha terminado."],
  open_entry: ["A recorded entry has no clock-out.", "Un registro no tiene salida marcada."],
  open_break: ["A recorded break has no end.", "Un descanso registrado no tiene fin."],
  pending_correction: ["A time correction awaits review.", "Una corrección de tiempo espera revisión."],
  overlapping_time: ["Recorded entries overlap.", "Hay registros de tiempo superpuestos."],
  no_records: ["No recorded time; review the period population. This does not establish absence.", "Sin tiempo registrado; revise la población del período. Esto no establece una ausencia."],
  review_required: ["The timecard has not been finalized.", "La tarjeta de tiempo no está finalizada."],
  RULE_ACCEPTANCE_REQUIRED: ["Payroll rule acceptance is required.", "Se requiere aceptar las reglas de nómina."],
  SETTINGS_REQUIRED: ["Payroll settings are missing.", "Falta la configuración de nómina."],
  POPULATION_REVIEW_REQUIRED: ["The period population needs review.", "La población del período necesita revisión."],
  POPULATION_SOURCE_CONFLICT: ["The period population refers to older records.", "La población del período usa registros anteriores."],
  WAITING_FOR_AMOUNTS: ["The recorded run awaits amounts.", "La corrida registrada espera importes."],
  NATIVE_INPUT_REQUIRED: ["Native payroll inputs are missing.", "Faltan datos para la nómina interna."],
  LOCATION_COVERAGE_REQUIRED: ["Location coverage is incomplete.", "La cobertura de ubicaciones está incompleta."],
  OTHER: ["Another payroll exception needs review in Payroll.", "Otra excepción de nómina necesita revisión en Nómina."],
};
export function issueLabel(code: string, language: "en" | "es") {
  return (issueLabels[code] ?? issueLabels.OTHER)[language === "es" ? 1 : 0];
}
