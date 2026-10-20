import { describe, expect, it } from "vitest";
import { activeMobileTab, activeNavigationHref, mobileMoreForRole, mobileTabsForRole, navigationForRole, sectionTabsFor } from "./navigation";
import type { PayrollCapabilities } from './payroll/contracts';

const payroll: PayrollCapabilities = { enabled: true, canConfigure: false, canReview: false, canApprove: false, internalCalculatorAvailable: false, bankCompatibility: 'UNVERIFIED' };

describe("role navigation", () => {
  it("keeps owner controls restricted to owners", () => {
    const owner = navigationForRole("OWNER").map((item) => item.href);
    const manager = navigationForRole("MANAGER").map((item) => item.href);
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
    expect(mobileMoreForRole(role, payroll).map(item => item.href)).toEqual(['/app/updates','/app/notifications','/app/profile']);
  });
  it.each(['MANAGER','OWNER'] as const)('gives %s Home, Schedule, Inbox and Team, with every other destination in More', role => {
    expect(mobileTabsForRole(role).map(tab => tab.href)).toEqual(['/app','/app/schedule','/app/inbox','/app/employees']);
    expect(navigationForRole(role).map(item => item.href).slice(0, 3)).toEqual(['/app','/app/inbox','/app/schedule']);
    const reachable = [...mobileTabsForRole(role).flatMap(tab => tab.owns), ...mobileMoreForRole(role, { ...payroll, canReview: true }).map(item => item.href)];
    for (const item of navigationForRole(role, { ...payroll, canReview: true })) expect(reachable).toContain(item.href);
    expect(activeMobileTab(role, '/app/schedule/templates')).toBe('more');
    expect(activeMobileTab(role, '/app/schedule/new')).toBe('/app/schedule');
    expect(activeMobileTab(role, '/app/payroll')).toBeUndefined();
  });
});

describe('section tabs', () => {
  it('lists only destinations the role can open', () => {
    expect(sectionTabsFor('MANAGER', '/app/timecards', payroll)?.items.map(item => item.label)).toEqual(['Timecards','Time exports']);
    expect(sectionTabsFor('OWNER', '/app/payroll', { ...payroll, canReview: true, canConfigure: true })?.items.map(item => item.label)).toEqual(['Timecards','Payroll runs','Time exports','Payroll settings']);
    expect(sectionTabsFor('EMPLOYEE', '/app/my-pay', payroll)?.items.map(item => item.href)).toEqual(['/app/my-pay','/app/my-time','/app/timecards']);
    expect(sectionTabsFor('EMPLOYEE', '/app/my-time')?.items.map(item => item.href)).toEqual(['/app/my-time','/app/timecards']);
  });
  it('keeps tabs off nested and unrelated pages', () => {
    expect(sectionTabsFor('EMPLOYEE', '/app/exchange/swap')).toBeNull();
    expect(sectionTabsFor('MANAGER', '/app/requests?tab=pending')?.label).toBe('Requests');
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
    const withTools = moreNavigationGroups(mobileMoreForRole('MANAGER', {enabled: true} as never), teamToolsForRole('MANAGER'));
    expect(withTools.map(group => group.label)).toEqual(['Time and pay', 'Planning', 'Team tools', 'Account']);
    expect(withTools.find(group => group.label === 'Team tools')?.items.map(item => item.label)).toEqual(['Attendance', 'Team overview', 'Schedule activity', 'Clocker recovery', 'Account recovery']);
    expect(teamToolsForRole('EMPLOYEE')).toEqual([]);
    expect(teamToolsForRole('LEAD')).toEqual([]);
  });
});
