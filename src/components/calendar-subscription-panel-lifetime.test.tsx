import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {CalendarSubscriptionPanel} from './calendar-subscription-panel';
rs.mock('./employee-mobile/use-mobile',()=>({useEmployeeMobile:()=>false}));
const host=rs.hoisted(()=>({state:[] as unknown[],refs:[] as {current:unknown}[],effects:[] as (()=>void|(()=>void))[],s:0,r:0}));
rs.mock('react',()=>({...rstestOriginal0,useCallback:(fn:unknown)=>fn,useEffect:(fn:()=>void|(()=>void))=>{host.effects.push(fn);},useRef:(initial:unknown)=>host.refs[host.r++]??(host.refs[host.r-1]={current:initial}),useState:(initial:unknown)=>{const n=host.s++;if(!(n in host.state))host.state[n]=typeof initial==='function'?initial():initial;return [host.state[n],(value:unknown)=>{host.state[n]=typeof value==='function'?value(host.state[n]):value;}];}}));
const authority='a'.repeat(64),id='11111111-1111-4111-8111-111111111111',generation='22222222-2222-4222-8222-222222222222';
const ready=(validForMs=45000)=>({state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],authority,observedAt:new Date().toISOString(),validForMs,canIssue:true});
let cleanups:(()=>void)[]=[];
const render=()=>{host.s=0;host.r=0;return CalendarSubscriptionPanel({authority});};
const props=()=>render().props;
async function mount(){render();cleanups=host.effects.splice(0).map(effect=>effect()).filter((fn):fn is ()=>void=>typeof fn==='function');await rs.advanceTimersByTimeAsync(0);}
beforeEach(()=>{rs.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});host.state=[];host.refs=[];host.effects=[];rs.stubGlobal('window',new EventTarget());rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));rs.stubGlobal('navigator',{onLine:true,clipboard:{writeText:rs.fn(async()=>{})}});rs.stubGlobal('location',{origin:'https://nevora.test'});});
afterEach(()=>{cleanups.forEach(fn=>fn());cleanups=[];rs.restoreAllMocks();rs.unstubAllGlobals();rs.useRealTimers();});

it('bounds a held read and offers recovery instead of checking forever',async()=>{
 rs.stubGlobal('fetch',rs.fn(()=>new Promise(()=>{})));await mount();await rs.advanceTimersByTimeAsync(10001);
 expect(props().status).toMatchObject({state:'unavailable'});expect(props().busy).toBe(false);
});
it.each(['headers','body'])('bounds held command %s and retries exactly the original intent after a fresh read',async boundary=>{
 const calls:RequestInit[]=[];let posts=0;
 rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{calls.push(init);if(init.method!=='POST')return Response.json(ready());posts++;if(boundary==='headers')return await new Promise<Response>(()=>{});return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));}}));}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(10001);
 expect(props().busy).toBe(false);expect(props().notice).toMatch(/unknown/i);expect(props().url).toBeNull();
 await rs.advanceTimersByTimeAsync(0);props().onRetry();await rs.advanceTimersByTimeAsync(0);
 expect(posts).toBe(2);expect(calls.filter(call=>call.method==='POST')[1].body).toBe(calls.find(call=>call.method==='POST')!.body);
});
it('does not lose an uncertain original request when another tab changes appearance',async()=>{
 const calls:RequestInit[]=[];
 rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{calls.push(init);if(init.method==='POST')throw Error('lost reply');return Response.json(ready());}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);
 window.dispatchEvent(Object.assign(new Event('storage'),{key:'nv-theme'}));await rs.advanceTimersByTimeAsync(0);props().onRetry();await rs.advanceTimersByTimeAsync(0);
 const posts=calls.filter(call=>call.method==='POST');expect(posts).toHaveLength(2);expect(posts[1].body).toBe(posts[0].body);
});
it('releases facts on signout and cannot resume the ended mounted session',async()=>{
 const request=rs.fn(async()=>Response.json(ready()));rs.stubGlobal('fetch',request);await mount();expect(props().status).toMatchObject({state:'none'});
 window.dispatchEvent(new Event('nevora:signout'));expect(props().status).toBeNull();expect(props().paused).toBe(true);
 for(const event of ['focus','pageshow','online'])window.dispatchEvent(new Event(event));await rs.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(1);
});
it('expires the server authorization budget even before periodic polling',async()=>{
 rs.stubGlobal('fetch',rs.fn(async()=>Response.json(ready(100))));await mount();expect(props().status).toMatchObject({state:'none'});await rs.advanceTimersByTimeAsync(101);
 expect(props().status).toMatchObject({state:'unavailable'});expect(props().url).toBeNull();
});
it('does not reveal a created private link before a fresh canonical read confirms its generation',async()=>{
 let reads=0;rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){const command=JSON.parse(String(init.body));return Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`});}if(++reads>1)return await new Promise<Response>(()=>{});return Response.json(ready());}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);expect(props().url).toBeNull();expect(reads).toBe(2);
});
it.each([401,403])('denies HTTP %s without waiting for an unread body and releases that body',async status=>{
 const cancel=rs.fn();rs.stubGlobal('fetch',rs.fn(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel}),{status})));await mount();expect(props().status).toMatchObject({state:'unauthorized'});expect(cancel).toHaveBeenCalledOnce();await rs.advanceTimersByTimeAsync(60000);expect(fetch).toHaveBeenCalledOnce();
});
it.each(['fuel-portal-account-fence','fuel-portal-owner-generation',null])('account storage fence %s ends this owner instead of reopening it',async key=>{
 rs.stubGlobal('fetch',rs.fn(async()=>Response.json(ready())));await mount();window.dispatchEvent(Object.assign(new Event('storage'),{key}));expect(props().status).toBeNull();window.dispatchEvent(new Event('focus'));await rs.advanceTimersByTimeAsync(60000);expect(fetch).toHaveBeenCalledOnce();
});
it('preserves unknown original through blur/resume and fences the late created reply',async()=>{
 let deliver!:(value:Response)=>void;const calls:RequestInit[]=[];
 rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{calls.push(init);if(init.method==='POST')return await new Promise<Response>(resolve=>{deliver=resolve;});return Response.json(ready());}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);const command=JSON.parse(String(calls.find(call=>call.method==='POST')!.body));
 window.dispatchEvent(new Event('blur'));expect(props().url).toBeNull();window.dispatchEvent(new Event('focus'));await rs.advanceTimersByTimeAsync(0);
 deliver(Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`}));await rs.advanceTimersByTimeAsync(0);expect(props().url).toBeNull();expect(props().notice).toMatch(/unknown/);props().onRetry();await rs.advanceTimersByTimeAsync(0);const posts=calls.filter(call=>call.method==='POST');expect(posts).toHaveLength(2);expect(posts[1].body).toBe(posts[0].body);
});
it('subtracts held-response time from the lease and never admits expired actions',async()=>{
 let deliver!:(value:Response)=>void;rs.stubGlobal('fetch',rs.fn(()=>new Promise<Response>(resolve=>{deliver=resolve;})));await mount();await rs.advanceTimersByTimeAsync(500);deliver(Response.json(ready(100)));await rs.advanceTimersByTimeAsync(0);expect(props().status).toMatchObject({state:'unavailable'});props().onCommand('ISSUE');expect(fetch).toHaveBeenCalledOnce();
});
it('only reveals a created URL after its own matching active generation and releases it on expiry',async()=>{
 let active=false;rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){active=true;const command=JSON.parse(String(init.body));return Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`});}return Response.json(active?{...ready(100),state:'active',id,generation,issuedAt:new Date().toISOString(),allowedLocationIds:['loc-1']}:ready());}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);expect(props().url).toContain('/api/calendar/');await rs.advanceTimersByTimeAsync(101);expect(props().url).toBeNull();expect(props().status).toMatchObject({state:'unavailable'});
});
it('refuses a new issue when current canonical location eligibility is absent',async()=>{
 rs.stubGlobal('fetch',rs.fn(async()=>Response.json({...ready(),canIssue:false})));await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledOnce();
});
it.each(['new command','original retry'])('checks the monotonic lease before %s when native expiry callbacks are delayed',async action=>{
 const now=rs.spyOn(performance,'now').mockReturnValue(0);let posts=0;
 rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){posts++;throw Error('lost reply');}return Response.json(ready(100));}));await mount();
 if(action==='original retry'){props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);expect(posts).toBe(1);}
 now.mockReturnValue(101);if(action==='new command')props().onCommand('ISSUE');else props().onRetry();await rs.advanceTimersByTimeAsync(0);
 expect(posts).toBe(action==='original retry'?1:0);expect(props().status).toMatchObject({state:'unavailable'});expect(props().url).toBeNull();now.mockRestore();
});
it('checks the monotonic lease before copying when native expiry callbacks are delayed',async()=>{
 const now=rs.spyOn(performance,'now').mockReturnValue(0);let active=false;const copy=rs.fn(async()=>{});rs.stubGlobal('navigator',{onLine:true,clipboard:{writeText:copy}});
 rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){active=true;const command=JSON.parse(String(init.body));return Response.json({status:'created',operationId:command.operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`});}return Response.json(active?{...ready(100),state:'active',id,generation,issuedAt:new Date().toISOString(),allowedLocationIds:['loc-1']}:ready());}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);expect(props().url).toContain('/api/calendar/');now.mockReturnValue(101);props().onCopy();await rs.advanceTimersByTimeAsync(0);
 expect(copy).not.toHaveBeenCalled();expect(props().url).toBeNull();expect(props().status).toMatchObject({state:'unavailable'});now.mockRestore();
});
it('keeps the original request deadline when later clock reads advance before admission',async()=>{
 const now=rs.spyOn(performance,'now').mockReturnValue(101).mockReturnValueOnce(0).mockReturnValueOnce(0);let posts=0;
 rs.stubGlobal('fetch',rs.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST'){posts++;throw Error('unexpected expired write');}return Response.json(ready(100));}));
 await mount();props().onCommand('ISSUE');await rs.advanceTimersByTimeAsync(0);
 expect(posts).toBe(0);expect(props().status).toMatchObject({state:'unavailable'});expect(props().url).toBeNull();now.mockRestore();
});
