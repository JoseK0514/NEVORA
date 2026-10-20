import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { parseNativeProfileCommand } from "./model";
import { input } from "./fixtures.test-support";
import { fictionalWorkweekPolicy } from "./workweek-fixtures.test-support";
const command = () => { const i = input(); return { action: "SAVE_NATIVE_PROFILE", operationId: randomUUID(), reason: "Verified fictional actual payroll elections", expectedRevision: 0, configuration: { schema: "NEVORA_NATIVE_CONFIGURATION_V1", employeeId: i.employeeId, wages: i.wages, tax: i.tax, deductions: i.deductions } }; };
describe("Owner native configuration boundary", () => {
    it("accepts explicit versioned facts without importing planning rates", () => expect(parseNativeProfileCommand(command())).toEqual(expect.objectContaining({ action: "SAVE_NATIVE_PROFILE" })));
    it.each([null, [], new String("HOURLY"), { toString: () => "HOURLY" }])("rejects nonprimitive wage compensation %j", value => { const c = command(); c.configuration.wages[0].compensation = value as never; expect(() => parseNativeProfileCommand(c)).toThrow("INVALID_NATIVE_PROFILE"); });
    it.each([null, [], "30", NaN, Infinity, -1, 31])("rejects unknown/coerced SINOT elections %j", value => { const c = command(); c.configuration.tax!.sinotEmployeeBasisPoints = value as never; expect(() => parseNativeProfileCommand(c)).toThrow("INVALID_NATIVE_PROFILE"); });
    it.each(["-1", "02000", 2000, {}, "0", "1e3"])("rejects invalid or zero actual wage %j", value => { const c = command(); c.configuration.wages[0].hourlyRateMinor = value as never; expect(() => parseNativeProfileCommand(c)).toThrow("INVALID_NATIVE_PROFILE"); });
    it("rejects profile-controlled payroll money or source fields", () => { const c = command(); expect(() => parseNativeProfileCommand({ ...c, amounts: { grossMinor: "1" } })).toThrow("INVALID_NATIVE_PROFILE"); expect(() => parseNativeProfileCommand({ ...c, configuration: { ...c.configuration, scheduledHours: 40 } })).toThrow("INVALID_NATIVE_PROFILE"); });
    it("rejects unsafe revisions and invalid effective dates", () => { const c = command(); expect(() => parseNativeProfileCommand({ ...c, expectedRevision: "0" })).toThrow("INVALID_NATIVE_PROFILE"); c.configuration.tax!.effectiveFrom = "2026-02-30"; expect(() => parseNativeProfileCommand(c)).toThrow("INVALID_NATIVE_PROFILE"); });
    it("rejects duplicate break elections and duplicate location coverage", () => { const c = command(); c.configuration.wages[0].breakRules.push({ ...c.configuration.wages[0].breakRules[0] }); expect(() => parseNativeProfileCommand(c)).toThrow("INVALID_NATIVE_PROFILE"); });
    it("rejects incomplete employer coverage", () => { const c = command(); c.configuration.tax!.employerContributions = []; expect(() => parseNativeProfileCommand(c)).toThrow("INVALID_NATIVE_PROFILE"); });
    it("requires an explicit attestation even for opening zero", () => { const i = input(); const c = { action: "ATTEST_OPENING_YTD", operationId: randomUUID(), reason: "Opening balance reviewed", expectedRevision: 0, employeeId: i.employeeId, ytd: i.ytd }; expect(parseNativeProfileCommand(c)).toEqual(c); expect(() => parseNativeProfileCommand({ ...c, ytd: { ...i.ytd, attested: false } })).toThrow("INVALID_NATIVE_PROFILE"); });
    it("requires finite distinct locations for enabled Manager permissions", () => {
        const c = { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "Finite payroll authority", expectedRevision: 0, employeeId: "M1", review: true, approve: false, locationIds: ["L1"] };
        expect(parseNativeProfileCommand(c)).toEqual(c);
        for (const value of [[], ["L1", "L1"], ["*"]])
            expect(() => parseNativeProfileCommand({ ...c, locationIds: value })).toThrow("INVALID_NATIVE_PROFILE");
        expect(() => parseNativeProfileCommand({ ...c, review: false, approve: true })).toThrow("INVALID_NATIVE_PROFILE");
    });
});

it('accepts explicit employee-covered default facts and saves unknown policy without inventing a notice', () => {
    const c = command(); c.configuration.wages[0].workweekStartTime = '00:01';
    c.configuration.wages[0].workweekPolicy = fictionalWorkweekPolicy('E1', { weekday:1,startTime:'00:01',timeZone:'America/Puerto_Rico' }, true);
    expect(parseNativeProfileCommand(c)).toEqual(c);
    c.configuration.wages[0].workweekStartTime = '00:00'; c.configuration.wages[0].workweekPolicy = null;
    expect(parseNativeProfileCommand(c)).toEqual(c);
});
it('does not accept a provided workweek notice belonging to another employee', () => {
    const c=command();c.configuration.wages[0].workweekPolicy=fictionalWorkweekPolicy('OTHER');
    expect(()=>parseNativeProfileCommand(c)).toThrow('INVALID_NATIVE_PROFILE');
});

it('saves an unknown workweek with both legacy coordinates null without inventing clock facts', () => {
    const c = command();
    c.configuration.wages[0].workweekAnchorDate = null;
    c.configuration.wages[0].workweekStartTime = null;
    c.configuration.wages[0].workweekPolicy = null;
    expect(parseNativeProfileCommand(c)).toEqual(c);
});
it('saves an explicit employee-covered workweek without redundant legacy coordinates', () => {
    const c = command();
    c.configuration.wages[0].workweekAnchorDate = null;
    c.configuration.wages[0].workweekStartTime = null;
    expect(parseNativeProfileCommand(c)).toEqual(c);
});
it.each(['workweekAnchorDate', 'workweekStartTime'] as const)('rejects incomplete legacy coordinate pair %s', field => {
    const c = command(); c.configuration.wages[0][field] = null;
    expect(() => parseNativeProfileCommand(c)).toThrow('INVALID_NATIVE_PROFILE');
});
