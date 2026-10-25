import type { UserRole } from "@/lib/domain";
import type { NavIconName } from "@/components/nav-icon";
import type { PayrollCapabilities } from './payroll/contracts';
import { ALL_MODULES_ON, pathEnabled, type EnabledModules } from './workspace-presentation/modules';
import { DEFAULT_WORDS, type WordSlots } from './workspace-presentation/words';

/** Company choices that shape navigation (B2): modules that are off disappear
 * everywhere, and the vocabulary names the people page. Defaults change nothing. */
export type NavContext = { ownerAdvisorEnabled?: boolean; modules?: EnabledModules; words?: WordSlots; operational?:OperationalAuthorityView };
import type {OperationalAuthorityView} from './company-access/model';

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
  // Clean Manager (v3): Scheduling rules sits in Plan for Owners too; Settings no longer holds it.
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

/** Clean Manager (v3): the occasional tools that used to sit on Home. They keep their addresses (Home's views and the two
 * recovery pages); only their place in the navigation is new. Owners and Managers only. */
const TEAM_TOOLS: NavigationItem[] = [
  { href: "/app?view=attendance", label: "Attendance", icon: "hours" },
  { href: "/app?view=team", label: "Team overview", icon: "employees" },
  { href: "/app?view=activity", label: "Schedule activity", icon: "calendar" },
  { href: "/app/clocker-recovery", label: "Clocker recovery", icon: "refresh" },
  { href: "/app/account-recovery", label: "Account recovery", icon: "employee" },
];
export function teamToolsForRole(role: UserRole, context: NavContext = {}): NavigationItem[] {
  const current = context.operational;
  return role === "OWNER" || role === "MANAGER" && current?.state === "ready" && current.role === "MANAGER" && current.scope?.mode === "COMPANY" ? TEAM_TOOLS : [];
}

/** Presentation groups consume only already-authorized navigation entries. Team tools, when given, sit before Workspace. */
export function managementNavigationGroups(items: NavigationItem[], tools: NavigationItem[] = []) {
  const definitions = [
    {label:'Plan', hrefs:['/app','/app/ai-manager','/app/inbox','/app/schedule','/app/availability','/app/exchange','/app/schedule/templates','/app/schedule/settings']},
    // "People", not "Team", so the Team entry isn't filed under a heading of the same name.
    {label:'People', hrefs:['/app/employees','/app/requests','/app/updates']},
    {label:'Time and pay', hrefs:['/app/timecards','/app/payroll','/app/payroll-export','/app/reports','/app/my-pay']},
    {label:'Workspace', hrefs:['/app/settings']},
  ];
  const groups = definitions.map(group=>({label:group.label,items:group.hrefs.flatMap(href=>items.filter(item=>item.href===href))}));
  if (tools.length) groups.splice(3, 0, {label:'Team tools', items:tools});
  return groups.filter(group=>group.items.length);
}

/** MG3, regrouped for the clean Manager app (v3): the phone More sheet by job. Grouping grants nothing: it only
 * orders the items the role already has (plus the team tools passed in), and anything unlisted stays under "More". */
export function moreNavigationGroups(items: NavigationItem[], tools: NavigationItem[] = []) {
  const definitions = [
    {label: 'Time and pay', hrefs: ['/app/timecards', '/app/payroll', '/app/payroll-export', '/app/reports']},
    {label: 'Planning', hrefs: ['/app/schedule/templates', '/app/schedule/settings', '/app/updates', '/app/availability', '/app/exchange', '/app/requests']},
    {label: 'Account', hrefs: ['/app/profile', '/app/my-pay', '/app/settings']},
  ];
  const listed = new Set(definitions.flatMap(group => group.hrefs));
  const groups = definitions.map(group => ({label: group.label, items: group.hrefs.flatMap(href => items.filter(item => item.href === href))}));
  if (tools.length) groups.splice(2, 0, {label: 'Team tools', items: tools});
  groups.push({label: 'More', items: items.filter(item => !listed.has(item.href))});
  return groups.filter(group => group.items.length);
}

/** Canonical workflows keep their URLs, queries and commands. Only their
 * employee navigation owner is the Requests group. Manager owners are unchanged. */
export function activeNavigationHref(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext | OperationalAuthorityView = {}): string | undefined {
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

/**
 * Projects links from server-provided role, scope, module and payroll capability
 * views. Missing Manager scope stays conservative. This is UI composition, not
 * authorization: direct requests must pass the destination's current guards.
 */
export function navigationForRole(role: UserRole, payroll?: PayrollCapabilities, input: NavContext | OperationalAuthorityView = {}): NavigationItem[] {
  const context:NavContext = 'state' in input ? {operational:input} : input;
  const modules = context.modules ?? ALL_MODULES_ON, words = context.words ?? DEFAULT_WORDS.en;
  return baseNavigation(role, payroll, context.operational, context.ownerAdvisorEnabled)
    .filter(item => pathEnabled(item.href, modules))
    .map(item => item.href === "/app/employees" ? { ...item, label: words.people } : item);
}

function baseNavigation(role: UserRole, payroll?: PayrollCapabilities, operational?:OperationalAuthorityView, ownerAdvisorEnabled=false): NavigationItem[] {
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
      ...(ownerAdvisorEnabled ? [{href:"/app/ai-manager",label:"AI manager",icon:"reports" as const}] : []),
      { href: "/app/settings", label: "Settings", icon: "settings" as const },
    ];
  }

  if (role === "MANAGER") {
    const scope=operational?.state==='ready'&&operational.role==='MANAGER'?operational.scope:null;
    if(scope?.mode==='COMPANY')return management;
    const allowed=new Set(['/app','/app/profile',...(scope?.mode==='LOCATIONS'&&scope.locationIds.length?['/app/schedule','/app/employees']:[]),...finance.map(item=>item.href)]);
    return management.filter(item=>allowed.has(item.href));
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
  const schedule: MobileTab = { href: "/app/schedule", label: "Schedule", icon: "schedule", owns: ["/app/schedule", "/app/schedule/templates", "/app/schedule/settings"] };
  if (role === "EMPLOYEE" || role === "LEAD") {
    const pay: MobileTab = payroll?.enabled && (context.modules ?? ALL_MODULES_ON).payStatements
      ? { href: "/app/my-pay", label: "Pay", icon: "receipt", owns: ["/app/my-pay", "/app/my-time", "/app/timecards"] }
      : { href: "/app/my-time", label: "Hours", icon: "clock", owns: ["/app/my-time", "/app/timecards"] };
    // v5 One look (approved Oct 24): Notifications opens from Home's bell, and every request page sits under Requests.
    return [{ ...home, owns: ["/app", "/app/notifications"] }, schedule, { href: "/app/requests/hub", label: "Requests", icon: "requests", owns: ["/app/requests/hub", "/app/requests", "/app/exchange", "/app/exchange/swap", "/app/exchange/callout", "/app/availability"] }, pay];
  }
  const authorized = new Set(navigationForRole(role, payroll, context).map(item=>item.href));
  const tabs:MobileTab[] = [
    // Quiet (v4): Notifications opens from Today's bell, so Home stays lit there.
    { ...home, owns: ["/app", "/app/notifications"] },
    schedule,
    { href: "/app/inbox", label: "Inbox", icon: "inbox", owns: ["/app/inbox", "/app/requests", "/app/exchange", "/app/availability"] },
    { href: "/app/employees", label: "Team", icon: "employees", owns: ["/app/employees", "/app/account-recovery", "/app/clocker-recovery"] },
  ];
  return tabs.filter(tab=>authorized.has(tab.href));
}

/** Authorized destinations without a tab of their own, in sidebar order. */
export function mobileMoreForRole(role: UserRole, payroll?: PayrollCapabilities, context: NavContext = {}) {
  const owned = new Set(mobileTabsForRole(role, payroll, context).flatMap(tab => tab.owns));
  return navigationForRole(role, payroll, context).filter(item => !owned.has(item.href));
}

/** The tab that owns the current page: a tab href, "more", or none. */
export function activeMobileTab(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): string | undefined {
  const active = activeNavigationHref(role, path, payroll, context);
  // Quiet (v4): a tool page with no menu entry of its own (Account and Clocker recovery) lights the tab that owns it.
  if (!active) return mobileTabsForRole(role, payroll, context).find(tab => tab.owns.some(owned => owned !== "/app" && (path === owned || path.startsWith(`${owned}/`))))?.href;
  return mobileTabsForRole(role, payroll, context).find(tab => tab.owns.includes(active))?.href ?? "more";
}

export type SectionTabGroup = { label: string; items: { href: string; label: string }[] };

/** Pages that share one place in the navigation show tabs between each other.
 * Every tab is an existing URL; only destinations the role can open appear. */
export function sectionTabsFor(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): SectionTabGroup | null {
  const modules = context.modules ?? ALL_MODULES_ON;
  const pathname = path.split(/[?#]/, 1)[0];
  // v5 "One look" (approved Oct 24, 2026): an Employee's or Lead's pages switch views with segments and go back with the
  // bar's Back, so they have no tab row.
  if (role === "EMPLOYEE" || role === "LEAD") return null;
  // Clean Manager (v3): Owners and Managers move between the three request pages from the band (RequestPagesNav),
  // so those pages have one pill row.
  const groups: SectionTabGroup[] = [
    { label: "Time and pay", items: [
      { href: "/app/timecards", label: "Timecards" },
      ...(navigationForRole(role, payroll, context).some(item => item.href === "/app/payroll") ? [{ href: "/app/payroll", label: "Payroll runs" }] : []),
      { href: "/app/payroll-export", label: "Time exports" },
      ...(payroll?.canConfigure ? [{ href: "/app/settings/payroll", label: "Payroll settings" }] : []),
    ] },
  ];
  // A turned-off module's pages leave the tabs; a lone tab is no tab row.
  const authorized = new Set(navigationForRole(role,payroll,context).map(item=>item.href));
  if(payroll?.canConfigure)authorized.add('/app/settings/payroll');
  const visible = groups.map(group => ({ ...group, items: group.items.filter(item => pathEnabled(item.href, modules)&&(role!=='MANAGER'||authorized.has(item.href))) })).filter(group => group.items.length > 1);
  return visible.find(group => group.items.some(item => item.href === pathname)) ?? null;
}
