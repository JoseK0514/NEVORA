import type { UserRole } from "./domain";

export function employeeInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function employeeRoleLabel(role: UserRole) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "LEAD") return "Lead";
  return "Employee";
}
