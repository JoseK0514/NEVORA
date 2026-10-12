import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import {
  parseLaborPlanningInputs,
  type LaborPlanningRate,
  type LaborPlanningBudget,
  type LaborCalculationMethodReference,
} from "../labor-budget/model";
export type ThresholdRule = {
  thresholdMinutes: number;
  comparison: "GT" | "GTE";
  effectiveFrom: string;
};
export type AttendancePolicySettings = {
  lateness?: ThresholdRule | null;
  earlyDeparture?: ThresholdRule | null;
  longEntry?:
    | (ThresholdRule & {
        basis: "RECORDED_ELAPSED" | "EFFECTIVE_ELAPSED";
        appliesTo: "OPEN" | "CLOSED" | "BOTH";
      })
    | null;
  missingClockOut?:
    | (ThresholdRule & {
        association: "CAPTURED_PUBLISHED_SHIFT";
        cutoff: "AFTER_SCHEDULE_END";
      })
    | null;
  missingClockIn?:
    | (ThresholdRule & {
        association: "CAPTURED_PUBLISHED_SHIFT";
        cutoff: "AFTER_SCHEDULE_START" | "AFTER_SCHEDULE_END";
      })
    | null;
};
export type OvertimeRiskRule = ThresholdRule & {
  basis:
    | "RECORDED_ELAPSED_INCLUDING_BREAKS"
    | "EFFECTIVE_ELAPSED_INCLUDING_BREAKS";
  window: "BUSINESS_DAY" | "BUSINESS_WEEK";
  aggregation: "COMPANY" | "LOCATION";
  dayBoundaryTime: string;
  weekStartsOn?: number;
};
/** Compensation is an explicit company reference/readiness contract. It never
 * interprets law or computes wage entitlement from a rule label. */
export type CompensationRule = {
  effectiveFrom: string;
  ruleReference: string;
  breakTreatment:
    | "INCLUDE_ALL_RECORDED_BREAKS"
    | "EXCLUDE_SELECTED_BREAK_TYPES";
  excludedBreakTypeIds: string[];
};
export type CustomerLaborRate = LaborPlanningRate;
export type CustomerLaborBudget = LaborPlanningBudget;
export type FinanceMethodReference = LaborCalculationMethodReference;
export type LaborPolicySettings = {
  overtimeRisk?: OvertimeRiskRule | null;
  compensation?: CompensationRule | null;
  rates?: CustomerLaborRate[] | null;
  budgets?: CustomerLaborBudget[] | null;
  calculationMethod?: FinanceMethodReference | null;
};
export type CompanyPolicySettings = {
  version: 1;
  attendance?: AttendancePolicySettings;
  labor?: LaborPolicySettings;
};
export type EffectiveCompanyPolicies = {
  version: 1;
  attendance: Required<AttendancePolicySettings>;
  labor: Required<LaborPolicySettings>;
};
export type CompanyPolicyCommand = {
  operationId: string;
  expectedRevision: number;
  locationId: string | null;
  settings: CompanyPolicySettings;
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 300): v is string =>
  typeof v === "string" &&
  v === v.trim() &&
  v.length > 0 &&
  v.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(v).some((k) => !allowed.includes(k)))
    throw Error("Invalid company policy fields");
};
const instant = (v: unknown) => {
  if (!text(v, 100)) throw Error("Invalid effective date");
  return Temporal.Instant.from(v).toString();
};
function threshold(v: unknown, extra: string[] = []): ThresholdRule {
  if (!object(v)) throw Error("Invalid company rule");
  keys(v, ["thresholdMinutes", "comparison", "effectiveFrom", ...extra]);
  if (
    !Number.isSafeInteger(v.thresholdMinutes) ||
    Number(v.thresholdMinutes) < 0 ||
    Number(v.thresholdMinutes) > 525600 ||
    !["GT", "GTE"].includes(String(v.comparison))
  )
    throw Error("Invalid explicit threshold");
  return {
    thresholdMinutes: Number(v.thresholdMinutes),
    comparison: v.comparison as "GT" | "GTE",
    effectiveFrom: instant(v.effectiveFrom),
  };
}
export function parseCompanyPolicySettings(
  value: unknown,
): CompanyPolicySettings {
  if (!object(value) || value.version !== 1)
    throw Error("Invalid company policy version");
  keys(value, ["version", "attendance", "labor"]);
  const output: CompanyPolicySettings = { version: 1 };
  if (value.attendance !== undefined) {
    if (!object(value.attendance)) throw Error("Invalid attendance settings");
    keys(value.attendance, [
      "lateness",
      "earlyDeparture",
      "longEntry",
      "missingClockIn",
      "missingClockOut",
    ]);
    const attendance: AttendancePolicySettings = {};
    for (const field of ["lateness", "earlyDeparture"] as const)
      if (Object.hasOwn(value.attendance, field))
        attendance[field] =
          value.attendance[field] === null
            ? null
            : threshold(value.attendance[field]);
    if (Object.hasOwn(value.attendance, "longEntry")) {
      const rule = value.attendance.longEntry;
      if (rule === null) attendance.longEntry = null;
      else {
        const base = threshold(rule, ["basis", "appliesTo"]);
        if (
          !object(rule) ||
          !["RECORDED_ELAPSED", "EFFECTIVE_ELAPSED"].includes(
            String(rule.basis),
          ) ||
          !["OPEN", "CLOSED", "BOTH"].includes(String(rule.appliesTo))
        )
          throw Error("Invalid entry basis");
        attendance.longEntry = {
          ...base,
          basis: rule.basis as "RECORDED_ELAPSED" | "EFFECTIVE_ELAPSED",
          appliesTo: rule.appliesTo as "OPEN" | "CLOSED" | "BOTH",
        };
      }
    }
    if (Object.hasOwn(value.attendance, "missingClockIn")) {
      const rule = value.attendance.missingClockIn;
      if (rule === null) attendance.missingClockIn = null;
      else {
        const base = threshold(rule, ["association", "cutoff"]);
        if (
          !object(rule) ||
          rule.association !== "CAPTURED_PUBLISHED_SHIFT" ||
          !["AFTER_SCHEDULE_START", "AFTER_SCHEDULE_END"].includes(
            String(rule.cutoff),
          )
        )
          throw Error("Invalid expected-assignment basis");
        attendance.missingClockIn = {
          ...base,
          association: rule.association,
          cutoff: rule.cutoff as "AFTER_SCHEDULE_START" | "AFTER_SCHEDULE_END",
        };
      }
    }
    if (Object.hasOwn(value.attendance, "missingClockOut")) {
      const rule = value.attendance.missingClockOut;
      if (rule === null) attendance.missingClockOut = null;
      else {
        const base = threshold(rule, ["association", "cutoff"]);
        if (
          !object(rule) ||
          rule.association !== "CAPTURED_PUBLISHED_SHIFT" ||
          rule.cutoff !== "AFTER_SCHEDULE_END"
        )
          throw Error("Invalid clock-out basis");
        attendance.missingClockOut = {
          ...base,
          association: rule.association,
          cutoff: rule.cutoff,
        };
      }
    }
    output.attendance = attendance;
  }
  if (value.labor !== undefined) {
    if (!object(value.labor)) throw Error("Invalid labor settings");
    keys(value.labor, [
      "overtimeRisk",
      "compensation",
      "rates",
      "budgets",
      "calculationMethod",
    ]);
    const labor: LaborPolicySettings = {};
    if (Object.hasOwn(value.labor, "overtimeRisk")) {
      const rule = value.labor.overtimeRisk;
      if (rule === null) labor.overtimeRisk = null;
      else {
        const base = threshold(rule, [
          "basis",
          "window",
          "aggregation",
          "dayBoundaryTime",
          "weekStartsOn",
        ]);
        if (
          !object(rule) ||
          ![
            "RECORDED_ELAPSED_INCLUDING_BREAKS",
            "EFFECTIVE_ELAPSED_INCLUDING_BREAKS",
          ].includes(String(rule.basis)) ||
          !["BUSINESS_DAY", "BUSINESS_WEEK"].includes(String(rule.window)) ||
          !["COMPANY", "LOCATION"].includes(String(rule.aggregation)) ||
          typeof rule.dayBoundaryTime !== "string" ||
          !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(rule.dayBoundaryTime) ||
          (rule.window === "BUSINESS_WEEK"
            ? !Number.isSafeInteger(rule.weekStartsOn) ||
              Number(rule.weekStartsOn) < 0 ||
              Number(rule.weekStartsOn) > 6
            : rule.weekStartsOn !== undefined)
        )
          throw Error("Invalid actual-time overtime basis");
        labor.overtimeRisk = {
          ...base,
          basis: rule.basis as OvertimeRiskRule["basis"],
          window: rule.window as OvertimeRiskRule["window"],
          aggregation: rule.aggregation as OvertimeRiskRule["aggregation"],
          dayBoundaryTime: rule.dayBoundaryTime,
          ...(rule.window === "BUSINESS_WEEK"
            ? { weekStartsOn: Number(rule.weekStartsOn) }
            : {}),
        };
      }
    }
    if (Object.hasOwn(value.labor, "compensation")) {
      const rule = value.labor.compensation;
      if (rule === null) labor.compensation = null;
      else {
        if (!object(rule)) throw Error("Invalid compensation setting");
        keys(rule, [
          "effectiveFrom",
          "ruleReference",
          "breakTreatment",
          "excludedBreakTypeIds",
        ]);
        if (
          !text(rule.ruleReference) ||
          ![
            "INCLUDE_ALL_RECORDED_BREAKS",
            "EXCLUDE_SELECTED_BREAK_TYPES",
          ].includes(String(rule.breakTreatment)) ||
          !Array.isArray(rule.excludedBreakTypeIds) ||
          rule.excludedBreakTypeIds.length > 100 ||
          rule.excludedBreakTypeIds.some((v) => !text(v, 200)) ||
          new Set(rule.excludedBreakTypeIds).size !==
            rule.excludedBreakTypeIds.length ||
          (rule.breakTreatment === "INCLUDE_ALL_RECORDED_BREAKS" &&
            rule.excludedBreakTypeIds.length)
        )
          throw Error("Invalid explicit compensation basis");
        labor.compensation = {
          effectiveFrom: instant(rule.effectiveFrom),
          ruleReference: rule.ruleReference,
          breakTreatment:
            rule.breakTreatment as CompensationRule["breakTreatment"],
          excludedBreakTypeIds: [...rule.excludedBreakTypeIds].sort(),
        };
      }
    }
    const planning = parseLaborPlanningInputs({
      rates: value.labor.rates ?? null,
      budgets: value.labor.budgets ?? null,
      calculationMethod: value.labor.calculationMethod ?? null,
    });
    for (const field of ["rates", "budgets", "calculationMethod"] as const)
      if (Object.hasOwn(value.labor, field))
        Object.assign(labor, { [field]: planning[field] });
    output.labor = labor;
  }
  return output;
}
export function parseCompanyPolicyCommand(
  value: unknown,
): CompanyPolicyCommand {
  if (!object(value)) throw Error("Invalid company policy command");
  keys(value, ["operationId", "expectedRevision", "locationId", "settings"]);
  // PostgreSQL integer revisions must leave room for the atomic expected + 1.
  if (
    typeof value.operationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.operationId,
    ) ||
    !Number.isSafeInteger(value.expectedRevision) ||
    Number(value.expectedRevision) < 0 ||
    Number(value.expectedRevision) > 2147483646 ||
    !(value.locationId === null || text(value.locationId, 200))
  )
    throw Error("Invalid company policy command");
  return {
    operationId: value.operationId.toLowerCase(),
    expectedRevision: Number(value.expectedRevision),
    locationId: value.locationId,
    settings: parseCompanyPolicySettings(value.settings),
  };
}
/** Absent override keys inherit; null unconfigures; provided arrays replace the
 * complete company array. Omitted employee rates never become zero. */
export function effectiveCompanyPolicies(
  company: CompanyPolicySettings | null,
  location: CompanyPolicySettings | null,
): EffectiveCompanyPolicies {
  const own = (section: "attendance" | "labor", field: string) => {
    const override = location?.[section] as Record<string, unknown> | undefined;
    return override && Object.hasOwn(override, field)
      ? override[field]
      : ((company?.[section] as Record<string, unknown> | undefined)?.[field] ??
          null);
  };
  return {
    version: 1,
    attendance: {
      lateness: own("attendance", "lateness"),
      earlyDeparture: own("attendance", "earlyDeparture"),
      longEntry: own("attendance", "longEntry"),
      missingClockIn: own("attendance", "missingClockIn"),
      missingClockOut: own("attendance", "missingClockOut"),
    },
    labor: {
      overtimeRisk: own("labor", "overtimeRisk"),
      compensation: own("labor", "compensation"),
      rates: own("labor", "rates"),
      budgets: own("labor", "budgets"),
      calculationMethod: own("labor", "calculationMethod"),
    },
  } as EffectiveCompanyPolicies;
}
export function companyPolicyCommandHash(
  command: CompanyPolicyCommand,
): string {
  return createHash("sha256")
    .update("nevora:company-policy:command:v1\0")
    .update(JSON.stringify(command))
    .digest("hex");
}
