import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/domain";

export const MANAGER_ROLES: UserRole[] = ["OWNER", "MANAGER"];
export const TIME_OFF_REVIEW_ROLES: UserRole[] = ["OWNER", "MANAGER", "LEAD"];

export function isManagerRole(role: UserRole) {
  return MANAGER_ROLES.includes(role);
}

export function isTimeOffReviewerRole(role: UserRole) {
  return TIME_OFF_REVIEW_ROLES.includes(role);
}

export async function requireRoles(roles: UserRole[]) {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    redirect("/app");
  }

  return session;
}
