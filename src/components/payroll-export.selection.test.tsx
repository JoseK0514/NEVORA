import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const host=vi.hoisted(()=>({cursor:0,mounted:false,slots:[] as {value:unknown}[],effects:[] as (()=>void|(()=>void))[]}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
 useEffect:(effect:()=>void|(()=>void))=>{if(!host.mounted)host.effects.push(effect);},
}));
import {PayrollExport} from './payroll-export';
import {PayrollExportMapping} from './payroll-export-mapping';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
function card(id:string,finalized=true){const source={...period,employeeId:id,employeeName:`PRIVATE ${id}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]};return {source,state:finalized?'FINALIZED':'DRAFT',revision:finalized?1:0,sourceHash:'a'.repeat(32),history:finalized?[{operationId:'22222222-2222-4222-8222-222222222222',revision:1,action:'FINALIZE',occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:source}]:[]};}
let cleanup:void|(()=>void);
function render(){host.cursor=0;return PayrollExport({initialPeriod:period,actorId:'OWNER'});}
const html=()=>renderToStaticMarkup(render());
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const n=v as ReactElement<Record<string,unknown>>;if(n.type===PayrollExportMapping){const mapping=n as ReactElement<Parameters<typeof PayrollExportMapping>[0]>;return [n,...nodes(PayrollExportMapping(mapping.props))];}return [n,...nodes(n.props.children as ReactNode)];}
function labelText(value:ReactNode):string{if(typeof value==='string'||typeof value==='number')return String(value);if(Array.isArray(value))return value.map(labelText).join('');if(value&&typeof value==='object'&&'props'in value)return labelText((value as ReactElement<{children?:ReactNode}>).props.children);return '';}
const controlName=(node:ReactElement<Record<string,unknown>>)=>typeof node.props['aria-label']==='string'?node.props['aria-label']:labelText(node.props.children as ReactNode);
function control(test:(n:ReactElement<Record<string,unknown>>)=>boolean){const n=nodes(render()).find(test);if(!n)throw Error('Missing rendered control');return n.props;}
const click=(label:string)=>(control(n=>n.type==='button'&&controlName(n)===label).onClick as ()=>unknown)();
const flush=()=>vi.advanceTimersByTimeAsync(0);
async function mount(cards=[card('E1'),card('DRAFT',false)],validForMs=45000){vi.stubGlobal('fetch',async(path:string)=>path==='/api/timecards'?Response.json({state:'ready',observedAt:'2026-09-29T12:00:00Z',validForMs,cards}):Response.json({state:'ready',profiles:[]}));render();host.mounted=true;cleanup=host.effects[0]();await flush();}
beforeEach(()=>{host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});
it('deliberately selects only visible finalized cards and exposes the exclusion count',async()=>{
 await mount();expect(html()).toContain('0 selected');click('Select visible finalized timecards');expect(html()).toContain('1 selected');expect(html()).toContain('1 not finalized');
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Export PRIVATE E1').checked).toBe(true);expect(control(n=>n.type==='input'&&n.props['aria-label']==='Export PRIVATE DRAFT').checked).toBe(false);
 click('Clear employee selection');expect(html()).toContain('0 selected');
});
it('selects at most 100 visible finalized cards and explicitly reports overflow',async()=>{
 await mount(Array.from({length:101},(_,i)=>card(`E${i}`)));click('Select visible finalized timecards');expect(html()).toContain('100 selected');expect(html()).toContain('Select up to 100 people at a time.');
 expect(control(n=>n.type==='input'&&n.props['aria-label']==='Export PRIVATE E100').disabled).toBe(true);
});
it('refresh and expiry remove the convenience selection with protected private data',async()=>{
 await mount(undefined,1000);click('Select visible finalized timecards');click('Refresh export data');await flush();expect(html()).toContain('0 selected');
 click('Select visible finalized timecards');vi.stubGlobal('fetch',()=>new Promise<Response>(()=>{}));await vi.advanceTimersByTimeAsync(1001);expect(html()).not.toContain('PRIVATE');expect(html()).not.toContain('Select visible finalized timecards');
});
