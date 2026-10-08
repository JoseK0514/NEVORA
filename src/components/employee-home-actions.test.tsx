import {afterEach,expect,it,vi} from 'vitest';
const snapshot=()=>({observedAt:'2030-10-07T12:00:00.000Z',authority:'a'.repeat(64),validForMs:45000,timeZone:'America/Puerto_Rico',sources:Object.fromEntries(['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'].map(k=>[k,{state:k==='communications'?'partial':'complete',observedAt:'2030-10-07T12:00:00.000Z',version:'v1',reason:k==='communications'?'integration_pending':null}])),publicationState:'complete',nextShift:null,currentShift:null,attention:[]});
afterEach(()=>vi.useRealTimers());
it('late_former_authority_reply_discarded',async()=>{
 const subject=await import('./employee-home-actions').catch(()=>null);
 expect(subject?.createEmployeeHomeController,'Home requires a bound private lifetime controller').toBeTypeOf('function');
 vi.useFakeTimers();let resolve!:(v:unknown)=>void;const changed=vi.fn();
 const controller=subject!.createEmployeeHomeController(changed,()=>new Promise(r=>{resolve=r;}),'a'.repeat(64));
 controller.start();await Promise.resolve();controller.pause();resolve({state:'partial',snapshot:snapshot(),allSet:false});await vi.advanceTimersByTimeAsync(0);
 expect(changed.mock.calls.at(-1)?.[0]).toMatchObject({snapshot:null,paused:true});
 controller.start();await Promise.resolve();resolve({state:'partial',snapshot:{...snapshot(),authority:'b'.repeat(64)},allSet:false});await vi.advanceTimersByTimeAsync(0);
 expect(changed.mock.calls.at(-1)?.[0].snapshot).toMatchObject({state:'unavailable',reason:'access_denied'});controller.stop();
});
