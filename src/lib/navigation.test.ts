import { describe, expect, it } from "@rstest/core";
import { activeMobileTab, activeNavigationHref, managementNavigationGroups, mobileMoreForRole, mobileTabsForRole, navigationForRole, sectionTabsFor, teamToolsForRole } from "./navigation";
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
    // Review F2 (NV-070): every shift request page goes back to Schedule, so Schedule lights at every width.
    expect(activeNavigationHref('EMPLOYEE','/app/exchange?tab=mine',payroll)).toBe('/app/schedule');
    expect(activeNavigationHref('EMPLOYEE','/app/requests',payroll)).toBe('/app/requests/hub');
    // Phase 3 (MG-007, TB-009): More lights no sidebar or rail entry for Owners and Managers (it lit Home, NV-294).
    expect(activeNavigationHref('OWNER','/app/more',payroll)).toBeUndefined();
    expect(activeNavigationHref('MANAGER','/app/more',payroll)).toBeUndefined();
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
    // Review Nov 14 (BR-4): More and the pages it opens are not tabs, so they light none (not Home); an unknown address too.
    for (const path of ['/app/notifications', '/app/more', '/app/updates', '/app/updates/own-update', '/app/profile', '/app/profile/calendar', '/app/help', '/app/account/delete']) {
      expect(tabs).not.toContain(activeMobileTab('EMPLOYEE', path, payroll));
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
    // Review Nov 14 (BR-4): More, Insights, Settings and its pages, Profile, Notifications, Help and Updates light no tab.
    const tabs = mobileTabsForRole(role,review,context).map(tab => tab.href);
    for (const path of ['/app/more', '/app/reports', '/app/settings', '/app/settings/locations', '/app/profile', '/app/notifications', '/app/help', '/app/updates', '/app/my-pay'])
      expect(tabs).not.toContain(activeMobileTab(role,path,review,context));
    // Payroll settings belongs to Payroll, and Help someone sign in to Team (with or without a prefilled person).
    expect(activeMobileTab(role,'/app/settings/payroll',{...review,canConfigure:true},context)).toBe('/app/payroll');
    expect(activeMobileTab(role,'/app/account-recovery?employee=E-1',review,context)).toBe('/app/employees');
    const reachable = [...mobileTabsForRole(role,review,context).flatMap(tab => tab.owns), ...mobileMoreForRole(role,review,context).map(item => item.href)];
    for (const item of navigationForRole(role,review,context)) expect(reachable).toContain(item.href);
  });
  it.each(['MANAGER','OWNER'] as const)('gives %s Home, Schedule, Time, Inbox and Team without payroll review, with every other destination in More', role => {
    const context={operational:company};
    // Phase 3 (MG-006): a Manager's To do tab is second (Home, To do, Schedule, Time, Team); the Owner's stays fourth.
    expect(mobileTabsForRole(role,undefined,context).map(tab => tab.href)).toEqual(role==='MANAGER'?['/app','/app/inbox','/app/schedule','/app/timecards','/app/employees']:['/app','/app/schedule','/app/timecards','/app/inbox','/app/employees']);
    expect(navigationForRole(role,undefined,context).map(item => item.href).slice(0, 3)).toEqual(['/app','/app/inbox','/app/schedule']);
    const reachable = [...mobileTabsForRole(role,undefined,context).flatMap(tab => tab.owns), ...mobileMoreForRole(role,undefined,context).map(item => item.href)];
    for (const item of navigationForRole(role,undefined,context)) expect(reachable).toContain(item.href);
    // Quiet (v4): Templates and Scheduling rules open from Schedule, so Schedule stays lit there (approved mockups).
    expect(activeMobileTab(role, '/app/schedule/templates',undefined,context)).toBe('/app/schedule');
    expect(activeMobileTab(role, '/app/schedule/settings',undefined,context)).toBe('/app/schedule');
    expect(activeMobileTab(role, '/app/notifications',undefined,context)).toBeUndefined();
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
  // Phase 9 (Nov 18, 2026): one glyph per concept. Every place an Owner or Manager can reach has its own glyph (Rondo AI
  // two speech bubbles, Insights the chart), a tab draws its sidebar entry's glyph, and a pay statement is the receipt for every role.
  it('gives each place one glyph of its own, the same on the tab bar and in the sidebar', () => {
    const review = { ...payroll, canReview: true };
    for (const [role, context] of [['OWNER', { billingEnabled: true, ownerAdvisorEnabled: true }], ['MANAGER', { operational: company, ownerAdvisorEnabled: true, managerAdvisorEnabled: true }]] as const) {
      const items = [...navigationForRole(role, review, context), ...teamToolsForRole(role, { operational: company })];
      const byIcon = new Map<string, string[]>();
      for (const item of items) byIcon.set(item.icon, [...(byIcon.get(item.icon) ?? []), item.href]);
      expect([...byIcon.values()].filter(hrefs => hrefs.length > 1), role).toEqual([]);
      for (const tab of mobileTabsForRole(role, review, context)) expect(tab.icon, tab.href).toBe(items.find(item => item.href === tab.href)?.icon);
    }
    expect(navigationForRole('OWNER', review, { billingEnabled: true }).find(item => item.href === '/app/billing')?.icon).toBe('billing');
    for (const role of ['OWNER', 'MANAGER', 'EMPLOYEE', 'LEAD'] as const) expect(navigationForRole(role, review, { operational: company }).find(item => item.href === '/app/my-pay')?.icon, role).toBe('statement');
  });
});

// Rondo AI (Nov 18, 2026): its own name and glyph; an Owner has it with the adviser's switch, a Manager with a current scope
// only when the Manager switch is on too (contract docs/handoffs/2026-11-18-rondo-manager-ui-contract.md).
describe('Rondo AI in the navigation', () => {
  const places = {...company, scope: {mode: 'LOCATIONS' as const, locationIds: ['loc-1']}} as never;
  const none = {...company, scope: null} as never;
  const rondo = (role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'LEAD', context: Record<string, unknown>) => navigationForRole(role, undefined, context as never).find(item => item.href === '/app/ai-manager');
  it('names it Rondo AI with its own glyph for an Owner with the adviser on, and leaves it out with it off', () => {
    expect(rondo('OWNER', { ownerAdvisorEnabled: true })).toEqual({ href: '/app/ai-manager', label: 'Rondo AI', icon: 'rondo' });
    expect(rondo('OWNER', {})).toBeUndefined();
  });
  it('lists it for a Manager with a company or location scope only when both switches are on', () => {
    for (const operational of [company, places]) {
      expect(rondo('MANAGER', { operational, ownerAdvisorEnabled: true, managerAdvisorEnabled: true })?.label).toBe('Rondo AI');
      expect(rondo('MANAGER', { operational, ownerAdvisorEnabled: true })).toBeUndefined();
      expect(rondo('MANAGER', { operational, managerAdvisorEnabled: true })).toBeUndefined();
    }
    expect(rondo('MANAGER', { operational: none, ownerAdvisorEnabled: true, managerAdvisorEnabled: true })).toBeUndefined();
    expect(rondo('MANAGER', { ownerAdvisorEnabled: true, managerAdvisorEnabled: true })).toBeUndefined();
  });
  it('never lists it for an Employee or a Lead', () => {
    for (const role of ['EMPLOYEE', 'LEAD'] as const) expect(rondo(role, { operational: company, ownerAdvisorEnabled: true, managerAdvisorEnabled: true })).toBeUndefined();
  });
  it('puts a Manager’s entry in the second sidebar group and on the phone’s More', () => {
    const context = { operational: company, ownerAdvisorEnabled: true, managerAdvisorEnabled: true };
    const groups = managementNavigationGroups(navigationForRole('MANAGER', undefined, context), [], 'MANAGER');
    expect(groups[1].items[0].href).toBe('/app/ai-manager');
    expect(mobileMoreForRole('MANAGER', undefined, context).some(item => item.href === '/app/ai-manager')).toBe(true);
  });
});

// Final fixes K (Nov 23, 2026): every page of the Schedule family lights Schedule on a phone, for every role; Payroll's
// exports and settings light Payroll; time off and Things to do stay with Home.
describe("phone tab for each section's pages", () => {
  const full: PayrollCapabilities = { ...payroll, canConfigure: true, canReview: true, canApprove: true };
  const schedulePages = ["/app/availability", "/app/availability/agreement", "/app/exchange", "/app/exchange/swap", "/app/exchange/callout", "/app/exchange/open-shifts", "/app/schedule/templates", "/app/schedule/settings", "/app/schedule/publish"];
  it.each([["OWNER", full, {}], ["MANAGER", payroll, { operational: company }], ["LEAD", payroll, {}], ["EMPLOYEE", payroll, {}]] as const)("%s", (role, caps, context) => {
    for (const path of schedulePages) expect([path, activeMobileTab(role, path, caps, context as never)]).toEqual([path, "/app/schedule"]);
  });
  it("Payroll's exports and settings light Payroll; time off and Things to do light Home", () => {
    for (const path of ["/app/payroll-export", "/app/payroll-export/paid-time", "/app/settings/payroll"]) expect(activeMobileTab("OWNER", path, full)).toBe("/app/payroll");
    for (const path of ["/app/requests", "/app/inbox"]) expect(activeMobileTab("OWNER", path, full)).toBe("/app");
  });
});
