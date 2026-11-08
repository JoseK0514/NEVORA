import { describe, expect, it } from "vitest";
import { activeMobileTab, activeNavigationHref, mobileMoreForRole, mobileTabsForRole, navigationForRole, sectionTabsFor } from "./navigation";
import type { PayrollCapabilities } from './payroll/contracts';

const payroll: PayrollCapabilities = { enabled: true, canConfigure: false, canReview: false, canApprove: false, internalCalculatorAvailable: false, bankCompatibility: 'UNVERIFIED' };

const company = {state:'ready' as const,employeeId:'M1',role:'MANAGER' as const,source:'LEGACY_ADOPTION' as const,scope:{mode:'COMPANY' as const,locationIds:[] as []},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};

describe("role navigation", () => {
  it("keeps owner controls restricted to owners", () => {
    const owner = navigationForRole("OWNER").map((item) => item.href);
    const manager = navigationForRole("MANAGER",undefined,company).map((item) => item.href);
    const lead = navigationForRole("LEAD").map((item) => item.href);
    const employee = navigationForRole("EMPLOYEE").map((item) => item.href);

    expect(owner).toContain("/app/settings");
    expect(manager).toContain("/app/employees");
    expect(manager).toContain("/app/schedule/settings");
    expect(manager).not.toContain("/app/settings");
    expect(lead).toEqual(employee);
    expect(employee).not.toContain("/app/employees");
    expect(employee).not.toContain("/app/settings");
  });
  it('keeps the feature-off navigation unchanged for every role', () => {
    for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) expect(navigationForRole(role, { ...payroll, enabled: false, canReview: true })).toEqual(navigationForRole(role));
  });
  it('uses current finance capabilities instead of Manager role', () => {
    expect(navigationForRole('MANAGER', payroll).map(item => item.href)).not.toContain('/app/payroll');
    expect(navigationForRole('MANAGER', { ...payroll, canReview: true }).map(item => item.href)).toContain('/app/payroll');
    expect(navigationForRole('OWNER', payroll).map(item => item.href)).not.toContain('/app/payroll');
  });
  it('makes self statements available without a finance grant', () => {
    for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) expect(navigationForRole(role, payroll).map(item => item.href)).toContain('/app/my-pay');
  });
  it('marks only authorized payroll destinations active without changing request ownership', () => {
    expect(activeNavigationHref('MANAGER','/app/payroll',payroll)).toBeUndefined();
    expect(activeNavigationHref('MANAGER','/app/payroll',{...payroll,canReview:true})).toBe('/app/payroll');
    expect(activeNavigationHref('EMPLOYEE','/app/my-pay',payroll)).toBe('/app/my-pay');
    expect(activeNavigationHref('EMPLOYEE','/app/my-pay',{...payroll,enabled:false})).toBeUndefined();
    expect(activeNavigationHref('EMPLOYEE','/app/exchange?tab=mine',payroll)).toBe('/app/requests/hub');
  });
});

it.each(['EMPLOYEE','LEAD'] as const)('Home_Schedule_MyTime_More_all_routes_reachable for %s in explicit order',role=>{
 expect(navigationForRole(role).map(item=>item.href)).toEqual(['/app','/app/schedule','/app/my-time','/app/requests/hub','/app/availability','/app/updates','/app/notifications','/app/profile']);
});

describe('phone tabs', () => {
  // Corporate (Release 1, board C-Employee): an Employee's tabs are Home, Schedule, Time, Pay and Requests. Upscale (Nov 1):
  // More, Updates, Profile and Notifications open from the header avatar or bell; on phones they go back to Home.
  it('gives EMPLOYEE Home, Schedule, Time, Pay and Requests, with Pay only while payroll is on', () => {
    expect(mobileTabsForRole('EMPLOYEE').map(tab => tab.label)).toEqual(['Home','Schedule','Time','Requests']);
    expect(mobileTabsForRole('EMPLOYEE', payroll).map(tab => [tab.label, tab.href])).toEqual([['Home','/app'],['Schedule','/app/schedule'],['Time','/app/my-time'],['Pay','/app/my-pay'],['Requests','/app/requests/hub']]);
    expect(activeMobileTab('EMPLOYEE', '/app/my-time', payroll)).toBe('/app/my-time');
    expect(activeMobileTab('EMPLOYEE', '/app/timecards', payroll)).toBe('/app/my-time');
    const tabs = mobileTabsForRole('EMPLOYEE', payroll).map(tab => tab.href);
    // Direction B (Nov 7, 2026): More and the pages it opens go back to Home, so they light Home; an unknown address lights none.
    for (const path of ['/app/notifications', '/app/more', '/app/updates', '/app/updates/own-update', '/app/profile', '/app/profile/calendar', '/app/help', '/app/account/delete']) {
      expect(activeMobileTab('EMPLOYEE', path, payroll)).toBe('/app');
    }
    expect(tabs).not.toContain(activeMobileTab('EMPLOYEE', '/app/no-such-page', payroll));
    expect(mobileTabsForRole('EMPLOYEE', payroll)[0].owns).toEqual(['/app']);
    expect(activeMobileTab('EMPLOYEE', '/app', payroll)).toBe('/app');
    // Direction B (Nov 6, 2026): Pick up and swap (all its tabs), swaps, can't work and Availability go back to Schedule, so
    // they light Schedule; time off stays on Requests.
    expect(activeMobileTab('EMPLOYEE', '/app/exchange', payroll)).toBe('/app/schedule');
    for (const path of ['/app/availability', '/app/exchange/swap?shiftId=s1', '/app/exchange/callout?shiftId=s1', '/app/exchange?tab=available']) expect(activeMobileTab('EMPLOYEE', path, payroll)).toBe('/app/schedule');
    expect(activeMobileTab('EMPLOYEE', '/app/exchange?tab=my', payroll)).toBe('/app/schedule');
    expect(activeMobileTab('EMPLOYEE', '/app/requests', payroll)).toBe('/app/requests/hub');
    // Direction B for Leads (Nov 8, 2026): a Lead's Availability lights Schedule, as an Employee's does.
    expect(activeMobileTab('LEAD', '/app/availability', payroll)).toBe('/app/schedule');
    expect(activeMobileTab('OWNER', '/app?view=activity', payroll)).toBe('/app/schedule');
    expect(activeMobileTab('OWNER', '/app', payroll)).toBe('/app');
  });
  // Direction B for Leads (Jose, Nov 8, 2026): a Lead has the Employee's tabs (Home, Schedule, Time, Pay while statements
  // are on, Requests; More opens from the avatar) and the same current-tab rules; the v5 Hours tab and More tab are gone.
  it('gives LEAD the Employee tabs and current-tab rules', () => {
    expect(mobileTabsForRole('LEAD').map(tab => tab.label)).toEqual(['Home','Schedule','Time','Requests']);
    expect(mobileTabsForRole('LEAD', payroll)).toEqual(mobileTabsForRole('EMPLOYEE', payroll));
    for (const path of ['/app/my-time', '/app/notifications', '/app/exchange', '/app/availability', '/app/account/delete', '/app/account-recovery', '/app/help', '/app/updates'])
      expect(activeMobileTab('LEAD', path, payroll)).toBe(activeMobileTab('EMPLOYEE', path, payroll));
    expect(mobileMoreForRole('LEAD', payroll).map(item => item.href)).toEqual(mobileMoreForRole('EMPLOYEE', payroll).map(item => item.href));
  });
  // Corporate (Release 1, approved Oct 26): Owner and company-wide Manager tabs are Home, Schedule, Time, Payroll and Team.
  // Things to do (Inbox) opens from Home, which stays lit there. Without payroll review, Inbox takes Payroll's place.
  it.each(['MANAGER','OWNER'] as const)('gives %s Home, Schedule, Time, Payroll and Team when payroll review is on', role => {
    const context={operational:company}, review={...payroll,canReview:true};
    expect(mobileTabsForRole(role,review,context).map(tab => [tab.label, tab.href])).toEqual([['Home','/app'],['Schedule','/app/schedule'],['Time','/app/timecards'],['Payroll','/app/payroll'],['Team','/app/employees']]);
    expect(activeMobileTab(role,'/app/inbox',review,context)).toBe('/app');
    expect(activeMobileTab(role,'/app/requests',review,context)).toBe('/app');
    expect(activeMobileTab(role,'/app/payroll-export',review,context)).toBe('/app/payroll');
    expect(activeMobileTab(role,'/app/timecards',review,context)).toBe('/app/timecards');
    const reachable = [...mobileTabsForRole(role,review,context).flatMap(tab => tab.owns), ...mobileMoreForRole(role,review,context).map(item => item.href)];
    for (const item of navigationForRole(role,review,context)) expect(reachable).toContain(item.href);
  });
  it.each(['MANAGER','OWNER'] as const)('gives %s Home, Schedule, Time, Inbox and Team without payroll review, with every other destination in More', role => {
    const context={operational:company};
    expect(mobileTabsForRole(role,undefined,context).map(tab => tab.href)).toEqual(['/app','/app/schedule','/app/timecards','/app/inbox','/app/employees']);
    expect(navigationForRole(role,undefined,context).map(item => item.href).slice(0, 3)).toEqual(['/app','/app/inbox','/app/schedule']);
    const reachable = [...mobileTabsForRole(role,undefined,context).flatMap(tab => tab.owns), ...mobileMoreForRole(role,undefined,context).map(item => item.href)];
    for (const item of navigationForRole(role,undefined,context)) expect(reachable).toContain(item.href);
    // Quiet (v4): Templates and Scheduling rules open from Schedule, so Schedule stays lit there (approved mockups).
    expect(activeMobileTab(role, '/app/schedule/templates',undefined,context)).toBe('/app/schedule');
    expect(activeMobileTab(role, '/app/schedule/settings',undefined,context)).toBe('/app/schedule');
    expect(activeMobileTab(role, '/app/notifications',undefined,context)).toBe('/app');
    expect(activeMobileTab(role, '/app/schedule/new',undefined,context)).toBe('/app/schedule');
    expect(activeMobileTab(role, '/app/payroll',undefined,context)).toBeUndefined();
  });
});

describe('section tabs', () => {
  it('lists only destinations the role can open', () => {
    // Owner premium (Oct 31): Payroll draws its own tabs under its title and Timecards belongs to Time, so the shell draws none.
    for (const path of ['/app/timecards', '/app/payroll', '/app/payroll-export', '/app/settings/payroll']) {
      expect(sectionTabsFor('MANAGER', path, payroll,{operational:company})).toBeNull();
      expect(sectionTabsFor('OWNER', path, { ...payroll, canReview: true, canConfigure: true })).toBeNull();
    }
    // v5: Employees and Leads move with segments and Back; Pay lists My time and Timecards as rows.
    for (const role of ['EMPLOYEE', 'LEAD'] as const) for (const path of ['/app/my-pay', '/app/my-time', '/app/timecards']) expect(sectionTabsFor(role, path, payroll)).toBeNull();
  });
  it('keeps tabs off nested and unrelated pages', () => {
    expect(sectionTabsFor('EMPLOYEE', '/app/exchange/swap')).toBeNull();
    // Clean Manager (v3): the request pages link to each other in their band instead.
    expect(sectionTabsFor('MANAGER', '/app/requests?tab=pending',undefined,{operational:company})).toBeNull();
    expect(sectionTabsFor('EMPLOYEE', '/app/requests')).toBeNull();
    expect(sectionTabsFor('MANAGER', '/app/employees')).toBeNull();
  });
});

describe('More sheet groups (MG3)', () => {
  it('groups every More item by job without adding or dropping any', async () => {
    const {mobileMoreForRole, moreNavigationGroups} = await import('./navigation');
    for (const role of ['OWNER', 'MANAGER'] as const) {
      const items = mobileMoreForRole(role, {enabled: true} as never);
      const groups = moreNavigationGroups(items);
      expect(groups.flatMap(group => group.items).map(item => item.href).sort()).toEqual(items.map(item => item.href).sort());
      expect(groups.every(group => group.items.length > 0)).toBe(true);
    }
    const own = moreNavigationGroups([{href: '/app/my-pay', label: 'My pay', icon: 'pay'} as never, {href: '/app/timecards', label: 'Timecards', icon: 'clock'} as never]);
    expect(own.map(group => group.label)).toEqual(['Time and pay', 'Account']);
    // Clean Manager (v3): Home's team tools get their own group, before Account.
    const {teamToolsForRole} = await import('./navigation');
    const withTools = moreNavigationGroups(mobileMoreForRole('MANAGER', {enabled: true} as never, {operational:company}), teamToolsForRole('MANAGER', {operational:company}));
    expect(withTools.map(group => group.label)).toEqual(['Time and pay', 'Planning', 'Team tools', 'Account']);
    expect(withTools.find(group => group.label === 'Team tools')?.items.map(item => item.label)).toEqual(['Who’s working', 'Hours this week', 'Activity', 'Help someone sign in']);
    expect(teamToolsForRole('EMPLOYEE')).toEqual([]);
    expect(teamToolsForRole('LEAD')).toEqual([]);
  });
});
