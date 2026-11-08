export const DAY = 86_400_000;
export class CommerceError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
  ) {
    super(code);
  }
}
export type PlanKey = "small" | "team";
export function planFor(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 30)
    throw new CommerceError("assisted_quote_required");
  return count <= 15
    ? { key: "small" as const, employees: 15, amount: 1900 }
    : { key: "team" as const, employees: 30, amount: 2900 };
}
export type AccessRecord = {
  trialEnd: number | null;
  paidThrough: number | null;
  pastDueSince: number | null;
  subscriptionStatus: string | null;
};
export function accessAt(record: AccessRecord, now = Date.now()) {
  let state: "trial" | "paid" | "grace" | "restricted" = "restricted";
  if (record.paidThrough && record.paidThrough > now) state = "paid";
  else if (record.trialEnd && record.trialEnd > now) state = "trial";
  else if (
    ["past_due", "unpaid"].includes(record.subscriptionStatus ?? "") &&
    record.paidThrough &&
    record.pastDueSince &&
    now < record.pastDueSince + 7 * DAY
  )
    state = "grace";
  return {
    state,
    operational: state !== "restricted",
    billing: true,
    export: true,
  };
}
export type Signup = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  timeZone: string;
  locationName: string;
  employeeCount: number;
};
export function parseSignup(value: unknown): Signup {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CommerceError("invalid_signup");
  const input = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = input[key];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > max ||
      /[\p{Cc}\p{Cf}]/u.test(value)
    )
      throw new CommerceError("invalid_signup");
    return value.trim();
  };
  const email = text("email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new CommerceError("invalid_email");
  const password = input.password;
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 256
  )
    throw new CommerceError("invalid_password");
  const phone = text("phone", 32)
    .replace(/[^0-9]/g, "")
    .replace(/^1(?=\d{10}$)/, "");
  if (!/^\d{10}$/.test(phone)) throw new CommerceError("invalid_phone");
  const timeZone = text("timeZone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    throw new CommerceError("invalid_timezone");
  }
  const employeeCount = input.employeeCount as number;
  planFor(employeeCount);
  return {
    email,
    password,
    firstName: text("firstName", 160),
    lastName: text("lastName", 160),
    phone,
    businessName: text("businessName", 160),
    timeZone,
    locationName: text("locationName", 48),
    employeeCount,
  };
}
