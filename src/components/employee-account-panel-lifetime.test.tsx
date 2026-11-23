import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import type {PrivatePanelState} from '../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../lib/employee-view';
import {EmployeeAccountPanel,EmployeeAccountView} from './employee-account-panel';

// Exercise the panel's actual effect/controller/fetch integration with a small
// hook host. This is a timer/HTTP fault test, not authenticated browser evidence.
const host=rs.hoisted(()=>({effect:undefined as undefined|(()=>void|(()=>void)),states:[] as PrivatePanelState<EmployeeViewSnapshot>[]}));
rs.mock('react',()=>({...rstestOriginal0,useEffect:(effect:()=>void|(()=>void))=>{host.effect=effect;},useRef:()=>({current:null}),useState:(initial:unknown)=>[initial,(state:PrivatePanelState<EmployeeViewSnapshot>)=>host.states.push(state)]}));
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
let cleanup:void|(()=>void);
const ready=(items=true)=>({state:'ready',kind:'notifications',observedAt:new Date().toISOString(),validForMs:items?100:45000,coverage:'complete',items:items?[{id:'expiring',label:'Time off update',at:new Date().toISOString(),href:'/app/notifications/open?notificationId=expiring'}]:[]});
const last=()=>host.states.at(-1)!;
const html=()=>renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={last()} onRetry={()=>{}}/>);
beforeEach(()=>{rs.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});host.states=[];host.effect=undefined;rs.stubGlobal('window',new EventTarget());rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));rs.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{cleanup?.();cleanup=undefined;rs.unstubAllGlobals();rs.useRealTimers();});
async function mount(){const panel=EmployeeAccountPanel({kind:'notifications',authority:'bound-view'});cleanup=host.effect!();await rs.advanceTimersByTimeAsync(0);return panel;}

it('clears source-expired rows while checking again and accepts the next authorized list',async()=>{
 const request=rs.fn().mockResolvedValueOnce(Response.json(ready())).mockImplementation(async()=>Response.json(ready(false)));rs.stubGlobal('fetch',request);
 await mount();expect(html()).toContain('notificationId=expiring');
 await rs.advanceTimersByTimeAsync(100);
 expect(last()).toEqual({snapshot:null,refreshing:true,paused:false});expect(html()).not.toContain('notificationId=expiring');expect(html()).not.toContain('Sign in');expect(html()).not.toContain('Try again');
 await rs.advanceTimersByTimeAsync(900);
 expect(request).toHaveBeenCalledTimes(2);expect(last().snapshot).toMatchObject({state:'ready',items:[]});expect(html()).toContain('No notifications here.');
 expect(host.states.some(state=>state.snapshot?.state==='unavailable')).toBe(false);
});

it('offers Retry after a renewal actually fails and accepts a fresh list on retry',async()=>{
 const request=rs.fn().mockResolvedValueOnce(Response.json(ready())).mockResolvedValueOnce(new Response(null,{status:503})).mockImplementation(async()=>Response.json(ready(false)));rs.stubGlobal('fetch',request);
 const panel=await mount();await rs.advanceTimersByTimeAsync(1000);
 expect(last().snapshot).toEqual({state:'unavailable',reason:'read_failed'});expect(html()).toContain('Try again');expect(html()).not.toContain('notificationId=expiring');
 panel.props.onRetry();await rs.advanceTimersByTimeAsync(0);
 expect(request).toHaveBeenCalledTimes(3);expect(last().snapshot).toMatchObject({state:'ready',items:[]});expect(html()).toContain('No notifications here.');
});

it.each([401,403])('still clears and denies when current revalidation actually returns HTTP %s',async status=>{
 const request=rs.fn().mockResolvedValueOnce(Response.json(ready())).mockResolvedValue(new Response(null,{status}));rs.stubGlobal('fetch',request);
 const panel=await mount();expect(html()).toContain('notificationId=expiring');await rs.advanceTimersByTimeAsync(101);panel.props.onRetry();await rs.advanceTimersByTimeAsync(0);
 expect(last().snapshot).toEqual({state:'unavailable',reason:'access_denied'});expect(html()).not.toContain('notificationId=expiring');expect(html()).toContain('Sign in again');expect(html()).not.toContain('Retry');
 await rs.advanceTimersByTimeAsync(120000);expect(request).toHaveBeenCalledTimes(2);
});

it.each([401,403])('releases an unread HTTP %s response without waiting for its body before denying Profile',async status=>{
 const cancel=rs.fn();
 const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel});
 rs.stubGlobal('fetch',rs.fn(async()=>new Response(body,{status})));
 EmployeeAccountPanel({kind:'profile',authority:'profile-view'});cleanup=host.effect!();await rs.advanceTimersByTimeAsync(0);
 expect(last().snapshot).toEqual({state:'unavailable',reason:'access_denied'});
 expect(cancel).toHaveBeenCalledTimes(1);
 await rs.advanceTimersByTimeAsync(120000);
 expect(fetch).toHaveBeenCalledTimes(1);
});

it('invalidates old notification rows before rechecking a changed operational source',async()=>{
 let resolve!: (response:Response)=>void;
 const request=rs.fn().mockResolvedValueOnce(Response.json(ready())).mockImplementation(()=>new Promise<Response>(done=>{resolve=done;}));rs.stubGlobal('fetch',request);
 await mount();expect(html()).toContain('notificationId=expiring');
 window.dispatchEvent(new Event('nevora:notifications-changed'));
 expect(html()).not.toContain('notificationId=expiring');
 await rs.advanceTimersByTimeAsync(0);expect(request).toHaveBeenCalledTimes(2);
 resolve(Response.json(ready(false)));await rs.advanceTimersByTimeAsync(0);
 expect(html()).toContain('No notifications here.');expect(html()).not.toContain('notificationId=expiring');
});

it('does not apply notification source invalidation to the separate own-profile reader',async()=>{
 const request=rs.fn(async()=>Response.json({state:'unavailable',reason:'read_failed'}));rs.stubGlobal('fetch',request);
 EmployeeAccountPanel({kind:'profile',authority:'profile-view'});cleanup=host.effect!();await rs.advanceTimersByTimeAsync(0);
 window.dispatchEvent(new Event('nevora:notifications-changed'));await rs.advanceTimersByTimeAsync(0);
 expect(request).toHaveBeenCalledTimes(1);
});

it('signout intent immediately fences own profile and focus/storage cannot reopen that mounted session',async()=>{
 const own={state:'ready',kind:'profile',observedAt:new Date().toISOString(),validForMs:45000,profile:{name:'PRIVATE PROFILE PERSON',role:'Employee',workspace:'Fictional workplace',timeZone:'America/Puerto_Rico',locations:['Main Office']}};
 const request=rs.fn(async()=>Response.json(own));rs.stubGlobal('fetch',request);
 EmployeeAccountPanel({kind:'profile',authority:'profile-view'});cleanup=host.effect!();await rs.advanceTimersByTimeAsync(0);
 expect(last().snapshot).toMatchObject({state:'ready',kind:'profile'});
 window.dispatchEvent(new Event('nevora:signout'));
 expect(last().paused).toBe(true);expect(last().snapshot).toBeNull();
 for(const event of ['focus','pageshow','online','storage'])window.dispatchEvent(new Event(event));
 await rs.advanceTimersByTimeAsync(120000);
 expect(last().snapshot).toBeNull();expect(request).toHaveBeenCalledTimes(1);
});
it('a held own-profile response cannot restore private facts after native signout intent',async()=>{
 let resolve!:(response:Response)=>void;
 rs.stubGlobal('fetch',rs.fn(()=>new Promise<Response>(done=>{resolve=done;})));
 EmployeeAccountPanel({kind:'profile',authority:'profile-view'});cleanup=host.effect!();await rs.advanceTimersByTimeAsync(0);
 window.dispatchEvent(new Event('nevora:signout'));
 resolve(Response.json({state:'ready',kind:'profile',observedAt:new Date().toISOString(),validForMs:45000,profile:{name:'LATE PRIVATE PERSON',role:'Employee',workspace:'Fictional workplace',timeZone:'America/Puerto_Rico',locations:['Main Office']}}));
 await rs.advanceTimersByTimeAsync(0);
 expect(last().paused).toBe(true);expect(last().snapshot).toBeNull();
});
