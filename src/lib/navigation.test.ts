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
  it.each(['EMPLOYEE','LEAD'] as const)('gives %s Pay while payroll is on and Hours while it is off', role => {
    expect(mobileTabsForRole(role).map(tab => tab.label)).toEqual(['Home','Schedule','Requests','Hours']);
    expect(mobileTabsForRole(role, payroll).map(tab => [tab.label, tab.href])).toEqual([['Home','/app'],['Schedule','/app/schedule'],['Requests','/app/requests/hub'],['Pay','/app/my-pay']]);
    expect(activeMobileTab(role, '/app/my-time', payroll)).toBe('/app/my-pay');
    // v5 One look: Notifications opens from Home's bell (Home stays lit there), as for Owners; the More page lists it by name.
    expect(activeMobileTab(role, '/app/notifications', payroll)).toBe('/app');
    expect(activeMobileTab(role, '/app/exchange', payroll)).toBe('/app/requests/hub');
    expect(mobileMoreForRole(role, payroll).map(item => item.href)).toEqual(['/app/updates','/app/profile']);
  });
  it.each(['MANAGER','OWNER'] as const)('gives %s Home, Schedule, Inbox and Team, with every other destination in More', role => {
    const context={operational:company};
    expect(mobileTabsForRole(role,undefined,context).map(tab => tab.href)).toEqual(['/app','/app/schedule','/app/inbox','/app/employees']);
    expect(navigationForRole(role,undefined,context).map(item => item.href).slice(0, 3)).toEqual(['/app','/app/inbox','/app/schedule']);
    const reachable = [...mobileTabsForRole(role,undefined,context).flatMap(tab => tab.owns), ...mobileMoreForRole(role, { ...payroll, canReview: true },context).map(item => item.href)];
    for (const item of navigationForRole(role, { ...payroll, canReview: true },context)) expect(reachable).toContain(item.href);
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
    expect(sectionTabsFor('MANAGER', '/app/timecards', payroll,{operational:company})?.items.map(item => item.label)).toEqual(['Timecards','Time exports']);
    expect(sectionTabsFor('OWNER', '/app/payroll', { ...payroll, canReview: true, canConfigure: true })?.items.map(item => item.label)).toEqual(['Timecards','Payroll runs','Time exports','Payroll settings']);
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
    expect(withTools.find(group => group.label === 'Team tools')?.items.map(item => item.label)).toEqual(['Attendance', 'Team overview', 'Schedule activity', 'Clocker recovery', 'Account recovery']);
    expect(teamToolsForRole('EMPLOYEE')).toEqual([]);
    expect(teamToolsForRole('LEAD')).toEqual([]);
  });
});
