import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/domain";

// Route admission by current session role. These checks do not grant Company
// Access scope or replace the authority guards on protected reads and writes.
export const MANAGER_ROLES: UserRole[] = ["OWNER", "MANAGER"];
export const TIME_OFF_REVIEW_ROLES: UserRole[] = ["OWNER", "MANAGER"];
export const SELF_SERVICE_ROLES: UserRole[] = ["EMPLOYEE", "LEAD"];

export function isSelfServiceRole(role: UserRole) {
  return SELF_SERVICE_ROLES.includes(role);
}

/** Admit the employee/lead self-service surface; other signed-in roles return
 * to the caller's destination, while missing sessions use requireSession's login. */
export async function requireSelfService(destination = "/app") {
  const session = await requireSession();
  if (!isSelfServiceRole(session.role)) redirect(destination);
  return session;
}

export function isManagerRole(role: UserRole) {
  return MANAGER_ROLES.includes(role);
}

export function isTimeOffReviewerRole(role: UserRole) {
  return TIME_OFF_REVIEW_ROLES.includes(role);
}

/** Where a signed-in person lands when a page or action is closed to their role. Review Nov 14 (AR-18, RA-7): the page
 * says who it is for and how to get access, in place of a silent move to Home. */
export const RESTRICTED_PATH = "/app/restricted";

/** Server route gate for the supplied role set. A denied signed-in employee is
 * redirected to the in-app notice rather than being treated as an unauthenticated visitor. */
export async function requireRoles(roles: UserRole[]) {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    redirect(RESTRICTED_PATH);
  }

  return session;
}
