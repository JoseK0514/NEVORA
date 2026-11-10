import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {TimecardCommand} from '../lib/timecards/service';
const host=vi.hoisted(()=>({cursor:0,mounted:false,slots:[] as {value:unknown}[],effects:[] as (()=>void|(()=>void))[]}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
 useCallback:(callback:unknown)=>callback,
 useEffect:(effect:()=>void|(()=>void))=>{if(!host.mounted)host.effects.push(effect);},
}));
vi.mock('./clean/top-bar-slot',()=>({useTopBarSlot:()=>null}));
vi.mock('next/navigation',()=>({useSearchParams:()=>null}));
import {Timecards} from './timecards';
import {QuietSheet} from './quiet/quiet-sheet';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
function card(id:string){const source={...period,employeeId:id,employeeName:`PRIVATE ${id}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]};return {source,state:'DRAFT',revision:0,sourceHash:'a'.repeat(32),history:[]};}
const ready=(validForMs=45000)=>({state:'ready',observedAt:'2026-09-29T12:00:00Z',validForMs,cards:[card('E1'),card('E2'),card('OWNER')]});
let cleanup:void|(()=>void);let commands:TimecardCommand[]=[],actorId='OWNER',manager=true,employeeCorporate=false;
function render(){host.cursor=0;return Timecards({initialPeriod:period,manager,actorId,employeeCorporate});}
const html=()=>renderToStaticMarkup(render());
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const n=v as ReactElement<Record<string,unknown>>;return [n,...nodes(n.props.children as ReactNode),...nodes(n.props.right as ReactNode),...nodes(n.props.actions as ReactNode),...nodes(n.props.action as ReactNode)];}
// Release 1 (board G-O-Time): Select sits in the corporate title's actions slot, so the walk also visits `actions`; the
// kit's error card holds Try again or Refresh in its `action` slot.
function control(test:(n:ReactElement<Record<string,unknown>>)=>boolean){const n=nodes(render()).find(test);if(!n)throw Error('Missing rendered control');return n.props;}
const click=(label:string)=>(control(n=>n.type==='button'&&(n.props.children===label||n.props['aria-label']===label)).onClick as ()=>unknown)();
// Owner premium (A8): the checkboxes show once the manager taps Select (it shows when a card can be approved or finalized).
const has=(test:(n:ReactElement<Record<string,unknown>>)=>boolean)=>nodes(render()).some(test);
function enterSelect(){if(manager&&!has(n=>n.type==='input'&&String(n.props['aria-label']??'').startsWith('Select PRIVATE')))click('Select');}
const check=(label:string,value=true)=>{if(label.startsWith('Select ')&&!has(n=>n.type==='input'&&n.props['aria-label']===label))enterSelect();(control(n=>n.type==='input'&&n.props['aria-label']===label).onChange as (e:unknown)=>void)({target:{checked:value}});};
const flush=()=>vi.advanceTimersByTimeAsync(0);
async function mount(){render();host.mounted=true;cleanup=host.effects[0]();await flush();}
function transport(outcome:'success'|'unknown'='success',validForMs=45000){vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready(validForMs));const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);if(outcome==='unknown')throw Error('Interrupted');return Response.json({status:'approved',operationId:c.operationId,revision:1});});}
beforeEach(()=>{actorId='OWNER';manager=true;employeeCorporate=false;host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];commands=[];vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});
it('shows employee period information and keeps approval controls out of the employee view',async()=>{
 manager=false;employeeCorporate=true;actorId='E1';
 vi.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-27T12:00:00Z',cards:[card('E1')]}));
 await mount();
 expect(html()).toContain('Period is still open');
 expect(html()).toContain('Period information');
 expect(html()).toContain('data-tone="neutral"');
 expect(html()).toContain('Totals can change until the period closes.');
 expect(html()).not.toContain('Needs attention');
 expect(html()).not.toMatch(/Approve timecard|Finalize period|Reopen period|Selected timecard review|Select PRIVATE/);
 window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('Period is still open');
 expect(html()).not.toContain('Your timecard');
 expect(commands).toHaveLength(0);
});
it.each([401,403])('clears employee timecard rows and distinguishes HTTP%i on native refresh',async(status)=>{
 manager=false;employeeCorporate=true;actorId='E1';let denied=false;
 vi.stubGlobal('fetch',async()=>denied?new Response(null,{status}):Response.json({...ready(),cards:[card('E1')]}));
 await mount();expect(html()).toContain('Your timecard');
 denied=true;
 (control(n=>n.type==='button'&&n.props['aria-label']==='Refresh timecards').onClick as ()=>unknown)();
 await flush();expect(html()).toContain(status===401?'Your session ended. Sign in again to view your timecards.':'Your access changed. Sign in again to check your timecards.');
 expect(html()).toContain('href="/login"');
 expect(html()).not.toContain('Your timecard');
 expect(html()).not.toContain('Revision 0');
 expect(commands).toHaveLength(0);
});
it('renders all mixed employee issue reasons without changing their order or exposing approvals',async()=>{
 manager=false;employeeCorporate=true;actorId='E1';
 const own=card('E1');
 const entry={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-27T08:00:00Z',endAt:null,rawStartAt:'2026-09-27T08:00:00Z',rawEndAt:null,breaks:[{id:'break-1',name:'Meal',startAt:'2026-09-27T09:00:00Z',endAt:null,rawStartAt:'2026-09-27T09:00:00Z',rawEndAt:null,adjustmentId:null}]};
 const source={...own.source,pendingCorrections:1,entries:[entry,{...entry,id:'punch-2',startAt:'2026-09-27T10:00:00Z',rawStartAt:'2026-09-27T10:00:00Z',breaks:[]}]};
 vi.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-27T12:00:00Z',cards:[{...own,source}]}));
 await mount();const rendered=html();
 expect(rendered).toContain('data-tone="warning"');
 const reasons=['Period is still open','Correction awaiting review','No clock-out yet','Open break','Overlapping recorded time'];
 const positions=reasons.map(reason=>rendered.indexOf(reason));
 expect(positions.every(position=>position>=0)).toBe(true);
 expect(positions).toEqual([...positions].sort((a,b)=>a-b));
 expect(rendered).not.toMatch(/Approve timecard|Finalize period|Reopen period|Selected timecard review/);
});
it('requires explicit selection, a rendered reviewed set and fresh confirmation before approval',async()=>{
 transport();await mount();enterSelect();expect(control(n=>n.type==='button'&&n.props.children==='Review selected timecards').disabled).toBe(true);
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE OWNER').disabled).toBe(true);
 check('Select PRIVATE E1');click('Review selected timecards');expect(html()).toContain('Reviewed approval set');expect(html()).toContain('Revision 0');
 expect(control(n=>n.type==='button'&&n.props.children==='Approve selected').disabled).toBe(true);
 check('Confirm reviewed timecards');click('Approve selected');await flush();expect(commands).toHaveLength(1);expect(commands[0].employeeId).toBe('E1');expect(commands[0].action).toBe('APPROVE');
 expect(html()).toContain('approved');expect(html()).toContain('Refresh timecards before reviewing another set.');
});
it('shows partial unknown and not-submitted outcomes and retries only the original command',async()=>{
 transport('unknown');await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();
 expect(commands).toHaveLength(1);expect(html()).toContain('outcome unknown');expect(html()).toContain('not submitted');
 const original=commands[0];click('Retry original attempted action');await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);
});
it('refresh clears selection and confirmation, requiring a fresh review',async()=>{
 transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');click('Refresh timecards');await flush();
 expect(html()).not.toContain('Reviewed approval set');expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);expect(commands).toHaveLength(0);
});
it('expiry removes private reviewed rows and does not submit remaining commands after an in-flight result',async()=>{
 let resolve!:(response:Response)=>void;vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready(1000));commands.push(JSON.parse(String(init?.body)));return new Promise<Response>(r=>{resolve=r;});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();await vi.advanceTimersByTimeAsync(1001);
 expect(html()).not.toContain('PRIVATE');resolve(Response.json({status:'approved',operationId:commands[0].operationId,revision:1}));await flush();expect(commands).toHaveLength(1);expect(html()).not.toContain('PRIVATE');
});
it('window blur clears selection and reviewed private rows',async()=>{transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');window.dispatchEvent(new Event('blur'));expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Reviewed approval set');});
it('actor replacement hides private reviewed rows and overview before the next effect can run',async()=>{transport();await mount();expect(html()).toContain('Period overview');check('Select PRIVATE E1');click('Review selected timecards');actorId='OTHER';expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Reviewed approval set');expect(html()).not.toContain('Period overview');expect(html()).not.toContain('No timecards to show');expect(commands).toHaveLength(0);});
it('action change clears the old selected set and review instead of reusing approval confirmation',async()=>{transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');const action=control(n=>n.type==='select');(action.onChange as (e:unknown)=>void)({target:{value:'FINALIZE'}});expect(html()).not.toContain('Reviewed approval set');expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').disabled).toBe(true);expect(commands).toHaveLength(0);});
it('a denied first command clears protected data and stops before submitting the second card',async()=>{vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));return new Response(null,{status:403});});await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();expect(commands).toHaveLength(1);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Retry original attempted action');expect(html()).toContain('Sign in again');});
it('clears a completed batch whose source deadline passed before the expiry timer runs',async()=>{
 let resolve!:(response:Response)=>void;vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));return new Promise<Response>(r=>{resolve=r;});});
 await mount();check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();
 const now=vi.spyOn(performance,'now').mockReturnValue(50000);try{resolve(Response.json({status:'approved',operationId:commands[0].operationId,revision:1}));await flush();expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Per-card results');}finally{now.mockRestore();}
});
it('clears an overdue original retry before sending and retains only its exact recovery identity for a fresh protected read',async()=>{
 transport('unknown');await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();const original=commands[0];
 const now=vi.spyOn(performance,'now').mockReturnValue(50000);try{click('Retry original attempted action');await flush();expect(commands).toHaveLength(1);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Per-card results');expect(html()).not.toContain('Retry original attempted action');}finally{now.mockRestore();}
 click('Refresh timecards');await flush();click('Retry original attempted action');await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);
});
it('clears private rows and stale outcomes when an original retry receipt arrives after its deadline before the timer runs',async()=>{
 let resolve!:(response:Response)=>void;vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);if(commands.length===1)throw Error('Interrupted initial attempt');if(commands.length===2)return new Promise<Response>(r=>{resolve=r;});return Response.json({status:'approved',operationId:c.operationId,revision:1});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();const original=commands[0];click('Retry original attempted action');await flush();
 const now=vi.spyOn(performance,'now').mockReturnValue(50000);try{resolve(Response.json({status:'approved',operationId:original.operationId,revision:1}));await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Per-card results');expect(html()).not.toContain('Retry original attempted action');}finally{now.mockRestore();}
 click('Refresh timecards');await flush();click('Retry original attempted action');await flush();expect(commands).toHaveLength(3);expect(commands[2]).toEqual(original);
});
it.each([{status:'blocked',reason:'unresolved_time',http:409},{status:'conflict',http:409},{status:'unavailable',http:503}])('replaces the original unknown per-card result with a verified $status retry without submitting remaining cards',async({http,...result})=>{
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));if(commands.length===1)throw Error('Interrupted initial attempt');return Response.json(result,{status:http});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();expect(html()).toContain('PRIVATE E1 · outcome unknown');click('Retry original attempted action');await flush();
 expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(html()).toContain(`PRIVATE E1 · ${result.status}`);expect(html()).not.toContain('PRIVATE E1 · outcome unknown');expect(html()).toContain('PRIVATE E2 · not submitted');expect(html()).not.toContain('Retry original attempted action');
});

it('refreshes a 15-second projection early and preserves selection, confirmation and the original reviewed command',async()=>{
 let reads=0;vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards'){reads++;return Response.json({...ready(15000),observedAt:reads===1?'2026-09-29T12:00:00Z':'2026-09-29T12:00:01Z'});}commands.push(JSON.parse(String(init?.body)));throw Error('Fictional unknown result');});
 await mount();const id=vi.spyOn(crypto,'randomUUID');try{
  check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');
  await vi.advanceTimersByTimeAsync(14000);expect(reads).toBe(2);expect(html()).toContain('Reviewed approval set');expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(true);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Confirm reviewed timecards').checked).toBe(true);
  click('Approve selected');await flush();expect(commands).toHaveLength(1);expect(commands[0].operationId).toBe(id.mock.results[0].value);expect(id).toHaveBeenCalledTimes(1);
 }finally{id.mockRestore();}
});
it('keeps the old deadline armed during a single-flight replacement and never revives its late reply',async()=>{
 let reads=0,resolve!:(r:Response)=>void;vi.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):new Promise<Response>(r=>{resolve=r;}));
 await mount();check('Select PRIVATE E1');click('Review selected timecards');await vi.advanceTimersByTimeAsync(14999);expect(reads).toBe(2);expect(html()).toContain('PRIVATE E1');expect(html()).toContain('Reviewed approval set');await vi.advanceTimersByTimeAsync(2);expect(html()).not.toContain('PRIVATE');resolve(Response.json(ready(15000)));await flush();expect(html()).not.toContain('PRIVATE');expect(reads).toBe(2);
});
it('counts initial transit and JSON parsing against the supplied finite budget',async()=>{
 let resolve!:(body:unknown)=>void;vi.stubGlobal('fetch',async()=>({ok:true,status:200,json:()=>new Promise(r=>{resolve=r;})}));await mount();await vi.advanceTimersByTimeAsync(10000);resolve(ready(15000));await flush();expect(html()).toContain('PRIVATE E1');vi.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));await vi.advanceTimersByTimeAsync(5001);expect(html()).not.toContain('PRIVATE');
});
it.each([403,503,'malformed'] as const)('retires private selection and review on a replacement %s',async result=>{
 let reads=0;vi.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):result==='malformed'?Response.json({state:'ready',cards:[]}):new Response(null,{status:result}));await mount();check('Select PRIVATE E1');click('Review selected timecards');await vi.advanceTimersByTimeAsync(10000);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Reviewed approval set');expect(commands).toHaveLength(0);
});
it.each(['blur','offline','pagehide'])('fences an early replacement after %s and does not poll a paused view',async event=>{
 let reads=0,resolve!:(r:Response)=>void;vi.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):new Promise<Response>(r=>{resolve=r;}));await mount();await vi.advanceTimersByTimeAsync(10000);window.dispatchEvent(new Event(event));resolve(Response.json(ready(15000)));await flush();await vi.advanceTimersByTimeAsync(31000);expect(reads).toBe(2);expect(html()).not.toContain('PRIVATE');
});
it('clears a frozen review and selection when a fresh projection changes source facts',async()=>{
 let reads=0;vi.stubGlobal('fetch',async()=>{const result=ready(15000);if(++reads>1)result.cards[0].sourceHash='b'.repeat(32);return Response.json(result);});await mount();check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');await vi.advanceTimersByTimeAsync(10000);expect(html()).toContain('PRIVATE E1');expect(html()).not.toContain('Reviewed approval set');expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);expect(commands).toHaveLength(0);
});
it('preserves only the original unknown command through a healthy early fresh projection',async()=>{
 let reads=0;vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards'){reads++;return Response.json(ready(15000));}commands.push(JSON.parse(String(init?.body)));throw Error('Fictional response loss');});await mount();check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();await vi.advanceTimersByTimeAsync(14000);expect(reads).toBe(2);expect(html()).toContain('Retry original attempted action');click('Retry original attempted action');await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);
});
it('does not start the deferred first read after unmount',async()=>{
 transport();render();host.mounted=true;cleanup=host.effects[0]();cleanup?.();cleanup=undefined;await flush();expect(html()).not.toContain('PRIVATE');expect(commands).toHaveLength(0);
});
// Clean Manager v3: one table with a four-figure overview. "Need review" uses the Inbox's rule (not finalized, with
// recorded time or history), each row says why in a few words, and the batch wording stays for the confirm step only.
it('counts Ready to approve as the Inbox does, names the reason on the row and keeps the legal wording for the confirm step',async()=>{
 const entry={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:'p1',positionName:'Front desk',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:null,rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:null,breaks:[]};
 const timed=card('E1');
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[{...timed,source:{...timed.source,entries:[entry]}},card('E2'),card('OWNER')]});commands.push(JSON.parse(String(init?.body)));return Response.json({status:'approved'});});
 await mount();const rendered=html();
 expect(rendered).toContain('aria-label="Period overview"');
 expect(rendered).toContain('aria-label="Ready to approve, 1"');
 expect(rendered).toContain('aria-label="Approved, 0"');
 expect(rendered).toContain('Missing clock-out');
 expect(rendered).toContain('Front desk');
 expect(rendered).not.toMatch(/Approve timecard|Finalize period/);
 expect(rendered).not.toContain('Each card commits separately');
 enterSelect();expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').disabled).toBe(true);
 // UI-9: the two people with no time yet share one row, the Role column shows because a punch names one, and the row opens in place.
 expect(rendered).toContain('2 people with no time yet');
 expect(rendered).toContain('>Role</th>');
 expect(rendered).not.toContain('Select PRIVATE E2');
 (control(n=>n.type==='button'&&n.props.className==='c-tc-idle__open').onClick as ()=>void)();
 expect(html()).not.toContain('people with no time yet');
 check('Select PRIVATE E2');click('Review selected timecards');
 expect(html()).toContain('Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.');
 expect(html()).toContain('I reviewed this exact selected set and its recorded time for approval.');
 expect(commands).toHaveLength(0);
});
it('approves from the clean detail sheet with the exact current revision and clears its private content on blur',async()=>{
 transport('unknown');await mount();
 expect(html()).not.toContain('Approve timecard');
 // UI-9: no punch names a role, so the Role column goes; no one has time yet, so nothing folds.
 expect(html()).not.toContain('>Role</th>');
 expect(html()).not.toContain('people with no time yet');
 const person=control(n=>n.type==='button'&&n.props.className==='c-tc-person');
 (person.onClick as ()=>void)();
 expect(html()).toContain('Approve timecard');
 expect(control(n=>n.type==='button'&&n.props.children==='Approve timecard').disabled).toBe(false);
 click('Approve timecard');await flush();
 expect(commands).toHaveLength(1);
 expect(commands[0]).toMatchObject({...period,employeeId:'E1',action:'APPROVE',expectedRevision:0,expectedSourceHash:'a'.repeat(32)});
 expect(html()).toContain('Retry pending action');
 window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('PRIVATE');
 expect(html()).not.toContain('Approve timecard');
 expect(html()).not.toContain('Retry pending action');
});
it('retires failed background data and offers Try again to obtain a fresh protected snapshot',async()=>{
 let reads=0;
 vi.stubGlobal('fetch',async()=>++reads===2?new Response(null,{status:503}):Response.json(ready(15000)));
 await mount();check('Select PRIVATE E1');click('Review selected timecards');
 await vi.advanceTimersByTimeAsync(10000);
 expect(html()).not.toContain('PRIVATE');
 expect(html()).not.toContain('Reviewed approval set');
 expect(html()).toContain('Couldn’t load timecards');
 expect(html()).toContain('Try again');
 (control(n=>n.props.children==='Try again').onClick as ()=>void)();
 await flush();
 expect(reads).toBe(3);
 expect(html()).toContain('PRIVATE E1');
 expect(html()).not.toContain('Try again');
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);
 expect(commands).toHaveLength(0);
});
it('offers recovery after a stalled initial read reaches its finite request deadline',async()=>{
 vi.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));
 await mount();await vi.advanceTimersByTimeAsync(45001);
 expect(html()).not.toContain('PRIVATE');
 expect(html()).toContain('Try again');
 expect(control(n=>n.props.children==='Try again').disabled).toBeFalsy();
 expect(commands).toHaveLength(0);
});

// Model the DOM identities across a refresh: native dialog restoration points at
// a detached old trigger; only a newly queried current row or the chooser is safe.
function sheetFocusFixture(){
 const target=()=>({isConnected:true,getClientRects:()=>[{}],hasAttribute:()=>false,focus:vi.fn()});
 const original=target(),replacement=target(),chooser=target();
 original.isConnected=false;
 const lookup=vi.fn(()=>({querySelector:()=>replacement}));
 Object.assign(document,{hasFocus:()=>true,getElementById:lookup});
 // Owner premium (A8): the period control is the This week / Last week segments; focus falls back to the chosen one.
 const picker=control(n=>n.type==='div'&&n.props.className==='c-seg c-tc-seg').ref as {current:unknown};
 picker.current={querySelector:()=>chooser};
 return {original,replacement,chooser,lookup};
}
// Phone-native P5: the detail is the kit's sheet. Escape, Done, a tap outside and a swipe down all close it through its
// onClose; a close because the protected read was retired is driven by `open` and never calls onClose.
function closeSheet(kind:'escape'|'done'|'automatic'='escape'){
 if(kind==='automatic')return;
 (control(n=>n.type===QuietSheet).onClose as ()=>void)();
}
function openFirstSheet(){
 (control(n=>n.type==='button'&&n.props.className==='c-tc-person').onClick as ()=>void)();
}
it.each(['escape','done'] as const)('returns focus to the replacement current row on %s after a refresh replaces the original trigger',async kind=>{
 transport();await mount();openFirstSheet();
 const focus=sheetFocusFixture();
 click('Approve timecard');await flush();
 expect(commands).toHaveLength(1);
 expect(html()).toContain('PRIVATE E1');
 closeSheet(kind);
 expect(focus.lookup).toHaveBeenCalledWith('timecard-E1');
 expect(focus.replacement.focus).toHaveBeenCalledOnce();
 expect(focus.original.focus).not.toHaveBeenCalled();
 expect(focus.chooser.focus).not.toHaveBeenCalled();
});
it('returns focus to the period chooser when Escape closes a sheet during the post-approval replacement read',async()=>{
 let reads=0,resolve!:(response:Response)=>void;
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{
  if(path==='/api/timecards')return ++reads===1?Response.json(ready()):new Promise<Response>(r=>{resolve=r;});
  const command=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(command);
  return Response.json({status:'approved',operationId:command.operationId,revision:1});
 });
 await mount();openFirstSheet();const focus=sheetFocusFixture();
 click('Approve timecard');await flush();
 expect(html()).toContain('Checking period timecards');
 expect(html()).not.toContain('PRIVATE E1');
 closeSheet();
 expect(focus.chooser.focus).toHaveBeenCalledOnce();
 expect(focus.replacement.focus).not.toHaveBeenCalled();
 expect(focus.original.focus).not.toHaveBeenCalled();
 resolve(Response.json(ready()));await flush();
 expect(html()).not.toContain('Approve timecard');
 expect(commands).toHaveLength(1);
 expect(focus.chooser.focus).toHaveBeenCalledOnce();
});
it.each(['detached','hidden'])('uses the visible period chooser instead of a %s current row',async state=>{
 transport();await mount();openFirstSheet();const focus=sheetFocusFixture();
 if(state==='detached')focus.replacement.isConnected=false;
 else focus.replacement.getClientRects=()=>[];
 closeSheet();
 expect(focus.replacement.focus).not.toHaveBeenCalled();
 expect(focus.chooser.focus).toHaveBeenCalledOnce();
});
it.each(['blur','expiry'])('does not move focus during automatic %s retirement of an open sheet',async reason=>{
 transport();await mount();openFirstSheet();const focus=sheetFocusFixture();
 if(reason==='blur')window.dispatchEvent(new Event('blur'));
 else{vi.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));await vi.advanceTimersByTimeAsync(45001);}
 expect(html()).not.toContain('PRIVATE');
 closeSheet('automatic');
 expect(focus.original.focus).not.toHaveBeenCalled();
 expect(focus.replacement.focus).not.toHaveBeenCalled();
 expect(focus.chooser.focus).not.toHaveBeenCalled();
});
it('does not restore focus after a user close is followed by window blur',async()=>{
 transport();await mount();openFirstSheet();const focus=sheetFocusFixture();
 window.dispatchEvent(new Event('blur'));
 closeSheet();
 expect(focus.replacement.focus).not.toHaveBeenCalled();
 expect(focus.chooser.focus).not.toHaveBeenCalled();
 expect(html()).not.toContain('PRIVATE');
});

// Codex review (Oct 23): phones keep the reviewed batch. Select in the top bar, the eligible cards, the exact
// reviewed set, an explicit confirmation, then each card's result, and resizing never drops any of it.
// Nov 1 upscale: Timecards now asks two media queries (phone layout and the wide-screen inspector), so every listener hears a resize.
let media:{matches:boolean;listeners:(()=>void)[]};
function phoneWindow(matches=true){media={matches,listeners:[]};vi.stubGlobal('window',Object.assign(new EventTarget(),{matchMedia:()=>({get matches(){return media.matches;},addEventListener:(_:string,l:()=>void)=>{media.listeners.push(l);},removeEventListener:()=>{}})}));}
async function mountAll(){render();host.mounted=true;const cleanups=host.effects.map(effect=>effect());cleanup=()=>cleanups.forEach(c=>{if(typeof c==='function')c();});await flush();}
const resize=(matches:boolean)=>{media.matches=matches;for(const listener of media.listeners)listener();};
it('phone: Select in the top bar opens eligible cards; self-review stays excluded with its reason',async()=>{
 phoneWindow();transport();await mountAll();
 expect(html()).toContain('c-page c-tc"');expect(html()).not.toContain('Selected timecard review');
 click('Select');const page=html();
 expect(page).toContain('Selected timecard review');expect(page).toContain('2 eligible · 1 excluded · Select up to 100 current timecards below.');
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE OWNER').disabled).toBe(true);expect(page).toContain('A different manager must review');
 expect(control(n=>n.type==='button'&&n.props.children==='Review selected timecards').disabled).toBe(true);
 check('Select all eligible timecards');expect(html()).toContain('2 selected');
});
it('phone: review the exact set, confirm explicitly, then show each card’s result',async()=>{
 phoneWindow();transport();await mountAll();click('Select');check('Select PRIVATE E1');click('Review selected timecards');
 const reviewed=html();expect(reviewed).toContain('Reviewed approval set');expect(reviewed).toContain('Revision 0');expect(reviewed).toContain('Approval never automatically finalizes time.');
 expect(reviewed).toContain('I reviewed this exact selected set and its recorded time for approval.');
 expect(control(n=>n.type==='button'&&n.props.children==='Approve selected').disabled).toBe(true);
 check('Confirm reviewed timecards');click('Approve selected');await flush();
 expect(commands).toHaveLength(1);expect(commands[0]).toMatchObject({employeeId:'E1',action:'APPROVE',expectedRevision:0});
 const done=html();expect(done).toContain('Per-card results');expect(done).toContain('approved');expect(done).toContain('Refresh timecards before reviewing another set.');
 click('Refresh timecards');await flush();expect(html()).not.toContain('Per-card results');
});
it('phone: finalization stays its own action with its own wording',async()=>{
 phoneWindow();transport();await mountAll();click('Select');
 (control(n=>n.type==='select').onChange as (e:unknown)=>void)({target:{value:'FINALIZE'}});
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').disabled).toBe(true);expect(html()).toContain('0 eligible · 3 excluded');
});
it('phone: a partial unknown result keeps not-submitted cards and retries only the original command',async()=>{
 phoneWindow();transport('unknown');await mountAll();click('Select');check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('Confirm reviewed timecards');click('Approve selected');await flush();
 expect(commands).toHaveLength(1);expect(html()).toContain('outcome unknown');expect(html()).toContain('not submitted');
 const original=commands[0];click('Retry original attempted action');await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);
});
it('resizing desktop → phone mid-review keeps the reviewed set and confirmation; phone → desktop keeps the results',async()=>{
 phoneWindow(false);transport();await mountAll();expect(html()).toContain('c-page c-tc c-tc-desk');
 check('Select PRIVATE E1');click('Review selected timecards');check('Confirm reviewed timecards');
 resize(true);const phone=html();expect(phone).toContain('c-page c-tc"');expect(phone).toContain('Reviewed approval set');
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Confirm reviewed timecards').checked).toBe(true);
 click('Approve selected');await flush();expect(commands).toHaveLength(1);
 resize(false);const desk=html();expect(desk).toContain('c-page c-tc c-tc-desk');expect(desk).toContain('Per-card results');expect(desk).toContain('approved');
});
it('phone: blur clears the selection and the reviewed private rows',async()=>{
 phoneWindow();transport();await mountAll();click('Select');check('Select PRIVATE E1');click('Review selected timecards');window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Reviewed approval set');
});

// Owner premium R10 (copy table 36–38): "In progress" only where the server's period_open issue proves the period hasn't
// ended; a Total row from the same read; Time exports and Time corrections outside the table card.
it('R10: an open period reads In progress, totals the week and keeps the tools out of the table card',async()=>{
 const entry={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:'2026-09-22T16:00:00Z',rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:'2026-09-22T16:00:00Z',breaks:[]};
 const timed=card('E1');
 vi.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-24T12:00:00Z',cards:[{...timed,source:{...timed.source,entries:[entry]}},card('E2'),card('OWNER')]}));
 await mount();const rendered=html();
 expect(rendered).toContain('In progress');
 expect(rendered).toContain('aria-label="In progress, 1"');
 expect(rendered).not.toContain('Needs review');
 expect(rendered).toMatch(/<th scope="row" data-col="person">Total<\/th>/);
 expect(rendered).toContain('8 h');
 expect(rendered).toContain('>Time exports<');expect(rendered).toContain('>Time corrections<');
 expect(rendered.indexOf('>Time exports<')).toBeGreaterThan(rendered.indexOf('</table>'));
 expect(rendered).not.toContain('c-tc-bar');
});
it('says how many ready cards have no time and shows each reviewed card’s recorded time (Codex inspection, Approve N ready)',async()=>{
 const closed={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:'p1',positionName:'Front desk',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:'2026-09-22T12:00:00Z',rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:'2026-09-22T12:00:00Z',breaks:[]};
 const timed=card('E1');
 vi.stubGlobal('fetch',async(path:string)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[{...timed,source:{...timed.source,entries:[closed]}},card('E2'),card('OWNER')]});throw Error('No command expected');});
 await mount();const mixed=html();
 expect(mixed).toContain('Approve 2 ready');
 expect(mixed).toContain('2 ready · 1 with no time');
 expect(mixed).toContain(' · 4 h recorded');
 enterSelect();check('Select all eligible timecards');click('Review selected timecards');
 const reviewed=html();
 expect(reviewed).toContain('PRIVATE E1 · 4 h recorded · Revision 0');
 expect(reviewed).toContain('PRIVATE E2 · No time · Revision 0');
 expect(commands).toEqual([]);
});
it('says “no time recorded” once when no ready card has time',async()=>{
 vi.stubGlobal('fetch',async(path:string)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[card('E1'),card('E2'),card('OWNER')]});throw Error('No command expected');});
 await mount();const rendered=html();
 expect(rendered).toContain('2 ready · no time recorded');
 expect(rendered).not.toMatch(/0 min recorded/);
});

it('separates recorded-time approval and finalization counts without treating approved cards as awaiting approval',async()=>{
 const recorded=(id:string)=>{const item=card(id);return {...item,source:{...item.source,entries:[{id:'entry-'+id,locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:'2026-09-22T09:00:00Z',rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:'2026-09-22T09:00:00Z',breaks:[]}]}};};
 const approved=recorded('APPROVED');
 const history={operationId:'22222222-2222-4222-8222-222222222222',revision:1,action:'APPROVE',occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:approved.source};
 vi.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[recorded('DRAFT'),{...approved,state:'APPROVED',revision:1,history:[history]},card('BLANK')]}));
 await mount();const rendered=html();
 expect(rendered).toContain('1 awaiting approval');expect(rendered).toContain('1 awaiting finalization');
 expect(control(n=>n.type==='button'&&n.props['aria-label']==='Needs review, 2')).toBeDefined();
 expect(rendered).toContain('PRIVATE BLANK');expect(commands).toHaveLength(0);
});
