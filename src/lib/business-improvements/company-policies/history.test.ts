import { expect, it } from "vitest";
import { projectCompanyPolicyHistory, type StoredPolicyRevision } from "./history";
const rule = { thresholdMinutes: 7, comparison: "GT", effectiveFrom: "2030-10-01T00:00:00Z" };
const row = (revision: number, settings: unknown, locationId: string | null = null): StoredPolicyRevision => ({ operationId: `11111111-1111-4111-8111-${String(revision).padStart(12, "0")}`, revision, locationId, changedAt: rule.effectiveFrom, changedKeys: ["attendance.lateness"], settings });
const valid = { version: 1, attendance: { lateness: rule } };
it.each([null, [], { version: "1" }, { version: 1, attendance: { lateness: { ...rule, comparison: ["GT"] } } }, { version: 1, labor: { rates: [{ id: "private-invalid-rate", rateUnit: ["HOUR"] }] } }])("invalid saved settings remain explicit and do not expose raw settings: %j", (settings) => {
  const input = [row(1, valid), row(2, settings)];
  const before = structuredClone(input);
  const history = projectCompanyPolicyHistory(input);
  expect(history.revisions[1]).toEqual({ operationId: input[1].operationId, revision: 2, locationId: null, changedAt: rule.effectiveFrom, changedKeys: ["attendance.lateness"], state: "unavailable", reason: "invalid_settings" });
  expect(history.scopes[0]).toMatchObject({ expectedRevision: 2, state: "unavailable", selected: { revision: 2 } });
  expect(history.revisions[1]).not.toHaveProperty("settings");
  expect(JSON.stringify(history)).not.toMatch(/private-invalid-rate|rateUnit/);
  expect(input).toEqual(before);
});
it("selects revision numbers per scope, keeps older invalid evidence, and never falls back", () => {
  const latestCompany = row(3, { version: 1, attendance: { lateness: null }, labor: { rates: null } });
  latestCompany.changedAt = "2020-01-01T00:00:00Z";
  const invalid = { version: 1, attendance: { lateness: { ...rule, comparison: ["GT"] } } };
  const history = projectCompanyPolicyHistory([row(2, invalid), row(9, invalid, "loc-1"), latestCompany, row(1, valid), row(8, valid, "loc-1"), row(1, { version: 1 }, "loc-2")]);
  expect(history.revisions).toHaveLength(6);
  expect(history.scopes.map((s) => [s.locationId, s.expectedRevision, s.state])).toEqual([[null, 3, "valid"], ["loc-1", 9, "unavailable"], ["loc-2", 1, "valid"]]);
  expect(history.scopes[0].selected).toMatchObject({ settings: latestCompany.settings });
  expect(history.scopes[1].selected).not.toHaveProperty("settings");
  expect(history.revisions.filter((r) => r.state === "unavailable")).toHaveLength(2);
});
it("keeps valid scalar settings and private finance values only on Owner-valid rows", () => {
  const settings = { version: 1, attendance: { lateness: { ...rule, comparison: "GTE" }, longEntry: null }, labor: { rates: [{ id: "private-rate", employeeId: "owner", locationId: null, rate: "12.125", currency: "USD", rateUnit: "HOUR", validFrom: rule.effectiveFrom, validUntil: null }] } };
  const history = projectCompanyPolicyHistory([row(1, settings)]);
  expect(history.revisions[0]).toMatchObject({ state: "valid", settings });
  expect(history.revisions[0]).not.toHaveProperty("sessionTokenHash");
});
it("empty history has an explicit unconfigured company scope with expected revision zero", () => {
  expect(projectCompanyPolicyHistory([])).toEqual({ revisions: [], scopes: [{ locationId: null, expectedRevision: 0, state: "not_configured", selected: null }] });
});
it.each([{ changedKeys: ["private raw key"] }, { changedKeys: ["attendance.lateness", 7] }, { changedKeys: null }])("invalid changed-key metadata is unavailable, never coerced or exposed: %j", ({ changedKeys }) => {
  const history = projectCompanyPolicyHistory([{ ...row(1, valid), changedKeys }]);
  expect(history.revisions[0]).toMatchObject({ state: "valid", changedKeys: null });
  expect(JSON.stringify(history)).not.toContain("private raw key");
});
