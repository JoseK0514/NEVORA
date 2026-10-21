import { parseCompanyPolicySettings, type CompanyPolicySettings } from "./model";
import type { PolicyRevision } from "./service";

export type StoredPolicyRevision = Omit<PolicyRevision, "settings" | "changedKeys"> & {
  settings: unknown;
  changedKeys: unknown;
};
export type PolicyHistoryRevision = Omit<PolicyRevision, "settings" | "changedKeys"> & {
  changedKeys: string[] | null;
} & (
  | { state: "valid"; settings: CompanyPolicySettings }
  | { state: "unavailable"; reason: "invalid_settings" }
);
export type PolicyScopeHistory = { locationId: string | null; expectedRevision: number } & (
  | { state: "not_configured"; selected: null }
  | { state: "valid"; selected: Extract<PolicyHistoryRevision, { state: "valid" }> }
  | {
      state: "unavailable";
      reason: "invalid_settings";
      selected: Extract<PolicyHistoryRevision, { state: "unavailable" }>;
    }
);
export type CompanyPolicyHistory = {
  revisions: PolicyHistoryRevision[];
  scopes: PolicyScopeHistory[];
};
const changedKeys = new Set([
  "attendance.lateness",
  "attendance.earlyDeparture",
  "attendance.longEntry",
  "attendance.missingClockIn",
  "attendance.missingClockOut",
  "labor.overtimeRisk",
  "labor.compensation",
  "labor.rates",
  "labor.budgets",
  "labor.calculationMethod",
]);
function projectRevision(row: StoredPolicyRevision): PolicyHistoryRevision {
  // Select metadata explicitly. Never spread an unvalidated settings payload or
  // reflect parser messages/unknown changed-key content into the Owner view.
  const metadata = {
    operationId: row.operationId,
    revision: row.revision,
    locationId: row.locationId,
    changedAt: row.changedAt,
    changedKeys:
      Array.isArray(row.changedKeys) && row.changedKeys.length <= changedKeys.size &&
      row.changedKeys.every((key) => typeof key === "string" && changedKeys.has(key))
        ? [...row.changedKeys] as string[]
        : null,
  };
  let settings: CompanyPolicySettings;
  try {
    settings = parseCompanyPolicySettings(row.settings);
  } catch {
    return { ...metadata, state: "unavailable", reason: "invalid_settings" };
  }
  return { ...metadata, state: "valid", settings };
}
/** Owner-only recovery display. This does not supply effective policies or
 * convert an invalid latest revision into an absent/unconfigured scope. */
export function projectCompanyPolicyHistory(rows: StoredPolicyRevision[]): CompanyPolicyHistory {
  const revisions = rows.map(projectRevision);
  const latest = new Map<string | null, PolicyHistoryRevision>();
  for (const row of revisions) {
    const previous = latest.get(row.locationId);
    if (!previous || row.revision > previous.revision) latest.set(row.locationId, row);
  }
  const locationIds = [null, ...[...latest.keys()].filter((id): id is string => id !== null).sort()];
  const scopes: PolicyScopeHistory[] = locationIds.map((locationId) => {
    const selected = latest.get(locationId);
    if (!selected) return { locationId, expectedRevision: 0, state: "not_configured", selected: null };
    if (selected.state === "unavailable") {
      return {
        locationId,
        expectedRevision: selected.revision,
        state: "unavailable",
        reason: selected.reason,
        selected,
      };
    }
    return { locationId, expectedRevision: selected.revision, state: "valid", selected };
  });
  return { revisions, scopes };
}
