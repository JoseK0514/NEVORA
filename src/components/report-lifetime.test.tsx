import {createElement,type ComponentProps,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

// Actual Reports/ReportsView effects, handlers, parser and rendered output run
// with a scheduling host and controlled HTTP/browser primitives. Print event
// sequences below are synthetic: they do not establish native dialog ordering.
type Slot={value?:unknown;deps?:readonly unknown[];pending?:()=>void|(()=>void);cleanup?:()=>void};
type Frame={cursor:number;slots:Slot[]};
const host=vi.hoisted(()=>({scope:'reports' as 'reports'|'view',frames:{reports:{cursor:0,slots:[]} as Frame,view:{cursor:0,slots:[]} as Frame},writes:[] as {scope:string;slot:number;value:unknown}[],content:null as unknown}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useState:(initial:unknown)=>{const scope=host.scope,frame=host.frames[scope],index=frame.cursor++;const slot=frame.slots[index]??(frame.slots[index]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;host.writes.push({scope,slot:index,value:slot.value});}];},
 useRef:(initial:unknown)=>{const frame=host.frames[host.scope],index=frame.cursor++;const slot=frame.slots[index]??(frame.slots[index]={value:{current:initial}});if(host.scope==='view')(slot.value as {current:unknown}).current=host.content;return slot.value;},
 useEffect:(effect:()=>void|(()=>void),deps?:readonly unknown[])=>{const frame=host.frames[host.scope],index=frame.cursor++,old=frame.slots[index];if(!old||!deps||!old.deps||deps.length!==old.deps.length||deps.some((value,i)=>!Object.is(value,old.deps![i]))){const slot=old??(frame.slots[index]={});slot.deps=deps;slot.pending=effect;}},
}));
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
import {Reports,ReportsView} from './reports';

const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const nextPeriod={startDate:'2026-09-28',endDate:'2026-10-04'};
const originalName='PRIVATE Original Employee',freshName='PRIVATE Fresh Employee';
const sections=['Period summary','Scheduled vs recorded','Hours by employee','Hours by location','Hours by position','Clock-in notes','Overtime','Time off and callouts','Shift changes &amp; coverage','Schedule stability','Approval status','Report definitions'];
function ready(name=originalName,validForMs=15000,p=period){
 const day=p.startDate==='2026-09-21'?'2026-09-22':'2026-09-29';
 const source={employeeId:'E1',employeeName:name,timeZone:'America/Puerto_Rico',...p,pendingCorrections:0,corrections:[],entries:[{id:'T1',locationId:'L1',locationName:'PRIVATE Office',positionId:'P1',positionName:'PRIVATE Captured Support',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:day+'T12:00:00Z',endAt:day+'T20:00:00Z',rawStartAt:day+'T12:00:00Z',rawEndAt:day+'T20:00:00Z',breaks:[]}]};
 return {state:'ready',validForMs,source:{workspaceId:'W1',timeZone:'America/Puerto_Rico',observedAt:'2026-10-05T12:00:00Z',period:p,cards:[{source,sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]}],schedules:[],requests:[],changes:[{id:'C1',requestId:'X1',requestKind:'EXCHANGE',eventKind:'COMPLETED',requestRevision:1,createdAt:day+'T21:00:00Z',sourceDate:day,employeeId:'E1',outcomeMode:'AUTOMATIC',kind:'COVERAGE'}],publications:[],attendanceSources:[],publishedWeeks:p.startDate==='2026-09-21'?['2026-09-14','2026-09-21']:['2026-09-21','2026-09-28']}};
}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return {promise,resolve};}
function bodyResponse(body:Promise<unknown>){return {status:200,ok:true,json:()=>body} as Response;}
function nodes(value:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(value))return value.flatMap(nodes);if(!value||typeof value!=='object'||!('props'in value))return [];const node=value as ReactElement<Record<string,unknown>>;return [node,...nodes(node.props.children as ReactNode)];}
function tree(){host.scope='reports';host.frames.reports.cursor=0;return Reports({initialPeriod:period});}
function commit(scope:'reports'|'view'){for(const slot of host.frames[scope].slots){if(!slot.pending)continue;slot.cleanup?.();const effect=slot.pending;slot.pending=undefined;const cleanup=effect();slot.cleanup=typeof cleanup==='function'?cleanup:undefined;}}
let focused=true;
let details:{open:boolean}[],media:EventTarget&{matches:boolean},downloaded:{name:string;blob:Blob}[],urls:Blob[];
function html(){const root=tree(),view=nodes(root).find(node=>node.type===ReportsView)!;host.scope='view';host.frames.view.cursor=0;host.content=view.props.report?{querySelectorAll:()=>details}:null;const output=renderToStaticMarkup(root).replaceAll('\u00a0',' ');commit('view');return output;}
function control(predicate:(node:ReactElement<Record<string,unknown>>)=>boolean){const node=nodes(tree()).find(predicate);if(!node)throw Error('Missing actual rendered control');return node.props;}
function button(label:string){return control(node=>node.type==='button'&&(node.props['aria-label']===label||node.props.children===label));}
function click(label:string){(button(label).onClick as ()=>void)();}
async function flush(){await vi.advanceTimersByTimeAsync(0);return html();}
async function mount(){html();commit('reports');await flush();}
function unmount(){for(const scope of ['reports','view'] as const)for(const slot of host.frames[scope].slots){slot.cleanup?.();slot.cleanup=undefined;slot.pending=undefined;}}
function event(type:string,target:unknown=window){if(target===window&&type==='blur')focused=false;if(target===window&&type==='focus')focused=true;const value=new Event(type);if(target!==window)Object.defineProperty(value,'target',{value:target});window.dispatchEvent(value);}
function printMedia(matches:boolean){media.matches=matches;media.dispatchEvent(new Event('change'));}
function retire(kind:string){if(kind==='hidden'){Object.assign(document,{visibilityState:'hidden'});document.dispatchEvent(new Event('visibilitychange'));}else{if(kind==='offline')Object.assign(navigator,{onLine:false});event(kind);}}
function choosePeriod(p:typeof period){for(const [index,date]of [p.startDate,p.endDate].entries()){const input=nodes(tree()).filter(node=>node.type==='input'&&node.props.type==='date')[index];(input.props.onChange as (value:unknown)=>void)({target:{value:date}});}const form=control(node=>node.type==='form');(form.onSubmit as (value:unknown)=>void)({preventDefault(){}});html();commit('reports');}
function reads(name=originalName,validForMs=15000){const requested:{path:string;body:unknown;signal:AbortSignal|null|undefined}[]=[];vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{requested.push({path,body:init?.body?JSON.parse(String(init.body)):null,signal:init?.signal});if(path!=='/api/reports')throw Error('Unexpected transport path');return Response.json(ready(name,validForMs));});return requested;}
function assertProtectedAbsent(){const output=html();expect(output).not.toContain('PRIVATE');expect(output).not.toContain('Period summary');expect(button('Download CSV').disabled).toBe(true);expect(button('Print / Save PDF').disabled).toBe(true);}

beforeEach(()=>{focused=true;host.scope='reports';host.frames={reports:{cursor:0,slots:[]},view:{cursor:0,slots:[]}};host.writes=[];host.content=null;details=[{open:false},{open:true}];media=Object.assign(new EventTarget(),{matches:false});downloaded=[];urls=[];vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});vi.stubGlobal('window',Object.assign(new EventTarget(),{matchMedia:()=>media,print:()=>{}}));vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>focused,createElement:()=>({href:'',download:'',click(){downloaded.push({name:this.download,blob:urls.at(-1)!});}})}));vi.stubGlobal('navigator',{onLine:true});vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{urls.push(blob as Blob);return 'blob:fictional-report';});vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});});
afterEach(()=>{unmount();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

it('R01 true non-print window blur removes names totals and export controls without losing period filters',async()=>{const requests=reads();await mount();expect(html()).toContain(originalName);expect(html()).toContain('8h');event('blur');assertProtectedAbsent();expect(nodes(tree()).filter(node=>node.type==='input').map(node=>node.props.value)).toEqual(['2026-09-21','2026-09-27']);expect(requests).toHaveLength(1);expect(requests[0].signal?.aborted).toBe(true);});
it('R02 element blur and duplicate active focus do not retire a current report or trigger a replacement read',async()=>{const requests=reads();await mount();event('blur',new EventTarget());event('focus',new EventTarget());event('focus');await flush();expect(html()).toContain(originalName);expect(requests).toHaveLength(1);});
it('R03 a delayed JSON body after window blur cannot restore protected content or an expiry timer',async()=>{const body=deferred<unknown>();vi.stubGlobal('fetch',async()=>bodyResponse(body.promise));await mount();event('blur');body.resolve(ready());await flush();assertProtectedAbsent();expect(vi.getTimerCount()).toBe(0);});
it('R04 an old period body cannot overwrite the fresh committed period',async()=>{const old=deferred<unknown>();const requests:unknown[]=[];vi.stubGlobal('fetch',async(_path:string,init?:RequestInit)=>{const requested=JSON.parse(String(init?.body));requests.push(requested);return requested.startDate==='2026-09-21'?bodyResponse(old.promise):Response.json(ready(freshName,15000,nextPeriod));});await mount();choosePeriod(nextPeriod);await flush();expect(html()).toContain(freshName);old.resolve(ready());await flush();expect(html()).toContain(freshName);expect(html()).not.toContain(originalName);expect(html()).toContain('Sep 28 – Oct 4, 2026');expect(requests).toEqual([period,nextPeriod]);});
it('R04 a retired refresh body cannot replace a newer verified source',async()=>{const old=deferred<unknown>();let count=0;vi.stubGlobal('fetch',async()=>++count===1?bodyResponse(old.promise):Response.json(ready(freshName)));await mount();click('Refresh');await flush();expect(html()).toContain(freshName);old.resolve(ready());await flush();expect(html()).toContain(freshName);expect(html()).not.toContain(originalName);});
it('R05 cleanup fences a pending body without post-unmount state publication or timers',async()=>{const body=deferred<unknown>();vi.stubGlobal('fetch',async()=>bodyResponse(body.promise));await mount();unmount();const writes=host.writes.length;body.resolve(ready());await vi.advanceTimersByTimeAsync(0);expect(host.writes).toHaveLength(writes);expect(vi.getTimerCount()).toBe(0);});
it.each(['pagehide','hidden','offline'])('R06 %s retires an already received response whose JSON is pending',async kind=>{const body=deferred<unknown>();vi.stubGlobal('fetch',async()=>bodyResponse(body.promise));await mount();retire(kind);body.resolve(ready());await flush();assertProtectedAbsent();expect(vi.getTimerCount()).toBe(0);});
it.each(['pageshow','visible','online'])('R06 %s re-entry requests a fresh report rather than restoring old content',async kind=>{reads();await mount();retire(kind==='pageshow'?'pagehide':kind==='visible'?'hidden':'offline');assertProtectedAbsent();const body=deferred<unknown>();const requested:unknown[]=[];vi.stubGlobal('fetch',async(_path:string,init?:RequestInit)=>{requested.push(JSON.parse(String(init?.body)));return bodyResponse(body.promise);});if(kind==='visible'){Object.assign(document,{visibilityState:'visible'});document.dispatchEvent(new Event('visibilitychange'));}else{Object.assign(navigator,{onLine:true});event(kind);}await flush();assertProtectedAbsent();body.resolve(ready(freshName));await flush();expect(html()).toContain(freshName);expect(html()).not.toContain(originalName);expect(requested).toEqual([period]);});
it('R07 returning focus leaves the paused report empty until a fresh authorized body is verified',async()=>{reads();await mount();event('blur');const body=deferred<unknown>();vi.stubGlobal('fetch',async()=>bodyResponse(body.promise));event('focus');await flush();assertProtectedAbsent();body.resolve(ready(freshName));await flush();expect(html()).toContain(freshName);expect(html()).not.toContain(originalName);});
it.each([401,403])('R07 HTTP %s on focus return ends access without old content or enabled exports',async status=>{reads();await mount();event('blur');vi.stubGlobal('fetch',async()=>new Response(null,{status}));event('focus');await flush();assertProtectedAbsent();expect(html()).toContain('Insights access ended');});
it('R08 body parsing consumes the original source lifetime instead of restarting it',async()=>{const body=deferred<unknown>();let calls=0;vi.stubGlobal('fetch',async()=>++calls===1?bodyResponse(body.promise):new Promise<Response>(()=>{}));await mount();await vi.advanceTimersByTimeAsync(800);body.resolve(ready(originalName,1000));await flush();expect(html()).toContain(originalName);await vi.advanceTimersByTimeAsync(201);assertProtectedAbsent();});
it('R08 a JSON body arriving after its original deadline is never admitted',async()=>{const body=deferred<unknown>();vi.stubGlobal('fetch',async()=>bodyResponse(body.promise));await mount();await vi.advanceTimersByTimeAsync(1001);body.resolve(ready(originalName,1000));await flush();assertProtectedAbsent();});
it.each([undefined,0,-1,15001,Infinity,'1000'])('R08 invalid source lifetime %s fails closed',async validForMs=>{vi.stubGlobal('fetch',async()=>Response.json({...ready(),validForMs}));await mount();assertProtectedAbsent();});
it('R08 print does not extend expiry or revive an expired report if its end event is missing',async()=>{reads(originalName,1000);await mount();event('beforeprint');event('blur');vi.stubGlobal('fetch',async()=>new Promise<Response>(()=>{}));await vi.advanceTimersByTimeAsync(1001);assertProtectedAbsent();event('afterprint');event('blur');assertProtectedAbsent();});
it('R09 beforeprint and dialog blur preserve a still-current report until completion then focus revalidates',async()=>{reads();await mount();event('beforeprint');event('blur');event('focus');await flush();expect(html()).toContain(originalName);for(const section of sections)expect(html()).toContain(section);expect(details.map(detail=>detail.open)).toEqual([true,true]);event('afterprint');expect(details.map(detail=>detail.open)).toEqual([false,true]);vi.stubGlobal('fetch',async()=>Response.json(ready(freshName)));event('focus');await flush();expect(html()).toContain(freshName);expect(html()).not.toContain(originalName);event('blur');assertProtectedAbsent();});
it.each(['blur-first','beforeprint-first'])('R10 actual print button preserves output for synthetic %s ordering and releases ordinary blur afterwards',async ordering=>{reads();await mount();let output='';Object.assign(window,{print:()=>{if(ordering==='blur-first'){event('blur');event('beforeprint');}else{event('beforeprint');event('blur');}output=html();event('afterprint');}});click('Print / Save PDF');expect(output).toContain(originalName);for(const section of sections)expect(output).toContain(section);expect(details.map(detail=>detail.open)).toEqual([false,true]);event('blur');assertProtectedAbsent();});
it.each(['immediate-return','throw'])('R10 %s from print invocation leaves no permanent privacy exemption',async outcome=>{reads();await mount();Object.assign(window,{print:()=>{if(outcome==='throw')throw Error('Fictional print cancelled');}});try{click('Print / Save PDF');}catch(error){expect((error as Error).message).toBe('Fictional print cancelled');}event('blur');assertProtectedAbsent();});
it('R11 repeated print signals expand real view disclosures without overwriting their original open state',async()=>{reads();await mount();expect(details.map(detail=>detail.open)).toEqual([false,true]);event('beforeprint');printMedia(true);event('beforeprint');expect(details.map(detail=>detail.open)).toEqual([true,true]);event('afterprint');printMedia(false);expect(details.map(detail=>detail.open)).toEqual([false,true]);expect(html()).toMatch(/As of <time datetime="2026-10-05T12:00:00Z">Oct 5, 2026, 8:00\sAM<\/time>/i);expect(html()).toContain('Actual time uses D2 canonical effective entries and breaks');});
it('R11 unmount restores disclosure state and removes real print handlers',async()=>{reads();await mount();event('beforeprint');expect(details.map(detail=>detail.open)).toEqual([true,true]);unmount();expect(details.map(detail=>detail.open)).toEqual([false,true]);event('beforeprint');expect(details.map(detail=>detail.open)).toEqual([false,true]);});
it('R12 print media entry preserves the report through dialog blur and media exit restores normal lifetime',async()=>{reads();await mount();printMedia(true);event('blur');expect(html()).toContain(originalName);expect(details.map(detail=>detail.open)).toEqual([true,true]);printMedia(false);expect(details.map(detail=>detail.open)).toEqual([false,true]);vi.stubGlobal('fetch',async()=>Response.json(ready(freshName)));event('focus');await flush();expect(html()).toContain(freshName);event('blur');assertProtectedAbsent();});
it.each(['pagehide','hidden','offline'])('R12 genuine %s still clears during a synthetic print phase',async kind=>{reads();await mount();event('beforeprint');retire(kind);assertProtectedAbsent();event('afterprint');assertProtectedAbsent();});
it.each(['blur','pagehide','unmount','period'])('R13 %s retires an export blob before any download side effect',async kind=>{reads();await mount();const body=deferred<Blob>();vi.stubGlobal('fetch',async()=>({status:200,ok:true,headers:new Headers({'content-type':'text/csv;charset=utf-8'}),blob:()=>body.promise}) as Response);click('Download CSV');await flush();if(kind==='unmount')unmount();else if(kind==='period'){vi.stubGlobal('fetch',async()=>new Promise<Response>(()=>{}));choosePeriod(nextPeriod);}else retire(kind);body.resolve(new Blob(['"private","old export"\r\n'],{type:'text/csv'}));await flush();expect(urls).toHaveLength(0);expect(downloaded).toHaveLength(0);});
it('R13 a current export downloads the verified literal CSV with the committed period filename',async()=>{reads();await mount();vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{expect(path).toBe('/api/reports/export');expect(JSON.parse(String(init?.body))).toEqual(period);return new Response('"employee","hours"\r\n"PRIVATE Original Employee","8"\r\n',{headers:{'content-type':'text/csv;charset=utf-8'}});});click('Download CSV');await flush();expect(downloaded).toHaveLength(1);expect(downloaded[0].name).toBe('nevora-reports-2026-09-21-2026-09-27.csv');expect(await downloaded[0].blob.text()).toBe('"employee","hours"\r\n"PRIVATE Original Employee","8"\r\n');});

it('R12 account storage during print retires protected content before a fresh authorized body',async()=>{const initial=reads();await mount();event('beforeprint');const body=deferred<unknown>(),requests:unknown[]=[];vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{expect(path).toBe('/api/reports');requests.push(JSON.parse(String(init?.body)));return bodyResponse(body.promise);});event('storage');await flush();assertProtectedAbsent();expect(initial[0].signal?.aborted).toBe(true);expect(requests).toEqual([period]);event('afterprint');assertProtectedAbsent();body.resolve({state:'unavailable'});await flush();assertProtectedAbsent();vi.stubGlobal('fetch',async()=>new Response(null,{status:403}));click('Refresh');await flush();assertProtectedAbsent();expect(html()).toContain('Insights access ended');});
it('R13 an export body beyond the monotonic deadline cannot download before the expiry timer dispatches',async()=>{reads(originalName,1000);await mount();const body=deferred<Blob>();vi.stubGlobal('fetch',async()=>({status:200,ok:true,headers:new Headers({'content-type':'text/csv;charset=utf-8'}),blob:()=>body.promise}) as Response);click('Download CSV');await flush();expect(vi.getTimerCount()).toBe(1);vi.spyOn(performance,'now').mockReturnValue(1001);expect(performance.now()).toBe(1001);body.resolve(new Blob(['"private","expired export"\r\n'],{type:'text/csv'}));await flush();expect(urls).toHaveLength(0);expect(downloaded).toHaveLength(0);});

it('R14 section shortcuts resolve to visible report groups while every report section stays rendered',async()=>{
 reads();await mount();const output=html();
 for(const section of sections)expect(output).toContain(section);
 for(const target of ['hours','attendance','changes','approvals']){
  expect(output).toContain(`href="#report-${target}"`);
  expect(output).toContain(`id="report-${target}" tabindex="-1"`);
 }
 expect(output.match(/role="table"/g)).toHaveLength(4);
 expect(output).toContain('role="rowheader"');
 expect(output).toContain('aria-hidden="true">Published plan</span>');
 expect(output).toContain('href="/app/timecards?start=2026-09-21&amp;end=2026-09-27"');
});

it('R14 section shortcuts and report groups retire with protected content on window blur',async()=>{
 reads();await mount();event('blur');assertProtectedAbsent();const output=html();
 expect(output).not.toContain('aria-label="Report sections"');
 expect(output).not.toContain('id="report-hours"');
 expect(output).toContain('Applied period');
});

it('R15 draft dates show explicit unapplied guidance and do not silently change the CSV period',async()=>{
 const requests=reads();await mount();
 const input=control(node=>node.type==='input'&&node.props.value===period.startDate);
 (input.onChange as (event:unknown)=>void)({target:{value:nextPeriod.startDate}});
 const output=html();expect(output).toContain('Dates changed. Select View period to apply.');
 expect(output).toContain('Applied period</span>Sep 21 – Sep 27, 2026');
 expect(requests).toHaveLength(1);
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{
  expect(path).toBe('/api/reports/export');expect(JSON.parse(String(init?.body))).toEqual(period);
  return new Response('"fictional","8"',{headers:{'content-type':'text/csv'}});
 });
 click('Download CSV');await flush();expect(downloaded[0].name).toBe('nevora-reports-2026-09-21-2026-09-27.csv');
});

it('R15 invalid period submission preserves the applied range and does not issue another report request',async()=>{
 const requests=reads();await mount();choosePeriod({startDate:'2026-09-21',endDate:'2026-11-07'});
 const output=html();expect(output).toContain('Choose a valid period of 1 to 31 days.');
 expect(output).toContain('Applied period</span>Sep 21 – Sep 27, 2026');
 expect(requests).toHaveLength(1);expect(output).toContain(originalName);
});
