import { describe, expect, it } from "vitest";
import { navigationForRole, sidebarActiveHref, sidebarNavigation } from "./navigation";
import { ALL_MODULES_ON } from "./workspace-presentation/modules";

const payroll = { enabled: true, canReview: true, canConfigure: true } as never;
const company={state:'ready' as const,employeeId:'M1',role:'MANAGER' as const,source:'LEGACY_ADOPTION' as const,scope:{mode:'COMPANY' as const,locationIds:[] as []},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};
const labels = (role: Parameters<typeof navigationForRole>[0], context = {}) => sidebarNavigation(role, navigationForRole(role, payroll, {operational:company,...context})).map(item => item.label);

describe("desktop sidebar (D3)", () => {
  it("gives the Owner ten destinations; the rest stay one step away", () => {
    // D-4: Requests folds into Inbox, and the people page reads "Team" as on the phone tab.
    // Clean Manager (v3): Scheduling rules stays for Owners too (shown under Plan), instead of hiding under Settings.
    expect(labels("OWNER")).toEqual(["Home", "Inbox", "Schedule", "Updates", "Team", "Timecards", "Insights", "Payroll", "Scheduling rules", "Settings"]);
    // The full list still drives phones, More menus and the finder.
    expect(navigationForRole("OWNER", payroll).map(item => item.href)).toEqual(expect.arrayContaining(["/app/availability", "/app/exchange", "/app/payroll-export", "/app/schedule/templates", "/app/schedule/settings", "/app/my-pay"]));
  });

  it("keeps an entry when the place that would hold it is missing", () => {
    // Managers have no Settings, so Scheduling rules stays.
    expect(labels("MANAGER")).toContain("Scheduling rules");
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
    expect(sidebarActiveHref("OWNER", "/app/payroll-export", items, payroll)).toBe("/app/timecards");
    expect(sidebarActiveHref("OWNER", "/app/schedule/templates/abc", items, payroll)).toBe("/app/schedule");
    expect(sidebarActiveHref("OWNER", "/app/schedule/settings", items, payroll)).toBe("/app/schedule/settings");
    expect(sidebarActiveHref("OWNER", "/app/my-pay", items, payroll)).toBeUndefined();
  });

  it("employees lose only entries their Requests tabs and account menu already hold", () => {
    const own = { enabled: true, canReview: false, canConfigure: false } as never;
    const items = sidebarNavigation("EMPLOYEE", navigationForRole("EMPLOYEE", own));
    expect(items.map(item => item.label)).toEqual(["Home", "My schedule", "My time", "Requests", "Updates", "Notifications", "My pay"]);
    expect(sidebarActiveHref("EMPLOYEE", "/app/availability", items, own)).toBe("/app/requests/hub");
    // Profile lives in the account menu: no sidebar entry lights up for it (D5 fix: it used to light Home).
    expect(sidebarActiveHref("EMPLOYEE", "/app/profile", items, own)).toBeUndefined();
  });
});
