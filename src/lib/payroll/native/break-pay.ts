import { Temporal } from "@js-temporal/polyfill";
import type { NativeWageProfile } from "./contracts";
import { parseConfiguration } from "./model";
import { nativeBreakTreatment } from "./time";

export type BreakPay = "PAID" | "UNPAID";
/** One recorded break to classify: its recorded type and the effective boundaries
 * and location of the entry it belongs to. */
export type BreakPayQuery = { id: string; employeeId: string; typeId: string | null; locationId: string; startAt: string; endAt: string | null };
export type PayProfileRow = { employeeId: string; configuration: unknown };

const ns = (v: string) => Temporal.Instant.from(v).epochNanoseconds;
function wagesByEmployee(rows: readonly PayProfileRow[]): Map<string, NativeWageProfile[]> {
    const wages = new Map<string, NativeWageProfile[]>();
    for (const row of rows) {
        try {
            const c = row.configuration as Record<string, unknown>;
            const parsed = parseConfiguration({ schema: c.schema, employeeId: c.employeeId, wages: c.wages, tax: c.tax, deductions: c.deductions, ...(c.calculationPolicyReference !== undefined ? { calculationPolicyReference: c.calculationPolicyReference } : {}) });
            if (parsed.employeeId === row.employeeId)
                wages.set(row.employeeId, parsed.wages);
        }
        catch {
            // An incomplete or invalid profile classifies nothing; paid time stays unknown.
        }
    }
    return wages;
}

/** Classify breaks with the employee's payroll wage profile and the same rule native
 * payroll applies (nativeBreakTreatment). A break is left out (unknown) when no single
 * wage profile covers it or the engine would block it; callers then show no paid
 * total rather than a guess. Runs on the server: wage rates never leave it. */
export function resolveBreakPay(profiles: readonly PayProfileRow[], breaks: readonly BreakPayQuery[]): Record<string, BreakPay> {
    const wages = wagesByEmployee(profiles), out: Record<string, BreakPay> = {};
    for (const b of breaks) {
        if (b.endAt === null)
            continue;
        const start = ns(b.startAt), end = ns(b.endAt);
        const eligible = (wages.get(b.employeeId) ?? []).filter(w => w.locationIds.includes(b.locationId) && ns(w.effectiveFrom) <= start && (!w.effectiveTo || ns(w.effectiveTo) >= end));
        if (eligible.length !== 1)
            continue;
        try {
            out[b.id] = nativeBreakTreatment(eligible[0], b);
        }
        catch {
            // Blocked by the engine (unmapped type, short meal, long rest): unknown.
        }
    }
    return out;
}

/** Current payroll wage profiles for the given employees, or none when the native
 * payroll schema is not installed. Only break rules are used from the result. */
export function payProfilesStatement(workspaceId: string, employeeIds: readonly string[]) {
    return { text: `SELECT employee_id AS "employeeId",payload AS configuration FROM native_payroll_profiles_current WHERE workspace_id=$1 AND employee_id=ANY($2::text[]) ORDER BY employee_id`, values: [workspaceId, [...employeeIds]] };
}
