import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CalendarSubscriptionPanel} from './calendar-subscription-panel';
vi.mock('./employee-mobile/use-mobile',()=>({useEmployeeMobile:()=>false}));
const host=vi.hoisted(()=>({state:[] as unknown[],refs:[] as {current:unknown}[],effects:[] as (()=>void|(()=>void))[],s:0,r:0}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),useCallback:(fn:unknown)=>fn,useEffect:(fn:()=>void|(()=>void))=>{host.effects.push(fn);},useRef:(initial:unknown)=>host.refs[host.r++]??(host.refs[host.r-1]={current:initial}),useState:(initial:unknown)=>{const n=host.s++;if(!(n in host.state))host.state[n]=typeof initial==='function'?initial():initial;return [host.state[n],(value:unknown)=>{host.state[n]=typeof value==='function'?value(host.state[n]):value;}];}}));
const authority='a'.repeat(64),id='11111111-1111-4111-8111-111111111111',generation='22222222-2222-4222-8222-222222222222';
const ready=(validForMs=45000)=>({state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],authority,observedAt:new Date().toISOString(),validForMs,canIssue:true});
let cleanups:(()=>void)[]=[];
const render=()=>{host.s=0;host.r=0;return CalendarSubscriptionPanel({authority});};
const props=()=>render().props;
async function mount(){render();cleanups=host.effects.splice(0).map(effect=>effect()).filter((fn):fn is ()=>void=>typeof fn==='function');await vi.advanceTimersByTimeAsync(0);}
beforeEach(()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});host.state=[];host.refs=[];host.effects=[];vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true,clipboard:{writeText:vi.fn(async()=>{})}});vi.stubGlobal('location',{origin:'https://nevora.test'});});
afterEach(()=>{cleanups.forEach(fn=>fn());cleanups=[];vi.unstubAllGlobals();vi.useRealTimers();});

it('bounds a held read and offers recovery instead of checking forever',async()=>{
 vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));await mount();await vi.advanceTimersByTimeAsync(10001);
 expect(props().status).toMatchObject({state:'unavailable'});expect(props().busy).toBe(false);
});
it.each(['headers','body'])('bounds held command %s and retries exactly the original intent after a fresh read',async boundary=>{
 const calls:RequestInit[]=[];let posts=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{calls.push(init);if(init.method!=='POST')return Response.json(ready());posts++;if(boundary==='headers')return await new Promise<Response>(()=>{});return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));}}));}));
 await mount();props().onCommand('ISSUE');await vi.advanceTimersByTimeAsync(10001);
 expect(props().busy).toBe(false);expect(props().notice).toMatch(/unknown/i);expect(props().url).toBeNull();
 await vi.advanceTimersByTimeAsync(0);props().onRetry();await vi.advanceTimersByTimeAsync(0);
 expect(posts).toBe(2);expect(calls.filter(call=>call.method==='POST')[1].body).toBe(calls.find(call=>call.method==='POST')!.body);
});
it('does not lose an uncertain original request when another tab changes appearance',async()=>{
 const calls:RequestInit[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{calls.push(init);if(init.method==='POST')throw Error('lost reply');return Response.json(ready());}));
 await mount();props().onCommand('ISSUE');await vi.advanceTimersByTimeAsync(0);
 window.dispatchEvent(Object.assign(new Event('storage'),{key:'nv-theme'}));await vi.advanceTimersByTimeAsync(0);props().onRetry();await vi.advanceTimersByTimeAsync(0);
 const posts=calls.filter(call=>call.method==='POST');expect(posts).toHaveLength(2);expect(posts[1].body).toBe(posts[0].body);
});
it('releases facts on signout and cannot resume the ended mounted session',async()=>{
 const request=vi.fn(async()=>Response.json(ready()));vi.stubGlobal('fetch',request);await mount();expect(props().status).toMatchObject({state:'none'});
 window.dispatchEvent(new Event('nevora:signout'));expect(props().status).toBeNull();expect(props().paused).toBe(true);
 for(const event of ['focus','pageshow','online'])window.dispatchEvent(new Event(event));await vi.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(1);
});
it('expires the server authorization budget even before periodic polling',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(ready(100))));await mount();expect(props().status).toMatchObject({state:'none'});await vi.advanceTimersByTimeAsync(101);
 expect(props().status).toMatchObject({state:'unavailable'});expect(props().url).toBeNull();
});
it('does not reveal a created private link before a fresh canonical read confirms its generation',async()=>{
 let reads=0;vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){const command=JSON.parse(String(init.body));return Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`});}if(++reads>1)return await new Promise<Response>(()=>{});return Response.json(ready());}));
 await mount();props().onCommand('ISSUE');await vi.advanceTimersByTimeAsync(0);expect(props().url).toBeNull();expect(reads).toBe(2);
});
it.each([401,403])('denies HTTP %s without waiting for an unread body and releases that body',async status=>{
 const cancel=vi.fn();vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel}),{status})));await mount();expect(props().status).toMatchObject({state:'unauthorized'});expect(cancel).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(60000);expect(fetch).toHaveBeenCalledOnce();
});
it.each(['fuel-portal-account-fence','fuel-portal-owner-generation',null])('account storage fence %s ends this owner instead of reopening it',async key=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(ready())));await mount();window.dispatchEvent(Object.assign(new Event('storage'),{key}));expect(props().status).toBeNull();window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(60000);expect(fetch).toHaveBeenCalledOnce();
});
it('preserves unknown original through blur/resume and fences the late created reply',async()=>{
 let deliver!:(value:Response)=>void;const calls:RequestInit[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{calls.push(init);if(init.method==='POST')return await new Promise<Response>(resolve=>{deliver=resolve;});return Response.json(ready());}));
 await mount();props().onCommand('ISSUE');await vi.advanceTimersByTimeAsync(0);const command=JSON.parse(String(calls.find(call=>call.method==='POST')!.body));
 window.dispatchEvent(new Event('blur'));expect(props().url).toBeNull();window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(0);
 deliver(Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`}));await vi.advanceTimersByTimeAsync(0);expect(props().url).toBeNull();expect(props().notice).toMatch(/unknown/);props().onRetry();await vi.advanceTimersByTimeAsync(0);const posts=calls.filter(call=>call.method==='POST');expect(posts).toHaveLength(2);expect(posts[1].body).toBe(posts[0].body);
});
it('subtracts held-response time from the lease and never admits expired actions',async()=>{
 let deliver!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{deliver=resolve;})));await mount();await vi.advanceTimersByTimeAsync(500);deliver(Response.json(ready(100)));await vi.advanceTimersByTimeAsync(0);expect(props().status).toMatchObject({state:'unavailable'});props().onCommand('ISSUE');expect(fetch).toHaveBeenCalledOnce();
});
it('only reveals a created URL after its own matching active generation and releases it on expiry',async()=>{
 let active=false;vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){active=true;const command=JSON.parse(String(init.body));return Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`});}return Response.json(active?{...ready(100),state:'active',id,generation,issuedAt:new Date().toISOString(),allowedLocationIds:['loc-1']}:ready());}));
 await mount();props().onCommand('ISSUE');await vi.advanceTimersByTimeAsync(0);expect(props().url).toContain('/api/calendar/');await vi.advanceTimersByTimeAsync(101);expect(props().url).toBeNull();expect(props().status).toMatchObject({state:'unavailable'});
});
it('refuses a new issue when current canonical location eligibility is absent',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({...ready(),canIssue:false})));await mount();props().onCommand('ISSUE');await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledOnce();
});
