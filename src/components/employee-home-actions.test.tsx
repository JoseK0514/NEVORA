import {afterEach,expect,it,vi} from 'vitest';
import type {HomeSnapshot} from '../lib/employee-home/types';
const snapshot=():HomeSnapshot=>({observedAt:'2030-10-07T12:00:00.000Z',authority:'a'.repeat(64),validForMs:45000,timeZone:'America/Puerto_Rico',sources:Object.fromEntries(['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'].map(k=>[k,{state:k==='communications'?'partial':'complete',observedAt:'2030-10-07T12:00:00.000Z',version:'v1',reason:k==='communications'?'integration_pending':null}])) as HomeSnapshot['sources'],publicationState:'complete',nextShift:null,currentShift:null,attention:[]});
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
it('complete authorized zero-item Home displays exact all-set copy and communications links to Updates',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server'),{createElement}=await import('react'),{EmployeeHomeView}=await import('./employee-home-actions');
 const current=snapshot();current.sources.communications={state:'complete',observedAt:current.observedAt,version:'empty-current',reason:null};
 const html=renderToStaticMarkup(createElement(EmployeeHomeView,{state:{snapshot:{state:'ready',observedAt:current.observedAt,validForMs:45000,home:{state:'ready',allSet:true,snapshot:current}},refreshing:false,paused:false},timeAuthority:'b'.repeat(64),authority:'a'.repeat(64),onRetry:()=>{}}));
 expect(html).toContain("You’re all set.");expect(html).not.toContain('Communications are not included yet');
});
