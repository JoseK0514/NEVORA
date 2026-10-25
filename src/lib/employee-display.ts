import type { UserRole } from "./domain";

export function employeeInitials(firstName: string, lastName: string) {
  return `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
}

/** One rule for a display name: first letter of the first and the last word, so
 * "María José Rivera" is "MR" everywhere, as employeeInitials gives from parts. */
export function nameInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const last = words.length > 1 ? words[words.length - 1] : "";
  return `${words[0][0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function employeeRoleLabel(role: UserRole) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "LEAD") return "Lead";
  return "Employee";
}
