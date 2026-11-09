import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

// Exercise the real inner component's effects, fetches, handlers and markup.
// Actual mounted DOM/parent refresh evidence is recorded separately.
const host=vi.hoisted(()=>({cursor:0,mounted:false,slots:[] as {value:unknown}[],effects:[] as (()=>void|(()=>void))[]}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
 useCallback:(callback:unknown)=>callback,
 useEffect:(effect:()=>void|(()=>void))=>{if(!host.mounted)host.effects.push(effect);},
}));
import {PayrollPeriodClose} from './payroll-period-close';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const operationId='22222222-2222-4222-8222-222222222222';
const original={action:'POPULATION',command:{...period,operationId,expectedRevision:0,sourceHash:'a'.repeat(64),members:[{employeeId:'PRIVATE-E1',disposition:'ZERO_TIME',reason:'Fictional reviewed zero time',employmentFacts:'Fictional employment fact',employmentBasis:'MANAGER_ATTESTED'}]}};
const view=()=>({period,sourceHash:'a'.repeat(64),population:null,members:[{employeeId:'PRIVATE-E1',name:'PRIVATE Period Worker',active:true,locationId:'L1',employmentStart:null,employmentEnd:null,employmentBasis:'UNKNOWN',cardState:'DRAFT',recordedNanoseconds:'0',breakNanoseconds:'0',hasPeriodEvidence:false,issues:[],revision:0}],manifests:[],exports:[{actorId:'OTHER',operationId,profileName:'PRIVATE Recorded batch',employeeIds:['PRIVATE-E1']}]});
const ready=()=>({state:'ready',result:view()});
let cleanup:void|(()=>void),reads=0,commands:unknown[]=[],actorId='OWNER';
const recoveryKey=`nevora-period-pending:OWNER:${period.startDate}:${period.endDate}`;
function render(){host.cursor=0;const element=PayrollPeriodClose({period,actorId});return (element.type as (props:typeof element.props)=>ReactElement)(element.props);}
const html=()=>renderToStaticMarkup(render());
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const n=v as ReactElement<Record<string,unknown>>;return [n,...nodes(n.props.children as ReactNode)];}
function control(test:(n:ReactElement<Record<string,unknown>>)=>boolean){const n=nodes(render()).find(test);if(!n)throw Error('Missing rendered control');return n.props;}
const click=(label:string)=>(control(n=>n.type==='button'&&n.props.children===label).onClick as ()=>unknown)();
const flush=()=>vi.advanceTimersByTimeAsync(0);
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
function transport(read:()=>Promise<Response>=async()=>Response.json(ready())){vi.stubGlobal('fetch',async(_path:string,init?:RequestInit)=>{const body=JSON.parse(String(init?.body));if(body.action==='READ'){reads++;return read();}commands.push(body);throw Error('Fictional interrupted command');});}
async function mount(){render();host.mounted=true;cleanup=host.effects[0]();await flush();}
beforeEach(()=>{actorId='OWNER';reads=0;commands=[];host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});vi.stubGlobal('window',Object.assign(new EventTarget(),{setTimeout,clearTimeout,setInterval,clearInterval}));vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});});
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});

it('never accepts a held READ after its 15-second request-start deadline',async()=>{
 const late=deferred<Response>();transport(()=>late.promise);await mount();await vi.advanceTimersByTimeAsync(15001);late.resolve(Response.json(ready()));await flush();expect(html()).not.toContain('PRIVATE');expect(reads).toBe(1);expect(commands).toHaveLength(0);
});
it('subtracts transit and body parsing from the conservative period budget',async()=>{
 const body=deferred<unknown>();transport(async()=>({ok:true,status:200,json:()=>body.promise}) as Response);await mount();await vi.advanceTimersByTimeAsync(10000);body.resolve(ready());await flush();expect(html()).toContain('PRIVATE Period Worker');transport(()=>new Promise<Response>(()=>{}));await vi.advanceTimersByTimeAsync(5001);expect(html()).not.toContain('PRIVATE');
});
it('refreshes early while preserving selected receipts for the same source',async()=>{
 transport();await mount();
 (control(n=>n.type==='input'&&n.props.type==='checkbox').onChange as (e:unknown)=>void)({target:{checked:true}});
 await vi.advanceTimersByTimeAsync(16000);expect(reads).toBe(2);expect(html()).toContain('PRIVATE Period Worker');expect(control(n=>n.type==='input'&&n.props.type==='checkbox').checked).toBe(true);expect(commands).toHaveLength(0);
});
it('keeps the original expiry armed while one replacement is pending and discards a late result',async()=>{
 const late=deferred<Response>();transport(async()=>reads===1?Response.json(ready()):late.promise);await mount();await vi.advanceTimersByTimeAsync(14999);expect(reads).toBe(2);expect(html()).toContain('PRIVATE');await vi.advanceTimersByTimeAsync(2);expect(html()).not.toContain('PRIVATE');late.resolve(Response.json(ready()));await flush();expect(html()).not.toContain('PRIVATE');expect(reads).toBe(2);
});
it.each([403,503,'malformed','wrong-period'] as const)('retires the view after a replacement %s',async result=>{
 transport(async()=>{if(reads===1)return Response.json(ready());if(result==='malformed')return Response.json({state:'ready',result:{}});if(result==='wrong-period'){const body=ready();body.result.period={startDate:'2026-09-28',endDate:'2026-10-04'};return Response.json(body);}return new Response(null,{status:result});});await mount();await vi.advanceTimersByTimeAsync(10000);expect(html()).not.toContain('PRIVATE');expect(commands).toHaveLength(0);
});
it.each(['blur','offline','pagehide','hidden'])('%s retires private population and fences a pending reply without paused polling',async event=>{
 const late=deferred<Response>();transport(async()=>reads===1?Response.json(ready()):late.promise);await mount();await vi.advanceTimersByTimeAsync(10000);if(event==='hidden'){Object.assign(document,{visibilityState:'hidden'});document.dispatchEvent(new Event('visibilitychange'));}else window.dispatchEvent(new Event(event));late.resolve(Response.json(ready()));await flush();await vi.advanceTimersByTimeAsync(31000);expect(reads).toBe(2);expect(html()).not.toContain('PRIVATE');
});
it('requires a new READ on return focus and does not restore the old selection',async()=>{
 transport();await mount();(control(n=>n.type==='input'&&n.props.type==='checkbox').onChange as (e:unknown)=>void)({target:{checked:true}});window.dispatchEvent(new Event('blur'));expect(html()).not.toContain('PRIVATE');window.dispatchEvent(new Event('focus'));await flush();expect(reads).toBe(2);expect(html()).toContain('PRIVATE');expect(control(n=>n.type==='input'&&n.props.type==='checkbox').checked).toBe(false);
});
it('source changes reset selected receipts',async()=>{
 transport(async()=>{const body=ready();if(reads>1)body.result.sourceHash='b'.repeat(64);return Response.json(body);});await mount();(control(n=>n.type==='input'&&n.props.type==='checkbox').onChange as (e:unknown)=>void)({target:{checked:true}});await vi.advanceTimersByTimeAsync(10000);expect(html()).toContain('PRIVATE');expect(control(n=>n.type==='input'&&n.props.type==='checkbox').checked).toBe(false);
});
it('healthy early refresh and pause/recovery retain only the exact original unknown command',async()=>{
 localStorage.setItem(recoveryKey,JSON.stringify(original));transport();await mount();click('Retry original period command');await flush();await vi.advanceTimersByTimeAsync(10000);expect(reads).toBe(2);expect(html()).toContain('Retry original period command');window.dispatchEvent(new Event('blur'));expect(html()).not.toContain('PRIVATE');expect(control(n=>n.type==='button'&&n.props.children==='Retry original period command').disabled).toBe(true);window.dispatchEvent(new Event('focus'));await flush();click('Retry original period command');await flush();expect(commands).toEqual([original,original]);expect(JSON.parse(localStorage.getItem(recoveryKey)!)).toEqual(original);
});
it('stale in-flight command results cannot revive data or delete the original recovery identity',async()=>{
 const commandReply=deferred<Response>();localStorage.setItem(recoveryKey,JSON.stringify(original));vi.stubGlobal('fetch',async(_path:string,init?:RequestInit)=>{const body=JSON.parse(String(init?.body));if(body.action==='READ'){reads++;return Response.json(ready());}commands.push(body);return commandReply.promise;});await mount();click('Retry original period command');await flush();await vi.advanceTimersByTimeAsync(15001);expect(html()).not.toContain('PRIVATE');commandReply.resolve(Response.json({state:'ready'}));await flush();expect(html()).not.toContain('PRIVATE');expect(JSON.parse(localStorage.getItem(recoveryKey)!)).toEqual(original);expect(commands).toEqual([original]);
});
it('unmount cancels the deferred first read',async()=>{
 transport();render();host.mounted=true;cleanup=host.effects[0]();cleanup?.();cleanup=undefined;await flush();expect(reads).toBe(0);expect(html()).not.toContain('PRIVATE');
});
