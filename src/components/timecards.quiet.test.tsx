import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const host=vi.hoisted(()=>({cursor:0,mounted:false,slots:[] as {value:unknown}[],effects:[] as (()=>void|(()=>void))[]}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
 useCallback:(callback:unknown)=>callback,
 useEffect:(effect:()=>void|(()=>void))=>{if(!host.mounted)host.effects.push(effect);},
}));
vi.mock('./clean/top-bar-slot',()=>({useTopBarSlot:()=>null}));
import {Timecards} from './timecards';

/* Final pass (Oct 25, 2026), Team U4: T-12 timecard sheet with the correction decided in place (UX-O-30), and
 * business P0-3 (Worked is paid time; breaks shown separately) on the Owner sheet and the Employee Quiet view. */
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const REQUEST='3f1c2a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const meal={id:'break-1',name:'Meal',startAt:'2026-09-22T16:00:00Z',endAt:'2026-09-22T17:00:00Z',rawStartAt:'2026-09-22T16:00:00Z',rawEndAt:'2026-09-22T17:00:00Z',adjustmentId:null};
// 8:00 AM – 6:00 PM in Puerto Rico (UTC-4) with a one-hour meal: 10 h elapsed, 9 h paid.
const entry={id:'punch-1',locationId:'office',locationName:'Main Office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T12:00:00Z',endAt:'2026-09-22T22:00:00Z',rawStartAt:'2026-09-22T12:00:00Z',rawEndAt:'2026-09-22T22:00:00Z',breaks:[meal]};
const correction={id:REQUEST,kind:'MISSING_ENTRY',status:'PENDING',reason:'Forgot to clock in',startAt:'2026-09-24T12:00:00Z',endAt:'2026-09-24T20:00:00Z',revision:2};
function card(id:string,extra:Record<string,unknown>={}){const source={...period,employeeId:id,employeeName:`Fictional ${id}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[entry],corrections:[],...extra};return {source,state:'DRAFT',revision:0,sourceHash:'a'.repeat(32),history:[]};}
let manager=true,actorId='OWNER',reads=0,posts:{path:string;body:unknown;headers:Record<string,string>}[]=[],cardsFor:()=>unknown[]=()=>[card('E1',{pendingCorrections:1,corrections:[correction]})];
let cleanup:void|(()=>void);
function render(){host.cursor=0;return Timecards({initialPeriod:period,manager,actorId,signature:!manager,today:'2026-09-29',correctionAuthority:'b'.repeat(64)});}
const html=()=>renderToStaticMarkup(render());
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const n=v as ReactElement<Record<string,unknown>>;return [n,...nodes(n.props.children as ReactNode),...nodes(n.props.right as ReactNode)];}
function control(test:(n:ReactElement<Record<string,unknown>>)=>boolean){const n=nodes(render()).find(test);if(!n)throw Error('Missing rendered control');return n.props;}
const button=(label:string)=>control(n=>n.type==='button'&&(n.props.children===label||n.props['aria-label']===label));
const flush=()=>vi.advanceTimersByTimeAsync(0);
async function mount(){render();host.mounted=true;cleanup=host.effects[0]();await flush();}
beforeEach(()=>{manager=true;actorId='OWNER';reads=0;posts=[];cardsFor=()=>[card('E1',{pendingCorrections:1,corrections:[correction]})];host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});
 vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{
  if(path==='/api/timecards'){reads++;return Response.json({state:'ready',observedAt:'2026-09-29T12:00:00Z',validForMs:45000,cards:cardsFor()});}
  const body=JSON.parse(String(init?.body)) as {operationId:string;requestId:string};posts.push({path,body,headers:init?.headers as Record<string,string>});
  return Response.json({state:'approved',operationId:body.operationId,requestId:body.requestId,revision:3,adjustmentId:'6a1c2a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'});
 });
});
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});

it('shows paid time with breaks separate, the day row and the reason Approve is unavailable (T-12, P0-3, UX-O-30)',async()=>{
 await mount();
 (control(n=>n.type==='button'&&n.props.className==='cm-tc-person').onClick as ()=>void)();
 const sheet=html();
 expect(sheet).toContain('q-page q-sheet q-tc-sheet cm-tc-sheet');
 expect(sheet).toMatch(/<b>Worked<\/b><i>10 h clocked in, unpaid breaks left out<\/i><\/span><span class="q-rv q-rv--l">9 h</);
 expect(sheet).toMatch(/<b>Breaks<\/b><\/span><span class="q-rv q-rv--l">1 h</);
 expect(sheet).toContain('<b>Tue, Sep 22</b><i>8:00 AM – 6:00 PM · Main Office</i>');
 expect(sheet).toContain('Corrections (1)');
 expect(sheet).toContain('<b>Missed punch</b><i>Sep 24, 8:00 AM – 4:00 PM · Forgot to clock in</i>');
 expect(button('Approve timecard').disabled).toBe(true);
 expect(sheet).toContain('Decide the correction first.');
 // No 2x2 stat grid, no bullets, no "Period information" card.
 expect(sheet).not.toContain('cm-tc-figures');expect(sheet).not.toContain('Period information');
});

it('approves the correction inside the timecard with the existing review command, then reads fresh timecards',async()=>{
 await mount();
 (control(n=>n.type==='button'&&n.props.className==='cm-tc-person').onClick as ()=>void)();
 expect(reads).toBe(1);
 (button('Approve').onClick as ()=>void)();await flush();
 expect(posts).toHaveLength(1);
 expect(posts[0].path).toBe('/api/manager/time-corrections');
 expect(posts[0].body).toMatchObject({requestId:REQUEST,expectedRevision:2,decision:'APPROVE'});
 expect(Object.keys(posts[0].body as object).sort()).toEqual(['decision','expectedRevision','operationId','requestId']);
 expect(posts[0].headers['X-Nevora-Correction-Authority']).toBe('b'.repeat(64));
 expect(posts[0].headers['X-Nevora-Actor']).toBe('OWNER');
 expect(reads).toBe(2);
 expect(html()).toContain('Correction approved. Fictional’s timecard is updated.');
});

it('never offers the decision on the actor’s own correction',async()=>{
 actorId='E1';
 await mount();
 (control(n=>n.type==='button'&&n.props.className==='cm-tc-person').onClick as ()=>void)();
 const sheet=html();
 expect(sheet).toContain('Another manager decides your own correction.');
 expect(()=>button('Approve')).toThrow('Missing rendered control');
 expect(sheet).toContain('Another manager approves your timecard.');
});

it('shows the employee their paid time, breaks separately, and a day without punches (T-17, P0-3)',async()=>{
 manager=false;actorId='E1';cardsFor=()=>[card('E1')];
 await mount();
 const page=html();
 expect(page).toContain('q-page q-tc-mine');expect(page).toContain('href="/app/my-pay"');
 expect(page).toContain('<h1>Timecards</h1><p>Sep 21 – 27 · In progress</p>');
 expect(page).toMatch(/<b>Worked<\/b><\/span><span class="q-rv q-rv--l">9 h</);
 expect(page).toMatch(/<b>Breaks<\/b><\/span><span class="q-rv q-rv--l">1 h</);
 expect(page).toMatch(/<b>Mon, Sep 21<\/b><\/span><span class="q-rv q-rv--ph">No punches</);
 expect(page).toContain('Worked leaves out unpaid breaks.');
 expect(page).not.toMatch(/YOUR TIMECARD|Your timecard ·|sg-band|Approve timecard/);
 // The Other dates sheet keeps the labelled period fields and View period.
 expect(page).toContain('aria-label="Period start"');expect(page).toContain('aria-label="Period end"');expect(page).toContain('View period');
});

it('prefers the server’s paidSeconds when it is present (Team P)',async()=>{
 manager=false;actorId='E1';cardsFor=()=>[{...card('E1'),paidSeconds:8*3600+1800}];
 await mount();
 expect(html()).toMatch(/<b>Worked<\/b><\/span><span class="q-rv q-rv--l">8 h 30 min</);
});

it('shows meal-period warnings as calm rows when the server sends them (Jose, Oct 25)',async()=>{
 manager=false;actorId='E1';cardsFor=()=>[{...card('E1'),mealWarnings:[{date:'2026-09-22',kind:'MEAL_TOO_EARLY'},{date:'2026-09-23',kind:'MEAL_TOO_SHORT',minutes:20},{date:'bad',kind:'NOPE'}]}];
 await mount();
 const page=html();
 expect(page).toContain('Meal periods');
 expect(page).toContain('<b>Meal break started before the 2nd hour ended</b><i>Tue, Sep 22</i>');
 expect(page).toContain('<b>Meal break was 20 min</b><i>Wed, Sep 23</i>');
 expect(page).not.toContain('NOPE');
});

it('renders no meal rows when the field is absent, on the Owner sheet too',async()=>{
 await mount();
 (control(n=>n.type==='button'&&n.props.className==='cm-tc-person').onClick as ()=>void)();
 expect(html()).not.toContain('Meal periods');
 manager=false;actorId='E1';cardsFor=()=>[card('E1')];
});
