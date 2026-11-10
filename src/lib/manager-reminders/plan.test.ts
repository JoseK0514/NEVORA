import {expect,it} from 'vitest';
import {planManagerReminder} from './plan';
const now=new Date('2026-11-11T02:00:00Z');
it('defers both reminder types to Puerto Rico quiet end with a stable daily identity',()=>{
 for(const kind of ['AVAILABILITY','COMMUNICATION'] as const){
  const input={kind,id:kind==='AVAILABILITY'?'2026-11-16':'update',version:'version',employeeId:'employee',expiresAt:'2026-11-20T00:00:00Z'};
  const a=planManagerReminder(input,now,'America/Puerto_Rico'),b=planManagerReminder(input,now,'America/Puerto_Rico');
  expect(a).toMatchObject({purpose:'REMINDER',dueAt:'2026-11-11T11:00:00.000Z',environment:'test'});
  expect(a?.eventKey).toBe(b?.eventKey);expect(a?.id).not.toBe(b?.id);
 }
});
it('does not queue a reminder whose source expires during quiet hours',()=>{
 expect(planManagerReminder({kind:'COMMUNICATION',id:'update',version:'version',employeeId:'employee',expiresAt:'2026-11-11T10:00:00Z'},now,'America/Puerto_Rico')).toBeNull();
});
