/**
 * Plain payroll setup on the owned PostgreSQL harness (fictional company and people).
 * Proves an Owner can go from nothing to a payroll run that prepares with zero setup
 * blockers using only plain inputs, while the server records the audit evidence.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createPunchFixture } from "./clocker-punch-fixture";
import { nativeProfiles, saveNativeProfile } from "../../lib/payroll/native/profiles.server";
import { readTimecards, mutateTimecard } from "../../lib/timecards/service";
import { readPeriodClose, savePeriodPopulation } from "../../lib/period-close/service";
import { command, newRun, readRun, saveSettings, source } from "../../lib/payroll/service";
import { captureNativePayroll } from "../../lib/payroll/native/source.server";
import { authority } from "../../lib/payroll/store";
import { verifySetupRecord } from "../../lib/payroll/native/setup";
import { input } from "../../lib/payroll/native/fixtures.test-support";
import type { NativeCompanyPayrollFacts, NativePlainOpening, NativeSetupRecord } from "../../lib/payroll/native/contracts";
import type { SessionMutationProof } from "../../lib/shift-changes/types";

const proof: SessionMutationProof = { employee: { id: "c34-owner", role: "OWNER", firstName: "Owner", lastName: "QA", primaryLocationId: "loc-1" }, sessionTokenHash: "a".repeat(64) };
const period = { startDate: "2026-09-21", endDate: "2026-09-27" }, payday = "2026-09-29";
// Monday 00:01 weeks reach one minute into Sep 28 and the six-day rest lookback reaches back two weeks.
const context = { startDate: "2026-09-08", endDate: "2026-09-28" };
let f: Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async () => {
    process.env.NEVORA_PAYROLL_ENABLED = "true";
    f = await createPunchFixture({ companyAccess: true });
    await f.q("UPDATE employees SET first_name='Luis',last_name='Ortiz' WHERE id='c34-a'");
    await f.q("UPDATE employees SET first_name='Marta',last_name='Cruz' WHERE id='c34-b'");
    await f.q("INSERT INTO clocker_break_types(id,workspace_id,name,category,created_by,updated_by) SELECT 'rest-1',id,'Rest break','REST','c34-owner','c34-owner' FROM workspaces WHERE singleton");
    await f.q("INSERT INTO clocker_break_types(id,workspace_id,name,category,created_by,updated_by) SELECT 'meal-1',id,'Meal','MEAL','c34-owner','c34-owner' FROM workspaces WHERE singleton");
});
afterEach(async () => { await f?.db.dispose(); delete process.env.NEVORA_PAYROLL_ENABLED; });

const defaults = (overrides: Partial<NativeCompanyPayrollFacts> = {}): NativeCompanyPayrollFacts => ({
    workweek: "STATUTORY_MONDAY_0001",
    employerPrograms: [{ code: "FUTA", applies: true, basisPoints: 60 }, { code: "PR_UI", applies: true, basisPoints: 340 }, { code: "CFSE", applies: true, basisPoints: 150 }],
    breakPay: [{ typeId: "meal-1", treatment: "UNPAID_RELIEVED_MEAL" }, { typeId: "rest-1", treatment: "PAID_REST" }],
    includeOwners: false, ...overrides,
});
const companyCommand = (expectedRevision = 0, overrides: Partial<NativeCompanyPayrollFacts> = {}) => ({ action: "SAVE_COMPANY_PAYROLL_DEFAULTS", operationId: randomUUID(), expectedRevision, defaults: defaults(overrides) });
const payCommand = (employeeId: string, options: { expectedRevision?: number; rate?: string; startsOn?: string; opening?: NativePlainOpening | null; openingRevision?: number } = {}) => ({
    action: "SAVE_EMPLOYEE_PAY_SETUP", operationId: randomUUID(), expectedRevision: options.expectedRevision ?? 0, employeeId,
    pay: { hourlyRateMinor: options.rate ?? "1250", rateStartsOn: options.startsOn ?? "2026-01-01", withholding: { personal: "INDIVIDUAL_FULL", fullDependents: 1, halfDependents: 0, deductionAllowances: 0, veteran: false, extraWithholdingMinor: "0" } },
    opening: options.opening === null ? null : { taxYear: 2026, expectedRevision: options.openingRevision ?? 0, totals: options.opening ?? { kind: "FRESH" } },
});
async function companySettings() {
    await saveSettings(proof, { action: "SAVE_SETTINGS", operationId: randomUUID(), expectedRevision: 0, effectiveFrom: "2026-01-01", reason: "Fictional pay schedule", preferences: { companyName: "Panadería Ficticia", language: "es", currency: "USD", schedule: { frequency: "WEEKLY", anchorDate: "2026-09-21", paydayOffsetDays: 2 }, rules: [], automation: { prepare: false, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null } }, f.db.executor);
}
async function workedWeek(employeeId: string) {
    for (const day of [21, 22, 23, 24, 25])
        await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',1)", [`${employeeId}-${day}`, employeeId, f.devices[0].device.id, `2026-09-${day}T12:00:00Z`, `2026-09-${day}T20:00:00Z`]);
}
async function finalize(employeeIds: string[]) {
    for (const action of ["APPROVE", "FINALIZE"] as const) {
        const read = await readTimecards(proof, context, f.db.executor);
        if (read.state !== "ready")
            throw Error("Time unavailable");
        for (const employeeId of employeeIds) {
            const card = read.cards.find(c => c.source.employeeId === employeeId)!;
            await mutateTimecard(proof, { operationId: randomUUID(), employeeId, ...context, action, expectedRevision: card.revision, expectedSourceHash: card.sourceHash }, f.db.executor);
        }
    }
}
async function population(dispositions: Record<string, "INCLUDE" | "ZERO_TIME" | "EXCLUDE">) {
    const close = await readPeriodClose(proof, period, f.db.executor);
    await savePeriodPopulation(proof, { operationId: randomUUID(), expectedRevision: 0, sourceHash: close.sourceHash, ...period, members: close.members.map(e => ({ employeeId: e.employeeId, disposition: dispositions[e.employeeId] ?? "EXCLUDE", reason: "Fictional reviewed population", employmentFacts: "Fictional employment", employmentBasis: "MANAGER_ATTESTED" })) }, f.db.executor);
}
const capture = async () => captureNativePayroll(await source(proof, period, f.db.executor), newRun(randomUUID(), period, payday), f.db.executor, authority(proof, "REVIEW"));
async function plainCompanyAndTeam() {
    await companySettings();
    await workedWeek("c34-a");
    await workedWeek("c34-b");
    await finalize(["c34-a", "c34-b"]);
    await saveNativeProfile(proof, companyCommand(), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-a"), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-b", { rate: "1500" }), f.db.executor);
    // The Owner is listed as included in the time review; the payroll default still leaves Owners out.
    await population({ "c34-a": "INCLUDE", "c34-b": "INCLUDE", "c34-owner": "INCLUDE" });
}

it("takes a fictional company from nothing to a payroll run that prepares with zero setup blockers using plain inputs only", async () => {
    // Nothing set up yet: every person is a blocker, and so are the Owner accounts.
    await companySettings();
    await workedWeek("c34-a");
    await workedWeek("c34-b");
    await finalize(["c34-a", "c34-b"]);
    await population({ "c34-a": "INCLUDE", "c34-b": "INCLUDE", "c34-owner": "INCLUDE" });
    const before = await capture();
    expect(before.run.status).toBe("BLOCKED");
    expect(before.run.exceptions).toEqual(expect.arrayContaining(["WAGE_PROFILE_REQUIRED:c34-a", "WAGE_PROFILE_REQUIRED:c34-b"]));
    expect(before.run.exceptions.some(e => e.endsWith(":c34-owner"))).toBe(false);
    // Plain inputs: company defaults once, then hourly rate + 499R-4 basics per person, starting fresh this year.
    await expect(saveNativeProfile(proof, payCommand("c34-a"), f.db.executor)).rejects.toThrow("COMPANY_PAYROLL_DEFAULTS_REQUIRED");
    await saveNativeProfile(proof, companyCommand(), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-a"), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-b", { rate: "1500" }), f.db.executor);
    const after = await capture();
    expect(after.run.exceptions).toEqual([]);
    expect(after.run.status).toBe("REVIEW_REQUIRED");
    expect(after.run.totals).toMatchObject({ grossMinor: "110000" });
    expect(after.snapshot?.native?.facts.populationRule).toEqual({ version: "OWNERS_EXCLUDED_BY_DEFAULT_V1", excludedOwnerIds: ["c34-owner"], companyDefaultsRevision: 1 });
    // The run prepares and is approved by a human like any other native run.
    const prepared = await command(proof, { action: "PREPARE", operationId: randomUUID(), period, payday }, f.db.executor);
    const run = await readRun(proof, prepared.runId!, f.db.executor);
    expect(run.payload.status).toBe("REVIEW_REQUIRED");
    expect(run.payload.exceptions).toEqual([]);
    const approved = await command(proof, { action: "APPROVE", operationId: randomUUID(), runId: run.payload.id, expectedRevision: run.payload.revision, reviewToken: run.payload.reviewToken }, f.db.executor);
    expect((await readRun(proof, approved.runId!, f.db.executor)).payload.status).toBe("APPROVED");
    const evidence = { period, payday, exceptionsBefore: before.run.exceptions, exceptionsAfter: run.payload.exceptions, statusAfter: run.payload.status, totals: run.payload.totals, populationRule: run.snapshot?.native?.facts.populationRule, setup: (await nativeProfiles(proof, f.db.executor)).setup };
    await mkdir("outputs/plain-payroll-setup", { recursive: true });
    await writeFile("outputs/plain-payroll-setup/fictional-company-zero-blockers.json", JSON.stringify(evidence, null, 2));
});

it("records who entered each setup fact, when, the revision, form version and a server SHA-256", async () => {
    await saveNativeProfile(proof, companyCommand(), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-a"), f.db.executor);
    const read = await nativeProfiles(proof, f.db.executor);
    const company = read.setup!.companyDefaults!, pay = read.setup!.records.find(r => r.kind === "EMPLOYEE_PAY" && r.subjectId === "c34-a")!, opening = read.setup!.records.find(r => r.kind === "OPENING_TOTALS")!;
    for (const record of [company, pay, opening] as (NativeSetupRecord & { verified: boolean })[]) {
        expect(record).toMatchObject({ enteredBy: { employeeId: "c34-owner", name: "Owner QA" }, formVersion: "NEVORA_PLAIN_PAYROLL_SETUP_V1", revision: 1, verified: true });
        expect(record.statement).toMatch(/^Entered by Owner QA on [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(record.factsSha256).toMatch(/^[a-f0-9]{64}$/);
        const { verified: _verified, ...stored } = record;
        expect(verifySetupRecord(stored)).toBe(true);
    }
    const configuration = read.configurations.find(c => c.employeeId === "c34-a")!;
    expect(configuration.wages[0]).toMatchObject({ evidenceReference: pay.reference, standardContextAttested: true, locationIds: ["loc-1", "loc-2"], workweekPolicy: { origin: { kind: "STATUTORY_DEFAULT", evidenceReference: company.reference } } });
    expect(configuration.tax).toMatchObject({ certificateReference: pay.reference, employerCoverageAttested: true });
    expect(read.openingYtd[0].ytd).toMatchObject({ attested: true, evidenceReference: opening.reference, ledgerFingerprint: opening.factsSha256, grossMinor: "0" });
    // The database rows carry the same fingerprint and refuse edits.
    expect(await f.q("SELECT kind,revision,actor_employee_id,facts_sha256=payload->>'factsSha256' AS matches FROM native_payroll_setup_records ORDER BY kind")).toEqual([{ kind: "COMPANY_DEFAULTS", revision: 1, actor_employee_id: "c34-owner", matches: true }, { kind: "EMPLOYEE_PAY", revision: 1, actor_employee_id: "c34-owner", matches: true }, { kind: "OPENING_TOTALS", revision: 1, actor_employee_id: "c34-owner", matches: true }]);
    await expect(f.q("UPDATE native_payroll_setup_records SET payload=payload||'{\"statement\":\"edited\"}'::jsonb")).rejects.toThrow("immutable");
    await expect(f.q("DELETE FROM native_payroll_setup_records")).rejects.toThrow("immutable");
    await expect(f.q("TRUNCATE native_payroll_setup_records")).rejects.toThrow("immutable");
});

it("keeps Owner-only authorization, expected revisions, exact replay and one winner under concurrency", async () => {
    const first = companyCommand();
    const receipt = await saveNativeProfile(proof, first, f.db.executor);
    expect(receipt).toMatchObject({ action: "SAVE_COMPANY_PAYROLL_DEFAULTS", employeeId: "COMPANY", revision: 1 });
    expect(await saveNativeProfile(proof, first, f.db.executor)).toEqual(receipt);
    await expect(saveNativeProfile(proof, { ...first, defaults: defaults({ includeOwners: true }) }, f.db.executor)).rejects.toThrow("OPERATION_CONFLICT");
    await expect(saveNativeProfile(proof, companyCommand(0), f.db.executor)).rejects.toThrow("NATIVE_PROFILE_CONFLICT");
    const results = await Promise.allSettled([saveNativeProfile(proof, payCommand("c34-a"), f.db.executor), saveNativeProfile(proof, payCommand("c34-a", { rate: "1300" }), f.db.executor)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await f.q("SELECT count(*)::int n FROM native_payroll_profile_revisions WHERE employee_id='c34-a'")).toEqual([{ n: 1 }]);
    expect(await f.q("SELECT count(*)::int n FROM native_payroll_setup_records WHERE kind='EMPLOYEE_PAY'")).toEqual([{ n: 1 }]);
    await expect(saveNativeProfile(proof, payCommand("c34-a"), f.db.executor)).rejects.toThrow("NATIVE_PROFILE_CONFLICT");
    await expect(saveNativeProfile(proof, payCommand("missing"), f.db.executor)).rejects.toThrow("CONFLICT");
    await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-owner'");
    await expect(saveNativeProfile(proof, companyCommand(1), f.db.executor)).rejects.toThrow("payroll_authorization");
    await expect(saveNativeProfile(proof, payCommand("c34-b"), f.db.executor)).rejects.toThrow("payroll_authorization");
});

it("applies company default changes to every plain-setup employee as a new recorded revision", async () => {
    await saveNativeProfile(proof, companyCommand(), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-a"), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-b"), f.db.executor);
    await saveNativeProfile(proof, companyCommand(1, { employerPrograms: [{ code: "FUTA", applies: true, basisPoints: 60 }, { code: "PR_UI", applies: true, basisPoints: 340 }, { code: "CFSE", applies: false, basisPoints: null }] }), f.db.executor);
    const read = await nativeProfiles(proof, f.db.executor);
    for (const employeeId of ["c34-a", "c34-b"]) {
        const configuration = read.configurations.find(c => c.employeeId === employeeId)!;
        expect(configuration.revision).toBe(2);
        expect(configuration.tax!.employerContributions.find(c => c.code === "CFSE")).toMatchObject({ applicability: "EXEMPT", evidenceReference: read.setup!.companyDefaults!.reference });
        const record = read.setup!.records.find(r => r.kind === "EMPLOYEE_PAY" && r.subjectId === employeeId)!;
        expect(record).toMatchObject({ revision: 2, cause: "COMPANY_DEFAULTS_APPLIED", derivedFrom: { companyDefaults: { revision: 2 } } });
        expect(record.statement).toMatch(/^Updated from company payroll defaults saved by Owner QA on /);
    }
    // Earlier revisions stay in the append-only history.
    expect(await f.q("SELECT count(*)::int n FROM native_payroll_profile_revisions")).toEqual([{ n: 4 }]);
});

it("leaves Owners out by default and includes them when the company switch is on", async () => {
    await plainCompanyAndTeam();
    expect((await capture()).run.exceptions).toEqual([]);
    await saveNativeProfile(proof, companyCommand(1, { includeOwners: true }), f.db.executor);
    const included = await capture();
    expect(included.run.status).toBe("BLOCKED");
    expect(included.run.exceptions).toContain("WAGE_PROFILE_REQUIRED:c34-owner");
});

it("locks year-to-date totals once payroll for the year is approved, while rates can still change", async () => {
    await plainCompanyAndTeam();
    const prepared = await command(proof, { action: "PREPARE", operationId: randomUUID(), period, payday }, f.db.executor);
    const run = await readRun(proof, prepared.runId!, f.db.executor);
    await command(proof, { action: "APPROVE", operationId: randomUUID(), runId: run.payload.id, expectedRevision: run.payload.revision, reviewToken: run.payload.reviewToken }, f.db.executor);
    await expect(saveNativeProfile(proof, payCommand("c34-a", { expectedRevision: 1, openingRevision: 1, opening: { kind: "MID_YEAR", grossMinor: "100000", withheld: { socialSecurityMinor: "0", medicareMinor: "0", prIncomeTaxMinor: "0", sinotMinor: "0" }, employerPaid: { socialSecurityMinor: "0", medicareMinor: "0", sinotMinor: "0", futaMinor: "0", prUiMinor: "0", cfseMinor: "0" } } }), f.db.executor)).rejects.toThrow("OPENING_TOTALS_LOCKED");
    const raise = await saveNativeProfile(proof, payCommand("c34-a", { expectedRevision: 1, rate: "1400", startsOn: "2026-10-01", opening: null }), f.db.executor);
    expect(raise.revision).toBe(2);
    const wages = (await nativeProfiles(proof, f.db.executor)).configurations.find(c => c.employeeId === "c34-a")!.wages;
    expect(wages.map(w => [w.hourlyRateMinor, w.effectiveFrom, w.effectiveTo])).toEqual([["1250", "2026-01-01T04:00:00Z", "2026-10-01T04:00:00Z"], ["1400", "2026-10-01T04:00:00Z", null]]);
    // The approved run is unchanged and still frozen.
    expect((await readRun(proof, run.payload.id, f.db.executor)).payload.status).toBe("APPROVED");
});

it("records mid-year totals as plain amounts and still records detailed full-contract saves", async () => {
    await saveNativeProfile(proof, companyCommand(), f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-a", { opening: { kind: "MID_YEAR", grossMinor: "1000000", withheld: { socialSecurityMinor: "62000", medicareMinor: "14500", prIncomeTaxMinor: "40000", sinotMinor: "3000" }, employerPaid: { socialSecurityMinor: "62000", medicareMinor: "14500", sinotMinor: "3000", futaMinor: "4200", prUiMinor: "23800", cfseMinor: "15000" } } }), f.db.executor);
    const read = await nativeProfiles(proof, f.db.executor);
    expect(read.openingYtd[0].ytd).toMatchObject({ grossMinor: "1000000", netMinor: "880500", locationIds: ["loc-1"], employerWagesMinor: { FUTA: "1000000", PR_UI: "1000000", CFSE: "1000000" } });
    expect(read.configurations[0].tax!.employerContributions.map(c => c.wagesBeforeMinor)).toEqual(["1000000", "1000000", "1000000"]);
    await saveNativeProfile(proof, { action: "ATTEST_OPENING_YTD", operationId: randomUUID(), reason: "Fictional detailed opening", expectedRevision: 0, employeeId: "c34-b", ytd: input().ytd }, f.db.executor);
    expect(await f.q("SELECT payload->>'formVersion' AS form,payload->>'statement' AS statement FROM native_payroll_setup_records WHERE subject_id='c34-b'")).toEqual([{ form: "NEVORA_NATIVE_FULL_CONTRACT_V1", statement: expect.stringMatching(/^Entered by Owner QA on /) }]);
});

it("keeps a recorded 30-minute meal agreement when a later save leaves it out", async () => {
    await saveNativeProfile(proof, companyCommand(), f.db.executor);
    const first = payCommand("c34-a");
    await saveNativeProfile(proof, { ...first, pay: { ...first.pay, mealReductionAgreement: true } }, f.db.executor);
    await saveNativeProfile(proof, payCommand("c34-a", { expectedRevision: 1, rate: "1300", opening: null }), f.db.executor);
    const read = await nativeProfiles(proof, f.db.executor);
    expect(read.configurations.find(c => c.employeeId === "c34-a")!.wages.map(w => w.mealReductionAgreement)).toEqual([true]);
    expect((read.setup!.records.find(r => r.kind === "EMPLOYEE_PAY")!.facts as { entered: { mealReductionAgreement: boolean } }).entered.mealReductionAgreement).toBe(true);
    // Company default changes keep it too.
    await saveNativeProfile(proof, companyCommand(1, { includeOwners: true }), f.db.executor);
    expect((await nativeProfiles(proof, f.db.executor)).configurations.find(c => c.employeeId === "c34-a")!.wages[0].mealReductionAgreement).toBe(true);
});
