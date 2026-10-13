import type { NativeYtd, NativePayrollReady } from "./contracts";
import { hash } from "../store";
import { minor } from "./money";
import { fail } from "./time";
export type NativeLedgerEntry = {
    runId: string;
    correctionOf: string | null;
    employeeId: string;
    period: {
        startDate: string;
        endDate: string;
    };
    payday: string;
    sequence: number;
    result: NativePayrollReady;
    locationCoverage?:{complete:boolean;locationIds:string[]}|null;
    deductionSources?: import("./contracts").NativeAuthorizedDeduction[];
};
export function projectNativeYtd(opening: NativeYtd, ledger: NativeLedgerEntry[], correctionOf: string | null = null): NativeYtd {
    if (!opening || opening.attested !== true || !opening.evidenceReference || opening.revision < 1)
        fail("ATTESTED_YTD_REQUIRED");
    if (ledger.length > 5000)
        fail("YTD_SOURCE_LIMIT");
    const byId = new Map<string, NativeLedgerEntry>(), successors = new Set<string>();
    for (const item of ledger) {
        if (byId.has(item.runId) || item.result.employeeId !== item.employeeId || !Number.isSafeInteger(item.sequence) || item.sequence < 1 || !item.payday.startsWith(opening.year + "-"))
            fail("YTD_LINEAGE_CONFLICT");
        byId.set(item.runId, item);
    }
    for (const item of ledger) {
        if (!item.correctionOf)
            continue;
        const prior = byId.get(item.correctionOf);
        if (!prior || successors.has(prior.runId) || prior.sequence >= item.sequence || prior.employeeId !== item.employeeId || prior.payday !== item.payday || JSON.stringify(prior.period) !== JSON.stringify(item.period))
            fail("YTD_LINEAGE_CONFLICT");
        successors.add(prior.runId);
    }
    let heads = ledger.filter(item => !successors.has(item.runId)).sort((a, b) => a.sequence - b.sequence);
    if (correctionOf !== null) {
        const target = heads.find(item => item.runId === correctionOf);
        if (!target)
            fail("YTD_LINEAGE_CONFLICT");
        if (heads.some(item => item.sequence > target.sequence))
            fail("YTD_DEPENDENT_RUNS_REQUIRED");
        heads = heads.filter(item => item.runId !== target.runId);
    }
    const output: NativeYtd = { ...opening, revision: opening.revision + ledger.length, deductions: { ...opening.deductions }, employerContributions: { ...opening.employerContributions }, employerWagesMinor: { ...opening.employerWagesMinor }, locationIds: [...new Set([...opening.locationIds, ...ledger.flatMap(item => [...item.result.breakdown.locationIds,...item.result.breakdown.ytdBefore.locationIds,...item.result.breakdown.ytdAfter.locationIds,...(item.locationCoverage?.locationIds??[])])])].sort(), ledgerFingerprint: hash({ opening, ledger: [...ledger].sort((a, b) => a.sequence - b.sequence), correctionOf }) };
    const plus = (a: string, b: string) => (minor(a) + minor(b)).toString();
    for (const item of heads) {
        const row = item.result.row;
        output.grossMinor = plus(output.grossMinor, row.grossMinor);
        output.netMinor = plus(output.netMinor, row.netMinor);
        // Supported standard scope has the same recorded gross in each wage base;
        // caps restrict current taxes, not the same-employer cumulative wages.
        for (const field of ["socialSecurityWagesMinor", "medicareWagesMinor", "sinotWagesMinor"] as const)
            output[field] = plus(output[field], row.grossMinor);
        for (const d of row.employeeDeductions)
            output.deductions[d.code] = plus(output.deductions[d.code] ?? "0", d.amountMinor);
        for (const d of row.employerContributions)
            output.employerContributions[d.code] = plus(output.employerContributions[d.code] ?? "0", d.amountMinor);
        for (const code of Object.keys(output.employerWagesMinor))
            output.employerWagesMinor[code] = plus(output.employerWagesMinor[code], row.grossMinor);
    }
    return output;
}
