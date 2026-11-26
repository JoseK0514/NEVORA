import "server-only";
import { correctionJson } from "@/lib/time-corrections/http.server";

export function payrollExportLaunchRefusal(): Response | null {
  if (process.env.NEVORA_PAYROLL_EXPORTS_DISABLED !== "true") return null;
  return correctionJson({ state: "unavailable", reason: "PAYROLL_EXPORTS_DISABLED" }, 403);
}
