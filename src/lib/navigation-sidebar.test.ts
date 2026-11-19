import { describe, expect, it } from '@rstest/core';
import { managementNavigationGroups, navigationForRole, sidebarActiveHref, sidebarNavigation } from "./navigation";
import { ALL_MODULES_ON } from "./workspace-presentation/modules";

const payroll = { enabled: true, canReview: true, canConfigure: true } as never;
const company={state:'ready' as const,employeeId:'M1',role:'MANAGER' as const,source:'LEGACY_ADOPTION' as const,scope:{mode:'COMPANY' as const,locationIds:[] as []},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};
const labels = (role: Parameters<typeof navigationForRole>[0], context = {}) => sidebarNavigation(role, navigationForRole(role, payroll, {operational:company,...context})).map(item => item.label);

describe("desktop sidebar (D3)", () => {
  it("gives the Owner nine destinations; the rest stay one step away", () => {
    // D-4: Requests folds into Inbox, and the people page reads "Team" as on the phone tab.
    // Clean Manager (v3): Scheduling rules stays for Owners too (shown under Plan), instead of hiding under Settings.
    // Release 1 (corporate board C-Owner): Inbox reads "Things to do" and Timecards reads "Time".
    // Release 1 ("don't overwhelm"): Scheduling rules opens from Schedule's menu, More and Settings, so Schedule holds it.
    expect(labels("OWNER")).toEqual(["Home", "Things to do", "Schedule", "Updates", "Team", "Time", "Insights", "Payroll", "Settings"]);
    // The full list still drives phones, More menus and the finder.
    expect(navigationForRole("OWNER", payroll).map(item => item.href)).toEqual(expect.arrayContaining(["/app/availability", "/app/exchange", "/app/payroll-export", "/app/schedule/templates", "/app/schedule/settings", "/app/my-pay"]));
  });

  it("keeps an entry when the place that would hold it is missing", () => {
    // Release 1: Scheduling rules is held by Schedule for an Owner (Schedule's menu and Settings open it).
    expect(labels("OWNER")).not.toContain("Scheduling rules");
    expect(labels("MANAGER")).toContain("Schedule");
    // Time off turned off: Inbox still holds Availability and Shift requests.
    const items = labels("OWNER", { modules: { ...ALL_MODULES_ON, timeOff: false } });
    expect(items).not.toEqual(expect.arrayContaining(["Availability"]));
    expect(items).not.toContain("Shift requests");
    expect(items).not.toContain("Requests");
  });

  it("lights the holder for a page whose entry left the sidebar", () => {
    const items = sidebarNavigation("OWNER", navigationForRole("OWNER", payroll));
    expect(sidebarActiveHref("OWNER", "/app/requests", items, payroll)).toBe("/app/inbox");
    expect(sidebarActiveHref("OWNER", "/app/requests?tab=pending&requestId=x", items, payroll)).toBe("/app/inbox");
    expect(sidebarActiveHref("OWNER", "/app/exchange", items, payroll)).toBe("/app/inbox");
    expect(sidebarActiveHref("OWNER", "/app/availability", items, payroll)).toBe("/app/inbox");
    expect(sidebarActiveHref("MANAGER", "/app/requests", sidebarNavigation("MANAGER", navigationForRole("MANAGER", payroll,company)), payroll,{operational:company})).toBe("/app/inbox");
    // Release 1: Time exports and Payroll settings light Payroll (their phone tab); without payroll review, Time.
    expect(sidebarActiveHref("OWNER", "/app/payroll-export", items, payroll)).toBe("/app/payroll");
    expect(sidebarActiveHref("OWNER", "/app/settings/payroll", items, payroll)).toBe("/app/payroll");
    const noReview = { enabled: true, canReview: false, canConfigure: false } as never;
    expect(sidebarActiveHref("OWNER", "/app/payroll-export", sidebarNavigation("OWNER", navigationForRole("OWNER", noReview)), noReview)).toBe("/app/timecards");
    expect(sidebarActiveHref("OWNER", "/app/schedule/templates/abc", items, payroll)).toBe("/app/schedule");
    expect(sidebarActiveHref("OWNER", "/app/schedule/settings", items, payroll)).toBe("/app/schedule");
    expect(sidebarActiveHref("OWNER", "/app/my-pay", items, payroll)).toBeUndefined();
  });

  it("Phase 3 (MG-006, MG-007): orders a Manager's sidebar by the job and gives Scheduling rules and My pay an entry", () => {
    const items = sidebarNavigation("MANAGER", navigationForRole("MANAGER", payroll, { operational: company }));
    const groups = managementNavigationGroups(items, [], "MANAGER");
    // Payroll is there only because this fixture lets the Manager review payroll; without it the list is the finding's five.
    expect(groups.map(group => [group.label, group.items.map(item => item.label)])).toEqual([
      ["", ["Home", "Things to do", "Schedule", "Time", "Payroll", "Team"]],
      ["", ["Insights", "Updates", "Scheduling rules", "My pay"]],
    ]);
    const own = { enabled: true, canReview: false, canConfigure: false } as never;
    const plain = managementNavigationGroups(sidebarNavigation("MANAGER", navigationForRole("MANAGER", own, { operational: company })), [], "MANAGER");
    expect(plain[0].items.map(item => item.label)).toEqual(["Home", "Things to do", "Schedule", "Time", "Team"]);
    // The two entries light themselves; nothing new is reachable (both were already in the Manager's navigation).
    expect(sidebarActiveHref("MANAGER", "/app/schedule/settings", items, payroll, { operational: company })).toBe("/app/schedule/settings");
    expect(sidebarActiveHref("MANAGER", "/app/my-pay", items, payroll, { operational: company })).toBe("/app/my-pay");
    expect(items.every(item => navigationForRole("MANAGER", payroll, { operational: company }).some(allowed => allowed.href === item.href))).toBe(true);
    // A Manager without those destinations gets no entry for them: no pay with payroll off, no rules without company scope.
    expect(sidebarNavigation("MANAGER", navigationForRole("MANAGER", undefined, { operational: company })).map(item => item.href)).not.toContain("/app/my-pay");
    const scoped = { ...company, scope: { mode: "LOCATIONS" as const, locationIds: ["L1"] } };
    expect(sidebarNavigation("MANAGER", navigationForRole("MANAGER", own, { operational: scoped as never })).map(item => item.href)).toEqual(["/app", "/app/schedule", "/app/employees", "/app/my-pay"]);
    // The Owner's sidebar is unchanged: the same order and the "More" heading, with both pages one step away.
    const owner = managementNavigationGroups(sidebarNavigation("OWNER", navigationForRole("OWNER", payroll)));
    expect(owner.map(group => group.label)).toEqual(["", "More"]);
    expect(owner[0].items.map(item => item.label)).toEqual(["Home", "Schedule", "Time", "Payroll", "Team", "Things to do"]);
    expect(owner.flatMap(group => group.items.map(item => item.href))).not.toEqual(expect.arrayContaining(["/app/schedule/settings"]));
  });

  it("employees lose only entries their Requests tabs and account menu already hold", () => {
    const own = { enabled: true, canReview: false, canConfigure: false } as never;
    const items = sidebarNavigation("EMPLOYEE", navigationForRole("EMPLOYEE", own));
    // Release 1 (boards C-Employee, E-More): the phone tabs' names and order, then what More lists.
    // Jose (Nov 15, 2026, item 12): Notifications is the top bar's bell for every role, so it has no sidebar entry.
    expect(items.map(item => item.label)).toEqual(["Home", "Schedule", "Time", "Pay", "Requests", "Updates"]);
    expect(sidebarActiveHref("EMPLOYEE", "/app/availability", items, own)).toBe("/app/schedule");
    // Profile lives in the account menu: no sidebar entry lights up for it (D5 fix: it used to light Home).
    expect(sidebarActiveHref("EMPLOYEE", "/app/profile", items, own)).toBeUndefined();
  });
});
