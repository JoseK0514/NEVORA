import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import type {TimecardCommand} from '../lib/timecards/service';
const host=rs.hoisted(()=>({cursor:0,mounted:false,slots:[] as {value:unknown}[],effects:[] as (()=>void|(()=>void))[],lang:'en' as 'en'|'es'}));
rs.mock('react',()=>({...rstestOriginal0,
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
 useCallback:(callback:unknown)=>callback,
 useContext:(context:{_currentValue:unknown})=>context._currentValue,
 useEffect:(effect:()=>void|(()=>void))=>{if(!host.mounted)host.effects.push(effect);},
}));
rs.mock('./clean/top-bar-slot',()=>({useTopBarSlot:()=>null}));
rs.mock('@/lib/i18n/portal-lang',()=>({usePortalLang:()=>host.lang}));
rs.mock('next/navigation',()=>({useSearchParams:()=>null}));
import {Timecards} from './timecards';
import {QuietSheet} from './quiet/quiet-sheet';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
function card(id:string){const source={...period,employeeId:id,employeeName:`PRIVATE ${id}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]};return {source,state:'DRAFT',revision:0,sourceHash:'a'.repeat(32),history:[]};}
const ready=(validForMs=45000)=>({state:'ready',observedAt:'2026-09-29T12:00:00Z',validForMs,cards:[card('E1'),card('E2'),card('OWNER')]});
let cleanup:void|(()=>void);let commands:TimecardCommand[]=[],actorId='OWNER',manager=true,employeeCorporate=false,payrollStep:'prepare'|'owner'|undefined;
function render(){host.cursor=0;return Timecards({initialPeriod:period,manager,actorId,employeeCorporate,payrollStep});}
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
const flush=()=>rs.advanceTimersByTimeAsync(0);
// Final polish (Nov 21, 2026; confirmations review B): the commit names its count ("Approve 2 timecards"); a lost reply
// offers one action, "Check and continue" in a set's result and "Check again" elsewhere, both the same replay as before.
const isCommit=(n:ReactElement<Record<string,unknown>>)=>n.type==='button'&&/^(Approve|Finalize) \d+ timecards?$/.test(String(n.props.children));
const commit=()=>(control(isCommit).onClick as ()=>unknown)();
const retry=()=>(control(n=>n.type==='button'&&(n.props.children==='Check and continue'||n.props.children==='Check again')).onClick as ()=>unknown)();
const row=(name:string,tone:string,word:string)=>`<span class="c-tc-flow__n">${name}</span><span class="c-tc-flow__v" data-tone="${tone}">${word}</span>`;
async function mount(){render();host.mounted=true;cleanup=host.effects[0]();await flush();}
function transport(outcome:'success'|'unknown'='success',validForMs=45000){rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready(validForMs));const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);if(outcome==='unknown')throw Error('Interrupted');return Response.json({status:'approved',operationId:c.operationId,revision:1});});}
beforeEach(()=>{host.lang='en';actorId='OWNER';manager=true;employeeCorporate=false;payrollStep=undefined;host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];commands=[];rs.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});rs.stubGlobal('window',new EventTarget());rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));rs.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{cleanup?.();cleanup=undefined;rs.unstubAllGlobals();rs.useRealTimers();});
it('shows employee period information and keeps approval controls out of the employee view',async()=>{
 manager=false;employeeCorporate=true;actorId='E1';
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-27T12:00:00Z',cards:[card('E1')]}));
 await mount();
 expect(html()).toContain('Period is still open');
 expect(html()).toContain('Period information');
 expect(html()).toContain('data-tone="neutral"');
 expect(html()).toContain('Totals can change until the period closes.');
 expect(html()).not.toContain('Needs attention');
 expect(html()).not.toMatch(/Approve timecard|Approve with no hours|Finalize period|Reopen period|Selected timecard review|Select PRIVATE/);
 window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('Period is still open');
 expect(html()).not.toContain('Your timecard');
 expect(commands).toHaveLength(0);
});
it.each([401,403])('clears employee timecard rows and distinguishes HTTP%i on native refresh',async(status)=>{
 manager=false;employeeCorporate=true;actorId='E1';let denied=false;
 rs.stubGlobal('fetch',async()=>denied?new Response(null,{status}):Response.json({...ready(),cards:[card('E1')]}));
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
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-27T12:00:00Z',cards:[{...own,source}]}));
 await mount();const rendered=html();
 expect(rendered).toContain('data-tone="warning"');
 const reasons=['Period is still open','Correction awaiting review','No clock-out yet','Open break','Overlapping recorded time'];
 const positions=reasons.map(reason=>rendered.indexOf(reason));
 expect(positions.every(position=>position>=0)).toBe(true);
 expect(positions).toEqual([...positions].sort((a,b)=>a-b));
 expect(rendered).not.toMatch(/Approve timecard|Approve with no hours|Finalize period|Reopen period|Selected timecard review/);
});
it('requires explicit selection, a rendered reviewed set and fresh confirmation before approval',async()=>{
 transport();await mount();enterSelect();expect(control(n=>n.type==='button'&&n.props.children==='Review selected timecards').disabled).toBe(true);
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE OWNER').disabled).toBe(true);
 check('Select PRIVATE E1');click('Review selected timecards');expect(html()).toMatch(/Approve \d+ timecards?\?/);expect(html()).not.toContain('Revision 0');
 expect(control(n=>isCommit(n)).disabled).toBe(true);
 check('I checked these hours');commit();await flush();expect(commands).toHaveLength(1);expect(commands[0].employeeId).toBe('E1');expect(commands[0].action).toBe('APPROVE');
 expect(html()).toContain('1 timecard approved');expect(html()).toContain('See all 1');
});
it('shows partial unknown and not-submitted outcomes and retries only the original command',async()=>{
 transport('unknown');await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();
 expect(commands).toHaveLength(1);expect(html()).toContain('Not confirmed');expect(html()).toContain('Not started');
 const original=commands[0];retry();await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);
});
it('refresh clears selection and confirmation, requiring a fresh review',async()=>{
 transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');
 // The decision has one way out, Cancel: it drops the review and its confirmation and keeps the selection; Refresh then clears that too.
 click('Cancel');expect(html()).not.toMatch(/Approve \d+ timecards?\?/);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(true);
 click('Review selected timecards');expect(control(isCommit).disabled).toBe(true);click('Cancel');click('Refresh timecards');await flush();
 expect(html()).not.toMatch(/Approve \d+ timecards?\?/);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);expect(commands).toHaveLength(0);
});
it('expiry removes private reviewed rows and does not submit remaining commands after an in-flight result',async()=>{
 let resolve!:(response:Response)=>void;rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready(1000));commands.push(JSON.parse(String(init?.body)));return new Promise<Response>(r=>{resolve=r;});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();await rs.advanceTimersByTimeAsync(1001);
 expect(html()).not.toContain('PRIVATE');resolve(Response.json({status:'approved',operationId:commands[0].operationId,revision:1}));await flush();expect(commands).toHaveLength(1);expect(html()).not.toContain('PRIVATE');
});
it('window blur clears selection and reviewed private rows',async()=>{transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');window.dispatchEvent(new Event('blur'));expect(html()).not.toContain('PRIVATE');expect(html()).not.toMatch(/Approve \d+ timecards?\?/);});
it('actor replacement hides private reviewed rows and overview before the next effect can run',async()=>{transport();await mount();expect(html()).toContain('Period overview');check('Select PRIVATE E1');click('Review selected timecards');actorId='OTHER';expect(html()).not.toContain('PRIVATE');expect(html()).not.toMatch(/Approve \d+ timecards?\?/);expect(html()).not.toContain('Period overview');expect(html()).not.toContain('No timecards to show');expect(commands).toHaveLength(0);});
it('action change clears the old selected set and review instead of reusing approval confirmation',async()=>{transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');/* The step is chosen before the decision: the decision shows no step control, so Cancel comes first. */expect(has(n=>n.type==='select')).toBe(false);click('Cancel');const action=control(n=>n.type==='select');(action.onChange as (e:unknown)=>void)({target:{value:'FINALIZE'}});expect(html()).not.toMatch(/Approve \d+ timecards?\?/);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').disabled).toBe(true);expect(commands).toHaveLength(0);});
it('a denied first command clears protected data and stops before submitting the second card',async()=>{rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));return new Response(null,{status:403});});await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();expect(commands).toHaveLength(1);expect(html()).not.toContain('PRIVATE');expect(html()).not.toMatch(/Check again|Check and continue/);expect(html()).toContain('Sign in again');});
it('clears a completed batch whose source deadline passed before the expiry timer runs',async()=>{
 let resolve!:(response:Response)=>void;rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));return new Promise<Response>(r=>{resolve=r;});});
 await mount();check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');commit();await flush();
 const now=rs.spyOn(performance,'now').mockReturnValue(50000);try{resolve(Response.json({status:'approved',operationId:commands[0].operationId,revision:1}));await flush();expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('data-stage="result"');}finally{now.mockRestore();}
});
it('clears an overdue original retry before sending and retains only its exact recovery identity for a fresh protected read',async()=>{
 transport('unknown');await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();const original=commands[0];
 const now=rs.spyOn(performance,'now').mockReturnValue(50000);try{retry();await flush();expect(commands).toHaveLength(1);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('data-stage="result"');expect(html()).not.toMatch(/Check again|Check and continue/);}finally{now.mockRestore();}
 click('Refresh timecards');await flush();retry();await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);
});
it('clears private rows and stale outcomes when an original retry receipt arrives after its deadline before the timer runs',async()=>{
 let resolve!:(response:Response)=>void;rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);if(commands.length===1)throw Error('Interrupted initial attempt');if(commands.length===2)return new Promise<Response>(r=>{resolve=r;});return Response.json({status:'approved',operationId:c.operationId,revision:1});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();const original=commands[0];retry();await flush();
 const now=rs.spyOn(performance,'now').mockReturnValue(50000);try{resolve(Response.json({status:'approved',operationId:original.operationId,revision:1}));await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('data-stage="result"');expect(html()).not.toMatch(/Check again|Check and continue/);}finally{now.mockRestore();}
 click('Refresh timecards');await flush();retry();await flush();expect(commands).toHaveLength(3);expect(commands[2]).toEqual(original);
});
it.each([{status:'blocked',reason:'unresolved_time',http:409},{status:'conflict',http:409},{status:'unavailable',http:503}])('replaces the original unknown per-card result with a verified $status retry without submitting remaining cards',async({http,...result})=>{
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));if(commands.length===1)throw Error('Interrupted initial attempt');return Response.json(result,{status:http});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();expect(html()).toContain(row('PRIVATE E1','outcome-unknown','Not confirmed'));retry();await flush();
 expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(html()).toContain(row('PRIVATE E1',result.status,({blocked:'Blocked',conflict:'Changed. Review it again',unavailable:'Not available'} as Record<string,string>)[result.status]));expect(html()).not.toContain(row('PRIVATE E1','outcome-unknown','Not confirmed'));expect(html()).toContain(row('PRIVATE E2','not-submitted','Not started'));/* Phase 7: a set with any unconfirmed card never shows the success mark. */expect(html()).not.toContain('b-donemark');expect(html()).not.toMatch(/Check again|Check and continue/);
});

it('refreshes a 15-second projection early and preserves selection, confirmation and the original reviewed command',async()=>{
 let reads=0;rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards'){reads++;return Response.json({...ready(15000),observedAt:reads===1?'2026-09-29T12:00:00Z':'2026-09-29T12:00:01Z'});}commands.push(JSON.parse(String(init?.body)));throw Error('Fictional unknown result');});
 await mount();const id=rs.spyOn(crypto,'randomUUID');try{
  check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');
  await rs.advanceTimersByTimeAsync(14000);expect(reads).toBe(2);expect(html()).toMatch(/Approve \d+ timecards?\?/);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(true);expect(control(n=>n.type==='input'&&n.props['aria-label']==='I checked these hours').checked).toBe(true);
  commit();await flush();expect(commands).toHaveLength(1);expect(commands[0].operationId).toBe(id.mock.results[0].value);expect(id).toHaveBeenCalledTimes(1);
 }finally{id.mockRestore();}
});
it('keeps the old deadline armed during a single-flight replacement and never revives its late reply',async()=>{
 let reads=0,resolve!:(r:Response)=>void;rs.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):new Promise<Response>(r=>{resolve=r;}));
 await mount();check('Select PRIVATE E1');click('Review selected timecards');await rs.advanceTimersByTimeAsync(14999);expect(reads).toBe(2);expect(html()).toContain('PRIVATE E1');expect(html()).toMatch(/Approve \d+ timecards?\?/);await rs.advanceTimersByTimeAsync(2);expect(html()).not.toContain('PRIVATE');resolve(Response.json(ready(15000)));await flush();expect(html()).not.toContain('PRIVATE');expect(reads).toBe(2);
});
it('counts initial transit and JSON parsing against the supplied finite budget',async()=>{
 let resolve!:(body:unknown)=>void;rs.stubGlobal('fetch',async()=>({ok:true,status:200,json:()=>new Promise(r=>{resolve=r;})}));await mount();await rs.advanceTimersByTimeAsync(10000);resolve(ready(15000));await flush();expect(html()).toContain('PRIVATE E1');rs.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));await rs.advanceTimersByTimeAsync(5001);expect(html()).not.toContain('PRIVATE');
});
it.each([403,503,'malformed'] as const)('retires private selection and review on a replacement %s',async result=>{
 let reads=0;rs.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):result==='malformed'?Response.json({state:'ready',cards:[]}):new Response(null,{status:result}));await mount();check('Select PRIVATE E1');click('Review selected timecards');await rs.advanceTimersByTimeAsync(10000);expect(html()).not.toContain('PRIVATE');expect(html()).not.toMatch(/Approve \d+ timecards?\?/);expect(commands).toHaveLength(0);
});
it.each(['blur','pagehide'])('fences an early replacement after %s and does not poll a paused view',async event=>{
 let reads=0,resolve!:(r:Response)=>void;rs.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):new Promise<Response>(r=>{resolve=r;}));await mount();await rs.advanceTimersByTimeAsync(10000);window.dispatchEvent(new Event(event));resolve(Response.json(ready(15000)));await flush();await rs.advanceTimersByTimeAsync(31000);expect(reads).toBe(2);expect(html()).not.toContain('PRIVATE');
});
// Review B2 (NV-001; Jose, Nov 10, 2026): offline with the person still here, the loaded timecards stay read-only; the late
// replacement is still fenced out and nothing polls.
it('keeps the loaded timecards offline, fences an early replacement and does not poll',async()=>{ const event='offline';
 let reads=0,resolve!:(r:Response)=>void;rs.stubGlobal('fetch',async()=>++reads===1?Response.json(ready(15000)):new Promise<Response>(r=>{resolve=r;}));await mount();await rs.advanceTimersByTimeAsync(10000);window.dispatchEvent(new Event(event));expect(html()).toContain('PRIVATE');resolve(Response.json(ready(15000)));await flush();await rs.advanceTimersByTimeAsync(31000);expect(reads).toBe(2);expect(html()).not.toContain('PRIVATE');
});
it('clears a frozen review and selection when a fresh projection changes source facts',async()=>{
 let reads=0;rs.stubGlobal('fetch',async()=>{const result=ready(15000);if(++reads>1)result.cards[0].sourceHash='b'.repeat(32);return Response.json(result);});await mount();check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');await rs.advanceTimersByTimeAsync(10000);expect(html()).toContain('PRIVATE E1');expect(html()).not.toMatch(/Approve \d+ timecards?\?/);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').checked).toBe(false);expect(commands).toHaveLength(0);
});
it('preserves only the original unknown command through a healthy early fresh projection',async()=>{
 let reads=0;rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards'){reads++;return Response.json(ready(15000));}commands.push(JSON.parse(String(init?.body)));throw Error('Fictional response loss');});await mount();check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');commit();await flush();await rs.advanceTimersByTimeAsync(14000);expect(reads).toBe(2);expect(html()).toContain('Check and continue');retry();await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);
});
it('does not start the deferred first read after unmount',async()=>{
 transport();render();host.mounted=true;cleanup=host.effects[0]();cleanup?.();cleanup=undefined;await flush();expect(html()).not.toContain('PRIVATE');expect(commands).toHaveLength(0);
});
// Clean Manager v3: one table with a four-figure overview. "Need review" uses the Inbox's rule (not finalized, with
// recorded time or history), each row says why in a few words, and the batch wording stays for the confirm step only.
// Review B2 (NV-006): the filter is "Need review" (it counts cards with issues too), so it can't read as "Approve N ready".
it('counts Need review as the Inbox does, names the reason on the row and keeps the legal wording for the confirm step',async()=>{
 const entry={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:'p1',positionName:'Front desk',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:null,rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:null,breaks:[]};
 const timed=card('E1');
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[{...timed,source:{...timed.source,entries:[entry]}},card('E2'),card('OWNER')]});commands.push(JSON.parse(String(init?.body)));return Response.json({status:'approved'});});
 await mount();const rendered=html();
 expect(rendered).toContain('aria-label="Period overview"');
 expect(rendered).toContain('aria-label="Needs review, 1"');
 expect(rendered).toContain('aria-label="Approved, 0"');
 expect(rendered).toContain('Missing clock-out');
 expect(rendered).toContain('Front desk');
 expect(rendered).not.toMatch(/Approve timecard|Approve with no hours|Finalize period/);
 expect(rendered).not.toContain('Each card commits separately');
 enterSelect();expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').disabled).toBe(true);
 // UI-9: the two people with no time yet share one row, the Role column shows because a punch names one, and the row opens in place.
 expect(rendered).toContain('2 people with no time yet');
 expect(rendered).toContain('>Role</th>');
 expect(rendered).not.toContain('Select PRIVATE E2');
 (control(n=>n.type==='button'&&n.props.className==='c-tc-idle__open').onClick as ()=>void)();
 expect(html()).not.toContain('people with no time yet');
 check('Select PRIVATE E2');click('Review selected timecards');
 expect(html()).toContain('If something stops, the rest stay as they are.');
 expect(html()).toContain('I checked these hours');
 expect(commands).toHaveLength(0);
});
it('approves from the clean detail sheet with the exact current revision and clears its private content on blur',async()=>{
 transport('unknown');await mount();
 expect(html()).not.toContain('Approve with no hours');
 // UI-9: no punch names a role, so the Role column goes; no one has time yet, so nothing folds.
 expect(html()).not.toContain('>Role</th>');
 expect(html()).not.toContain('people with no time yet');
 const person=control(n=>n.type==='button'&&n.props.className==='c-tc-person');
 (person.onClick as ()=>void)();
 expect(html()).toContain('Approve with no hours');
 expect(control(n=>n.type==='button'&&n.props.children==='Approve with no hours').disabled).toBe(false);
 click('Approve with no hours');await flush();
 expect(commands).toHaveLength(1);
 expect(commands[0]).toMatchObject({...period,employeeId:'E1',action:'APPROVE',expectedRevision:0,expectedSourceHash:'a'.repeat(32)});
 expect(html()).toContain('Check again');
 // Review B #12: the open panel carries the one note and its one action; the list behind keeps its mode.
 expect(html().split('Check again').length).toBe(2);expect(html()).toContain('Your approval isn’t confirmed yet');expect(html()).not.toContain('Selected timecard review');
 const first=commands[0];click('Check again');await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(first);
 window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('PRIVATE');
 expect(html()).not.toContain('Approve with no hours');
 expect(html()).not.toContain('Check again');
});
it('retires failed background data and offers Try again to obtain a fresh protected snapshot',async()=>{
 let reads=0;
 rs.stubGlobal('fetch',async()=>++reads===2?new Response(null,{status:503}):Response.json(ready(15000)));
 await mount();check('Select PRIVATE E1');click('Review selected timecards');
 await rs.advanceTimersByTimeAsync(10000);
 expect(html()).not.toContain('PRIVATE');
 expect(html()).not.toMatch(/Approve \d+ timecards?\?/);
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
 rs.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));
 await mount();await rs.advanceTimersByTimeAsync(45001);
 expect(html()).not.toContain('PRIVATE');
 expect(html()).toContain('Try again');
 expect(control(n=>n.props.children==='Try again').disabled).toBeFalsy();
 expect(commands).toHaveLength(0);
});

// Model the DOM identities across a refresh: native dialog restoration points at
// a detached old trigger; only a newly queried current row or the chooser is safe.
function sheetFocusFixture(){
 const target=()=>({isConnected:true,getClientRects:()=>[{}],hasAttribute:()=>false,focus:rs.fn()});
 const original=target(),replacement=target(),chooser=target();
 original.isConnected=false;
 const lookup=rs.fn(()=>({querySelector:()=>replacement}));
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
// Signed-in Spanish (Nov 23, 2026): the manager's Timecards in Spanish on a phone and from 768px, in the person's language
// from the portal (tú, the glossary, "16–22 nov"); no English words from the screen are left.
it('renders the phone list in Spanish',async()=>{
 host.lang='es';phoneWindow();transport();await mountAll();
 const page=html();
 expect(page).toContain('>Tarjetas de tiempo<');
 expect(page).toContain('Esta semana');expect(page).toContain('Semana pasada');
 expect(page).toContain('>Equipo<');expect(page).toContain('Herramientas de tiempo');
 expect(page).not.toMatch(/>(This week|Last week|Team|Time tools|Time exports|Ready to approve|Recorded)</);
});
it('renders the wide list, the sheet and the review in Spanish',async()=>{
 host.lang='es';transport();await mount();
 const page=html();
 expect(page).toContain('Resumen del período');
 expect(page).toMatch(/>Persona<|>Registrado</);
 expect(page).not.toMatch(/>(Person|Recorded|Breaks|Status|Period overview)</);
 openFirstSheet();
 const sheet=html().slice(html().indexOf('c-tc-sheet__who'));
 expect(sheet).toContain('Días');expect(sheet).toContain('Entradas y correcciones');
 expect(sheet).not.toMatch(/>(Days|Clock-ins and fixes|Request time correction|Approve timecard)</);
});
// Jose's review (Nov 23, 2026): with a correction waiting, the sheet offers no second request and no grey Approve; one line
// says why it can't be approved yet, and the attention note sits in the person's card.
it('a waiting correction: no second request, no dead Approve, one line says why',async()=>{
 const own=card('E1');
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-27T12:00:00Z',cards:[{...own,source:{...own.source,pendingCorrections:1}}]}));
 await mount();openFirstSheet();
 const sheet=html().slice(html().indexOf('c-tc-sheet__who'));
 expect(sheet).not.toContain('Request time correction');
 expect(sheet).not.toMatch(/>Approve timecard</);
 expect(sheet).toContain('Approve after the waiting correction is reviewed.');
 const personCard=sheet.slice(0,sheet.indexOf('</section>'));
 expect(personCard).toContain('c-tc-sheet__attn');
 expect(personCard).toContain('Correction awaiting review');
});
// Jose's review (Nov 23, 2026): when Approve is the footer, "Request time correction" sits in the footer above it, so the
// sticky footer never covers it.
it('a timecard ready to approve keeps Request time correction in the footer above Approve',async()=>{
 transport();await mount();openFirstSheet();
 const page=html();const foot=page.slice(page.indexOf('c-tc-sheet__foot'));
 expect(page.indexOf('c-tc-sheet__foot')).toBeGreaterThan(-1);
 expect(foot.indexOf('Request time correction')).toBeGreaterThan(-1);
 expect(foot.search(/Approve (timecard|with no hours)/)).toBeGreaterThan(-1);
 expect(foot.indexOf('Request time correction')).toBeLessThan(foot.search(/Approve (timecard|with no hours)/));
 expect(page.slice(page.indexOf('c-tc-sheet__actions'),page.indexOf('c-tc-sheet__foot'))).not.toContain('Request time correction');
});
// Gate check (Nov 23, 2026): a person's week says a waiting correction once (in the amber note), without the header's
// "Correction waiting" and without a line on how to clear issues before approval.
it('says a timecard issue once in the person\'s week',async()=>{
 const own=card('E1');
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-27T12:00:00Z',cards:[{...own,source:{...own.source,pendingCorrections:1}}]}));
 await mount();openFirstSheet();
 const sheet=html().slice(html().indexOf('c-tc-sheet__who'));
 expect(sheet).toContain('Correction awaiting review');
 expect(sheet).not.toContain('Correction waiting');
 expect(sheet).not.toContain('Review the entries');
});
it.each(['escape','done'] as const)('returns focus to the replacement current row on %s after a refresh replaces the original trigger',async kind=>{
 transport();await mount();openFirstSheet();
 const focus=sheetFocusFixture();
 click('Approve with no hours');await flush();
 expect(commands).toHaveLength(1);
 expect(html()).toContain('PRIVATE E1');
 closeSheet(kind);
 expect(focus.lookup).toHaveBeenCalledWith('timecard-E1');
 expect(focus.replacement.focus).toHaveBeenCalledOnce();
 expect(focus.original.focus).not.toHaveBeenCalled();
 expect(focus.chooser.focus).not.toHaveBeenCalled();
});
// Review B2 (NV-029): after an approval the table stays while the fresh read runs in the background (no blank page), so
// Escape returns focus to the row the sheet came from; the fresh rows then replace it.
it('keeps the table during the post-approval replacement read and returns focus to the row on Escape',async()=>{
 let reads=0,resolve!:(response:Response)=>void;
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{
  if(path==='/api/timecards')return ++reads===1?Response.json(ready()):new Promise<Response>(r=>{resolve=r;});
  const command=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(command);
  return Response.json({status:'approved',operationId:command.operationId,revision:1});
 });
 await mount();openFirstSheet();const focus=sheetFocusFixture();
 click('Approve with no hours');await flush();
 expect(html()).not.toContain('Checking period timecards');
 expect(html()).toContain('PRIVATE E1');
 closeSheet();
 expect(focus.replacement.focus).toHaveBeenCalledOnce();
 expect(focus.chooser.focus).not.toHaveBeenCalled();
 resolve(Response.json(ready()));await flush();
 expect(html()).not.toContain('Approve with no hours');
 expect(commands).toHaveLength(1);
 expect(focus.replacement.focus).toHaveBeenCalledOnce();
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
 else{rs.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));await rs.advanceTimersByTimeAsync(45001);}
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
function phoneWindow(matches=true){media={matches,listeners:[]};rs.stubGlobal('window',Object.assign(new EventTarget(),{matchMedia:()=>({get matches(){return media.matches;},addEventListener:(_:string,l:()=>void)=>{media.listeners.push(l);},removeEventListener:()=>{}})}));}
async function mountAll(){render();host.mounted=true;const cleanups=host.effects.map(effect=>effect());cleanup=()=>cleanups.forEach(c=>{if(typeof c==='function')c();});await flush();}
const resize=(matches:boolean)=>{media.matches=matches;for(const listener of media.listeners)listener();};
// G89 (Nov 23, 2026): on phones the Team card's title carries the count, so the band doesn't also say "N people".
it('phone: the number of people is said once, in the Team card',async()=>{
 phoneWindow();transport();await mountAll();
 const band=html().match(/<header class="b-hero[\s\S]*?<\/header>/)?.[0]??html().slice(0,html().indexOf('b-tc-team'));
 expect(band).not.toMatch(/\d+ (people|person)\b/);
 expect(html()).toContain('id="b-tc-team"');
});
// Jose's review (Nov 23, 2026, "not B2 compliant"): on a phone, Select and the review are a Direction B screen (the band,
// the set's kit card, the team as kit rows with the kit checkbox); on every width the set's card is the kit card with kit
// buttons. The steps and labels are unchanged.
it('phone: Select and the review are the Direction B screen with kit rows and kit buttons',async()=>{
 phoneWindow();transport();await mountAll();click('Select');
 const page=html();
 expect(page).toContain('class="b-screen');
 expect(page).toContain('id="b-tc-title"');
 expect(page).toContain('class="b-card b-tc-flow"');
 expect(page).toContain('class="b-row b-tc-pick"');
 expect(page).not.toMatch(/c-tc-pick|class="c-rows"|class="c-card c-tc-flow"/);
 check('Select PRIVATE E1');click('Review selected timecards');
 const reviewed=html();
 expect(reviewed).toContain('class="b-row b-tc-flow__check"');
 expect(reviewed).toMatch(/<button type="button" class="b-btn b-btn--ghost"[^>]*>Cancel<\/button>/);
 expect(reviewed).toMatch(/<button type="button" class="b-btn b-btn--teal"[^>]*>Approve 1 timecard<\/button>/);
});
it('wide: the selected set is the kit card with kit buttons',async()=>{
 transport();await mount();check('Select PRIVATE E1');click('Review selected timecards');
 const reviewed=html();
 expect(reviewed).toContain('class="b-card b-tc-flow"');
 expect(reviewed).not.toContain('c-card c-tc-flow');
 expect(reviewed).toMatch(/class="b-btn b-btn--teal"[^>]*>Approve 1 timecard</);
});
it('phone: Select in the top bar opens eligible cards; self-review stays excluded with its reason',async()=>{
 phoneWindow();transport();await mountAll();
 expect(html()).toContain('c-page c-tc"');expect(html()).not.toContain('Selected timecard review');
 click('Select');const page=html();
 expect(page).toContain('Selected timecard review');expect(page).toContain('2 ready · 1 can’t be approved yet');
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE OWNER').disabled).toBe(true);expect(page).toContain('A different manager must review');
 expect(control(n=>n.type==='button'&&n.props.children==='Review selected timecards').disabled).toBe(true);
 check('Select all eligible timecards');expect(html()).toContain('2 selected');
});
it('phone: review the exact set, confirm explicitly, then show each card’s result',async()=>{
 phoneWindow();transport();await mountAll();click('Select');check('Select PRIVATE E1');click('Review selected timecards');
 const reviewed=html();expect(reviewed).toMatch(/Approve \d+ timecards?\?/);expect(reviewed).not.toContain('Revision 0');expect(reviewed).toContain('If something stops, the rest stay as they are.');
 expect(reviewed).toContain('I checked these hours');
 expect(control(n=>isCommit(n)).disabled).toBe(true);
 check('I checked these hours');commit();await flush();
 expect(commands).toHaveLength(1);expect(commands[0]).toMatchObject({employeeId:'E1',action:'APPROVE',expectedRevision:0});
 const done=html();expect(done).toContain('data-stage="result"');expect(done).toContain('1 timecard approved');expect(done).not.toContain('1 selected');
 click('Done');await flush();expect(html()).not.toContain('data-stage="result"');
});
it('phone: finalization stays its own action with its own wording',async()=>{
 phoneWindow();transport();await mountAll();click('Select');
 (control(n=>n.type==='select').onChange as (e:unknown)=>void)({target:{value:'FINALIZE'}});
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Select PRIVATE E1').disabled).toBe(true);expect(html()).toContain('0 ready · 3 can’t be finalized yet');
});
it('phone: a partial unknown result keeps not-submitted cards and retries only the original command',async()=>{
 phoneWindow();transport('unknown');await mountAll();click('Select');check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();
 expect(commands).toHaveLength(1);expect(html()).toContain('Not confirmed');expect(html()).toContain('Not started');
 const original=commands[0];retry();await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(original);
});
it('resizing desktop → phone mid-review keeps the reviewed set and confirmation; phone → desktop keeps the results',async()=>{
 phoneWindow(false);transport();await mountAll();expect(html()).toContain('c-page c-tc c-tc-desk');
 check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');
 resize(true);const phone=html();expect(phone).toContain('c-page c-tc"');expect(phone).toMatch(/Approve \d+ timecards?\?/);
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='I checked these hours').checked).toBe(true);
 commit();await flush();expect(commands).toHaveLength(1);
 resize(false);const desk=html();expect(desk).toContain('c-page c-tc c-tc-desk');expect(desk).toContain('data-stage="result"');expect(desk).toContain('approved');
});
it('phone: blur clears the selection and the reviewed private rows',async()=>{
 phoneWindow();transport();await mountAll();click('Select');check('Select PRIVATE E1');click('Review selected timecards');window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('PRIVATE');expect(html()).not.toMatch(/Approve \d+ timecards?\?/);
});

// Owner premium R10 (copy table 36–38): "In progress" only where the server's period_open issue proves the period hasn't
// ended; a Total row from the same read; Time exports and Time corrections outside the table card.
it('R10: an open period reads In progress, totals the week and keeps the tools out of the table card',async()=>{
 const entry={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:'2026-09-22T16:00:00Z',rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:'2026-09-22T16:00:00Z',breaks:[]};
 const timed=card('E1');
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),observedAt:'2026-09-24T12:00:00Z',cards:[{...timed,source:{...timed.source,entries:[entry]}},card('E2'),card('OWNER')]}));
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
 rs.stubGlobal('fetch',async(path:string)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[{...timed,source:{...timed.source,entries:[closed]}},card('E2'),card('OWNER')]});throw Error('No command expected');});
 await mount();const mixed=html();
 expect(mixed).toContain('Approve 2 ready');
 expect(mixed).toContain('2 ready · 1 with no time');
 expect(mixed).toContain(' · 4 h recorded');
 enterSelect();check('Select all eligible timecards');click('Review selected timecards');
 const reviewed=html();
 expect(reviewed).toContain('<span class="c-tc-flow__n">PRIVATE E1</span><span class="c-tc-flow__v c-num">4 h</span>');
 expect(reviewed).toContain('<span class="c-tc-flow__n">PRIVATE E2</span><span class="c-tc-flow__v c-num">No time</span>');
 expect(commands).toEqual([]);
});
it('says “no time recorded” once when no ready card has time',async()=>{
 rs.stubGlobal('fetch',async(path:string)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[card('E1'),card('E2'),card('OWNER')]});throw Error('No command expected');});
 await mount();const rendered=html();
 expect(rendered).toContain('2 ready · no time recorded');
 expect(rendered).not.toMatch(/0 min recorded/);
});

it('separates recorded-time approval and finalization counts without treating approved cards as awaiting approval',async()=>{
 const recorded=(id:string)=>{const item=card(id);return {...item,source:{...item.source,entries:[{id:'entry-'+id,locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:'2026-09-22T09:00:00Z',rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:'2026-09-22T09:00:00Z',breaks:[]}]}};};
 const approved=recorded('APPROVED');
 const history={operationId:'22222222-2222-4222-8222-222222222222',revision:1,action:'APPROVE',occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:approved.source};
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[recorded('DRAFT'),{...approved,state:'APPROVED',revision:1,history:[history]},card('BLANK')]}));
 await mount();const rendered=html();
 expect(rendered).toContain('1 to approve · 1 to finalize');
 expect(control(n=>n.type==='button'&&n.props['aria-label']==='Needs review, 2')).toBeDefined();
 // Closing F1 (NV-252): one person with no time folds into a row of its own.
 expect(rendered).toContain('1 person with no time yet');expect(commands).toHaveLength(0);
});

// Nov 14 inspection (BR-1, BR-2, AR-11 and the timecard sheet).
const worked=(id:string,minutes:number)=>{const item=card(id),endAt=new Date(Date.parse('2026-09-22T08:00:00Z')+minutes*60000).toISOString();return {...item,source:{...item.source,entries:[{id:'entry-'+id,locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt,rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:endAt,breaks:[]}]}};};
const finalized=(id:string,minutes:number)=>{const item=worked(id,minutes),step=(revision:number,action:string)=>({operationId:`2222222${revision}-2222-4222-8222-222222222222`,revision,action,occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:item.source});return {...item,state:'FINALIZED',revision:2,history:[step(2,'FINALIZE'),step(1,'APPROVE')]};};
it('BR-1: a person’s time is a row figure and the week’s total a sentence, from the same minutes',async()=>{
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[worked('E1',8*60+6),worked('E2',120),card('OWNER')]}));
 await mount();const rendered=html();
 // The kit's CorpDuration wraps each unit, so the cell's text is read without its markup.
 const text=rendered.replace(/<[^>]+>/g,'').replace(/\s+/g,' ');
 expect(text).toContain('PRIVATE E18 h 06');expect(text).toContain('PRIVATE E22 h—');expect(text).not.toContain('2 h 00');
 // Phase 8 (a.md #38): the period total in the table is whole hours; the note under it keeps the exact figure.
 expect(text).toContain('Total10 h');expect(text).not.toContain('Total10 h 6 min');expect(text).toContain('10 h 6 min recorded');
});
it('BR-2, DEC8: says the two steps where they are taken (the sheet), not on the page, and names the button for a card with hours',async()=>{
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[worked('E1',240),card('E2'),card('OWNER')]}));
 await mount();
 const steps='Approve each timecard, then finalize the week to lock it for payroll.';
 // DEC8 (Jose, Nov 23, 2026): the page's summary already reads "1 to approve · 0 to finalize", so the line isn't on the page.
 expect(html()).not.toContain(steps);expect(html()).toContain('1 to approve · 0 to finalize');
 openFirstSheet();
 const sheet=html();
 expect(sheet).toContain('Approve timecard');expect(sheet).not.toContain('Approve with no hours');
 expect(sheet).toContain('Request time correction');
 expect(sheet).toContain(steps);
});
it.each([['prepare','Prepare payroll','href="/app/payroll/prepare"'],['owner','All done. Your Owner runs payroll.',null],[undefined,'Download hours for payroll','href="/app/payroll-export?start=2026-09-21&amp;end=2026-09-27"']] as const)('AR-11: a finalized period leads on (%s)',async(step,title,link)=>{
 payrollStep=step;
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[finalized('E1',240),finalized('E2',60)]}));
 await mount();const rendered=html();
 expect(rendered).toContain('aria-label="Next step"');expect(rendered).toContain(`c-row__title--b">${title}<`);expect(rendered).toContain('Every timecard for Sep 21–27 is finalized.');expect(rendered).toContain('All 2 finalized');
 if(link)expect(rendered).toContain(link);else expect(rendered).not.toContain('/app/payroll/prepare');
 expect(rendered).not.toContain('Approve each timecard');
});
it('AR-11: no next step while a timecard is still to finalize',async()=>{
 payrollStep='prepare';
 rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[finalized('E1',240),worked('E2',60)]}));
 await mount();
 expect(html()).not.toContain('Next step');expect(html()).not.toContain('Prepare payroll');
});
it('phone: the tile names the step under way, the steps are said once and a finalized week leads on',async()=>{
 payrollStep='prepare';let cards:unknown[]=[worked('E1',8*60+6),card('E2'),card('OWNER')];
 phoneWindow();rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards}));await mountAll();
 const text=(markup:string)=>markup.replace(/<[^>]+>/g,'|').replace(/\s+/g,' ');
 const before=text(html());
 expect(before).toContain('|Approved|');expect(before).not.toContain('|Finalized|');expect(before).toContain('|Recorded|');expect(before).toContain('|8 h|');
 expect(before).not.toContain('Approve each timecard');expect(before).not.toContain('Next step');
 cards=[finalized('E1',8*60+6),finalized('E2',60)];click('This week');await flush();
 const after=html();
 expect(text(after)).toContain('|Finalized|');expect(text(after)).toContain('|Prepare payroll|');expect(after).toContain('href="/app/payroll/prepare"');
 expect(after).toContain('Every timecard for Sep 21–27 is finalized.');expect(after).not.toContain('Approve each timecard');
});

// G47 (Nov 23, 2026): a Team row on a phone is named by what it shows. No aria-label rewrites it ("Ana Colon, No time
// yet" over a row that also drew the face's initials failed axe's label-content-name-mismatch on 12 rows); the initials
// stay aria-hidden, so the spoken name starts with the person's name, then "You", the status and the hours.
it('phone (G47): each Team row is named by its visible words, with no label that rewrites them',async()=>{
 phoneWindow();rs.stubGlobal('fetch',async()=>Response.json({...ready(),cards:[worked('E1',8*60+6),card('E2'),card('OWNER')]}));await mountAll();
 const markup=html();
 const rows=[...markup.matchAll(/<button type="button" class="(?:b-row b-row--link|c-row)"([^>]*)>([\s\S]*?)<\/button>/g)];
 expect(rows.length).toBeGreaterThanOrEqual(3);
 for(const [,attrs] of rows)expect(attrs).not.toContain('aria-label');
 const spoken=(inner:string)=>inner.replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 const team=rows.filter(([,,inner])=>inner.includes('b-row__tt')).map(([,,inner])=>spoken(inner));
 expect(team).toHaveLength(3);
 expect(team).toContain('PRIVATE E2 No time yet');
 expect(team.find(name=>name.startsWith('PRIVATE OWNER'))).toBe('PRIVATE OWNER You No time yet');
 expect(team.find(name=>name.startsWith('PRIVATE E1'))).toMatch(/^PRIVATE E1 .+ 8 h 06$/);
 // The initials are drawn but never spoken.
 expect(markup).toMatch(/<span class="b-av"[^>]*aria-hidden="true">PE<\/span>/);
});

it('after an approval the reviewer moves on when they choose: Next timecard, never on a timer (Jose, Nov 15, 2026)',async()=>{
 transport();await mount();openFirstSheet();
 const focus=rs.fn();
 rs.stubGlobal('requestAnimationFrame',(callback:()=>void)=>{callback();return 0;});
 Object.assign(document,{getElementById:(id:string)=>id==='cm-tc-sheet-title'?{focus}:null});
 click('Approve with no hours');await flush();
 const saved=html();
 expect(saved).toContain('PRIVATE’s timecard is approved');
 // The next card that still needs approval, skipping the viewer's own.
 expect(saved).toContain('aria-label="Next timecard: PRIVATE E2"');
 // Nothing moves by itself.
 await rs.advanceTimersByTimeAsync(2000);
 expect(html()).toContain('PRIVATE’s timecard is approved');
 expect(focus).not.toHaveBeenCalled();
 click('Next timecard: PRIVATE E2');
 expect(html()).toContain('id="cm-tc-sheet-title" class="c-row__title c-row__title--b" tabindex="-1">PRIVATE E2<');
 expect(html()).not.toContain('Next timecard');
 expect(focus).toHaveBeenCalledOnce();
});
it('Next timecard prefers a card that can be approved now over one waiting on a correction',async()=>{
 const waiting={...card('E2'),source:{...card('E2').source,pendingCorrections:1}};
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[card('E1'),waiting,card('E3'),card('OWNER')]});const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);return Response.json({status:'approved',operationId:c.operationId,revision:1});});
 await mount();
 // The list puts the card that needs attention first: E2, E1, E3. After E3 the order wraps to E2 (waiting), then E1.
 const person=nodes(render()).find(n=>n.type==='button'&&n.props.className==='c-tc-person'&&renderToStaticMarkup(n).includes('PRIVATE E3'))!;
 (person.props.onClick as ()=>void)();
 click('Approve with no hours');await flush();
 expect(html()).toContain('aria-label="Next timecard: PRIVATE E1"');
});

// Final polish (Nov 21, 2026; confirmations review B #2, #4, #9).
it('in flight, the pressed button keeps its own label with the busy ring and nothing offers a retry',async()=>{
 let resolve!:(response:Response)=>void;rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());commands.push(JSON.parse(String(init?.body)));return new Promise<Response>(r=>{resolve=r;});});
 await mount();(control(n=>n.type==='button'&&n.props.className==='c-tc-person').onClick as ()=>void)();click('Approve with no hours');await flush();
 const flying=html();expect(commands).toHaveLength(1);expect(flying).toMatch(/aria-busy="true"[^>]*>.*Approve with no hours/);expect(flying).not.toMatch(/Check again|Retry|Saving timecard action/);/* The only "Saving…" is the page's status line for screen readers. */expect(flying).not.toContain('cm-tc-sheet__message');expect(flying.split('Saving…').length).toBe(2);
 resolve(Response.json({status:'approved',operationId:commands[0].operationId,revision:1}));await flush();
 expect(commands).toHaveLength(1);expect(html()).toContain('PRIVATE’s timecard is approved');expect(html()).not.toContain('aria-busy="true"');
});
it('a checked set keeps each card’s confirmed state on screen and sends only the original command again',async()=>{
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json(ready());const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);if(commands.length===1)throw Error('Interrupted initial attempt');return Response.json({status:'approved',operationId:c.operationId,revision:1});});
 await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();
 expect(html()).toContain('1 timecard isn’t confirmed, 1 wasn’t sent');expect(html().split('Check and continue').length).toBe(2);
 retry();await flush();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);
 const checked=html();expect(checked).toContain('data-stage="result"');expect(checked).toContain(row('PRIVATE E1','approved','Approved'));expect(checked).toContain(row('PRIVATE E2','not-submitted','Not started'));
 expect(checked).toContain('1 of 2 approved');expect(checked).not.toContain('0 selected');expect(checked).not.toMatch(/Check again|Check and continue/);expect(checked).not.toContain('b-donemark');
 // Done is today's Refresh: a fresh protected read, after which nothing of the set remains.
 click('Done');await flush();expect(html()).not.toContain('data-stage="result"');expect(commands).toHaveLength(2);
});
it('a whole confirmed set replaces the select panel: the done state, the names folded, one step',async()=>{
 transport();await mount();check('Select PRIVATE E1');check('Select PRIVATE E2');click('Review selected timecards');check('I checked these hours');commit();await flush();
 const done=html();expect(commands).toHaveLength(2);expect(done).toContain('2 timecards approved');expect(done).toContain('See all 2');expect(done).not.toMatch(/\d selected|Selected action|Review selected timecards/);
 expect(has(n=>n.type==='input'&&String(n.props['aria-label']??'').startsWith('Select PRIVATE'))).toBe(false);
});
it('the set’s result stays when a background read brings the approved rows, and goes with the protected snapshot',async()=>{
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards'){const base=ready(15000);return Response.json(commands.length?{...base,cards:base.cards.map(item=>item.source.employeeId==='E1'?{...item,state:'APPROVED',revision:1,history:[{operationId:commands[0].operationId,revision:1,action:'APPROVE',occurredAt:'2026-09-29T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:item.source}]}:item)}:base);}const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);return Response.json({status:'approved',operationId:c.operationId,revision:1});});
 await mount();check('Select PRIVATE E1');click('Review selected timecards');check('I checked these hours');commit();await flush();expect(html()).toContain('1 timecard approved');
 await rs.advanceTimersByTimeAsync(10000);const later=html();expect(later).toContain('data-stage="result"');expect(later).toContain('1 timecard approved');expect(later).not.toContain('0 selected');expect(commands).toHaveLength(1);
 window.dispatchEvent(new Event('blur'));expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('data-stage="result"');
});

// Jose (Nov 21, 2026): Finalize on a timecard asks first. "Finalize timecard" (the sheet's footer once every card is
// approved, the quiet line while others still wait) opens the question in its place; nothing is sent until its own
// "Finalize timecard", which is the one FINALIZE command the button used to send.
it.each([['footer',true],['quiet line',false]] as const)('Finalize asks first (%s): nothing is sent when the question shows or on Not yet; the commit sends the one FINALIZE',async(_where,everyoneApproved)=>{
 const {DecisionAsk}=await import('./owner-b/decision-parts');
 const approvedCard=(id:string)=>{const item=worked(id,60);return {...item,state:'APPROVED',revision:1,history:[{operationId:'22222222-2222-4222-8222-222222222222',revision:1,action:'APPROVE',occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:item.source}]};};
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[approvedCard('E1'),everyoneApproved?approvedCard('E2'):worked('E2',60)]});const c=JSON.parse(String(init?.body)) as TimecardCommand;commands.push(c);return Response.json({status:'finalized',operationId:c.operationId,revision:2});});
 await mount();
 const person=nodes(render()).find(n=>n.type==='button'&&n.props.className==='c-tc-person'&&renderToStaticMarkup(n).includes('PRIVATE E1'))!;
 (person.props.onClick as ()=>void)();
 const opener=(n:ReactElement<Record<string,unknown>>)=>n.type==='button'&&n.props.children==='Finalize timecard';
 const question=()=>nodes(render()).find(n=>n.type===DecisionAsk)?.props as undefined|{onKeep:()=>void;onGo:()=>void;tone:string};
 expect(has(opener)).toBe(true);expect(question()).toBeUndefined();expect(html()).not.toContain('Finalize PRIVATE’s timecard?');
 // The first tap opens the question where the button was. Nothing is sent.
 click('Finalize timecard');
 expect(html()).toContain('<p class="b-ask__t" tabindex="-1">Finalize PRIVATE’s timecard?</p><p class="b-ask__s">It locks this timecard for payroll. Reopening it needs a reason.</p>');
 expect(html()).toMatch(/<div class="b-ask__acts"><button type="button" class="[^"]*b-ask__keep">Not yet<\/button><button type="button" class="[^"]*b-ask__go">Finalize timecard<\/button><\/div>/);
 expect(has(opener)).toBe(false);expect(question()?.tone).toBe('commit');expect(commands).toHaveLength(0);
 // Not yet: the button is back, nothing was sent.
 question()!.onKeep();
 expect(question()).toBeUndefined();expect(has(opener)).toBe(true);expect(commands).toHaveLength(0);
 // The question's commit sends the same command the button sent, once.
 click('Finalize timecard');expect(commands).toHaveLength(0);
 question()!.onGo();await flush();
 expect(commands).toEqual([{...period,operationId:expect.any(String),employeeId:'E1',expectedRevision:1,expectedSourceHash:'a'.repeat(32),action:'FINALIZE'}]);
 expect(question()).toBeUndefined();expect(html()).toContain('PRIVATE’s timecard is finalized');
});
it('the Finalize question belongs to its card: opening another timecard drops it and sends nothing',async()=>{
 const {DecisionAsk}=await import('./owner-b/decision-parts');
 const approvedCard=(id:string)=>{const item=worked(id,60);return {...item,state:'APPROVED',revision:1,history:[{operationId:'22222222-2222-4222-8222-222222222222',revision:1,action:'APPROVE',occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:item.source}]};};
 rs.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{if(path==='/api/timecards')return Response.json({...ready(),cards:[approvedCard('E1'),approvedCard('E2')]});commands.push(JSON.parse(String(init?.body)) as TimecardCommand);return Response.json({status:'finalized'});});
 await mount();
 const open=(name:string)=>{const people=nodes(render()).filter(n=>n.type==='button'&&n.props.className==='c-tc-person');const row=people.find(n=>renderToStaticMarkup(n).includes(name));if(!row)throw Error('rows: '+people.map(n=>renderToStaticMarkup(n).replace(/<[^>]+>/g,'|')).join(' // '));(row.props.onClick as ()=>void)();};
 open('PRIVATE E1');click('Finalize timecard');expect(has(n=>n.type===DecisionAsk)).toBe(true);
 open('PRIVATE E2');
 // The question was asked for E1; E2's sheet shows its own button, not E1's question.
 expect(has(n=>n.type===DecisionAsk)).toBe(false);expect(has(n=>n.type==='button'&&n.props.children==='Finalize timecard')).toBe(true);expect(commands).toHaveLength(0);
});
