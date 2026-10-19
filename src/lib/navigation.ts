import type { UserRole } from "@/lib/domain";
import type { NavIconName } from "@/components/nav-icon";
import type { PayrollCapabilities } from './payroll/contracts';
import { ALL_MODULES_ON, pathEnabled, type EnabledModules } from './workspace-presentation/modules';
import { DEFAULT_WORDS, type WordSlots } from './workspace-presentation/words';

/** Company choices that shape navigation (B2): modules that are off disappear
 * everywhere, and the vocabulary names the people page. Defaults change nothing. */
export type NavContext = { modules?: EnabledModules; words?: WordSlots };

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
  { href: "/app/reports", label: "Insights", icon: "reports" },
  { href: "/app/payroll-export", label: "Time exports", icon: "export" },
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

/** Desktop sidebar (D3). An entry that is already one step away (a section tab,
 * a page toolbar, the settings hub or the account menu) leaves the sidebar when the
 * place that holds it is present. Phones, the More menus and the finder keep every
 * entry; this only shortens the desktop list. */
const SIDEBAR_HOLDERS: Record<string, string> = {
  // Phase 4 (D-4): Requests folds into Inbox on desktop, as the Inbox tab already holds it on phones.
  // /app/requests, /app/exchange and /app/availability keep working and light Inbox.
  "/app/requests": "/app/inbox",
  "/app/availability": "/app/inbox",
  "/app/exchange": "/app/inbox",
  "/app/payroll-export": "/app/timecards",
  "/app/schedule/templates": "/app/schedule",
  "/app/schedule/settings": "/app/settings",
};
const EMPLOYEE_SIDEBAR_HOLDERS: Record<string, string> = {
  "/app/availability": "/app/requests/hub",
};
/** Entries reached from the desktop account menu instead; their pages light no sidebar entry. */
const ACCOUNT_MENU_ENTRIES = new Set(["/app/my-pay", "/app/profile"]);
const EMPLOYEE_ACCOUNT_MENU_ENTRIES = new Set(["/app/profile"]);

function sidebarHolders(role: UserRole) { return role === "EMPLOYEE" || role === "LEAD" ? EMPLOYEE_SIDEBAR_HOLDERS : SIDEBAR_HOLDERS; }

export function sidebarNavigation(role: UserRole, items: NavigationItem[]): NavigationItem[] {
  const present = new Set(items.map(item => item.href)), holders = sidebarHolders(role), management = role !== "EMPLOYEE" && role !== "LEAD";
  return items
    .filter(item => !(holders[item.href] && present.has(holders[item.href])) && !(management ? ACCOUNT_MENU_ENTRIES : EMPLOYEE_ACCOUNT_MENU_ENTRIES).has(item.href))
    // D-4: the people page is "Team" in the sidebar, as on the phone tab.
    .map(item => management && item.href === "/app/employees" ? { ...item, label: "Team" } : item);
}

/** The sidebar entry to highlight: a page whose own entry left the sidebar lights its holder. */
export function sidebarActiveHref(role: UserRole, path: string | null | undefined, items: NavigationItem[], payroll?: PayrollCapabilities, context: NavContext = {}): string | undefined {
  const active = activeNavigationHref(role, path ?? "", payroll, context);
  const shown = new Set(items.map(item => item.href));
  if (!active || shown.has(active)) return active;
  const holder = sidebarHolders(role)[active];
  return holder && shown.has(holder) ? holder : undefined;
}

/** Presentation groups consume only already-authorized navigation entries. */
export function managementNavigationGroups(items: NavigationItem[]) {
  const definitions = [
    {label:'Plan', hrefs:['/app','/app/inbox','/app/schedule','/app/availability','/app/exchange','/app/schedule/templates']},
    // "People", not "Team", so the Team entry isn't filed under a heading of the same name.
    {label:'People', hrefs:['/app/employees','/app/requests','/app/updates']},
    {label:'Time and pay', hrefs:['/app/timecards','/app/payroll','/app/payroll-export','/app/reports','/app/my-pay']},
    {label:'Workspace', hrefs:['/app/settings','/app/schedule/settings']},
  ];
  return definitions.map(group=>({...group,items:group.hrefs.flatMap(href=>items.filter(item=>item.href===href))})).filter(group=>group.items.length);
}

/** MG3: the phone More sheet grouped by job. Grouping grants nothing: it only
 * orders the items the role already has, and anything unlisted stays under "More". */
export function moreNavigationGroups(items: NavigationItem[]) {
  const definitions = [
    {label: 'Time and reporting', hrefs: ['/app/timecards', '/app/payroll', '/app/payroll-export', '/app/reports']},
    {label: 'Scheduling tools', hrefs: ['/app/schedule/templates', '/app/schedule/settings', '/app/availability', '/app/exchange']},
    {label: 'Workplace', hrefs: ['/app/updates', '/app/requests', '/app/settings']},
    {label: 'My account', hrefs: ['/app/my-pay', '/app/profile']},
  ];
  const listed = new Set(definitions.flatMap(group => group.hrefs));
  const groups = definitions.map(group => ({label: group.label, items: group.hrefs.flatMap(href => items.filter(item => item.href === href))}));
  groups.push({label: 'More', items: items.filter(item => !listed.has(item.href))});
  return groups.filter(group => group.items.length);
}

/** Canonical workflows keep their URLs, queries and commands. Only their
 * employee navigation owner is the Requests group. Manager owners are unchanged. */
export function activeNavigationHref(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): string | undefined {
  const pathname = path.split(/[?#]/, 1)[0];
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  if ((role === "EMPLOYEE" || role === "LEAD") &&
      (matches("/app/requests") || matches("/app/exchange"))) return "/app/requests/hub";
  // IS-67: an employee's Timecards belongs to the Hours family, so the Pay or Hours tab stays current on it.
  if ((role === "EMPLOYEE" || role === "LEAD") && matches("/app/timecards")) return "/app/my-time";
  return navigationForRole(role, payroll, context)
    .filter(item => item.href === "/app" ? pathname === "/app" : matches(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function navigationForRole(role: UserRole, payroll?: PayrollCapabilities, context: NavContext = {}): NavigationItem[] {
  const modules = context.modules ?? ALL_MODULES_ON, words = context.words ?? DEFAULT_WORDS.en;
  return baseNavigation(role, payroll)
    .filter(item => pathEnabled(item.href, modules))
    .map(item => item.href === "/app/employees" ? { ...item, label: words.people } : item);
}

function baseNavigation(role: UserRole, payroll?: PayrollCapabilities): NavigationItem[] {
  const finance: NavigationItem[] = payroll?.enabled ? [
    ...(payroll.canReview ? [{ href: '/app/payroll', label: 'Payroll', icon: 'payroll' as const }] : []),
    { href: '/app/my-pay', label: 'My pay', icon: 'statement' },
  ] : [];
  const management = [...managementNavigation];
  if (finance.length) management.splice(management.findIndex(item => item.href === '/app/payroll-export') + 1, 0, ...finance);
  // Phase 3.5: Owners and Managers have a Profile page too, reached from the account menu and More › My account.
  management.push({ href: "/app/profile", label: "Profile", icon: "employee" });
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
export function mobileTabsForRole(role: UserRole, payroll?: PayrollCapabilities, context: NavContext = {}): MobileTab[] {
  const home: MobileTab = { href: "/app", label: "Home", icon: "dashboard", owns: ["/app"] };
  const schedule: MobileTab = { href: "/app/schedule", label: "Schedule", icon: "schedule", owns: ["/app/schedule"] };
  if (role === "EMPLOYEE" || role === "LEAD") {
    const pay: MobileTab = payroll?.enabled && (context.modules ?? ALL_MODULES_ON).payStatements
      ? { href: "/app/my-pay", label: "Pay", icon: "statement", owns: ["/app/my-pay", "/app/my-time", "/app/timecards"] }
      : { href: "/app/my-time", label: "Hours", icon: "clock", owns: ["/app/my-time", "/app/timecards"] };
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
export function mobileMoreForRole(role: UserRole, payroll?: PayrollCapabilities, context: NavContext = {}) {
  const owned = new Set(mobileTabsForRole(role, payroll, context).flatMap(tab => tab.owns));
  return navigationForRole(role, payroll, context).filter(item => !owned.has(item.href));
}

/** The tab that owns the current page: a tab href, "more", or none. */
export function activeMobileTab(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): string | undefined {
  const active = activeNavigationHref(role, path, payroll, context);
  if (!active) return undefined;
  return mobileTabsForRole(role, payroll, context).find(tab => tab.owns.includes(active))?.href ?? "more";
}

export type SectionTabGroup = { label: string; items: { href: string; label: string }[] };

/** Pages that share one place in the navigation show tabs between each other.
 * Every tab is an existing URL; only destinations the role can open appear. */
export function sectionTabsFor(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): SectionTabGroup | null {
  const modules = context.modules ?? ALL_MODULES_ON;
  const pathname = path.split(/[?#]/, 1)[0];
  const requests = [
    { href: "/app/requests", label: "Time off" },
    { href: "/app/exchange", label: "Shift requests" },
    { href: "/app/availability", label: "Availability" },
  ];
  const groups: SectionTabGroup[] = role === "EMPLOYEE" || role === "LEAD"
    ? [
      { label: "Requests", items: [{ href: "/app/requests/hub", label: "Overview" }, ...requests] },
      // Timecards stays in the employee's Pay / Hours family (Codex mobile review M7).
      ...(payroll?.enabled && modules.payStatements
        // TCD-19: the tabs use the names the sidebar and page titles use.
        ? [{ label: "Pay", items: [{ href: "/app/my-pay", label: "My pay" }, { href: "/app/my-time", label: "My time" }, { href: "/app/timecards", label: "Timecards" }] }]
        : [{ label: "Hours", items: [{ href: "/app/my-time", label: "My time" }, { href: "/app/timecards", label: "Timecards" }] }]),
    ]
    : [
      { label: "Requests", items: requests },
      { label: "Time and pay", items: [
        { href: "/app/timecards", label: "Timecards" },
        ...(navigationForRole(role, payroll, context).some(item => item.href === "/app/payroll") ? [{ href: "/app/payroll", label: "Payroll runs" }] : []),
        { href: "/app/payroll-export", label: "Time exports" },
        ...(payroll?.canConfigure ? [{ href: "/app/settings/payroll", label: "Payroll settings" }] : []),
      ] },
    ];
  // A turned-off module's pages leave the tabs; a lone tab is no tab row.
  const visible = groups.map(group => ({ ...group, items: group.items.filter(item => pathEnabled(item.href, modules)) })).filter(group => group.items.length > 1);
  return visible.find(group => group.items.some(item => item.href === pathname)) ?? null;
}
