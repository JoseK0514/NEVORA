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
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
function card(id:string){const source={...period,employeeId:id,employeeName:`PRIVATE ${id}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]};return {source,state:'DRAFT',revision:0,sourceHash:'a'.repeat(32),history:[]};}

// UI-9 / UX4 scope check (coordinator, Oct 21): the Owner/Manager Timecards changes must leave every employee view
// exactly as it is on development. The 3d17453a fixture retains all employee markup, with only the three Signature
// wrapper attributes already present in f27216df added explicitly for dark-mode surface scoping. It is not auto-updated.
const entry={id:'punch-1',locationId:'fixture-office',locationName:'Fixture office',positionId:'p1',positionName:'Front desk',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T12:00:00Z',endAt:'2026-09-22T20:00:00Z',rawStartAt:'2026-09-22T12:00:00Z',rawEndAt:'2026-09-22T20:00:00Z',breaks:[]};
const open={...entry,id:'punch-2',startAt:'2026-09-23T12:00:00Z',endAt:null,rawStartAt:'2026-09-23T12:00:00Z',rawEndAt:null};
const withEntries=(id:string,entries:unknown[])=>{const c=card(id);return {...c,source:{...c.source,entries}};};
const host2={cleanup:undefined as void|(()=>void)};
beforeEach(()=>{host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{host2.cleanup?.();host2.cleanup=undefined;vi.unstubAllGlobals();vi.useRealTimers();});
const views=[{employeeCorporate:false,signature:false},{employeeCorporate:true,signature:false},{employeeCorporate:false,signature:true},{employeeCorporate:true,signature:true}];
const fixtures:Record<string,unknown[]>={'no time':[card('E1')],'closed punch with a role':[withEntries('E1',[entry])],'open punch':[withEntries('E1',[open])]};
// Review B1 (NV-118, Nov 10, 2026): the snapshot was refreshed once for the shell's one icon weight (NavIcon is Phosphor bold
// by default); only the icon path data changed, every element, class and word is the same.
it('renders every employee Timecards view exactly as before the upscale (UI-9, UX4)',async()=>{
 const out:string[]=[];
 for(const view of views)for(const [name,cards] of Object.entries(fixtures)){
  host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];
  vi.stubGlobal('fetch',async()=>Response.json({state:'ready',observedAt:'2026-09-24T12:00:00Z',validForMs:45000,cards}));
  const render=()=>{host.cursor=0;return Timecards({initialPeriod:period,manager:false,actorId:'E1',...view});};
  render();host.mounted=true;host2.cleanup=host.effects[0]();await vi.advanceTimersByTimeAsync(0);
  out.push(`<!-- ${JSON.stringify(view)} · ${name} -->\n${renderToStaticMarkup(render())}`);
  host2.cleanup?.();host2.cleanup=undefined;
 }
 const html=out.join('\n')+'\n';
 expect(html).not.toContain('people with no time yet');
 for(const part of out)expect(part).toContain('Your timecard');
 await expect(html).toMatchFileSnapshot('./__snapshots__/timecards-employee-unchanged.html');
});
