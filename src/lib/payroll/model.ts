/**
 * Pure transport validation for payroll imports and commands. Monetary amounts are
 * nonnegative base-10 USD cent strings; aggregate arithmetic uses bigint. These
 * parsers establish shape and arithmetic consistency, not actor or source authority.
 */
const enumValue = (value: unknown, allowed: string[]) =>
  typeof value === "string" && allowed.includes(value);
import type {
  PayrollImport,
  PayrollPreferences,
  PayrollRule,
  PayrollRunCommand,
  PayrollSettingsCommand,
  PayrollTotals,
} from "./contracts";
export class PayrollError extends Error {
  constructor(
    public code: string,
    public status = 400,
    public issues?: { path: string; message: string }[],
  ) {
    super(code);
  }
}
export function insist(value: unknown, path: string): asserts value {
  if (!value)
    throw new PayrollError("INVALID_PAYROLL_INPUT", 400, [
      { path, message: "Check this value." },
    ]);
}
export function record(
  v: unknown,
  keys: string[],
  path = "input",
): Record<string, unknown> {
  insist(v && typeof v === "object" && !Array.isArray(v), path);
  const o = v as Record<string, unknown>;
  insist(
    Object.keys(o).every((k) => keys.includes(k)),
    path,
  );
  return o;
}
export function text(v: unknown, max = 300): v is string {
  return (
    typeof v === "string" &&
    v.length > 0 &&
    v.length <= max &&
    v.trim() === v &&
    !/[\u0000-\u001f\u007f]/.test(v)
  );
}
export function date(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function minor(v: unknown): v is string {
  return typeof v === "string" && /^(0|[1-9]\d{0,14})$/.test(v);
}
export function uuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      v,
    )
  );
}
export function period(v: unknown) {
  const p = record(v, ["startDate", "endDate"], "period");
  insist(
    date(p.startDate) &&
      date(p.endDate) &&
      p.startDate <= p.endDate &&
      (Date.parse(p.endDate) - Date.parse(p.startDate)) / 86400000 <= 30,
    "period",
  );
  return { startDate: p.startDate, endDate: p.endDate };
}
function rules(v: unknown): PayrollRule[] {
  insist(Array.isArray(v) && v.length <= 100, "rules");
  const ids = new Set();
  for (const input of v) {
    const r = record(
      input,
      [
        "id",
        "name",
        "kind",
        "method",
        "amountMinor",
        "basisPoints",
        "base",
        "applicability",
        "effectiveFrom",
        "effectiveTo",
        "capMinor",
        "remittance",
      ],
      "rules",
    );
    insist(text(r.id, 80) && text(r.name) && !ids.has(r.id), "rules.id");
    ids.add(r.id);
    insist(
      enumValue(r.kind, ["EMPLOYEE_DEDUCTION", "EMPLOYER_CONTRIBUTION"]) &&
        r.base === "GROSS" &&
        enumValue(r.applicability, ["ALL", "EMPLOYEE_ELECTION"]) &&
        enumValue(r.remittance, ["EMPLOYER", "PROVIDER"]),
      "rules",
    );
    insist(
      date(r.effectiveFrom) &&
        (r.effectiveTo === null ||
          (date(r.effectiveTo) && r.effectiveTo >= r.effectiveFrom)),
      "rules.effectiveFrom",
    );
    insist(r.capMinor === null || minor(r.capMinor), "rules.capMinor");
    insist(
      (r.method === "FIXED" &&
        minor(r.amountMinor) &&
        r.basisPoints === null) ||
        (r.method === "PERCENTAGE" &&
          r.amountMinor === null &&
          Number.isInteger(r.basisPoints) &&
          Number(r.basisPoints) >= 0 &&
          Number(r.basisPoints) <= 10000),
      "rules.amount",
    );
  }
  return structuredClone(v) as PayrollRule[];
}
export function parsePreferences(v: unknown): PayrollPreferences {
  const p = record(v, [
    "companyName",
    "language",
    "currency",
    "schedule",
    "rules",
    "automation",
    "bankProfile",
    "sourceProvider",
    "bankChannel",
  ]);
  insist(
    text(p.companyName) &&
      enumValue(p.language, ["en", "es"]) &&
      p.currency === "USD",
    "preferences",
  );
  const s = record(p.schedule, ["frequency", "anchorDate", "paydayOffsetDays"]);
  insist(
    enumValue(s.frequency, ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"]) &&
      date(s.anchorDate) &&
      Number.isInteger(s.paydayOffsetDays) &&
      Number(s.paydayOffsetDays) >= 0 &&
      Number(s.paydayOffsetDays) <= 31,
    "schedule",
  );
  const a = record(p.automation, [
    "prepare",
    "publish",
    "reminders",
    "reminderLeadDays",
  ]);
  insist(
    ["prepare", "publish", "reminders"].every(
      (k) => typeof a[k] === "boolean",
    ) &&
      Array.isArray(a.reminderLeadDays) &&
      a.reminderLeadDays.length <= 10 &&
      a.reminderLeadDays.every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 31,
      ) &&
      new Set(a.reminderLeadDays).size === a.reminderLeadDays.length,
    "automation",
  );
  insist(
    p.bankProfile === null || p.bankProfile === "NEUTRAL_UNVERIFIED",
    "bankProfile",
  );
  insist(
    p.sourceProvider === undefined ||
      enumValue(p.sourceProvider, [
        "ADP_RUN",
        "QUICKBOOKS_PAYROLL",
        "PAYCHEX",
        "GUSTO",
        "OTHER",
      ]),
    "sourceProvider",
  );
  insist(
    p.bankChannel === undefined ||
      enumValue(p.bankChannel, [
        "POPULAR_WCM_TEXT",
        "POPULAR_WCM_NACHA",
        "POPULAR_COMMERCIAL_MANUAL",
        "OTHER",
      ]),
    "bankChannel",
  );
  rules(p.rules);
  return structuredClone(p) as PayrollPreferences;
}
/** Clone a balanced provider import: deductions must reconcile gross to net, optional
 * earnings must sum to gross, and a supplied population requires exactly one row
 * per employee, including zero/excluded dispositions handled by the service. */
export function parseImport(v: unknown, population?: string[]): PayrollImport {
  const p = record(v, [
    "schema",
    "currency",
    "sourceName",
    "sourceReference",
    "period",
    "payday",
    "rows",
  ]);
  insist(
    p.schema === "NEVORA_PAYROLL_IMPORT_V1" &&
      p.currency === "USD" &&
      text(p.sourceName) &&
      text(p.sourceReference),
    "source",
  );
  const dates = period(p.period);
  insist(date(p.payday) && p.payday >= dates.endDate, "payday");
  insist(
    Array.isArray(p.rows) && p.rows.length > 0 && p.rows.length <= 300,
    "rows",
  );
  const ids = new Set<string>();
  for (const [i, input] of p.rows.entries()) {
    const path = `rows.${i}`;
    const r = record(
      input,
      [
        "employeeId",
        "grossMinor",
        "employeeDeductions",
        "employerContributions",
        "netMinor",
        "earnings",
      ],
      path,
    );
    insist(
      text(r.employeeId, 200) && !ids.has(r.employeeId),
      path + ".employeeId",
    );
    ids.add(r.employeeId);
    insist(minor(r.grossMinor) && minor(r.netMinor), path + ".money");
    const sums: Record<string, bigint> = {};
    for (const key of [
      "employeeDeductions",
      "employerContributions",
      "earnings",
    ]) {
      if (key === "earnings" && r[key] === undefined) continue;
      const lines = r[key];
      insist(Array.isArray(lines) && lines.length <= 100, path + "." + key);
      const codes = new Set();
      sums[key] = BigInt(0);
      for (const line of lines) {
        const l = record(
          line,
          ["code", "label", "amountMinor"],
          path + "." + key,
        );
        insist(
          text(l.code, 80) &&
            !codes.has(l.code) &&
            text(l.label) &&
            minor(l.amountMinor),
          path + "." + key,
        );
        codes.add(l.code);
        sums[key] += BigInt(l.amountMinor);
      }
    }
    insist(
      BigInt(r.grossMinor) - sums.employeeDeductions === BigInt(r.netMinor),
      path + ".netMinor",
    );
    if (r.earnings !== undefined)
      insist(sums.earnings === BigInt(r.grossMinor), path + ".earnings");
  }
  if (population)
    insist(
      ids.size === population.length && population.every((id) => ids.has(id)),
      "rows.population",
    );
  return structuredClone(p) as PayrollImport;
}
export function totals(p: PayrollImport): PayrollTotals {
  const sum = (values: string[]) =>
    values.reduce((s, v) => s + BigInt(v), BigInt(0)).toString();
  return {
    grossMinor: sum(p.rows.map((r) => r.grossMinor)),
    netMinor: sum(p.rows.map((r) => r.netMinor)),
    deductionsMinor: sum(
      p.rows.flatMap((r) => r.employeeDeductions.map((l) => l.amountMinor)),
    ),
    employerContributionsMinor: sum(
      p.rows.flatMap((r) => r.employerContributions.map((l) => l.amountMinor)),
    ),
    employeeCount: p.rows.length,
  };
}
export function parseSettingsCommand(v: unknown): PayrollSettingsCommand {
  const c = record(v, [
    "action",
    "operationId",
    "reason",
    "expectedRevision",
    "effectiveFrom",
    "preferences",
    "exception",
    "grant",
  ]);
  insist(
    uuid(c.operationId) &&
      text(c.reason) &&
      Number.isSafeInteger(c.expectedRevision) &&
      Number(c.expectedRevision) <= 2147483646 &&
      Number(c.expectedRevision) >= 0,
    "command",
  );
  if (c.action === "SAVE_SETTINGS") {
    insist(date(c.effectiveFrom), "effectiveFrom");
    parsePreferences(c.preferences);
  } else if (c.action === "SAVE_EXCEPTION") {
    insist(date(c.effectiveFrom), "effectiveFrom");
    const e = record(c.exception, ["employeeId", "language", "rules"]);
    insist(
      text(e.employeeId, 200) &&
        (e.language === null || enumValue(e.language, ["en", "es"])),
      "exception",
    );
    if (e.rules !== null) rules(e.rules);
  } else if (c.action === "SET_GRANT") {
    const g = record(c.grant, ["employeeId", "review", "approve"]);
    insist(
      text(g.employeeId, 200) &&
        typeof g.review === "boolean" &&
        typeof g.approve === "boolean" &&
        (!g.approve || g.review),
      "grant",
    );
  } else insist(false, "action");
  return structuredClone(c) as PayrollSettingsCommand;
}
export function parseRunCommand(v: unknown): PayrollRunCommand {
  const c = record(v, [
    "action",
    "operationId",
    "period",
    "payday",
    "runId",
    "expectedRevision",
    "amounts",
    "reviewToken",
    "reason",
    "jobId",
  ]);
  insist(uuid(c.operationId), "operationId");
  if (c.action === "PREPARE") {
    period(c.period);
    insist(date(c.payday) && c.payday >= period(c.period).endDate, "payday");
  } else if (c.action === "RETRY_JOB") insist(uuid(c.jobId), "jobId");
  else {
    insist(
      uuid(c.runId) &&
        Number.isSafeInteger(c.expectedRevision) &&
        Number(c.expectedRevision) <= 2147483646 &&
        Number(c.expectedRevision) > 0,
      "run",
    );
    if(c.action==="RECALCULATE"||c.action==="CORRECT_NATIVE"){
      insist(Object.keys(c).every(k=>["action","operationId","runId","expectedRevision",...(c.action==="CORRECT_NATIVE"?["reason"]:[])].includes(k)),"nativeCommand");
      if(c.action==="CORRECT_NATIVE")insist(text(c.reason),"reason");
    }else if (c.action === "IMPORT" || c.action === "CORRECT") {
      parseImport(c.amounts);
      if (c.action === "CORRECT") insist(text(c.reason), "reason");
    } else if (c.action === "APPROVE")
      insist(
        typeof c.reviewToken === "string" &&
          /^[a-f0-9]{64}$/.test(c.reviewToken),
        "reviewToken",
      );
    else
      insist(c.action === "PUBLISH" || c.action === "PAYMENT_EXPORT", "action");
  }
  return structuredClone(c) as PayrollRunCommand;
}
