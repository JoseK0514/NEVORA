/** Browser-safe presentation shared by Velani and the authenticated company bridge. */
export const commerceReasons = [
  "setup_required",
  "setup_pending",
  "employee_limit_exceeded",
  "trial_ended",
  "payment_failed",
  "subscription_canceled",
  "payment_required",
] as const;
export type CommerceReason = (typeof commerceReasons)[number];
export type CommerceStatus = {
  state: "trial" | "paid" | "grace" | "restricted";
  operational: boolean;
  trialEndsAt: string | null;
  paidThrough: string | null;
  graceEndsAt: string | null;
  plan: "small" | "team" | null;
  employeeLimit: number;
  activeEmployees: number;
  reason: CommerceReason | null;
  billing: true;
  export: true;
};
export function parseCommerceStatus(value: unknown): CommerceStatus {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("invalid_commerce_status");
  const v = value as Record<string, unknown>;
  const date = (input: unknown): string | null => {
    if (input === null) return null;
    if (
      typeof input !== "string" ||
      input.length !== 24 ||
      !Number.isFinite(Date.parse(input)) ||
      new Date(input).toISOString() !== input
    )
      throw Error("invalid_commerce_status");
    return input;
  };
  if (
    !(["trial", "paid", "grace", "restricted"] as unknown[]).includes(
      v.state,
    ) ||
    typeof v.operational !== "boolean" ||
    v.operational !== (v.state !== "restricted") ||
    !([null, "small", "team"] as unknown[]).includes(v.plan) ||
    (v.employeeLimit !== 15 && v.employeeLimit !== 30) ||
    !Number.isSafeInteger(v.activeEmployees) ||
    Number(v.activeEmployees) < 0 ||
    (v.reason !== null &&
      !(commerceReasons as readonly unknown[]).includes(v.reason)) ||
    v.billing !== true ||
    v.export !== true
  )
    throw Error("invalid_commerce_status");
  return {
    state: v.state as CommerceStatus["state"],
    operational: v.operational,
    trialEndsAt: date(v.trialEndsAt),
    paidThrough: date(v.paidThrough),
    graceEndsAt: date(v.graceEndsAt),
    plan: v.plan as CommerceStatus["plan"],
    employeeLimit: v.employeeLimit,
    activeEmployees: Number(v.activeEmployees),
    reason: v.reason as CommerceReason | null,
    billing: true,
    export: true,
  };
}
