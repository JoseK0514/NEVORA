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
  { href: "/app/inbox", label: "Inbox", icon: "inbox" },
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
  { href: "/app/my-time", label: "My time", icon: "clock" },
  { href: "/app/requests/hub", label: "Requests", icon: "requests" },
  { href: "/app/availability", label: "Availability", icon: "availability" },
  { href: "/app/updates", label: "Updates", icon: "updates" },
  { href: "/app/notifications", label: "Notifications", icon: "notifications" },
  { href: "/app/profile", label: "Profile", icon: "employee" },
];

/** Presentation groups consume only already-authorized navigation entries. */
export function managementNavigationGroups(items: NavigationItem[]) {
  const definitions = [
    {label:'Plan', hrefs:['/app','/app/inbox','/app/schedule','/app/availability','/app/exchange','/app/schedule/templates']},
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

export type MobileTab = NavigationItem & {
  /** Sidebar destinations that light this tab up. */
  owns: string[];
};

/** Phone tab bar: four destinations, then More for everything else. Employees
 * get Home, Schedule, Requests and Pay (Hours while payroll is off); managers
 * get Home, Schedule, Inbox and Team. */
export function mobileTabsForRole(role: UserRole, payroll?: PayrollCapabilities): MobileTab[] {
  const home: MobileTab = { href: "/app", label: "Home", icon: "dashboard", owns: ["/app"] };
  const schedule: MobileTab = { href: "/app/schedule", label: "Schedule", icon: "schedule", owns: ["/app/schedule"] };
  if (role === "EMPLOYEE" || role === "LEAD") {
    const pay: MobileTab = payroll?.enabled
      ? { href: "/app/my-pay", label: "Pay", icon: "statement", owns: ["/app/my-pay", "/app/my-time"] }
      : { href: "/app/my-time", label: "Hours", icon: "clock", owns: ["/app/my-time"] };
    return [home, schedule, { href: "/app/requests/hub", label: "Requests", icon: "requests", owns: ["/app/requests/hub", "/app/availability"] }, pay];
  }
  return [
    home,
    schedule,
    { href: "/app/inbox", label: "Inbox", icon: "inbox", owns: ["/app/inbox", "/app/requests", "/app/exchange", "/app/availability"] },
    { href: "/app/employees", label: "Team", icon: "employees", owns: ["/app/employees"] },
  ];
}

/** Authorized destinations without a tab of their own, in sidebar order. */
export function mobileMoreForRole(role: UserRole, payroll?: PayrollCapabilities) {
  const owned = new Set(mobileTabsForRole(role, payroll).flatMap(tab => tab.owns));
  return navigationForRole(role, payroll).filter(item => !owned.has(item.href));
}

/** The tab that owns the current page: a tab href, "more", or none. */
export function activeMobileTab(role: UserRole, path: string, payroll?: PayrollCapabilities): string | undefined {
  const active = activeNavigationHref(role, path, payroll);
  if (!active) return undefined;
  return mobileTabsForRole(role, payroll).find(tab => tab.owns.includes(active))?.href ?? "more";
}

export type SectionTabGroup = { label: string; items: { href: string; label: string }[] };

/** Pages that share one place in the navigation show tabs between each other.
 * Every tab is an existing URL; only destinations the role can open appear. */
export function sectionTabsFor(role: UserRole, path: string, payroll?: PayrollCapabilities): SectionTabGroup | null {
  const pathname = path.split(/[?#]/, 1)[0];
  const requests = [
    { href: "/app/requests", label: "Time off" },
    { href: "/app/exchange", label: "Shift requests" },
    { href: "/app/availability", label: "Availability" },
  ];
  const groups: SectionTabGroup[] = role === "EMPLOYEE" || role === "LEAD"
    ? [
      { label: "Requests", items: [{ href: "/app/requests/hub", label: "Overview" }, ...requests] },
      ...(payroll?.enabled ? [{ label: "Pay", items: [{ href: "/app/my-pay", label: "Statements" }, { href: "/app/my-time", label: "Hours" }] }] : []),
    ]
    : [
      { label: "Requests", items: requests },
      { label: "Time and pay", items: [
        { href: "/app/timecards", label: "Timecards" },
        ...(navigationForRole(role, payroll).some(item => item.href === "/app/payroll") ? [{ href: "/app/payroll", label: "Payroll runs" }] : []),
        { href: "/app/payroll-export", label: "Time exports" },
        ...(payroll?.canConfigure ? [{ href: "/app/settings/payroll", label: "Payroll settings" }] : []),
      ] },
    ];
  return groups.find(group => group.items.some(item => item.href === pathname)) ?? null;
}
