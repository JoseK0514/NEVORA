import {expect,it} from 'vitest';
import {expectedNotificationRefusal,safeNotificationRefusal,type ObservedNotificationRefusal} from './integration/authority-refusal-observation';
const origin='http://127.0.0.1:12345',url=origin+'/api/notifications',entry={engine:'chromium',text:'Failed to load resource: the server responded with a status of 403 (Forbidden)',url,at:200};
const reply:ObservedNotificationRefusal={engine:'chromium',url,status:403,at:100,authorityLoss:true,bodySafe:true};
it('recognizes a late console delivery from an actually observed intentional authority denial',()=>expect(expectedNotificationRefusal(entry,origin,[reply])).toBe(true));
it.each([
 ['no response',[]],['wrong engine',[{...reply,engine:'webkit'}]],['unexpected denial',[{...reply,authorityLoss:false}]],['unsafe bytes',[{...reply,bodySafe:false}]],['wrong status',[{...reply,status:401}]],['response after console',[{...reply,at:201}]],['mixed unexpected denial',[reply,{...reply,at:150,authorityLoss:false}]],
])('retains %s as an error',(_label,replies)=>expect(expectedNotificationRefusal(entry,origin,replies as ObservedNotificationRefusal[])).toBe(false));
it.each(['',origin+'/api/employee/home','https://external.test/api/notifications',url+'?actor=other'])('rejects unproven console location %s',location=>expect(expectedNotificationRefusal({...entry,url:location},origin,[reply])).toBe(false));
it('admits only the exact public denial envelope',()=>{
 expect(safeNotificationRefusal({state:'unavailable',reason:'access_denied'})).toBe(true);
 for(const body of [null,[],{state:'ready'},{state:'unavailable',reason:'read_failed'},{state:'unavailable',reason:'access_denied',snapshot:{}}])expect(safeNotificationRefusal(body)).toBe(false);
});
