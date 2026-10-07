import type { UserRole } from "@/lib/domain";
import type { NavIconName } from "@/components/nav-icon";

export type NavigationItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

const managementNavigation: NavigationItem[] = [
  { href: "/app", label: "Dashboard", icon: "dashboard" },
  { href: "/app/schedule", label: "Schedule", icon: "schedule" },
  { href: "/app/availability", label: "Availability", icon: "availability" },
  { href: "/app/requests", label: "Time off", icon: "timeOff" },
  { href: "/app/exchange", label: "Shift requests", icon: "exchange" },
  { href: "/app/employees", label: "Employees", icon: "employees" },
  { href: "/app/timecards", label: "Timecards", icon: "clock" },
  { href: "/app/reports", label: "Reports", icon: "clock" },
  { href: "/app/schedule/templates", label: "Templates", icon: "templates" },
  { href: "/app/schedule/settings", label: "Scheduling rules", icon: "rules" },
];

const employeeNavigation: NavigationItem[] = [
  { href: "/app", label: "Home", icon: "dashboard" },
  { href: "/app/schedule", label: "My schedule", icon: "schedule" },
  { href: "/app/availability", label: "Availability", icon: "availability" },
  { href: "/app/requests", label: "Time off", icon: "timeOff" },
  { href: "/app/exchange", label: "Shift requests", icon: "exchange" },
  { href: "/app/my-time", label: "My Time", icon: "clock" },
];

export function navigationForRole(role: UserRole) {
  if (role === "OWNER") {
    return [
      ...managementNavigation,
      { href: "/app/settings", label: "Settings", icon: "settings" as const },
    ];
  }

  if (role === "MANAGER") {
    return [...managementNavigation];
  }

  return [...employeeNavigation];
}
