import {expect,it} from 'vitest';
import type {OperationalAuthorityView} from './company-access/model';
import {activeNavigationHref,navigationForRole,teamToolsForRole} from './navigation';
import type {PayrollCapabilities} from './payroll/contracts';
const company:OperationalAuthorityView={state:'ready',employeeId:'M1',role:'MANAGER',source:'LEGACY_ADOPTION',scope:{mode:'COMPANY',locationIds:[]},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};
const scoped:OperationalAuthorityView={...company,source:'OWNER_ASSIGNMENT',scope:{mode:'LOCATIONS',locationIds:['L1']},scopeRevision:2};
const finance:PayrollCapabilities={enabled:true,canConfigure:false,canReview:true,canApprove:false,internalCalculatorAvailable:false,bankCompatibility:'UNVERIFIED'};
it.each([undefined,{state:'unavailable',reason:'read_failed'} as const,{...company,scope:null,source:'UNASSIGNED' as const}])('does not derive Manager operations from role when current scope is missing or unavailable',view=>{expect(navigationForRole('MANAGER',undefined,view).map(i=>i.href)).toEqual(['/app','/app/profile']);});
it('preserves the explicitly adopted company-wide Manager navigation',()=>{const links=navigationForRole('MANAGER',undefined,company).map(i=>i.href);expect(links).toContain('/app/employees');expect(links).toContain('/app/reports');expect(links).toContain('/app/schedule/settings');expect(links).not.toContain('/app/settings');});
it('limits location-scoped navigation to safe projected operational views and the independent own Profile',()=>{expect(navigationForRole('MANAGER',undefined,scoped).map(i=>i.href)).toEqual(['/app','/app/schedule','/app/employees','/app/profile']);expect(activeNavigationHref('MANAGER','/app/reports',undefined,scoped)).toBeUndefined();expect(activeNavigationHref('MANAGER','/app/schedule?locationId=L1',undefined,scoped)).toBe('/app/schedule');});
it('keeps independent financial destinations when operational access is restricted or absent',()=>{for(const view of [scoped,{...company,scope:null}]){const links=navigationForRole('MANAGER',finance,view).map(i=>i.href);expect(links).toContain('/app/payroll');expect(links).toContain('/app/my-pay');expect(links).not.toContain('/app/payroll-export');}});
it('leaves Employee/Lead navigation and request ownership independent of management scope',()=>{for(const role of ['EMPLOYEE','LEAD'] as const){expect(navigationForRole(role,undefined,scoped)).toEqual(navigationForRole(role));expect(activeNavigationHref(role,'/app/exchange?tab=mine',undefined,scoped)).toBe('/app/requests/hub');}});

it.each([undefined,{state:'unavailable',reason:'read_failed'} as const,scoped,{...company,scope:null,source:'UNASSIGNED' as const}])('withholds the relocated global Team tools without current Company access',operational=>{
 expect(teamToolsForRole('MANAGER',{operational})).toEqual([]);
});
it('retains the relocated Team tools for an Owner and a currently company-authorized Manager',()=>{
 const expected=['/app?view=attendance','/app?view=team','/app?view=activity','/app/clocker-recovery','/app/account-recovery'];
 expect(teamToolsForRole('OWNER').map(item=>item.href)).toEqual(expected);
 expect(teamToolsForRole('MANAGER',{operational:company}).map(item=>item.href)).toEqual(expected);
 expect(teamToolsForRole('MANAGER',{operational:{...company,role:'OWNER'}})).toEqual([]);
 for(const role of ['EMPLOYEE','LEAD'] as const)expect(teamToolsForRole(role,{operational:company})).toEqual([]);
});
