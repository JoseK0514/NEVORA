import "server-only";

/** The same private flag and exact "true" value admitted by the export routes. */
export function payrollExportsDisabled() {
  return process.env.NEVORA_PAYROLL_EXPORTS_DISABLED === "true";
}
