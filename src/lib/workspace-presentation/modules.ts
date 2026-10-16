/** Company modules (B2). An Owner can turn off features the company doesn't
 * use. A module that is off disappears from navigation, tabs, the finder,
 * Home and the Inbox, and its pages, actions and APIs refuse to work. Turning
 * a module off never deletes anything: switching it back on restores it. */
export const MODULE_IDS = ["timeOff", "marketplace", "updates", "payStatements", "breaks"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];
export type EnabledModules = Record<ModuleId, boolean>;

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  description: string;
  /** What changes for the team while it is off. */
  offNote: string;
  /** Only shown when this capability is on (pay statements need payroll). */
  requires?: "payroll";
};

export const MODULES: ModuleDefinition[] = [
  { id: "timeOff", name: "Time off", description: "Employees request time off and managers approve it.",
    offNote: "Employees can't request time off. Approved time off stays on the schedule." },
  { id: "marketplace", name: "Shift swaps and cover", description: "Employees offer, swap and pick up open shifts.",
    offNote: "Employees can't offer, swap or pick up shifts. Shifts already traded stay as they are." },
  { id: "updates", name: "Company updates", description: "Announcements with optional acknowledgement.",
    offNote: "Updates are hidden from everyone and nothing new can be posted. Past updates are kept." },
  { id: "payStatements", name: "Pay statements", description: "Employees see their statements in NEVORA.", requires: "payroll",
    offNote: "Employees see their hours instead of statements. Payroll runs are unaffected." },
  { id: "breaks", name: "Breaks on the Clocker", description: "Employees start and end breaks on Clocker tablets.",
    offNote: "Employees can't start a break on the Clocker. A break already started can still be ended." },
];

export const ALL_MODULES_ON: EnabledModules = { timeOff: true, marketplace: true, updates: true, payStatements: true, breaks: true };

export function enabledModules(disabled: readonly unknown[] | null | undefined): EnabledModules {
  const off = new Set((disabled ?? []).filter((id): id is ModuleId => MODULE_IDS.includes(id as ModuleId)));
  return Object.fromEntries(MODULE_IDS.map(id => [id, !off.has(id)])) as EnabledModules;
}

export const disabledList = (modules: EnabledModules): ModuleId[] => MODULE_IDS.filter(id => !modules[id]);

/** The module that owns a portal path, if any. The Requests overview stays:
 * it also holds availability, which is not a module. */
export function moduleForPath(path: string): ModuleId | null {
  const pathname = path.split(/[?#]/, 1)[0];
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (under("/app/requests/hub")) return null;
  if (under("/app/requests")) return "timeOff";
  if (under("/app/exchange")) return "marketplace";
  if (under("/app/updates")) return "updates";
  if (under("/app/my-pay")) return "payStatements";
  if (under("/app/settings/breaks")) return "breaks";
  return null;
}

export const pathEnabled = (path: string, modules: EnabledModules = ALL_MODULES_ON) => {
  const id = moduleForPath(path);
  return !id || modules[id];
};

/** Things still in progress that would be stranded if a module turned off. */
export type ModuleBlockers = Partial<Record<ModuleId, number>>;
export function blockerText(id: ModuleId, count: number): string {
  const n = count === 1 ? "1 request" : `${count} requests`;
  return id === "timeOff" ? `${n} for time off ${count === 1 ? "is" : "are"} waiting for a decision. Decide ${count === 1 ? "it" : "them"} first.`
    : `${count === 1 ? "1 shift swap or cover request is" : `${count} shift swap or cover requests are`} still open. Let ${count === 1 ? "it" : "them"} finish first.`;
}

/** Manager request types that belong to a module (Inbox and Home tasks). */
export function requestTypeAllowed(type: string, modules: EnabledModules = ALL_MODULES_ON): boolean {
  if (type === "TIME_OFF") return modules.timeOff;
  if (type === "EXCHANGE" || type === "CALLOUT") return modules.marketplace;
  return true;
}
