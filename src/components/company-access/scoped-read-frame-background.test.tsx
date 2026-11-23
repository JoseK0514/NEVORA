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

import {Fragment,isValidElement,type ReactElement,type ReactNode} from 'react';
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
 // Rendered while lapsed: the held page sits first, as itself (mounted, effects running), with the checking state after
 // it carrying the ref that hides the page's root.
 const lapsed=renderWith(body());
 // Rendered once a current observation arrives: the same page in the same place, and no status after it.
 const renewed=renderWith({authority,phase:'ready',content:'Fictional period history'},{required:false,view:null});
 expect(slots(lapsed)[0]).toBe('Fictional period history');
 expect(typeof (slots(lapsed)[1] as ReactElement<{ref?:unknown}>).props.ref).toBe('function');
 expect(slots(renewed)).toEqual(['Fictional period history',null]);
});

it('lapse then deny: an access_denied answer drops the held page',async()=>{
 await historyOnScreen();
 rs.advanceTimersByTime(15000);
 await Promise.resolve();
 expect(body().kept).toBe('Fictional period history');
 fixture.changed!({snapshot:{state:'unavailable',reason:'access_denied'},refreshing:false,paused:false});
 expect(body()).toEqual({authority:null,phase:'expired',content:null,kept:null});
 const denied=slots(renderWith(body()));
 expect(denied[0]).toBeNull();
 expect((denied[1] as ReactElement<{ref?:unknown}>).props.ref).toBeUndefined();
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
/** The frame's two slots: the page (the same place in every state), then the status section or nothing. */
function slots(node:ReactNode):ReactNode[]{
 if(!isValidElement<{children?:ReactNode}>(node)||node.type!==Fragment)throw Error('The frame renders one fragment');
 const children=node.props.children;
 return Array.isArray(children)?children:[children];
}

it('while lapsed the page root is hidden and inert before paint, and shown again as the status leaves',async()=>{
 // A stand-in for the page's root element: the element just before the status section.
 class FakeElement{inert=false;attrs=new Map<string,string>();styles=new Map<string,[string,string]>();
  style={getPropertyValue:(k:string)=>this.styles.get(k)?.[0]??'',getPropertyPriority:(k:string)=>this.styles.get(k)?.[1]??'',
   setProperty:(k:string,v:string,p='')=>{this.styles.set(k,[v,p]);},removeProperty:(k:string)=>{this.styles.delete(k);}};
  setAttribute(k:string,v:string){this.attrs.set(k,v);} removeAttribute(k:string){this.attrs.delete(k);}}
 rs.stubGlobal('HTMLElement',FakeElement);
 await historyOnScreen();
 rs.advanceTimersByTime(15000);
 await Promise.resolve();
 const status=slots(renderWith(body()))[1] as ReactElement<{ref:(node:unknown)=>(()=>void)|void}>;
 const page=new FakeElement();page.style.setProperty('display','grid','');
 const show=status.props.ref({previousElementSibling:page});
 expect(page.style.getPropertyValue('display')).toBe('none');
 expect(page.style.getPropertyPriority('display')).toBe('important');
 expect(page.inert).toBe(true);
 expect(page.attrs.get('aria-hidden')).toBe('true');
 show!();
 expect(page.style.getPropertyValue('display')).toBe('grid');
 expect(page.inert).toBe(false);
 expect(page.attrs.has('aria-hidden')).toBe(false);
});
