import type { UserRole } from "@/lib/domain";

const managementNavigation = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/schedule", label: "Schedule" },
  { href: "/app/employees", label: "Employees" },
  { href: "/app/availability", label: "Availability" },
  { href: "/app/requests", label: "Requests" },
  { href: "/app/exchange", label: "Shift Exchange" },
] as const;

const employeeNavigation = [
  { href: "/app", label: "Home" },
  { href: "/app/schedule", label: "My Schedule" },
  { href: "/app/availability", label: "Availability" },
  { href: "/app/requests", label: "Requests" },
  { href: "/app/exchange", label: "Shift Exchange" },
] as const;

export function navigationForRole(role: UserRole) {
  if (role === "OWNER") {
    return [...managementNavigation, { href: "/app/settings", label: "Settings" }];
  }

  if (role === "MANAGER") {
    return [...managementNavigation];
  }

  return [...employeeNavigation];
}
