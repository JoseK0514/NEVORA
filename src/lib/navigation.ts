import type { UserRole } from "@/lib/domain";
import type { NavIconName } from "@/components/nav-icon";
import type { PayrollCapabilities } from './payroll/contracts';

export type NavigationItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

const managementNavigation: NavigationItem[] = [
  { href: "/app", label: "Home", icon: "dashboard" },
  { href: "/app/schedule", label: "Schedule", icon: "schedule" },
  { href: "/app/availability", label: "Availability", icon: "availability" },
  { href: "/app/requests", label: "Time off", icon: "timeOff" },
  { href: "/app/exchange", label: "Shift requests", icon: "exchange" },
  { href: "/app/updates", label: "Updates", icon: "updates" },
  { href: "/app/employees", label: "Employees", icon: "employees" },
  { href: "/app/timecards", label: "Timecards", icon: "clock" },
  { href: "/app/reports", label: "Reports", icon: "reports" },
  { href: "/app/payroll-export", label: "Payroll export", icon: "export" },
  { href: "/app/schedule/templates", label: "Templates", icon: "templates" },
  { href: "/app/schedule/settings", label: "Scheduling rules", icon: "rules" },
];

const employeeNavigation: NavigationItem[] = [
  { href: "/app", label: "Home", icon: "dashboard" },
  { href: "/app/schedule", label: "My schedule", icon: "schedule" },
  { href: "/app/my-time", label: "My Time", icon: "clock" },
  { href: "/app/requests/hub", label: "Requests", icon: "requests" },
  { href: "/app/availability", label: "Availability", icon: "availability" },
  { href: "/app/updates", label: "Updates", icon: "updates" },
  { href: "/app/notifications", label: "Notifications", icon: "notifications" },
  { href: "/app/profile", label: "Profile", icon: "employee" },
];

/** Presentation groups consume only already-authorized navigation entries. */
export function managementNavigationGroups(items: NavigationItem[]) {
  const definitions = [
    {label:'Plan', hrefs:['/app','/app/schedule','/app/availability','/app/exchange','/app/schedule/templates']},
    {label:'Team', hrefs:['/app/employees','/app/requests','/app/updates']},
    {label:'Time & Pay', hrefs:['/app/timecards','/app/payroll','/app/payroll-export','/app/reports','/app/my-pay']},
    {label:'Workspace', hrefs:['/app/settings','/app/schedule/settings']},
  ];
  return definitions.map(group=>({...group,items:group.hrefs.flatMap(href=>items.filter(item=>item.href===href))})).filter(group=>group.items.length);
}

/** Canonical workflows keep their URLs, queries and commands. Only their
 * employee navigation owner is the Requests group. Manager owners are unchanged. */
export function activeNavigationHref(role: UserRole, path: string, payroll?: PayrollCapabilities): string | undefined {
  const pathname = path.split(/[?#]/, 1)[0];
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  if ((role === "EMPLOYEE" || role === "LEAD") &&
      (matches("/app/requests") || matches("/app/exchange"))) return "/app/requests/hub";
  return navigationForRole(role, payroll)
    .filter(item => item.href === "/app" ? pathname === "/app" : matches(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function navigationForRole(role: UserRole, payroll?: PayrollCapabilities) {
  const finance: NavigationItem[] = payroll?.enabled ? [
    ...(payroll.canReview ? [{ href: '/app/payroll', label: 'Payroll', icon: 'payroll' as const }] : []),
    { href: '/app/my-pay', label: 'My pay', icon: 'statement' },
  ] : [];
  const management = [...managementNavigation];
  if (finance.length) management.splice(management.findIndex(item => item.href === '/app/payroll-export') + 1, 0, ...finance);
  if (role === "OWNER") {
    return [
      ...management,
      { href: "/app/settings", label: "Settings", icon: "settings" as const },
    ];
  }

  if (role === "MANAGER") {
    return management;
  }

  return [...employeeNavigation, ...finance];
}
