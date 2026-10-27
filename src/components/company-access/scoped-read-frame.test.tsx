import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Children,isValidElement,type ReactNode} from 'react';

const fixture=vi.hoisted(()=>({
 states:[] as unknown[],effects:[] as (()=>void|(()=>void))[],
 start:vi.fn(),pause:vi.fn(),stop:vi.fn(),
 router:{refresh:vi.fn(),replace:vi.fn()},reload:vi.fn(),changed:null as null|((state:unknown)=>void),
 navigation:{pending:vi.fn(()=>false),current:vi.fn(()=>null as null|{source:string}),discard:vi.fn(),subscribe:vi.fn(()=>()=>{})},
}));
vi.mock('react',async original=>({
 ...await original<Record<string,unknown>>(),
 useState:(initial:unknown)=>{
  const index=fixture.states.length;fixture.states.push(initial);
  return [initial,(value:unknown)=>{
   fixture.states[index]=typeof value==='function'?value(fixture.states[index]):value;
  }];
 },
 useRef:(current:unknown)=>({current}),
 useEffect:(effect:()=>void|(()=>void))=>{fixture.effects.push(effect);},
}));
vi.mock('next/navigation',()=>({useRouter:()=>fixture.router}));
vi.mock('../app-navigation',()=>({useAppNavigation:()=>fixture.navigation}));
vi.mock('@/lib/private-snapshot-client',()=>({
 createPrivateSnapshotController:(changed:(state:unknown)=>void)=>{fixture.changed=changed;return {start:fixture.start,pause:fixture.pause,stop:fixture.stop};},
}));

import {ScopedReadFrame,resetScopedReadTab} from './scoped-read-frame';

const receipt={authority:'fictional-current-authority',phase:'ready',content:'Current receipt'};
let dispose:void|(()=>void);
let view:ReturnType<typeof ScopedReadFrame>;
function activateRecovery(){
 if(!isValidElement<{children:ReactNode}>(view))throw Error('Recovery view unavailable');
 const button=Children.toArray(view.props.children).find(child=>isValidElement(child)&&child.type==='button');
 if(!isValidElement<{onClick?:()=>void}>(button)||typeof button.props.onClick!=='function')throw Error('Recovery action unavailable');
 button.props.onClick();
}
beforeEach(async()=>{
 fixture.states=[];fixture.effects=[];vi.clearAllMocks();fixture.navigation.pending.mockReturnValue(false);fixture.navigation.current.mockReturnValue(null);resetScopedReadTab();
 fixture.navigation.discard.mockImplementation(()=>{fixture.navigation.pending.mockReturnValue(false);fixture.navigation.current.mockReturnValue(null);});
 vi.stubGlobal('window',Object.assign(new EventTarget(),{location:{pathname:'/app/payroll-export',search:'?start=2026-09-21&end=2026-09-27',hash:'',reload:fixture.reload}}));
 vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true}));
 vi.stubGlobal('navigator',{onLine:true});
 view=ScopedReadFrame({children:'Current receipt'});
 dispose=fixture.effects[0]();
 await Promise.resolve();
 fixture.states[0]=receipt;
 fixture.states[1]={required:false,view:null};
 vi.clearAllMocks();
});
afterEach(()=>{dispose?.();dispose=undefined;vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});

it('retains the current receipt and authority on duplicate active window focus',()=>{
 window.dispatchEvent(new Event('focus'));
 window.dispatchEvent(new Event('focus'));
 expect(fixture.states[0]).toBe(receipt);
 expect(fixture.states[1]).toEqual({required:false,view:null});
 expect(fixture.start).not.toHaveBeenCalled();
 expect(fixture.pause).not.toHaveBeenCalled();
});

it.each(['blur','pagehide','offline'])('clears the child on %s and rechecks when focus returns',event=>{
 window.dispatchEvent(new Event(event));
 expect(fixture.states[0]).toEqual({authority:null,phase:'paused',content:null});
 expect(fixture.states[1]).toEqual({required:true,view:null});
 expect(fixture.start).not.toHaveBeenCalled();
 window.dispatchEvent(new Event('focus'));
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});

it.each(['storage','pageshow','online'])('requires a fresh check on %s even while focused',event=>{
 window.dispatchEvent(new Event(event));
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.states[1]).toEqual({required:true,view:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});

it('clears hidden content and rechecks after visibility is restored',()=>{
 Object.assign(document,{visibilityState:'hidden'});
 document.dispatchEvent(new Event('visibilitychange'));
 expect(fixture.states[0]).toEqual({authority:null,phase:'paused',content:null});
 Object.assign(document,{visibilityState:'visible'});
 document.dispatchEvent(new Event('visibilitychange'));
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});


it('explicit recovery preempts a stalled destination with the captured source only after a fresh authority read',()=>{
 vi.useFakeTimers();
 const source='/app/payroll-export?start=2026-09-21&end=2026-09-27';
 fixture.navigation.pending.mockReturnValue(true);fixture.navigation.current.mockReturnValue({source});
 // The browser's address can already point at the destination; the accepted source remains the recovery target.
 Object.assign(window.location,{pathname:'/app/reports',search:''});
 activateRecovery();
 expect(fixture.navigation.discard).toHaveBeenCalledTimes(1);
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.states[1]).toEqual({required:true,view:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
 expect(fixture.router.replace).not.toHaveBeenCalled();expect(fixture.router.refresh).not.toHaveBeenCalled();
 fixture.changed!({snapshot:{state:'ready',authority:'fictional-current-authority',observedAt:'2026-10-26T12:00:00Z',requestStartedAt:performance.now()+1},refreshing:false,paused:false});
 expect(fixture.router.replace).toHaveBeenCalledWith(source,{scroll:false});
 expect(fixture.reload).not.toHaveBeenCalled();
 expect(fixture.router.refresh).not.toHaveBeenCalled();
 vi.advanceTimersByTime(1500);
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
});

it('keeps ordinary explicit recovery inside the existing authority check when no destination is pending',()=>{
 activateRecovery();
 expect(fixture.navigation.discard).toHaveBeenCalledTimes(1);expect(fixture.start).toHaveBeenCalledTimes(1);
 fixture.changed!({snapshot:{state:'ready',authority:'fictional-current-authority',observedAt:'2026-10-26T12:00:00Z',requestStartedAt:performance.now()+1},refreshing:false,paused:false});
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.reload).not.toHaveBeenCalled();
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
});

it('does not navigate away offline even when a destination was pending',()=>{
 fixture.navigation.pending.mockReturnValue(true);Object.assign(navigator,{onLine:false});
 activateRecovery();
 expect(fixture.navigation.discard).toHaveBeenCalledTimes(1);
 expect(fixture.reload).not.toHaveBeenCalled();
 expect(fixture.start).not.toHaveBeenCalled();
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
});
