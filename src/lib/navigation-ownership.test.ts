import {expect,it} from 'vitest';
import {activeNavigationHref} from './navigation';
it.each(['/app/requests','/app/requests/hub','/app/requests?tab=my&requestId=own','/app/exchange?tab=history&requestId=own','/app/exchange/swap?sourceShiftId=own'])('selected_route_correct canonical employee Requests ownership: %s',path=>{
 expect(activeNavigationHref('EMPLOYEE',path)).toBe('/app/requests/hub');expect(activeNavigationHref('LEAD',path)).toBe('/app/requests/hub');
});
it('preserves management owners and does not capture unrelated prefixes',()=>{
 expect(activeNavigationHref('MANAGER','/app/requests')).toBe('/app/requests');expect(activeNavigationHref('OWNER','/app/exchange')).toBe('/app/exchange');expect(activeNavigationHref('EMPLOYEE','/app/requests-other')).toBeUndefined();
});
