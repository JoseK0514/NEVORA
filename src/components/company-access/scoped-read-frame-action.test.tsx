import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';

// Gaps G58 (Nov 23, 2026): Owner Publish on Review replacement with an 8.5 s reply saved the shift and notified the
// person, but the page reloaded the review and ended on "Coverage changed". The frame's re-check refreshed the page
// with router.replace, a navigation, and Next discards a Server Action still at the head of its router queue when a
// navigation starts, redirect included. These tests pin the rule: after a Server Action starts on this page, the
// frame's refresh is router.refresh(), which Next queues behind the action, never a replace (and since the WebKit
// history fix, no background refresh is a replace at all).
const fixture=rs.hoisted(()=>({
 states:[] as unknown[],effects:[] as (()=>void|(()=>void))[],
 start:rs.fn(),pause:rs.fn(),stop:rs.fn(),
 changed:null as null|((state:unknown)=>void),
 router:{refresh:rs.fn(),replace:rs.fn()},
}));
rs.mock('react', ()=>({
 ...rstestOriginal0,
 useState:(initial:unknown)=>{
  const index=fixture.states.length;fixture.states.push(initial);
  return [initial,(value:unknown)=>{fixture.states[index]=typeof value==='function'?value(fixture.states[index]):value;}];
 },
 useRef:(current:unknown)=>({current}),
 useEffect:(effect:()=>void|(()=>void))=>{fixture.effects.push(effect);},
}));
rs.mock('next/navigation',()=>({useRouter:()=>fixture.router}));
rs.mock('../app-navigation',()=>({useAppNavigation:()=>null}));
rs.mock('@/lib/private-snapshot-client',()=>({
 createPrivateSnapshotController:(changed:(state:unknown)=>void)=>{fixture.changed=changed;return {start:fixture.start,pause:fixture.pause,stop:fixture.stop};},
}));

import {ScopedReadFrame,resetScopedReadTab} from './scoped-read-frame';
import {resetServerActionFlight,serverActionStarted} from '@/lib/server-action-flight';

const authority='fictional-authority-A';
const at=(seconds:number)=>new Date(Date.UTC(2026,10,23,12,0,seconds)).toISOString();
const disposers:(()=>void)[]=[];
async function mount(observedAt:string){
 fixture.states=[];fixture.effects=[];
 ScopedReadFrame({observation:{authority,observedAt,validForMs:15000},children:'Fictional review'});
 const dispose=fixture.effects[0]();if(typeof dispose==='function')disposers.push(dispose);
 await Promise.resolve();
}
/** The review is on screen and current: the tab fenced at 10 s and the review page rendered at 12 s. */
async function reviewOnScreen(){
 await mount(at(8));
 fixture.changed!({snapshot:{state:'ready',authority,observedAt:at(10),validForMs:15000,requestStartedAt:performance.now()},refreshing:false,paused:false});
 // Find cover's frame leaves as the review page replaces it.
 disposers.pop()!();
 await mount(at(12));
 expect(fixture.states[1]).toEqual({required:false,view:null});
 rs.clearAllMocks();
}
/** The frame re-checks access (here the device comes back online) and the check answers while the reply is pending. */
function recheckAnswers(){
 window.dispatchEvent(new Event('online'));
 expect(fixture.start).toHaveBeenCalledTimes(1);
 fixture.changed!({snapshot:{state:'ready',authority,observedAt:at(20),validForMs:15000,requestStartedAt:performance.now()+1},refreshing:false,paused:false});
}
beforeEach(()=>{
 resetScopedReadTab();resetServerActionFlight();rs.clearAllMocks();rs.useFakeTimers();
 rs.stubGlobal('window',Object.assign(new EventTarget(),{location:{pathname:'/app/schedule/new',search:'?review=fictional-token',hash:''}}));
 rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true}));
 rs.stubGlobal('navigator',{onLine:true});
});
afterEach(()=>{while(disposers.length)disposers.pop()!();rs.clearAllTimers();rs.useRealTimers();rs.unstubAllGlobals();});

it('a re-check while Publish waits for its reply queues the refresh behind the action instead of discarding its redirect',async()=>{
 await reviewOnScreen();
 const settled=serverActionStarted();
 recheckAnswers();
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
 settled();
});

it('after the reply, while the router is still applying its redirect, the refresh still queues behind it',async()=>{
 await reviewOnScreen();
 serverActionStarted()();
 recheckAnswers();
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
});

// WebKit period history (QA, Nov 23, 2026): with no Server Action either, a re-check refreshes and never navigates. The
// same-address replace this used to be could show the route's loading.tsx in WebKit and drop the page's client state.
it('with no Server Action on the page, the re-check refreshes in place, never a replace',async()=>{
 await reviewOnScreen();
 recheckAnswers();
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
});

it('a page rendered after the action settled refreshes the same way on its later re-checks',async()=>{
 serverActionStarted()();
 await reviewOnScreen();
 recheckAnswers();
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
});
