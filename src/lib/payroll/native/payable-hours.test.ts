import { describe, expect, it } from "vitest";
import { calculateNativePayroll } from "./calculate";
import type { NativePayrollInput, NativeRecordedBreak, NativeRecordedEntry } from "./contracts";
import { OWNER_PROVISIONAL_POLICY_REFERENCE } from "./contracts";
import { input, entry } from "./fixtures.test-support";
import { classifyPayableHours } from "./payable-hours";
import { PR_FINAL_PERIODIC_HALF_UP_GUIDANCE } from "./pr-income-cent-policy";
import { nativeBreakTreatment } from "./time";

// Business analyst numeric cases (inspect/business.md §2), fictional $20/h fixture,
// week Oct 5–11 2026. Expected hours are by hand; actual is the native engine.
const H = (hours: number) => BigInt(Math.round(hours * 3600)) * BigInt(1_000_000_000);
const at = (day: string, time: string) => `2026-10-${day}T${time}:00-04:00`;
const day = (d: string, s: string, e: string, id: string, breaks: NativeRecordedBreak[] = [], endDay = d): NativeRecordedEntry => ({ ...entry(id, at(d, s), at(endDay, e)), breaks });
const brk = (d: string, s: string, e: string, typeId: string | null, id: string): NativeRecordedBreak => ({ id, typeId, startAt: at(d, s), endAt: at(d, e) });
function scenario(entries: NativeRecordedEntry[], change?: (i: NativePayrollInput) => void) { const i = input(); i.timecards[0].entries = entries; change?.(i); return i; }
function ownerPolicy(i: NativePayrollInput) { i.calculationPolicyReference = OWNER_PROVISIONAL_POLICY_REFERENCE; for (const w of i.wages) w.wageCentRounding = "UNVERIFIED"; i.tax!.ruleEvidenceReference = PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id; }
const week = (days: string[], s: string, e: string) => days.map((d, k) => day(d, s, e, "T" + k));
const MON_FRI = ["05", "06", "07", "08", "09"];

type Expect = { regular: number; overtime: number; doubleTime?: number; restDay?: number; unpaid?: number };
const ready: [string, NativePayrollInput, Expect][] = [
    ["C1 Mon 8:00–16:00", scenario([day("05", "08:00", "16:00", "T1")]), { regular: 8, overtime: 0 }],
    ["C2 Mon 8:00–18:00 with 60 min unpaid meal", scenario([day("05", "08:00", "18:00", "T1", [brk("05", "12:00", "13:00", "MEAL", "B1")])]), { regular: 8, overtime: 1, unpaid: 1 }],
    ["C2b 8:00–16:30, 15 min paid rest + 30 min meal", scenario([day("05", "08:00", "16:30", "T1", [brk("05", "10:00", "10:15", "REST", "B1"), brk("05", "12:00", "12:30", "MEAL", "B2")])]), { regular: 8, overtime: 0, unpaid: 0.5 }],
    ["C3 Mon–Fri 8:00–17:00", scenario(week(MON_FRI, "08:00", "17:00")), { regular: 40, overtime: 5 }],
    ["C4 Mon–Sat 7.5 h", scenario(week([...MON_FRI, "10"], "08:00", "15:30")), { regular: 40, overtime: 5 }],
    ["C5 Mon–Sun 6 h (7th day)", scenario(week([...MON_FRI, "10", "11"], "09:00", "15:00")), { regular: 36, overtime: 6, restDay: 6 }],
    ["C11 Mon–Fri 7:00–17:00 at $40", scenario(week(MON_FRI, "07:00", "17:00"), i => { i.wages[0].hourlyRateMinor = "4000"; }), { regular: 40, overtime: 10 }],
    ["C12 10 h straight, no meal", scenario([day("05", "07:00", "17:00", "T1")]), { regular: 8, overtime: 2 }],
    ["C13 8:07–16:02, no rounding", scenario([day("05", "08:07", "16:02", "T1")]), { regular: 7 + 55 / 60, overtime: 0 }],
    ["C14 9 h, double time preserved", scenario([day("05", "08:00", "17:00", "T1")], i => { i.wages[0].overtime = "DOUBLE_PRESERVED"; }), { regular: 8, overtime: 0, doubleTime: 1 }],
    ["P15 Mon–Thu 9 h @ $20 (L1), Fri 9 h @ $25 (L2)", scenario([...week(MON_FRI.slice(0, 4), "08:00", "17:00"), { ...day("09", "08:00", "17:00", "T5"), locationId: "L2" }], i => { i.wages.push({ ...i.wages[0], id: "W2", locationIds: ["L2"], hourlyRateMinor: "2500" }); }), { regular: 40, overtime: 5 }],
    ["P6 Mon 22–06 + Tue 22–08 (owner policy)", scenario([day("05", "22:00", "06:00", "T1", [], "06"), day("06", "22:00", "08:00", "T2", [], "07")], ownerPolicy), { regular: 18, overtime: 0 }],
    ["P6b overnight 20:00–08:00 (owner policy)", scenario([day("05", "20:00", "08:00", "T1", [], "06")], ownerPolicy), { regular: 12, overtime: 0 }],
];
const blocked: [string, NativePayrollInput, string][] = [
    ["C6 overnight Mon 22–06 + Tue 22–08, default policy", scenario([day("05", "22:00", "06:00", "T1", [], "06"), day("06", "22:00", "08:00", "T2", [], "07")]), "DAILY_BOUNDARY_SENSITIVE"],
    ["C6b overnight 20:00–08:00, default policy", scenario([day("05", "20:00", "08:00", "T1", [], "06")]), "DAILY_BOUNDARY_SENSITIVE"],
    ["C7 20 min unpaid meal", scenario([day("05", "08:00", "16:20", "T1", [brk("05", "12:00", "12:20", "MEAL", "B1")])]), "UNSUPPORTED_UNPAID_BREAK_DURATION"],
    ["C8 25 min paid rest", scenario([day("05", "08:00", "16:25", "T1", [brk("05", "10:00", "10:25", "REST", "B1")])]), "UNSUPPORTED_PAID_BREAK_BASIS"],
    ["C9 break type not mapped", scenario([day("05", "08:00", "16:15", "T1", [brk("05", "10:00", "10:15", null, "B1")])]), "BREAK_PAY_BASIS_REQUIRED"],
    ["C10 $10.49/h below PR minimum", scenario([day("05", "08:00", "16:00", "T1")], i => { i.wages[0].hourlyRateMinor = "1049"; }), "BELOW_APPLICABLE_MINIMUM_WAGE"],
];

describe("payable hours come from the native payroll engine", () => {
    it.each(ready)("%s", (_name, i, want) => {
        const hours = classifyPayableHours(i), pay = calculateNativePayroll(i);
        expect(hours.state, JSON.stringify(hours)).toBe("ready");
        expect(pay.state, JSON.stringify(pay)).toBe("ready");
        if (hours.state !== "ready" || pay.state !== "ready") throw Error("Expected ready");
        // Expected by hand.
        expect(hours).toMatchObject({ regularNanoseconds: H(want.regular).toString(), overtimeNanoseconds: H(want.overtime).toString(), doubleTimeNanoseconds: H(want.doubleTime ?? 0).toString(), restDayNanoseconds: H(want.restDay ?? 0).toString(), unpaidBreakNanoseconds: H(want.unpaid ?? 0).toString(), paidNanoseconds: H(want.regular + want.overtime + (want.doubleTime ?? 0)).toString() });
        // Same numbers payroll pays: no second overtime calculation.
        expect(hours.regularNanoseconds).toBe(pay.breakdown.regularNanoseconds);
        expect((BigInt(hours.overtimeNanoseconds) + BigInt(hours.doubleTimeNanoseconds)).toString()).toBe(pay.breakdown.overtimeNanoseconds);
        expect(hours.unpaidBreakNanoseconds).toBe(pay.breakdown.unpaidBreakNanoseconds);
        const earned = pay.breakdown.earnings.filter(e => e.kind !== "FLSA_TRUE_UP").reduce((sum, e) => sum + BigInt(e.nanoseconds), BigInt(0));
        expect(hours.paidNanoseconds).toBe(earned.toString());
    });
    it.each(blocked)("%s blocks exactly as payroll does", (_name, i, code) => {
        const hours = classifyPayableHours(i), pay = calculateNativePayroll(i);
        expect(hours).toMatchObject({ state: "blocked", code });
        expect(pay).toMatchObject({ state: "blocked", issues: [{ code }] });
    });
    it("records which wage profiles and daily interpretation produced the hours", () => {
        const hours = classifyPayableHours(ready[10][1]);
        expect(hours).toMatchObject({ state: "ready", basis: { wageProfiles: [{ id: "W1", revision: 1 }, { id: "W2", revision: 1 }], dailyInterpretation: "UNRESOLVED", dailyInputDisposition: "INVARIANT_NO_FIRST_MINUTE_ENTRIES" } });
    });
    it("blocks without a wage profile rather than inventing pay rules", () => {
        expect(classifyPayableHours(scenario([day("05", "08:00", "16:00", "T1")], i => { i.wages = []; }))).toMatchObject({ state: "blocked", code: "WAGE_PROFILE_REQUIRED" });
    });
});

describe("the shared break pay rule", () => {
    const wage = input().wages[0];
    it.each([
        ["30 min mapped meal", brk("05", "12:00", "12:30", "MEAL", "B"), "UNPAID"],
        ["20 min mapped rest", brk("05", "10:00", "10:20", "REST", "B"), "PAID"],
    ] as const)("%s", (_n, b, want) => { expect(nativeBreakTreatment(wage, b)).toBe(want); });
    it.each([
        ["unmapped type", brk("05", "10:00", "10:15", "OTHER", "B"), "BREAK_PAY_BASIS_REQUIRED"],
        ["untyped break", brk("05", "10:00", "10:15", null, "B"), "BREAK_PAY_BASIS_REQUIRED"],
        ["29 min meal", brk("05", "12:00", "12:29", "MEAL", "B"), "UNSUPPORTED_UNPAID_BREAK_DURATION"],
        ["21 min rest", brk("05", "10:00", "10:21", "REST", "B"), "UNSUPPORTED_PAID_BREAK_BASIS"],
    ] as const)("%s throws the engine code", (_n, b, code) => { expect(() => nativeBreakTreatment(wage, b)).toThrow(code); });
});
