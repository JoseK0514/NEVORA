import {afterEach,beforeEach,expect,it,vi} from 'vitest';

// Inspection Oct 24: every frame instance fenced its own access (an authority read after mount, then a second page
// render newer than it), so each tab tap cost two extra round trips. The fence is now kept once per tab. These tests
// pin the security rule: a later frame skips the extra work only if nothing retired since the tab's cutoff, the page
// was rendered after that cutoff, and its authority matches the fence. Otherwise it fences again, as before.
const fixture=vi.hoisted(()=>({
 states:[] as unknown[],effects:[] as (()=>void|(()=>void))[],
 start:vi.fn(),pause:vi.fn(),stop:vi.fn(),
 changed:null as null|((state:unknown)=>void),
 router:{refresh:vi.fn(),replace:vi.fn()},
}));
vi.mock('react',async original=>({
 ...await original<Record<string,unknown>>(),
 useState:(initial:unknown)=>{
  const index=fixture.states.length;fixture.states.push(initial);
  return [initial,(value:unknown)=>{fixture.states[index]=typeof value==='function'?value(fixture.states[index]):value;}];
 },
 useRef:(current:unknown)=>({current}),
 useEffect:(effect:()=>void|(()=>void))=>{fixture.effects.push(effect);},
}));
vi.mock('next/navigation',()=>({useRouter:()=>fixture.router}));
vi.mock('../app-navigation',()=>({useAppNavigation:()=>null}));
vi.mock('@/lib/private-snapshot-client',()=>({
 createPrivateSnapshotController:(changed:(state:unknown)=>void)=>{fixture.changed=changed;return {start:fixture.start,pause:fixture.pause,stop:fixture.stop};},
}));

import {ScopedReadFrame,resetScopedReadTab} from './scoped-read-frame';

const at=(seconds:number)=>new Date(Date.UTC(2026,9,24,12,0,seconds)).toISOString();
const disposers:(()=>void)[]=[];
async function mount(observation:{authority:string;observedAt:string;validForMs:number}){
 fixture.states=[];fixture.effects=[];
 ScopedReadFrame({observation,children:'Fictional schedule'});
 const dispose=fixture.effects[0]();if(typeof dispose==='function')disposers.push(dispose);
 await Promise.resolve();
}
/** The first frame fences: its controller reports a fresh authority read observed at `seconds`. */
async function fenceAt(seconds:number,authority='fictional-authority-A'){
 await mount({authority,observedAt:at(seconds-2),validForMs:15000});
 expect(fixture.start).toHaveBeenCalledTimes(1);
 fixture.changed!({snapshot:{state:'ready',authority,observedAt:at(seconds),validForMs:15000,requestStartedAt:performance.now()},refreshing:false,paused:false});
 vi.clearAllMocks();
}
beforeEach(()=>{
 resetScopedReadTab();vi.clearAllMocks();
 vi.stubGlobal('window',new EventTarget());
 vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true}));
 vi.stubGlobal('navigator',{onLine:true});
});
afterEach(()=>{while(disposers.length)disposers.pop()!();vi.unstubAllGlobals();});

it('a later page rendered after the tab cutoff, same authority, opens without a second check or render',async()=>{
 await fenceAt(10);
 await mount({authority:'fictional-authority-A',observedAt:at(12),validForMs:15000});
 expect(fixture.start).not.toHaveBeenCalled();
 expect(fixture.router.refresh).not.toHaveBeenCalled();
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.states[1]).toEqual({required:false,view:null});
});

it.each(['blur','pagehide','offline','storage','pageshow','online'])('after %s anywhere in the tab, the next page fences again',async event=>{
 await fenceAt(10);
 window.dispatchEvent(new Event(event));
 vi.clearAllMocks();
 await mount({authority:'fictional-authority-A',observedAt:at(30),validForMs:15000});
 expect(fixture.start).toHaveBeenCalledTimes(1);
 expect(fixture.states[1]).toEqual({required:true,view:null});
});

it('a page carrying a different authority fences again',async()=>{
 await fenceAt(10);
 await mount({authority:'fictional-authority-B',observedAt:at(12),validForMs:15000});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});

it('a page rendered before the cutoff (an older prefetch) fences again',async()=>{
 await fenceAt(10);
 await mount({authority:'fictional-authority-A',observedAt:at(9),validForMs:15000});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});

it('a fresh tab with no fence yet checks first, exactly as before',async()=>{
 await mount({authority:'fictional-authority-A',observedAt:at(12),validForMs:15000});
 expect(fixture.start).toHaveBeenCalledTimes(1);
 expect(fixture.states[1]).toEqual({required:true,view:null});
});

it('a page outside its validity window (a prefetch left in the cache) fences again and refreshes for real',async()=>{
 await mount({authority:'fictional-authority-A',observedAt:at(8),validForMs:15000});
 fixture.changed!({snapshot:{state:'ready',authority:'fictional-authority-A',observedAt:at(10),validForMs:15000,requestStartedAt:performance.now()-20000},refreshing:false,paused:false});
 vi.clearAllMocks();
 await mount({authority:'fictional-authority-A',observedAt:at(11),validForMs:15000});
 expect(fixture.start).toHaveBeenCalledTimes(1);
 expect(fixture.states[1]).toEqual({required:true,view:null});
});
