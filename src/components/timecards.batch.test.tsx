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
import {Timecards} from './timecards';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
function card(id:string){const source={...period,employeeId:id,employeeName:`PRIVATE ${id}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]};return {source,state:'DRAFT',revision:0,sourceHash:'a'.repeat(32),history:[]};}
const ready=(validForMs=45000)=>({state:'ready',observedAt:'2026-09-29T12:00:00Z',validForMs,cards:[card('E1'),card('E2'),card('OWNER')]});
let cleanup:void|(()=>void);let commands:TimecardCommand[]=[],actorId='OWNER',manager=true,employeeCorporate=false;
function render(){host.cursor=0;return Timecards({initialPeriod:period,manager,actorId,employeeCorporate});}
const html=()=>renderToStaticMarkup(render());
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const n=v as ReactElement<Record<string,unknown>>;return [n,...nodes(n.props.children as ReactNode)];}
function control(test:(n:ReactElement<Record<string,unknown>>)=>boolean){const n=nodes(render()).find(test);if(!n)throw Error('Missing rendered control');return n.props;}
const click=(label:string)=>(control(n=>n.type==='button'&&n.props.children===label).onClick as ()=>unknown)();
const check=(label:string,value=true)=>(control(n=>n.type==='input'&&n.props['aria-label']===label).onChange as (e:unknown)=>void)({target:{checked:value}});
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
 expect(html()).toContain('Request corrections in My Time.');
 expect(html()).not.toMatch(/Approve timecard|Finalize period|Reopen period|Selected timecard review|Select PRIVATE/);
 window.dispatchEvent(new Event('blur'));
 expect(html()).not.toContain('Period is still open');
 expect(html()).not.toContain('Your timecard');
 expect(commands).toHaveLength(0);
});
it('clears employee timecard rows after access denial on the native refresh control',async()=>{
 manager=false;employeeCorporate=true;actorId='E1';let denied=false;
 vi.stubGlobal('fetch',async()=>denied?new Response(null,{status:403}):Response.json({...ready(),cards:[card('E1')]}));
 await mount();expect(html()).toContain('Your timecard');
 denied=true;
 (control(n=>n.type==='button'&&n.props['aria-label']==='Refresh timecards').onClick as ()=>unknown)();
 await flush();expect(html()).toContain('Sign in again to view your timecards.');
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
 const reasons=['Period is still open','Correction awaiting review','Missing clock out','Open break','Overlapping recorded time'];
 const positions=reasons.map(reason=>rendered.indexOf(reason));
 expect(positions.every(position=>position>=0)).toBe(true);
 expect(positions).toEqual([...positions].sort((a,b)=>a-b));
 expect(rendered).not.toMatch(/Approve timecard|Finalize period|Reopen period|Selected timecard review/);
});
it('requires explicit selection, a rendered reviewed set and fresh confirmation before approval',async()=>{
 transport();await mount();expect(control(n=>n.type==='button'&&n.props.children==='Review selected timecards').disabled).toBe(true);
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
