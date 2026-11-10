import {expect,it} from 'vitest';
import {activeNavigationHref} from './navigation';
const company = {state:'ready' as const,employeeId:'M1',role:'MANAGER' as const,source:'LEGACY_ADOPTION' as const,scope:{mode:'COMPANY' as const,locationIds:[] as []},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};
it.each(['/app/requests','/app/requests/hub','/app/requests?tab=my&requestId=own'])('selected_route_correct canonical employee Requests ownership: %s',path=>{
 expect(activeNavigationHref('EMPLOYEE',path)).toBe('/app/requests/hub');expect(activeNavigationHref('LEAD',path)).toBe('/app/requests/hub');
});
// Review F2 (NV-070): Pick up and swap and every view of it (its own request details too) light Schedule, where its back
// link goes, as the phone's tab bar already does.
it('lights Schedule on every shift request view',()=>{
 expect(activeNavigationHref('EMPLOYEE','/app/exchange?tab=history&requestId=own')).toBe('/app/schedule');expect(activeNavigationHref('LEAD','/app/exchange?tab=history&requestId=own')).toBe('/app/schedule');
});
// Release 1 (boards E-SwapSheet, E-CantWorkSheet): an Employee opens a swap from Schedule, so Schedule stays current; a Lead keeps Requests.
it('keeps an Employee swap on Schedule and a Lead swap on Requests',()=>{
 expect(activeNavigationHref('EMPLOYEE','/app/exchange/swap?sourceShiftId=own')).toBe('/app/schedule');// Direction B for Leads (Nov 8, 2026): a Lead's swap lights Schedule too.
 expect(activeNavigationHref('LEAD','/app/exchange/swap?sourceShiftId=own')).toBe('/app/schedule');
});
it('preserves management owners and does not capture unrelated prefixes',()=>{
 expect(activeNavigationHref('MANAGER','/app/requests',undefined,company)).toBe('/app/requests');expect(activeNavigationHref('OWNER','/app/exchange')).toBe('/app/exchange');expect(activeNavigationHref('EMPLOYEE','/app/requests-other')).toBeUndefined();
});
