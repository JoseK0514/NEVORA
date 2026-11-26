export function isPayrollExportDisabled(status: number, body: unknown) {
  return status === 403 && typeof body === "object" && body !== null
    && "state" in body && body.state === "unavailable"
    && "reason" in body && body.reason === "PAYROLL_EXPORTS_DISABLED";
}

export const payrollExportAvailability = {
  en: {
    title: "Payroll exports are unavailable",
    line: "You can still prepare and review time records in NEVORA. Your company processes payroll and pays employees through its external payroll system.",
    period: "Review this period",
    history: "People and period history",
    historyLine: "Review who’s included and the records for this period.",
    boundary: (period: string, zone: string) => `Check the start and end of ${period} in ${zone}. Reconcile the timecards at the period boundary before exporting. Previous export receipts are still available.`,
  },
  es: {
    title: "Las exportaciones de nómina no están disponibles",
    line: "Puedes preparar y revisar los registros de tiempo en NEVORA. Tu empresa procesa la nómina y paga a los empleados en su sistema de nómina externo.",
    period: "Revisar este período",
    history: "Personas e historial del período",
    historyLine: "Revisa a quiénes incluye la lista y los registros de este período.",
    boundary: (period: string, zone: string) => `Verifica el inicio y el fin del período del ${period} en ${zone}. Concilia las tarjetas de tiempo en esos límites antes de exportar. Los recibos de exportaciones anteriores siguen disponibles.`,
  },
} as const;
