import type { Business, CommerceStore } from "./store";
import { accessAt, CommerceError } from "./model";
import { readInstallationHeadcount } from "./installation";
export async function businessAccess(
  store: CommerceStore,
  business: Business,
  now: number,
  headcount?: (business: Business) => Promise<number>,
) {
  const access = accessAt(business, now),
    employeeLimit = business.planKey === "small" ? 15 : 30;
  if (business.state !== "ready")
    return { ...access, employeeLimit, activeEmployees: 0, reason: null };
  const activeEmployees = await (headcount
    ? headcount(business)
    : readInstallationHeadcount(store, business));
  if (!Number.isSafeInteger(activeEmployees) || activeEmployees < 0)
    throw new CommerceError("installation_unavailable", 503);
  const over = activeEmployees > employeeLimit;
  return {
    ...access,
    state: over ? "restricted" : access.state,
    operational: access.operational && !over,
    employeeLimit,
    activeEmployees,
    reason: over ? "employee_limit_exceeded" : null,
  };
}
