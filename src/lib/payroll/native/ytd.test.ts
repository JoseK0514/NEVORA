import { describe, it, expect } from "vitest";
import { projectNativeYtd, type NativeLedgerEntry } from "./ytd";
import { calculateNativePayroll } from "./calculate";
import { input } from "./fixtures.test-support";
const opening = () => input().ytd!;
function ledger(id = "R1", correctionOf: string | null = null, sequence = 1): NativeLedgerEntry {
    const i = input();
    const r = calculateNativePayroll(i);
    if (r.state !== "ready")
        throw Error(JSON.stringify(r));
    return { runId: id, correctionOf, employeeId: i.employeeId, period: i.period, payday: i.payday, sequence, result: r };
}
describe("reproducible append-only YTD", () => {
    it("distinguishes attested opening zero from unknown", () => { expect(projectNativeYtd(opening(), [])).toMatchObject({ grossMinor: "0", netMinor: "0" }); expect(() => projectNativeYtd({ ...opening(), attested: false }, [])).toThrow("ATTESTED_YTD_REQUIRED"); });
    it("counts an approval exactly once and retains tax-specific/YTD locations", () => { const r = projectNativeYtd(opening(), [ledger()]); expect(r).toMatchObject({ grossMinor: "16000", netMinor: "14728", socialSecurityWagesMinor: "16000", medicareWagesMinor: "16000", sinotWagesMinor: "16000", locationIds: ["L1"] }); expect(r.deductions.SOCIAL_SECURITY).toBe("992"); expect(() => projectNativeYtd(opening(), [ledger(), ledger()])).toThrow("YTD_LINEAGE_CONFLICT"); });
    it("replaces a full original with its correction head rather than adding both", () => { const a = ledger(), b = ledger("R2", "R1", 2); b.result.row.grossMinor = "20000"; b.result.row.netMinor = "18728"; b.result.breakdown.earnings[0].amountMinor = "20000"; const r = projectNativeYtd(opening(), [a, b]); expect(r.grossMinor).toBe("20000"); expect(r.netMinor).toBe("18728"); expect(r.revision).toBe(3); });
    it("uses the balance before a latest correction target", () => { expect(projectNativeYtd(opening(), [ledger()], "R1").grossMinor).toBe("0"); });
    it("blocks earlier correction without downstream recalculation", () => { const a = ledger(), b = ledger("R2", null, 2); b.period = { startDate: "2026-10-12", endDate: "2026-10-18" }; b.payday = "2026-10-23"; expect(() => projectNativeYtd(opening(), [a, b], "R1")).toThrow("YTD_DEPENDENT_RUNS_REQUIRED"); });
    it("blocks branches, unknown predecessors and different-payday/year replacement", () => { expect(() => projectNativeYtd(opening(), [ledger(), ledger("R2", "R1", 2), ledger("R3", "R1", 3)])).toThrow("YTD_LINEAGE_CONFLICT"); expect(() => projectNativeYtd(opening(), [ledger("R2", "missing", 2)])).toThrow("YTD_LINEAGE_CONFLICT"); const b = ledger("R2", "R1", 2); b.payday = "2027-01-08"; expect(() => projectNativeYtd(opening(), [ledger(), b])).toThrow("YTD_LINEAGE_CONFLICT"); });
    it("pins revisions/lineage and retained disclosed locations in the fingerprint", () => { const a = ledger(), b = ledger("R2", "R1", 2); b.result.breakdown.locationIds = ["L2"]; const one = projectNativeYtd(opening(), [a]); const two = projectNativeYtd(opening(), [a, b]); expect(two.ledgerFingerprint).not.toBe(one.ledgerFingerprint); expect(two.locationIds).toEqual(["L1", "L2"]); });
});
it('retains approved context/correction footprint beyond current money locations for future Manager scope',()=>{const a=ledger();a.locationCoverage={complete:true,locationIds:['L1','L2']};expect(projectNativeYtd(opening(),[a]).locationIds).toEqual(['L1','L2']);});
