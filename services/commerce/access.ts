import type { Business, CommerceStore } from "./store";
import { accessAt, CommerceError } from "./model";
import { readInstallationFacts } from "./installation";
export async function businessAccess(
  store: CommerceStore,
  business: Business,
  now: number,
  headcount?: (business: Business) => Promise<number>,
) {
  const access = accessAt(business, now),
    employeeLimit = business.planKey === "small" ? 15 : 30;
  if (business.state !== "ready")
    return { ...access, employeeLimit, activeEmployees: 0, timeZone:null, reason: null };
  const facts = headcount
    ? {employeeCount:await headcount(business),timeZone:null}
    : await readInstallationFacts(store,business);
  const activeEmployees=facts.employeeCount;
  if (!Number.isSafeInteger(activeEmployees) || activeEmployees < 0)
    throw new CommerceError("installation_unavailable", 503);
  const over = activeEmployees > employeeLimit;
  return {
    ...access,
    state: over ? "restricted" : access.state,
    operational: access.operational && !over,
    employeeLimit,
    activeEmployees,
    timeZone:facts.timeZone,
    reason: over ? "employee_limit_exceeded" : null,
  };
}
