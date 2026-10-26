import {afterEach,beforeEach,expect,it,vi} from 'vitest';

// Inspection F3/F4 (Oct 25): a tab tap used to fence (authority read) and then render the page a second time, and
// the frame's proactive refresh emptied the router cache every ~10 s. A page whose authority digest a fresh check
// returns is now shown for that check's budget without a second render, up to MAX_PAGE_AGE_MS; anything else
// (another digest, an older page, a spent check) still fences and re-renders as before. Fictional data only.
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
import {ScopedReadFrame,resetScopedReadTab,adoptable,MAX_PAGE_AGE_MS} from './scoped-read-frame';

const at=(seconds:number)=>new Date(Date.UTC(2026,9,25,12,0,0)+seconds*1000).toISOString();
const view=(authority:string,seconds:number,startedAgoMs=0,validForMs=15000)=>({state:'ready' as const,authority,observedAt:at(seconds),validForMs,requestStartedAt:performance.now()-startedAgoMs,
 employeeId:'fictional-manager',role:'MANAGER' as const,source:'OWNER_ASSIGNMENT' as const,scope:{mode:'COMPANY' as const,locationIds:[] as string[]},scopeRevision:1,locations:[] as {id:string;name:string;shortName:string}[]}) as unknown as NonNullable<Parameters<typeof adoptable>[0]>;
const page=(authority:string,seconds:number)=>({authority,observedAt:at(seconds),validForMs:15000});
const disposers:(()=>void)[]=[];
async function mount(observation:{authority:string;observedAt:string;validForMs:number}){
 fixture.states=[];fixture.effects=[];
 ScopedReadFrame({observation,children:'Fictional schedule'});
 const dispose=fixture.effects[0]();if(typeof dispose==='function')disposers.push(dispose);
 await Promise.resolve();
}
beforeEach(()=>{
 resetScopedReadTab();vi.clearAllMocks();
 vi.stubGlobal('window',new EventTarget());
 vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true}));
 vi.stubGlobal('navigator',{onLine:true});
});
afterEach(()=>{while(disposers.length)disposers.pop()!();vi.unstubAllGlobals();});

it('adopts a page only with the same digest, a young enough page and a check with budget left',()=>{
 expect(adoptable(view('A',30),page('A',10))).toBe(true);
 expect(adoptable(view('B',30),page('A',10))).toBe(false);
 expect(adoptable(view('A',30),page('A',30-MAX_PAGE_AGE_MS/1000-1))).toBe(false);
 expect(adoptable(view('A',30,14500),page('A',29))).toBe(false);
 expect(adoptable(view('A',30),{...page('A',10),validForMs:0})).toBe(false);
 expect(adoptable(null,page('A',10))).toBe(false);
});

it('a tab tap onto a cached page with the same digest asks for no second render',async()=>{
 await mount(page('A',0));
 expect(fixture.start).toHaveBeenCalledTimes(1);
 fixture.changed!({snapshot:view('A',20),refreshing:false,paused:false});
 expect(fixture.router.refresh).not.toHaveBeenCalled();
 expect(fixture.router.replace).not.toHaveBeenCalled();
 expect(fixture.states[1]).toEqual({required:true,view:expect.objectContaining({authority:'A'})});
});

it.each([['another digest',view('B',20)],['a page older than the adoption limit',view('A',MAX_PAGE_AGE_MS/1000+5)]])('%s still re-renders the page after the check',async(_case,check)=>{
 await mount(page('A',0));
 fixture.changed!({snapshot:check,refreshing:false,paused:false});
 // Without a browser location the frame falls back to a plain refresh; in a browser it is a same-address replace.
 expect(fixture.router.refresh).toHaveBeenCalledTimes(1);
});
