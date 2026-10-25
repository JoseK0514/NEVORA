import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { calculateNativePayroll } from "./calculate";
import type { NativePayrollInput, NativeRecordedBreak, NativeRecordedEntry } from "./contracts";
import { OWNER_PROVISIONAL_POLICY_REFERENCE } from "./contracts";
import { input, entry } from "./fixtures.test-support";
import { classifyPayableHours } from "./payable-hours";
import { PR_FINAL_PERIODIC_HALF_UP_GUIDANCE } from "./pr-income-cent-policy";
import { classifyRecordedTime, nativeBreakTreatment } from "./time";

// Business analyst numeric cases (inspect/business.md §2), fictional $20/h fixture,
// week Oct 5–11 2026. Expected hours and gross are by hand; actual is the native engine.
// Jose 2026-10-25: overnight entries count wholly on their start day (B-02/B-15) and
// meal rules are review warnings only, never penalty pay (B-14).
const H = (hours: number) => BigInt(Math.round(hours * 3600)) * BigInt(1_000_000_000);
const at = (day: string, time: string) => `2026-10-${day}T${time}:00-04:00`;
const day = (d: string, s: string, e: string, id: string, breaks: NativeRecordedBreak[] = [], endDay = d): NativeRecordedEntry => ({ ...entry(id, at(d, s), at(endDay, e)), breaks });
const brk = (d: string, s: string, e: string, typeId: string | null, id: string): NativeRecordedBreak => ({ id, typeId, startAt: at(d, s), endAt: at(d, e) });
function scenario(entries: NativeRecordedEntry[], change?: (i: NativePayrollInput) => void) { const i = input(); i.timecards[0].entries = entries; change?.(i); return i; }
function ownerPolicy(i: NativePayrollInput) { i.calculationPolicyReference = OWNER_PROVISIONAL_POLICY_REFERENCE; for (const w of i.wages) w.wageCentRounding = "UNVERIFIED"; i.tax!.ruleEvidenceReference = PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id; }
const week = (days: string[], s: string, e: string) => days.map((d, k) => day(d, s, e, "T" + k));
const MON_FRI = ["05", "06", "07", "08", "09"];

type Expect = { regular: number; overtime: number; doubleTime?: number; restDay?: number; unpaid?: number; gross: string; warnings?: [string, number][] };
const ready: [string, NativePayrollInput, Expect][] = [
    ["C1 Mon 8:00–16:00", scenario([day("05", "08:00", "16:00", "T1")]), { regular: 8, overtime: 0, gross: "16000", warnings: [["NO_MEAL_5H", 480]] }],
    ["C2 Mon 8:00–18:00 with 60 min unpaid meal", scenario([day("05", "08:00", "18:00", "T1", [brk("05", "12:00", "13:00", "MEAL", "B1")])]), { regular: 8, overtime: 1, unpaid: 1, gross: "19000", warnings: [] }],
    ["C2b 8:00–16:30, 15 min paid rest + 30 min meal", scenario([day("05", "08:00", "16:30", "T1", [brk("05", "10:00", "10:15", "REST", "B1"), brk("05", "12:00", "12:30", "MEAL", "B2")])]), { regular: 8, overtime: 0, unpaid: 0.5, gross: "16000", warnings: [["MEAL_TOO_SHORT", 30]] }],
    ["C2c C2b with a recorded written 30-minute meal agreement", scenario([day("05", "08:00", "16:30", "T1", [brk("05", "10:00", "10:15", "REST", "B1"), brk("05", "12:00", "12:30", "MEAL", "B2")])], i => { i.wages[0].mealReductionAgreement = true; }), { regular: 8, overtime: 0, unpaid: 0.5, gross: "16000", warnings: [] }],
    ["C3 Mon–Fri 8:00–17:00", scenario(week(MON_FRI, "08:00", "17:00")), { regular: 40, overtime: 5, gross: "95000" }],
    ["C4 Mon–Sat 7.5 h", scenario(week([...MON_FRI, "10"], "08:00", "15:30")), { regular: 40, overtime: 5, gross: "95000" }],
    ["C5 Mon–Sun 6 h (7th day)", scenario(week([...MON_FRI, "10", "11"], "09:00", "15:00")), { regular: 36, overtime: 6, restDay: 6, gross: "90000" }],
    ["C11 Mon–Fri 7:00–17:00 at $40", scenario(week(MON_FRI, "07:00", "17:00"), i => { i.wages[0].hourlyRateMinor = "4000"; }), { regular: 40, overtime: 10, gross: "220000" }],
    ["C12 10 h straight, no meal", scenario([day("05", "07:00", "17:00", "T1")]), { regular: 8, overtime: 2, gross: "22000", warnings: [["NO_MEAL_5H", 600]] }],
    ["C13 8:07–16:02, no rounding", scenario([day("05", "08:07", "16:02", "T1")]), { regular: 7 + 55 / 60, overtime: 0, gross: "15833" }],
    ["C14 9 h, double time preserved", scenario([day("05", "08:00", "17:00", "T1")], i => { i.wages[0].overtime = "DOUBLE_PRESERVED"; }), { regular: 8, overtime: 0, doubleTime: 1, gross: "20000" }],
    ["P15 Mon–Thu 9 h @ $20 (L1), Fri 9 h @ $25 (L2)", scenario([...week(MON_FRI.slice(0, 4), "08:00", "17:00"), { ...day("09", "08:00", "17:00", "T5"), locationId: "L2" }], i => { i.wages.push({ ...i.wages[0], id: "W2", locationIds: ["L2"], hourlyRateMinor: "2500" }); }), { regular: 40, overtime: 5, gross: "99750" }],
    // Overnight: wholly on the start day; never blocks; no minute counted twice.
    ["C6 Mon 22–06 + Tue 22–08 (default policy)", scenario([day("05", "22:00", "06:00", "T1", [], "06"), day("06", "22:00", "08:00", "T2", [], "07")]), { regular: 16, overtime: 2, gross: "38000" }],
    ["P6 Mon 22–06 + Tue 22–08 (owner policy)", scenario([day("05", "22:00", "06:00", "T1", [], "06"), day("06", "22:00", "08:00", "T2", [], "07")], ownerPolicy), { regular: 16, overtime: 2, gross: "38000" }],
    ["C6b overnight 20:00–08:00 (default policy)", scenario([day("05", "20:00", "08:00", "T1", [], "06")]), { regular: 8, overtime: 4, gross: "28000", warnings: [["NO_MEAL_5H", 720]] }],
    ["P6b overnight 20:00–08:00 (owner policy)", scenario([day("05", "20:00", "08:00", "T1", [], "06")], ownerPolicy), { regular: 8, overtime: 4, gross: "28000", warnings: [["NO_MEAL_5H", 720]] }],
    ["P6d Mon 16:00–24:00 then Tue 00:00–04:00 (two entries)", scenario([day("05", "16:00", "00:00", "T1", [], "06"), day("06", "00:00", "04:00", "T2")], ownerPolicy), { regular: 12, overtime: 0, gross: "24000" }],
    ["N2 two overnights: Mon 22–Tue 06 and Tue 22–Wed 06", scenario([day("05", "22:00", "06:00", "T1", [], "06"), day("06", "22:00", "06:00", "T2", [], "07")]), { regular: 16, overtime: 0, gross: "32000" }],
    ["N3 Sun 22:00–Mon 06:30 counts on Sunday, in the Oct 5–11 period", scenario([day("11", "22:00", "06:30", "T1", [], "12")], i => { i.timecards[0].period.endDate = "2026-10-12"; }), { regular: 8, overtime: 0.5, gross: "17500", warnings: [["NO_MEAL_5H", 510]] }],
    // Meals: warnings only; a meal under 30 min and a long paid rest are paid time.
    ["C7 20 min unpaid meal is paid, with a warning", scenario([day("05", "08:00", "16:20", "T1", [brk("05", "12:00", "12:20", "MEAL", "B1")])]), { regular: 8, overtime: 1 / 3, gross: "17000", warnings: [["NO_MEAL_5H", 500], ["MEAL_TOO_SHORT", 20]] }],
    ["C8 25 min paid rest stays paid, with a warning", scenario([day("05", "08:00", "16:25", "T1", [brk("05", "10:00", "10:25", "REST", "B1")])]), { regular: 8, overtime: 25 / 60, gross: "17250", warnings: [["NO_MEAL_5H", 505], ["REST_TOO_LONG", 25]] }],
    ["M1 meal after 90 minutes of work", scenario([day("05", "08:00", "16:00", "T1", [brk("05", "09:30", "10:30", "MEAL", "B1")])]), { regular: 7, overtime: 0, unpaid: 1, gross: "14000", warnings: [["NO_MEAL_5H", 330], ["MEAL_TOO_EARLY", 90]] }],
];
const blocked: [string, NativePayrollInput, string][] = [
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
        expect(pay.row.grossMinor).toBe(want.gross);
        if (want.warnings) expect(hours.mealWarnings.map(w => [w.kind, w.minutes])).toEqual(want.warnings);
        // Same numbers payroll pays: no second overtime calculation.
        expect(hours.regularNanoseconds).toBe(pay.breakdown.regularNanoseconds);
        expect((BigInt(hours.overtimeNanoseconds) + BigInt(hours.doubleTimeNanoseconds)).toString()).toBe(pay.breakdown.overtimeNanoseconds);
        expect(hours.unpaidBreakNanoseconds).toBe(pay.breakdown.unpaidBreakNanoseconds);
        expect(hours.mealWarnings).toEqual(pay.breakdown.mealWarnings);
        // No penalty earning line: only regular, overtime and the FLSA money true-up.
        expect(pay.breakdown.earnings.every(e => ["REGULAR", "OVERTIME", "FLSA_TRUE_UP"].includes(e.kind))).toBe(true);
        const earned = pay.breakdown.earnings.filter(e => e.kind !== "FLSA_TRUE_UP").reduce((sum, e) => sum + BigInt(e.nanoseconds), BigInt(0));
        expect(hours.paidNanoseconds).toBe(earned.toString());
    });
    it.each(blocked)("%s blocks exactly as payroll does", (_name, i, code) => {
        const hours = classifyPayableHours(i), pay = calculateNativePayroll(i);
        expect(hours).toMatchObject({ state: "blocked", code });
        expect(pay).toMatchObject({ state: "blocked", issues: [{ code }] });
    });
    it("never counts a minute twice: each worked piece lies on exactly one attributed day", () => {
        const i = ready.find(([n]) => n.startsWith("N2"))![1];
        const pieces = classifyRecordedTime(i).pieces.filter(p => p.inPayPeriod);
        const byDay = new Map<string, bigint>();
        for (const p of pieces) byDay.set(p.date, (byDay.get(p.date) ?? BigInt(0)) + p.end - p.start);
        expect(Object.fromEntries([...byDay].map(([d, n]) => [d, n.toString()]))).toEqual({ "2026-10-05": H(8).toString(), "2026-10-06": H(8).toString() });
        const sorted = [...pieces].sort((a, b) => a.start < b.start ? -1 : 1);
        for (let k = 1; k < sorted.length; k++) expect(sorted[k].start >= sorted[k - 1].end).toBe(true);
        const elapsed = i.timecards[0].entries.reduce((n, e) => n + Temporal.Instant.from(e.endAt!).epochNanoseconds - Temporal.Instant.from(e.startAt).epochNanoseconds, BigInt(0));
        expect(pieces.reduce((n, p) => n + p.end - p.start, BigInt(0))).toBe(elapsed);
    });
    it("an overnight entry from the previous period is not paid again in this one", () => {
        const i = scenario([day("04", "22:00", "06:00", "T0", [], "05"), day("05", "08:00", "12:00", "T1")]);
        const hours = classifyPayableHours(i);
        expect(hours).toMatchObject({ state: "ready", paidNanoseconds: H(4).toString() });
    });
    it("records the shift-start-day rule in the boundary evidence", () => {
        const i = ready.find(([n]) => n.startsWith("P15"))![1];
        expect(classifyPayableHours(i)).toMatchObject({ state: "ready", basis: { wageProfiles: [{ id: "W1", revision: 1 }, { id: "W2", revision: 1 }], dailyInterpretation: "SHIFT_START_DAY", dailyInputDisposition: "SHIFT_START_DAY_ALL_ENTRIES" } });
        expect(calculateNativePayroll(i)).toMatchObject({ state: "ready", provenance: { boundaryEvidence: { dailyInterpretation: "SHIFT_START_DAY", dailyModels: ["SHIFT_START_DAY"] } } });
    });
    it("blocks without a wage profile rather than inventing pay rules", () => {
        expect(classifyPayableHours(scenario([day("05", "08:00", "16:00", "T1")], i => { i.wages = []; }))).toMatchObject({ state: "blocked", code: "WAGE_PROFILE_REQUIRED" });
    });
});

describe("the shared break pay rule", () => {
    const wage = input().wages[0];
    it.each([
        ["30 min mapped meal", brk("05", "12:00", "12:30", "MEAL", "B"), "UNPAID"],
        ["29 min mapped meal is paid time", brk("05", "12:00", "12:29", "MEAL", "B"), "PAID"],
        ["20 min mapped rest", brk("05", "10:00", "10:20", "REST", "B"), "PAID"],
        ["21 min mapped rest stays paid", brk("05", "10:00", "10:21", "REST", "B"), "PAID"],
    ] as const)("%s", (_n, b, want) => { expect(nativeBreakTreatment(wage, b)).toBe(want); });
    it.each([
        ["unmapped type", brk("05", "10:00", "10:15", "OTHER", "B"), "BREAK_PAY_BASIS_REQUIRED"],
        ["untyped break", brk("05", "10:00", "10:15", null, "B"), "BREAK_PAY_BASIS_REQUIRED"],
    ] as const)("%s throws the engine code", (_n, b, code) => { expect(() => nativeBreakTreatment(wage, b)).toThrow(code); });
});
