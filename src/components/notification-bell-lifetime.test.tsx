import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const host=vi.hoisted(()=>({effect:undefined as undefined|(()=>void|(()=>void)),changed:vi.fn()}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useState:(initial:unknown)=>[initial,host.changed],useRef:(initial:unknown)=>({current:initial}),
 useEffect:(effect:()=>void|(()=>void))=>{host.effect=effect;},
}));
vi.mock('next/navigation',()=>({usePathname:()=>'/app'}));
import {NotificationBell} from './notification-bell';
let cleanup:void|(()=>void);
let pending:{signal:AbortSignal;resolve:(response:Response)=>void}[];
const flush=()=>vi.advanceTimersByTimeAsync(0);
async function mount(){NotificationBell({authority:'a'.repeat(64)});cleanup=host.effect?.();await flush();}
async function ready(index:number){pending[index].resolve(Response.json({state:'ready',kind:'notifications',observedAt:new Date().toISOString(),validForMs:45000,coverage:'complete',items:[]}));await flush();}
beforeEach(()=>{
 pending=[];host.effect=undefined;host.changed.mockClear();
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});
 vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});
 vi.stubGlobal('fetch',(_path:string,init?:RequestInit)=>new Promise<Response>(resolve=>{if(!init?.signal)throw Error('Expected fenced notification read');pending.push({signal:init.signal,resolve});}));
});
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});
it('duplicate foreground focus/pageshow/visibility events do not abort or restart a current notification read',async()=>{
 await mount();expect(pending).toHaveLength(1);
 window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));await flush();
 expect(pending).toHaveLength(1);expect(pending[0].signal.aborted).toBe(false);
 await ready(0);expect(host.changed.mock.lastCall?.[0]).toMatchObject({paused:false,refreshing:false,snapshot:{state:'ready'}});
});
it('a real blur clears the snapshot and return requires exactly one fresh read',async()=>{
 await mount();await ready(0);window.dispatchEvent(new Event('blur'));
 expect(host.changed.mock.lastCall?.[0]).toEqual({paused:true,refreshing:false,snapshot:null});
 window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));await flush();
 expect(pending).toHaveLength(2);expect(host.changed.mock.lastCall?.[0]).toMatchObject({paused:false,refreshing:true,snapshot:null});
 await ready(1);expect(host.changed.mock.lastCall?.[0]).toMatchObject({paused:false,refreshing:false,snapshot:{state:'ready'}});
});
it('an explicit notification change still refreshes and cannot publish the superseded response',async()=>{
 await mount();window.dispatchEvent(new Event('nevora:notifications-changed'));await flush();
 expect(pending).toHaveLength(2);expect(pending[0].signal.aborted).toBe(true);
 await ready(0);expect(host.changed.mock.lastCall?.[0]).toMatchObject({snapshot:null});
 await ready(1);expect(host.changed.mock.lastCall?.[0]).toMatchObject({snapshot:{state:'ready'}});
});
it('unmount aborts the protected read and ignores its late response',async()=>{
 await mount();cleanup?.();expect(pending[0].signal.aborted).toBe(true);
 const publications=host.changed.mock.calls.length;await ready(0);expect(host.changed).toHaveBeenCalledTimes(publications);
});
it.each(['offline','pagehide','hidden'])('%s still clears private counts and requires a current read on return',async event=>{
 await mount();await ready(0);
 if(event==='offline')Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
 if(event==='hidden'){Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));}
 else window.dispatchEvent(new Event(event));
 expect(host.changed.mock.lastCall?.[0]).toEqual({paused:true,refreshing:false,snapshot:null});
 Object.defineProperty(navigator,'onLine',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 window.dispatchEvent(new Event('pageshow'));await flush();expect(pending).toHaveLength(2);
 expect(host.changed.mock.lastCall?.[0]).toMatchObject({snapshot:null,refreshing:true});await ready(1);
 expect(host.changed.mock.lastCall?.[0]).toMatchObject({snapshot:{state:'ready'}});
});
