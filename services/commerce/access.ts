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
  const dates = {
    trialEndsAt: business.trialEnd ? new Date(business.trialEnd).toISOString() : null,
    paidThrough: business.paidThrough ? new Date(business.paidThrough).toISOString() : null,
    plan: business.planKey,
  };
  if (business.state !== "ready")
    return { ...access, ...dates, employeeLimit, activeEmployees: 0, timeZone:null,
      reason: business.state === 'required' ? 'setup_required' : 'setup_pending' };
  const facts = headcount
    ? {employeeCount:await headcount(business),timeZone:null}
    : await readInstallationFacts(store,business);
  const activeEmployees=facts.employeeCount;
  if (!Number.isSafeInteger(activeEmployees) || activeEmployees < 0)
    throw new CommerceError("installation_unavailable", 503);
  const over = activeEmployees > employeeLimit;
  return {
    ...access,
    ...dates,
    state: over ? "restricted" : access.state,
    operational: access.operational && !over,
    employeeLimit,
    activeEmployees,
    timeZone:facts.timeZone,
    reason: over ? "employee_limit_exceeded" : access.reason,
  };
}
