import {it,expect} from 'vitest';
import {safeMessageDestination} from './employee-message-navigation';
it('admits only canonical local notification destinations including exact request fragments',()=>{
 expect(safeMessageDestination('/app/updates/11111111-1111-4111-8111-111111111111')).toBe(true);
 expect(safeMessageDestination('/app/requests?tab=my&requestId=own#request-own')).toBe(true);
 for(const value of ['https://elsewhere.invalid','//elsewhere.invalid','/app/updates/11111111-1111-4111-8111-111111111111?employeeId=peer','/app/requests?tab=my&requestId=own#request-peer','/app/notifications/open?notificationId=own#arbitrary'])expect(safeMessageDestination(value)).toBe(false);
});
