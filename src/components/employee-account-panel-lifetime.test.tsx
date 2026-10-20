import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {PrivatePanelState} from '../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../lib/employee-view';
import {EmployeeAccountPanel,EmployeeAccountView} from './employee-account-panel';

// Exercise the panel's actual effect/controller/fetch integration with a small
// hook host. This is a timer/HTTP fault test, not authenticated browser evidence.
const host=vi.hoisted(()=>({effect:undefined as undefined|(()=>void|(()=>void)),states:[] as PrivatePanelState<EmployeeViewSnapshot>[]}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),useEffect:(effect:()=>void|(()=>void))=>{host.effect=effect;},useRef:()=>({current:null}),useState:(initial:unknown)=>[initial,(state:PrivatePanelState<EmployeeViewSnapshot>)=>host.states.push(state)]}));
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
let cleanup:void|(()=>void);
const ready=(items=true)=>({state:'ready',kind:'notifications',observedAt:new Date().toISOString(),validForMs:items?100:45000,coverage:'complete',items:items?[{id:'expiring',label:'Time off update',at:new Date().toISOString(),href:'/app/notifications/open?notificationId=expiring'}]:[]});
const last=()=>host.states.at(-1)!;
const html=()=>renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={last()} onRetry={()=>{}}/>);
beforeEach(()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});host.states=[];host.effect=undefined;vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});
async function mount(){const panel=EmployeeAccountPanel({kind:'notifications',authority:'bound-view'});cleanup=host.effect!();await vi.advanceTimersByTimeAsync(0);return panel;}

it.each(['Retry','scheduled revalidation'])('clears source-expired rows without inventing lost access and recovers through %s',async recovery=>{
 const request=vi.fn().mockResolvedValueOnce(Response.json(ready())).mockImplementation(async()=>Response.json(ready(false)));vi.stubGlobal('fetch',request);
 const panel=await mount();expect(html()).toContain('notificationId=expiring');
 await vi.advanceTimersByTimeAsync(101);
 expect(last().snapshot).toEqual({state:'unavailable',reason:'read_failed'});expect(html()).not.toContain('notificationId=expiring');expect(html()).not.toContain('Sign in');expect(html()).toContain('Try again');
 if(recovery==='Retry'){panel.props.onRetry();await vi.advanceTimersByTimeAsync(0);}else await vi.advanceTimersByTimeAsync(30000);
 expect(request).toHaveBeenCalledTimes(2);expect(last().snapshot).toMatchObject({state:'ready',items:[]});expect(html()).toContain('No notifications here.');expect(host.states.some(state=>state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied')).toBe(false);
});

it.each([401,403])('still clears and denies when current revalidation actually returns HTTP %s',async status=>{
 const request=vi.fn().mockResolvedValueOnce(Response.json(ready())).mockResolvedValue(new Response(null,{status}));vi.stubGlobal('fetch',request);
 const panel=await mount();expect(html()).toContain('notificationId=expiring');await vi.advanceTimersByTimeAsync(101);panel.props.onRetry();await vi.advanceTimersByTimeAsync(0);
 expect(last().snapshot).toEqual({state:'unavailable',reason:'access_denied'});expect(html()).not.toContain('notificationId=expiring');expect(html()).toContain('Sign in again');expect(html()).not.toContain('Retry');
 await vi.advanceTimersByTimeAsync(120000);expect(request).toHaveBeenCalledTimes(2);
});

it('invalidates old notification rows before rechecking a changed operational source',async()=>{
 let resolve!: (response:Response)=>void;
 const request=vi.fn().mockResolvedValueOnce(Response.json(ready())).mockImplementation(()=>new Promise<Response>(done=>{resolve=done;}));vi.stubGlobal('fetch',request);
 await mount();expect(html()).toContain('notificationId=expiring');
 window.dispatchEvent(new Event('nevora:notifications-changed'));
 expect(html()).not.toContain('notificationId=expiring');
 await vi.advanceTimersByTimeAsync(0);expect(request).toHaveBeenCalledTimes(2);
 resolve(Response.json(ready(false)));await vi.advanceTimersByTimeAsync(0);
 expect(html()).toContain('No notifications here.');expect(html()).not.toContain('notificationId=expiring');
});

it('does not apply notification source invalidation to the separate own-profile reader',async()=>{
 const request=vi.fn(async()=>Response.json({state:'unavailable',reason:'read_failed'}));vi.stubGlobal('fetch',request);
 EmployeeAccountPanel({kind:'profile',authority:'profile-view'});cleanup=host.effect!();await vi.advanceTimersByTimeAsync(0);
 window.dispatchEvent(new Event('nevora:notifications-changed'));await vi.advanceTimersByTimeAsync(0);
 expect(request).toHaveBeenCalledTimes(1);
});
