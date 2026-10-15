import { describe, expect, it } from "vitest";
import { activeNavigationHref, navigationForRole } from "./navigation";
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
