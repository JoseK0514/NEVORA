import type { UserRole } from "@/lib/domain";
import type { NavIconName } from "@/components/nav-icon";
import type { PayrollCapabilities } from './payroll/contracts';
import { ALL_MODULES_ON, pathEnabled, type EnabledModules } from './workspace-presentation/modules';
import { type WordSlots } from './workspace-presentation/words';

/** Company choices that shape navigation (B2): modules that are off disappear
 * everywhere, and the vocabulary names the people page. Defaults change nothing. */
export type NavContext = { billingEnabled?:boolean;ownerAdvisorEnabled?: boolean;managerAdvisorEnabled?: boolean; modules?: EnabledModules; words?: WordSlots; operational?:OperationalAuthorityView };
import type {OperationalAuthorityView} from './company-access/model';

export type NavigationItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

/** Owner premium A3 (Oct 31): one name per place. Each label is the page's own title (H1), so the sidebar, the finder,
 * More and the page say the same thing: Things to do (not Inbox), Week templates, Who’s working, Hours this week, Activity.
 * The five tabs keep their bar names (Time stays "Time" over the Timecards page, as on the approved boards). */
const managementNavigation: NavigationItem[] = [
  { href: "/app", label: "Home", icon: "dashboard" },
  { href: "/app/inbox", label: "Things to do", icon: "inbox" },
  { href: "/app/schedule", label: "Schedule", icon: "schedule" },
  { href: "/app/availability", label: "Availability", icon: "availability" },
  { href: "/app/requests", label: "Time off", icon: "timeOff" },
  { href: "/app/exchange", label: "Shift requests", icon: "exchange" },
  { href: "/app/updates", label: "Updates", icon: "updates" },
  { href: "/app/employees", label: "Team", icon: "employees" },
  { href: "/app/timecards", label: "Timecards", icon: "clock" },
  { href: "/app/reports", label: "Insights", icon: "reports" },
  { href: "/app/payroll-export", label: "Time exports", icon: "export" },
  { href: "/app/schedule/templates", label: "Week templates", icon: "templates" },
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
  // Release 1: Time exports belongs to Payroll (its phone tab); without payroll review it stays with Time.
  "/app/payroll-export": "/app/payroll",
  "/app/schedule/templates": "/app/schedule",
  // Release 1 (board O-ScheduleRules, back "Schedule"): Scheduling rules opens from Schedule's menu, More and Settings.
  "/app/schedule/settings": "/app/schedule",
};
const EMPLOYEE_SIDEBAR_HOLDERS: Record<string, string> = {
  "/app/availability": "/app/schedule",
};
/** Entries reached from the desktop account menu instead; their pages light no sidebar entry. */
const ACCOUNT_MENU_ENTRIES = new Set(["/app/my-pay", "/app/profile"]);
const EMPLOYEE_ACCOUNT_MENU_ENTRIES = new Set(["/app/profile"]);
/** Jose (Nov 15, 2026, item 12): one bell, in the top bar, for every role. An Employee's or Lead's Notifications entry
 * leaves the sidebar and the tablet rail, as an Owner's and a Manager's never had one; the phone header's bell is the same. */
const EMPLOYEE_TOP_BAR_ENTRIES = new Set(["/app/notifications"]);
/** Phase 3 (MG-007): a Manager has no Settings page and no Payroll entry, so the two pages that were only on the avatar's
 * More page have their own sidebar entries: Scheduling rules (the one setting a Manager has) and My pay. Both are entries
 * the Manager's navigation already holds; a Manager without one of them gets no entry for it. Owners keep the shorter list. */
const MANAGER_SIDEBAR_KEEPS = new Set(["/app/schedule/settings", "/app/my-pay"]);
/** Release 1 (board C-Employee): an Employee's desktop sidebar uses the phone tabs' names and order. */
const EMPLOYEE_SIDEBAR_LABELS: Record<string, string> = { "/app/schedule": "Schedule", "/app/my-time": "Time", "/app/my-pay": "Pay" };
const EMPLOYEE_SIDEBAR_ORDER = ["/app", "/app/schedule", "/app/my-time", "/app/my-pay", "/app/requests/hub"];

// An Employee's Schedule holds Availability (its title action). A Lead's Schedule and Requests pages have no Availability
// link, so a Lead keeps the sidebar entry.
// Direction B for Leads (Jose, Nov 8, 2026): a Lead has the Employee's sidebar, tabs and current-page rules.
function sidebarHolders(role: UserRole) { return role === "EMPLOYEE" || role === "LEAD" ? EMPLOYEE_SIDEBAR_HOLDERS : SIDEBAR_HOLDERS; }

/** The holder that is present: Time exports falls back to Time when there is no Payroll entry. */
function holderFor(role: UserRole, href: string, present: Set<string>): string | undefined {
  const holder = sidebarHolders(role)[href];
  if (holder && present.has(holder)) return holder;
  return href === "/app/payroll-export" && present.has("/app/timecards") ? "/app/timecards" : undefined;
}

export function sidebarNavigation(role: UserRole, items: NavigationItem[]): NavigationItem[] {
  const present = new Set(items.map(item => item.href)), management = role !== "EMPLOYEE" && role !== "LEAD";
  const rank = (href: string) => { const index = EMPLOYEE_SIDEBAR_ORDER.indexOf(href); return index < 0 ? EMPLOYEE_SIDEBAR_ORDER.length : index; };
  // A Lead has the Employee's sidebar (Direction B, Nov 8, 2026).
  const employee = role === "EMPLOYEE" || role === "LEAD";
  const ordered = employee ? [...items].sort((a, b) => rank(a.href) - rank(b.href)) : items;
  const accountMenu = management ? ACCOUNT_MENU_ENTRIES : EMPLOYEE_ACCOUNT_MENU_ENTRIES;
  return ordered
    .filter(item => role === "MANAGER" && MANAGER_SIDEBAR_KEEPS.has(item.href) || !holderFor(role, item.href, present) && !accountMenu.has(item.href) && !(employee && EMPLOYEE_TOP_BAR_ENTRIES.has(item.href)))
    .map(item => !employee || !EMPLOYEE_SIDEBAR_LABELS[item.href] ? item : { ...item, label: EMPLOYEE_SIDEBAR_LABELS[item.href] })
    // D-4: the people page is "Team" in the sidebar, as on the phone tab.
    // Corporate (Release 1): the desktop sidebar uses the phone's names for Timecards (Time) and Inbox (Things to do).
    .map(item => !management ? item : item.href === "/app/employees" ? { ...item, label: "Team" } : item.href === "/app/timecards" ? { ...item, label: "Time" } : item.href === "/app/inbox" ? { ...item, label: "Things to do" } : item);
}

/** The sidebar entry to highlight: a page whose own entry left the sidebar lights its holder. */
export function sidebarActiveHref(role: UserRole, path: string | null | undefined, items: NavigationItem[], payroll?: PayrollCapabilities, context: NavContext = {}): string | undefined {
  const active = activeNavigationHref(role, path ?? "", payroll, context);
  const shown = new Set(items.map(item => item.href));
  if (!active || shown.has(active)) return active;
  return holderFor(role, active, shown);
}

/** Clean Manager (v3): the occasional tools that used to sit on Home. They keep their addresses (Home's views and the two
 * recovery pages); only their place in the navigation is new. Owners and Managers only.
 * Phase 9 (Nov 18, 2026): each glyph names its own page and no other entry's: Who's working is the people on now
 * (UsersThree; Team keeps Users), Hours this week the timer, Help someone sign in the key (Profile keeps the face). */
const TEAM_TOOLS: NavigationItem[] = [
  { href: "/app?view=attendance", label: "Who’s working", icon: "team" },
  { href: "/app?view=team", label: "Hours this week", icon: "hours" },
  { href: "/app?view=activity", label: "Activity", icon: "calendar" },
  { href: "/app/clocker-recovery", label: "Clocker recovery", icon: "refresh" },
  { href: "/app/account-recovery", label: "Help someone sign in", icon: "key" },
];
/** Release 1 ("don't overwhelm"): the team tools left the desktop sidebar. Each opens from the place the boards put it
 * (Who's working on Home, Hours this week and Help someone sign in on Team, Activity from Schedule), and that place's
 * sidebar entry lights while it is open. */
const TEAM_TOOL_HOLDERS: Record<string, string> = {
  "/app?view=attendance": "/app",
  "/app?view=team": "/app/employees",
  "/app?view=activity": "/app/schedule",
  // Review F2 (NV-070): Clocker recovery opens from Settings (its back link says "‹ Settings"), so Settings lights.
  "/app/clocker-recovery": "/app/settings",
  "/app/account-recovery": "/app/employees",
};
export function teamToolHolder(href: string): string | undefined { return TEAM_TOOL_HOLDERS[href]; }

/** Employees (Release 1, boards C-Employee and E-More): the five phone tabs first, then what More lists (Updates,
 * Notifications) under "More". */
export function employeeNavigationGroups(items: NavigationItem[]) {
  const main = new Set(EMPLOYEE_SIDEBAR_ORDER);
  return [{ label: "", items: items.filter(item => main.has(item.href)) }, { label: "More", items: items.filter(item => !main.has(item.href)) }].filter(group => group.items.length);
}

export function teamToolsForRole(role: UserRole, context: NavContext = {}): NavigationItem[] {
  const current = context.operational;
  return role === "OWNER" || role === "MANAGER" && current?.state === "ready" && current.role === "MANAGER" && current.scope?.mode === "COMPANY" ? TEAM_TOOLS.filter(item=>role==='OWNER'||item.href!=='/app/clocker-recovery') : [];
}

/** Presentation groups consume only already-authorized navigation entries. Corporate (Release 1): the desktop sidebar mirrors
 * the phone, so the five tabs and Things to do come first with no heading, then Team tools, then More.
 * Phase 3 (MG-006, MG-007): approving is a Manager's main job, so a Manager's list reads Home, Things to do, Schedule,
 * Time, Team; and a Manager's second group has no heading ("More" is the avatar's page, one name for one place). */
export function managementNavigationGroups(items: NavigationItem[], tools: NavigationItem[] = [], role?: UserRole) {
  const manager = role === "MANAGER";
  const definitions = [
    {label:'', hrefs:manager?['/app','/app/inbox','/app/schedule','/app/timecards','/app/timecards/corrections','/app/payroll','/app/employees']:['/app','/app/schedule','/app/timecards','/app/payroll','/app/employees','/app/inbox']},
    {label:manager?'':'More', hrefs:['/app/ai-manager','/app/reports','/app/updates','/app/schedule/settings','/app/schedule/templates','/app/availability','/app/exchange','/app/requests','/app/payroll-export','/app/my-pay','/app/settings']},
  ];
  const groups = definitions.map(group=>({label:group.label,items:group.hrefs.flatMap(href=>items.filter(item=>item.href===href))}));
  if (tools.length) groups.splice(1, 0, {label:'Team tools', items:tools});
  return groups.filter(group=>group.items.length);
}

/** MG3, regrouped for the clean Manager app (v3): the phone More sheet by job. Grouping grants nothing: it only
 * orders the items the role already has (plus the team tools passed in), and anything unlisted stays under "More". */
export function moreNavigationGroups(items: NavigationItem[], tools: NavigationItem[] = []) {
  const definitions = [
    {label: 'Time and pay', hrefs: ['/app/timecards', '/app/timecards/corrections', '/app/payroll', '/app/payroll-export', '/app/reports']},
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
  // Release 1 (boards E-Availability, E-SwapSheet, E-CoverSheet, E-CantWorkSheet, E-OpenShifts): an Employee opens these
  // from Schedule, so Schedule stays current on them. A Lead too (Direction B, Nov 8, 2026).
  const query = new URLSearchParams(path.split("?")[1]?.split("#")[0] ?? "");
  // Review F2 (NV-070): every shift request page (Pick up and swap and each of its tabs) goes back to Schedule, so the
  // sidebar and rail light Schedule, as the phone's tab bar does: one parent for the back label and the lit entry.
  if ((role === "EMPLOYEE" || role === "LEAD") && (matches("/app/availability") || matches("/app/exchange"))) return "/app/schedule";
  if ((role === "EMPLOYEE" || role === "LEAD") && matches("/app/requests")) return "/app/requests/hub";
  // Phase 3 (MG-007, TB-009): More opens from the avatar and is no sidebar entry, so the sidebar and rail light nothing on
  // it (they lit Home, NV-294); the avatar is marked instead, as the phone's tab bar already lights no tab (BR-4).
  // Release 1 (board O-Activity): Schedule activity is a view of Home's data opened from Schedule.
  if (role !== "EMPLOYEE" && role !== "LEAD" && pathname === "/app" && query.get("view") === "activity" &&
      navigationForRole(role, payroll, context).some(item => item.href === "/app/schedule")) return "/app/schedule";
  // Final polish (Nov 20, 2026): Posted open shifts opens from Schedule and its back link says "Schedule", so an Owner's
  // or Manager's sidebar, rail and phone tab light Schedule there (they lit Things to do and Home).
  if (role !== "EMPLOYEE" && role !== "LEAD" && matches("/app/exchange/open-shifts") &&
      navigationForRole(role, payroll, context).some(item => item.href === "/app/schedule")) return "/app/schedule";
  // IS-67: an employee's Timecards belongs to the Hours family, so the Pay or Hours tab stays current on it.
  if ((role === "EMPLOYEE" || role === "LEAD") && matches("/app/timecards")) return "/app/my-time";
  // Account deletion opens from Profile, so Profile's place (More) stays current on it.
  if ((role === "EMPLOYEE" || role === "LEAD") && matches("/app/account")) return "/app/profile";
  // Release 1: Payroll settings belongs to Payroll (its phone tab and the sidebar), not to the Settings hub.
  if (matches("/app/settings/payroll") && navigationForRole(role, payroll, context).some(item => item.href === "/app/payroll")) return "/app/payroll";
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
  const modules = context.modules ?? ALL_MODULES_ON;
  // B7 wording (NV-119): the people page is "Team" everywhere (its H1 and tab); the vocabulary preset stays in sentences.
  // Development (Nov 15): an Owner with billing enabled also gets Plan and billing (Phase 9: the card, as on More; the gear
  // is Settings).
  return [...baseNavigation(role, payroll, context.operational, context.ownerAdvisorEnabled, context.managerAdvisorEnabled),...(role==='OWNER'&&context.billingEnabled?[{href:'/app/billing',label:'Plan and billing',icon:'billing' as NavIconName}]:[])]
    .filter(item => pathEnabled(item.href, modules));
}

/** Rondo AI (Nov 18, 2026): the product's name for the adviser everywhere it is named, with its own glyph. An Owner has it
 * with the adviser's switch on; a Manager with a current scope has it with both the adviser's and the Manager switch on
 * (contract docs/handoffs/2026-11-18-rondo-manager-ui-contract.md). The page and the API decide access; this only lists it. */
const RONDO: NavigationItem = { href: "/app/ai-manager", label: "Rondo AI", icon: "rondo" };

function baseNavigation(role: UserRole, payroll?: PayrollCapabilities, operational?:OperationalAuthorityView, ownerAdvisorEnabled=false, managerAdvisorEnabled=false): NavigationItem[] {
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
      ...(ownerAdvisorEnabled ? [RONDO] : []),
      { href: "/app/settings", label: "Settings", icon: "settings" as const },
    ];
  }

  if (role === "MANAGER") {
    const scope=operational?.state==='ready'&&operational.role==='MANAGER'?operational.scope:null;
    const rondo=ownerAdvisorEnabled&&managerAdvisorEnabled&&(scope?.mode==='COMPANY'||scope?.mode==='LOCATIONS'&&scope.locationIds.length>0)?[RONDO]:[];
    if(scope?.mode==='COMPANY')return [...management,...rondo];
    const allowed=new Set(['/app','/app/profile',...(scope?.mode==='LOCATIONS'&&scope.locationIds.length?['/app/schedule','/app/employees']:[]),...finance.map(item=>item.href)]);
    if(scope?.mode==='LOCATIONS'&&scope.locationIds.length) {
      allowed.add('/app/inbox');
      return [...management.filter(item=>allowed.has(item.href)),
        { href: '/app/timecards/corrections', label: 'Time corrections', icon: 'clock' }, ...rondo];
    }
    return [...management.filter(item=>allowed.has(item.href)),...rondo];
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
  const requests: MobileTab = { href: "/app/requests/hub", label: "Requests", icon: "requests", owns: ["/app/requests/hub", "/app/requests", "/app/exchange", "/app/exchange/swap", "/app/exchange/callout", "/app/availability"] };
  if (role === "EMPLOYEE" || role === "LEAD") {
    // Corporate (Release 1, approved Oct 26): Home, Schedule, Time, Pay and Requests; More opens from the header avatar.
    // A Lead has the same tabs (Direction B, Nov 8, 2026).
    // Upscale (Nov 1): pages opened from the avatar or the bell (More, Updates, Profile, Notifications), Help and unknown
    // addresses light no tab; Home owns Home only.
    // Direction B (Nov 6, 2026): shift swaps, open shifts and Availability go back to Schedule, so they light Schedule.
    const shiftPages = ["/app/exchange", "/app/exchange/swap", "/app/exchange/callout", "/app/availability"];
    const tabs: MobileTab[] = [home, { ...schedule, owns: [...schedule.owns, ...shiftPages] }, { href: "/app/my-time", label: "Time", icon: "clock", owns: ["/app/my-time", "/app/timecards"] }];
    if (payroll?.enabled && (context.modules ?? ALL_MODULES_ON).payStatements) tabs.push({ href: "/app/my-pay", label: "Pay", icon: "receipt", owns: ["/app/my-pay"] });
    return [...tabs, { ...requests, owns: requests.owns.filter(href => !shiftPages.includes(href)) }];
  }
  const authorized = new Set(navigationForRole(role, payroll, context).map(item=>item.href));
  // Corporate (Release 1, approved Oct 26): Home, Schedule, Time, Payroll and Team; More opens from the header avatar.
  // Things to do (Inbox) opens from Home, so Home stays lit there. Without payroll review Inbox keeps a tab.
  // Review Nov 14 (BR-4): Notifications opens from the bell and is not one of the tabs, so it lights none.
  const payrollTab = authorized.has("/app/payroll");
  // Final fixes K (Nov 23, 2026): shift swaps, callouts, open shifts and Availability belong to Schedule (their back link and
  // the Schedule sub-pages they sit beside), as on Employee phones; Things to do and time off stay with Home (or To do).
  const shiftPages = ["/app/exchange", "/app/availability"];
  const inboxPages = ["/app/inbox", "/app/requests"];
  const tabs:MobileTab[] = [
    { ...home, owns: ["/app", ...(payrollTab ? inboxPages : [])] },
    { ...schedule, owns: [...schedule.owns, ...shiftPages] },
    { href: "/app/timecards", label: "Time", icon: "clock", owns: ["/app/timecards", ...(payrollTab ? [] : ["/app/payroll-export"])] },
    payrollTab
      ? { href: "/app/payroll", label: "Payroll", icon: "payroll", owns: ["/app/payroll", "/app/payroll-export", "/app/settings/payroll"] }
      : { href: "/app/inbox", label: "To do", icon: "inbox", owns: inboxPages },
    // Review F2 (NV-070): Clocker recovery belongs to Settings (its back link), which lights no tab on a phone.
    { href: "/app/employees", label: "Team", icon: "employees", owns: ["/app/employees", "/app/account-recovery"] },
  ];
  // Phase 3 (MG-006): a Manager's To do tab is second, as in the Manager's sidebar (Home, To do, Schedule, Time, Team).
  // The Owner's bar keeps its order.
  const ordered = role === "MANAGER" && !payrollTab ? [tabs[0], tabs[3], tabs[1], tabs[2], tabs[4]] : tabs;
  return ordered.filter(tab=>authorized.has(tab.href));
}

/** Authorized destinations without a tab of their own, in sidebar order. */
export function mobileMoreForRole(role: UserRole, payroll?: PayrollCapabilities, context: NavContext = {}) {
  const owned = new Set(mobileTabsForRole(role, payroll, context).flatMap(tab => tab.owns));
  return navigationForRole(role, payroll, context).filter(item => !owned.has(item.href));
}

/** The tab that owns the current page: a tab href, "more", or none. Review Nov 14 (BR-4): a page that is not one of the
 * tabs and belongs to none of them (More, Insights, Settings and its pages, Profile, Notifications, Help, Updates) lights
 * no tab; the bar never says Home while another page is open. "more" matches no tab either (phones have no More tab). */
export function activeMobileTab(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): string | undefined {
  const bare = path.split(/[?#]/)[0];
  const tabs = mobileTabsForRole(role, payroll, context);
  // Direction B (Employee phones, Nov 6, 2026): a page a tab owns lights that tab (shift swaps and Availability light
  // Schedule, where their back link goes), whatever the sidebar entry it belongs to.
  if (role === "EMPLOYEE" || role === "LEAD") {
    const own = tabs.find(tab => tab.owns.some(owned => owned !== "/app" && (bare === owned || bare.startsWith(`${owned}/`))));
    if (own) return own.href;
  }
  // More opens from the avatar: no tab is lit, and no sidebar entry either (activeNavigationHref).
  if (bare === "/app/more") return undefined;
  const active = activeNavigationHref(role, path, payroll, context);
  // Quiet (v4): a tool page with no menu entry of its own (Account recovery) lights the tab that owns it.
  return !active ? tabs.find(tab => tab.owns.some(owned => owned !== "/app" && (bare === owned || bare.startsWith(`${owned}/`))))?.href
    : tabs.find(tab => tab.owns.includes(active))?.href ?? "more";
}

export type SectionTabGroup = { label: string; items: { href: string; label: string }[] };

/** Pages that share one place in the navigation show tabs between each other.
 * Every tab is an existing URL; only destinations the role can open appear. */
/** Owner premium (Oct 31): Payroll's own tabs under its title (Pay runs · Time exports · Settings), with the access
 * rules the retired "Time and pay" row used. Timecards belongs to Time and is not one of them. A lone tab is no tab row. */
export function payrollTabsFor(role: UserRole, payroll?: PayrollCapabilities, context: NavContext = {}): SectionTabGroup["items"] | null {
  if (role === "EMPLOYEE" || role === "LEAD") return null;
  const modules = context.modules ?? ALL_MODULES_ON;
  const authorized = new Set(navigationForRole(role, payroll, context).map(item => item.href));
  if (payroll?.canConfigure) authorized.add("/app/settings/payroll");
  const items = [
    // Phase 2 (G1, G8, J12): from 768 the band title on all three pages is the section, "Payroll", and the tabs name the
    // pages, so the selected tab never repeats the title.
    ...(authorized.has("/app/payroll") ? [{ href: "/app/payroll", label: "Pay runs" }] : []),
    { href: "/app/payroll-export", label: "Time exports" },
    ...(payroll?.canConfigure ? [{ href: "/app/settings/payroll", label: "Settings" }] : []),
  ].filter(item => pathEnabled(item.href, modules) && (role !== "MANAGER" || authorized.has(item.href)));
  return items.length > 1 ? items : null;
}

export function sectionTabsFor(role: UserRole, path: string, payroll?: PayrollCapabilities, context: NavContext = {}): SectionTabGroup | null {
  const pathname = path.split(/[?#]/, 1)[0];
  // v5 "One look" (approved Oct 24, 2026): an Employee's or Lead's pages switch views with segments and go back with the
  // bar's Back, so they have no tab row.
  if (role === "EMPLOYEE" || role === "LEAD") return null;
  // Owner premium (Oct 31): the shell draws no section-tab row. Payroll draws its own tabs under its title (Payroll · Time
  // exports · Payroll settings), and Timecards belongs to Time, so its page has no row leading into Payroll. Every URL is
  // unchanged; the arguments stay so callers and a future group keep the same shape.
  void payroll; void context; void pathname;
  return null;
}
