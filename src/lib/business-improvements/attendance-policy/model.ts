import { Temporal } from "@js-temporal/polyfill";

export const detectorKinds = [
  "missing_clock_in",
  "missing_clock_out",
  "policy_lateness",
  "policy_early_departure",
  "unusually_long_entry",
  "overtime_risk",
] as const;
export type DetectorKind = (typeof detectorKinds)[number];
export type DetectorPolicy = {
  kind: DetectorKind;
  id: string;
  version: number;
  approvalReference: string;
  basis: string;
  thresholdNanoseconds: string;
  comparison: "GT" | "GTE";
};
/** Trusted server-source facts only. An API caller cannot provide measurements or policies. */
export type DetectorMeasurement = {
  id: string;
  employeeId: string;
  locationId: string;
  kind: DetectorKind;
  basis: string;
  valueNanoseconds: string;
  complete: boolean;
  sourceVersion: string;
};
export type DetectorResult = {
  kind: DetectorKind;
  state: "evaluated" | "unverifiable";
  reason: "policy_not_selected" | "source_unverifiable" | null;
  policy: Pick<
    DetectorPolicy,
    | "id"
    | "version"
    | "approvalReference"
    | "basis"
    | "thresholdNanoseconds"
    | "comparison"
  > | null;
  observations: Array<{
    measurementId: string;
    employeeId: string;
    locationId: string;
    valueNanoseconds: string;
    thresholdNanoseconds: string;
    sourceVersion: string;
  }>;
};
const bases: Record<DetectorKind, string> = {
  missing_clock_in: "APPROVED_EXPECTED_ASSIGNMENT_CENSUS",
  missing_clock_out: "CAPTURED_SCHEDULE_END_OPEN_DELTA",
  policy_lateness: "CAPTURED_SCHEDULE_START_DELTA",
  policy_early_departure: "CAPTURED_SCHEDULE_END_DELTA",
  unusually_long_entry: "APPROVED_ENTRY_ELAPSED_BASIS",
  overtime_risk: "APPROVED_EFFECTIVE_TIME_PERIOD_BASIS",
};
const text = (v: unknown): v is string =>
  typeof v === "string" &&
  v === v.trim() &&
  v.length > 0 &&
  v.length <= 300 &&
  !/[\u0000-\u001f\u007f]/.test(v);
const ns = (v: unknown): v is string =>
  typeof v === "string" && /^(0|[1-9][0-9]{0,29})$/.test(v);

/** Comparison is explicit policy data. This contract makes no pay, absence,
 * discipline or legal classification. Empty evidence needs an explicit complete census. */
export function evaluateConfiguredDetectors(input: {
  workspaceId: string;
  observedAt: string;
  policies: readonly unknown[];
  measurements: readonly unknown[];
  completeKinds?: readonly DetectorKind[];
}):
  | {
      state: "ready";
      workspaceId: string;
      observedAt: string;
      detectors: DetectorResult[];
    }
  | { state: "unavailable"; reason: "invalid_source" | "source_limit" } {
  try {
    if (!text(input.workspaceId)) throw Error();
    Temporal.Instant.from(input.observedAt);
    if (
      !Array.isArray(input.policies) ||
      !Array.isArray(input.measurements) ||
      input.policies.length > 6 ||
      input.measurements.length > 5000
    )
      return { state: "unavailable", reason: "source_limit" };
    const policies = new Map<DetectorKind, DetectorPolicy>();
    for (const value of input.policies) {
      const p = value as DetectorPolicy;
      if (
        !p ||
        !detectorKinds.includes(p.kind) ||
        policies.has(p.kind) ||
        !text(p.id) ||
        !Number.isSafeInteger(p.version) ||
        p.version < 1 ||
        !text(p.approvalReference) ||
        p.basis !== bases[p.kind] ||
        !ns(p.thresholdNanoseconds) ||
        !["GT", "GTE"].includes(p.comparison)
      )
        throw Error();
      policies.set(p.kind, p);
    }
    const measurements = input.measurements as DetectorMeasurement[];
    const seen = new Set<string>();
    for (const m of measurements) {
      const key = JSON.stringify([m.kind, m.id]);
      if (
        !m ||
        !detectorKinds.includes(m.kind) ||
        !text(m.id) ||
        !text(m.employeeId) ||
        !text(m.locationId) ||
        !text(m.basis) ||
        !text(m.sourceVersion) ||
        !ns(m.valueNanoseconds) ||
        typeof m.complete !== "boolean" ||
        seen.has(key)
      )
        throw Error();
      seen.add(key);
    }
    if (
      input.completeKinds &&
      (!Array.isArray(input.completeKinds) ||
        input.completeKinds.some((k) => !detectorKinds.includes(k)))
    )
      throw Error();
    return {
      state: "ready",
      workspaceId: input.workspaceId,
      observedAt: input.observedAt,
      detectors: detectorKinds.map((kind) => {
        const p = policies.get(kind),
          rows = measurements.filter((m) => m.kind === kind);
        const policy = p
          ? {
              id: p.id,
              version: p.version,
              approvalReference: p.approvalReference,
              basis: p.basis,
              thresholdNanoseconds: p.thresholdNanoseconds,
              comparison: p.comparison,
            }
          : null;
        if (!p)
          return {
            kind,
            state: "unverifiable",
            reason: "policy_not_selected",
            policy,
            observations: [],
          };
        if (
          rows.some((m) => !m.complete || m.basis !== p.basis) ||
          (!rows.length && !input.completeKinds?.includes(kind))
        )
          return {
            kind,
            state: "unverifiable",
            reason: "source_unverifiable",
            policy,
            observations: [],
          };
        return {
          kind,
          state: "evaluated",
          reason: null,
          policy,
          observations: rows
            .filter((m) =>
              p.comparison === "GT"
                ? BigInt(m.valueNanoseconds) > BigInt(p.thresholdNanoseconds)
                : BigInt(m.valueNanoseconds) >= BigInt(p.thresholdNanoseconds),
            )
            .map((m) => ({
              measurementId: m.id,
              employeeId: m.employeeId,
              locationId: m.locationId,
              valueNanoseconds: m.valueNanoseconds,
              thresholdNanoseconds: p.thresholdNanoseconds,
              sourceVersion: m.sourceVersion,
            })),
        };
      }),
    };
  } catch {
    return { state: "unavailable", reason: "invalid_source" };
  }
}

export const unselectedPolicyFacts: Record<DetectorKind, string> = {
  missing_clock_out:
    "Explicit captured scheduled-end cutoff, tolerance, comparator and effective date are not configured.",
  missing_clock_in:
    "Approved expected-assignment census, no-punch association, observation cutoff and cancellation/callout/supersession treatment are not selected.",
  policy_lateness:
    "Approved tolerance, applicable employee/location/effective version and equality/exception semantics are not selected.",
  policy_early_departure:
    "Approved tolerance, applicable employee/location/effective version and equality/exception semantics are not selected.",
  unusually_long_entry:
    "Approved duration and open/closed/effective-version basis are not selected.",
  overtime_risk:
    "Approved actual-time period, threshold, classification/break basis and complete source are not selected.",
};
