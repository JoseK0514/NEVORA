import type { PayrollRun } from "../contracts";
import type { NativePayrollInput } from "./contracts";
export type NativePreparationFacts = {
    inputs: NativePayrollInput[];
    population: {
        employeeId: string;
        name: string;
        disposition: "INCLUDE" | "ZERO_TIME" | "EXCLUDE";
    }[];
    sourceFingerprint: string;
    ruleRevision: number | null;
    rulesVerified: boolean;
    employeeLocations: Record<string, string[]>;
    unknownCoverageEmployeeIds: string[];
    blockingIssues?: string[];
};
import { calculateNativePayroll } from "./calculate";
import { fingerprintClosingEvidence } from "./workweek-policy";
import { hash } from "../store";
import { parseImport, totals, PayrollError } from "../model";
/** Project captured facts into an unapproved run and review token without I/O. Any
 * blocking fact/calculation suppresses all visible rows, totals and ready employee
 * results so zero placeholders cannot be mistaken for an approvable payroll. */
export function buildNativeRunCandidate(run: PayrollRun, facts: NativePreparationFacts): PayrollRun {
    if (facts.population.length < 1 || facts.population.length > 300 || new Set(facts.population.map(e => e.employeeId)).size !== facts.population.length || new Set(facts.inputs.map(i => i.employeeId)).size !== facts.inputs.length || facts.inputs.some(i => !facts.population.some(e => e.employeeId === i.employeeId)))
        throw new PayrollError("NATIVE_POPULATION_CONFLICT", 409);
    const exceptions: string[] = [...(facts.blockingIssues ?? [])], employees: import("./contracts").NativePayrollReady[] = [];
    if (!facts.rulesVerified || facts.ruleRevision === null)
        exceptions.push("RULE_ACCEPTANCE_REQUIRED");
    for (const input of facts.inputs) {
        const required = [...new Set([...input.timecards.flatMap(c => c.entries.map(e => e.locationId)), ...(input.ytd?.locationIds ?? [])])];
        if (required.some(id => !facts.employeeLocations[input.employeeId]?.includes(id)))
            throw new PayrollError("NATIVE_LOCATION_COVERAGE_CONFLICT", 409);
    }
    if (facts.unknownCoverageEmployeeIds.length)
        exceptions.push("LOCATION_COVERAGE_REQUIRED");
    const rows = facts.population.map(member => {
        const zero = { employeeId: member.employeeId, employeeName: member.name, grossMinor: "0", employeeDeductions: [], employerContributions: [], netMinor: "0", earnings: [] };
        if (member.disposition === "EXCLUDE")
            return zero;
        const input = facts.inputs.find(i => i.employeeId === member.employeeId);
        if (!input) {
            exceptions.push(`NATIVE_INPUT_REQUIRED:${member.employeeId}`);
            return zero;
        }
        if (hash(input.period) !== hash(run.period) || input.payday !== run.payday) {
            exceptions.push(`NATIVE_PERIOD_CONFLICT:${member.employeeId}`);
            return zero;
        }
        const result = calculateNativePayroll(input);
        if (result.state === "blocked") {
            exceptions.push(...result.issues.map(i => `${i.code}:${member.employeeId}`));
            return zero;
        }
        if (member.disposition === "ZERO_TIME" && result.row.grossMinor !== "0") {
            exceptions.push(`POPULATION_DISPOSITION:${member.employeeId}`);
            return zero;
        }
        employees.push(result);
        return { ...result.row, employeeName: member.name };
    });
    const complete = facts.unknownCoverageEmployeeIds.length === 0 && facts.population.every(e => facts.employeeLocations[e.employeeId]?.length > 0);
    const coverage = { complete, locationIds: [...new Set(Object.values(facts.employeeLocations).flat())].sort() };
    const nativeCalculation = { version: "NATIVE_RUN_V1" as const, state: exceptions.length ? "blocked" as const : "ready" as const, ruleRevision: facts.ruleRevision, templateVersion: "NEVORA_NATIVE_PAYSTUB_PDF_V3" as const /* NATIVE_PAYSTUB_TEMPLATE_VERSION; issued runs keep the template they recorded */, employees: exceptions.length ? [] : employees };
    const amounts = parseImport({ schema: "NEVORA_PAYROLL_IMPORT_V1", currency: "USD", sourceName: "NEVORA actual recorded time", sourceReference: facts.sourceFingerprint, period: run.period, payday: run.payday, rows: rows.map(({ employeeName: _name, ...r }) => r) }, facts.population.map(e => e.employeeId));
    return { ...run, sourceAuthority: "NATIVE_RECORDED_TIME", status: exceptions.length ? "BLOCKED" : "REVIEW_REQUIRED", rows: exceptions.length ? null : rows, totals: exceptions.length ? null : totals(amounts), coverage, nativeCalculation, exceptions, sourceName: amounts.sourceName, sourceReference: amounts.sourceReference, reviewToken: exceptions.length ? null : hash({ runId: run.id, period: run.period, payday: run.payday, correction: run.nativeCorrection ?? null, facts: { ...facts, inputs: facts.inputs.map(i => i.closingContextEvidence ? { ...i, closingContextEvidence: fingerprintClosingEvidence(i.closingContextEvidence) } : i) }, results: employees }), approvedBy: null, approvedAt: null };
}
