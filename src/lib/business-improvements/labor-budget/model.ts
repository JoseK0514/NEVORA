import { Temporal } from "@js-temporal/polyfill";

export type LaborPlanningRate = {
  id: string;
  employeeId: string;
  locationId: string | null;
  rate: string;
  currency: string;
  rateUnit: "HOUR" | "SHIFT" | "SALARY_PERIOD";
  validFrom: string;
  validUntil: string | null;
};
export type LaborPlanningBudget = {
  id: string;
  locationId: string | null;
  startAt: string;
  endAt: string;
  amount: string;
  currency: string;
};
export type LaborCalculationMethodReference = { id: string; revision: number };
/** Central company-policy custody owns persistence, workspace subject validation,
 * immutable revision/audit, location inheritance and source provenance. These
 * values grant no read permission and do not approve a calculation method. */
export type LaborPlanningInputs = {
  rates: LaborPlanningRate[] | null;
  budgets: LaborPlanningBudget[] | null;
  calculationMethod: LaborCalculationMethodReference | null;
};
export type LaborBudgetReadiness = {
  state: "not_configured";
  estimatedCost: null;
  variance: null;
  customerInputs: {
    rates: "provided" | "not_configured";
    budgets: "provided" | "not_configured";
  };
  calculationMethod: "not_configured";
  methodReference: LaborCalculationMethodReference | null;
  missing: (
    | "customer_rates"
    | "customer_budgets"
    | "approved_calculation_method"
  )[];
  timeBases: {
    planned: "separate_input_required";
    actual: "RECORDED_ELAPSED_INCLUDING_BREAKS";
    compensated: "not_configured";
  };
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= 200 &&
  v === v.trim() &&
  !/[\u0000-\u001f\u007f]/.test(v);
const fields = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
// Lexical decimal storage only. No conversion, scale, currency or rounding
// default; Finance must define arithmetic before any monetary output exists.
const decimal = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 80 && /^(0|[1-9]\d*)(\.\d+)?$/.test(v);
const currency = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Z]{3}$/.test(v);
const instant = (v: unknown): v is string => {
  try {
    return typeof v === "string" && Temporal.Instant.from(v).toString() !== "";
  } catch {
    return false;
  }
};
const location = (v: unknown): v is string | null => v === null || text(v);

/** Preserve bounded lexical decimal rates/budgets with their explicit currency/unit
 * and instant windows. Same employee/location rate windows may not overlap; no
 * rounding, currency conversion, monetary scale or approved Finance method is inferred. */
export function parseLaborPlanningInputs(v: unknown): LaborPlanningInputs {
  if (
    !object(v) ||
    !fields(v, ["rates", "budgets", "calculationMethod"]) ||
    !(v.rates === null || (Array.isArray(v.rates) && v.rates.length <= 5000)) ||
    !(
      v.budgets === null ||
      (Array.isArray(v.budgets) && v.budgets.length <= 500)
    )
  )
    throw Error("invalid_labor_inputs");
  const rates =
    v.rates === null
      ? null
      : (v.rates as unknown[]).map((r): LaborPlanningRate => {
          if (
            !object(r) ||
            !fields(r, [
              "id",
              "employeeId",
              "locationId",
              "rate",
              "currency",
              "rateUnit",
              "validFrom",
              "validUntil",
            ]) ||
            !text(r.id) ||
            !text(r.employeeId) ||
            !location(r.locationId) ||
            !decimal(r.rate) ||
            !currency(r.currency) ||
            typeof r.rateUnit !== "string" ||
            !["HOUR", "SHIFT", "SALARY_PERIOD"].includes(r.rateUnit) ||
            !instant(r.validFrom) ||
            !(
              r.validUntil === null ||
              (instant(r.validUntil) &&
                Temporal.Instant.compare(r.validUntil, r.validFrom) > 0)
            )
          )
            throw Error("invalid_labor_rate");
          return {
            id: r.id,
            employeeId: r.employeeId,
            locationId: r.locationId,
            rate: r.rate,
            currency: r.currency,
            rateUnit: r.rateUnit as LaborPlanningRate["rateUnit"],
            validFrom: r.validFrom,
            validUntil: r.validUntil,
          };
        });
  const budgets =
    v.budgets === null
      ? null
      : (v.budgets as unknown[]).map((b): LaborPlanningBudget => {
          if (
            !object(b) ||
            !fields(b, [
              "id",
              "locationId",
              "startAt",
              "endAt",
              "amount",
              "currency",
            ]) ||
            !text(b.id) ||
            !location(b.locationId) ||
            !decimal(b.amount) ||
            !currency(b.currency) ||
            !instant(b.startAt) ||
            !instant(b.endAt) ||
            Temporal.Instant.compare(b.endAt, b.startAt) <= 0
          )
            throw Error("invalid_labor_budget");
          return {
            id: b.id,
            locationId: b.locationId,
            startAt: b.startAt,
            endAt: b.endAt,
            amount: b.amount,
            currency: b.currency,
          };
        });
  let calculationMethod: LaborCalculationMethodReference | null = null;
  if (v.calculationMethod !== null) {
    const m = v.calculationMethod;
    if (
      !object(m) ||
      !fields(m, ["id", "revision"]) ||
      !text(m.id) ||
      !Number.isSafeInteger(m.revision) ||
      Number(m.revision) < 1
    )
      throw Error("invalid_method_reference");
    calculationMethod = { id: m.id, revision: Number(m.revision) };
  }
  if (
    (rates && new Set(rates.map((r) => r.id)).size !== rates.length) ||
    (budgets && new Set(budgets.map((b) => b.id)).size !== budgets.length)
  )
    throw Error("duplicate_labor_input");
  for (let i = 0; i < (rates?.length ?? 0); i++) {
    const a = rates![i];
    for (let j = 0; j < i; j++) {
      const b = rates![j];
      if (
        a.employeeId === b.employeeId &&
        a.locationId === b.locationId &&
        (a.validUntil === null ||
          Temporal.Instant.compare(b.validFrom, a.validUntil) < 0) &&
        (b.validUntil === null ||
          Temporal.Instant.compare(a.validFrom, b.validUntil) < 0)
      )
        throw Error("overlapping_labor_rate");
    }
  }
  return { rates, budgets, calculationMethod };
}

/** No trusted Finance method catalogue exists at this source. A company-owned
 * reference never becomes approval. Every unit, including hourly, stays unavailable.
 * Central callers must use captured canonical inputs, not request-supplied claims. */
export function laborBudgetReadiness(
  input: LaborPlanningInputs | null,
): LaborBudgetReadiness {
  const inputs = input === null ? null : parseLaborPlanningInputs(input);
  const hasRates = !!inputs?.rates?.length,
    hasBudgets = !!inputs?.budgets?.length;
  return {
    state: "not_configured",
    estimatedCost: null,
    variance: null,
    customerInputs: {
      rates: hasRates ? "provided" : "not_configured",
      budgets: hasBudgets ? "provided" : "not_configured",
    },
    calculationMethod: "not_configured",
    methodReference: inputs?.calculationMethod ?? null,
    missing: [
      ...(!hasRates ? ["customer_rates" as const] : []),
      ...(!hasBudgets ? ["customer_budgets" as const] : []),
      "approved_calculation_method",
    ],
    timeBases: {
      planned: "separate_input_required",
      actual: "RECORDED_ELAPSED_INCLUDING_BREAKS",
      compensated: "not_configured",
    },
  };
}
