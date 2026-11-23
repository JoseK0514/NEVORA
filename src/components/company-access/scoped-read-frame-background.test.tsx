import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';

// WebKit period history (QA, Nov 23, 2026): while a person paged through Payroll export's history in Safari, the frame's
// background renewal (before its 15 s window ran out) did a same-address router.replace. In WebKit that navigation
// sometimes showed the route's loading.tsx, which unmounted the page and dropped its client state (loaded history pages,
// the open "Choose who's included" sheet). These tests pin the rule: a background renewal is router.refresh() inside a
// transition (no navigation, so no loading boundary), never a replace.
const fixture=rs.hoisted(()=>({
 states:[] as unknown[],effects:[] as (()=>void|(()=>void))[],preset:[] as unknown[],
 start:rs.fn(),pause:rs.fn(),stop:rs.fn(),
 changed:null as null|((state:unknown)=>void),
 router:{refresh:rs.fn(),replace:rs.fn()},
 transition:rs.fn((work:()=>void)=>work()),
}));
rs.mock('react', ()=>({
 ...rstestOriginal0,
 startTransition:fixture.transition,
 useState:(initial:unknown)=>{
  const index=fixture.states.length;fixture.states.push(fixture.preset[index]??initial);initial=fixture.states[index];
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

import {Activity,Fragment,isValidElement,type ReactElement,type ReactNode} from 'react';
import {ScopedReadFrame,resetScopedReadTab} from './scoped-read-frame';

const authority='fictional-authority-A';
const at=(seconds:number)=>new Date(Date.UTC(2026,10,23,12,0,seconds)).toISOString();
const disposers:(()=>void)[]=[];
function render(observedAt:string){
 fixture.states=[];fixture.effects=[];
 ScopedReadFrame({observation:{authority,observedAt,validForMs:15000},children:'Fictional period history'});
}
/** History is on screen and current: the tab fenced at 10 s and the history page rendered at 12 s. */
async function historyOnScreen(){
 render(at(8));
 const first=fixture.effects[0]();if(typeof first==='function')disposers.push(first);
 await Promise.resolve();
 fixture.changed!({snapshot:{state:'ready',authority,observedAt:at(10),validForMs:15000,requestStartedAt:performance.now()},refreshing:false,paused:false});
 disposers.pop()!();
 render(at(12));
 // The frame's effects, in order: access checks, then the page's validity window.
 for(const effect of fixture.effects.slice(0,2)){const dispose=effect();if(typeof dispose==='function')disposers.push(dispose);}
 await Promise.resolve();await Promise.resolve();
 expect(fixture.states[1]).toEqual({required:false,view:null});
 rs.clearAllMocks();
}
beforeEach(()=>{
 fixture.preset=[];
 resetScopedReadTab();rs.clearAllMocks();rs.useFakeTimers();
 rs.stubGlobal('window',Object.assign(new EventTarget(),{location:{pathname:'/app/payroll-export',search:'?start=2026-09-21&end=2026-09-27',hash:''}}));
 rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true}));
 rs.stubGlobal('navigator',{onLine:true});
});
afterEach(()=>{while(disposers.length)disposers.pop()!();rs.clearAllTimers();rs.useRealTimers();rs.unstubAllGlobals();});

it('renews the page before its window ends with a refresh in a transition, never a same-address replace',async()=>{
 await historyOnScreen();
 rs.advanceTimersByTime(14000);
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
 expect(fixture.transition).toHaveBeenCalledTimes(1);
 // No delayed second refresh: the renewal is one refresh, not a replace and a refresh 1.5 s later.
 rs.advanceTimersByTime(1500);
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
});

it('keeps the page on screen while the renewal is in flight (no switch to the checking state)',async()=>{
 await historyOnScreen();
 const body=fixture.states[0];
 rs.advanceTimersByTime(10000);
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
 expect(fixture.states[0]).toBe(body);
 expect(fixture.states[1]).toEqual({required:false,view:null});
});

// WebKit period history, second route (QA, Nov 23, 2026): the window lapsing before the renewal landed dropped the page
// (state gone). A lapse in the foreground now keeps the page mounted but hidden until a current observation arrives.
type Body={authority:string|null;phase:string;content:ReactNode;kept?:ReactNode};
const body=()=>fixture.states[0] as Body;

it('lapse then renew: the window running out keeps the page held, hidden, and the renewal shows it again in place',async()=>{
 await historyOnScreen();
 const shown=body();
 expect(shown).toMatchObject({phase:'ready',content:'Fictional period history'});
 // No renewal lands before the 15 s window ends (counted from the page's arrival).
 fixture.router.refresh.mockImplementation(()=>{});
 rs.advanceTimersByTime(15000);
 await Promise.resolve();
 expect(body()).toEqual({authority:null,phase:'expired',content:null,kept:'Fictional period history'});
 expect(fixture.states[1]).toEqual({required:true,view:null});
 // Rendered while lapsed: the held page sits first, inside a hidden Activity, beside the checking state.
 const lapsed=renderWith(body());
 // Rendered once a current observation arrives: the same Activity, in the same place, now visible.
 const renewed=renderWith({authority,phase:'ready',content:'Fictional period history'},{required:false,view:null});
 expect(slot(lapsed)).toMatchObject({type:Activity,props:{mode:'hidden',children:'Fictional period history'}});
 expect(slot(renewed)).toMatchObject({type:Activity,props:{mode:'visible',children:'Fictional period history'}});
});

it('lapse then deny: an access_denied answer drops the held page',async()=>{
 await historyOnScreen();
 rs.advanceTimersByTime(15000);
 await Promise.resolve();
 expect(body().kept).toBe('Fictional period history');
 fixture.changed!({snapshot:{state:'unavailable',reason:'access_denied'},refreshing:false,paused:false});
 expect(body()).toEqual({authority:null,phase:'expired',content:null,kept:null});
 expect(slot(renderWith(body()))).toMatchObject({type:Activity,props:{mode:'hidden',children:null}});
});

it('stepping away still clears the page, held or shown (privacy fence unchanged)',async()=>{
 await historyOnScreen();
 window.dispatchEvent(new Event('blur'));
 expect(body()).toEqual({authority:null,phase:'paused',content:null});
});

function renderWith(state:Body,recovery:unknown={required:true,view:null}){
 fixture.preset=[state,recovery];fixture.states=[];fixture.effects=[];
 const out=ScopedReadFrame({observation:{authority,observedAt:at(30),validForMs:15000},children:'Fictional period history'});
 fixture.preset=[];
 return out;
}
/** The frame's first slot: the place the page lives in every state. */
function slot(node:ReactNode):ReactElement|null{
 if(!isValidElement<{children?:ReactNode}>(node)||node.type!==Fragment)return null;
 const children=node.props.children;
 const first=Array.isArray(children)?children[0]:children;
 return isValidElement(first)?first:null;
}
