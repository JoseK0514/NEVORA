rs.mock('@/lib/i18n/portal-lang', () => ({ usePortalLang: () => 'en' }));
import * as rstestOriginal0 from "react" with { rstest: 'importActual' };

import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';

import {createHash} from 'node:crypto';
import timecardsStyles from './timecards.module.css';
import timecardsSignatureStyles from './timecards-signature.module.css';
import signatureStyles from './signature/signature.module.css';

const scopedClasses = new Map<string, string>(([
 ['src/components/timecards.module.css', timecardsStyles],
 ['src/components/timecards-signature.module.css', timecardsSignatureStyles],
 ['src/components/signature/signature.module.css', signatureStyles],
] as const).flatMap(([file, styles]) => {
 const hash = createHash('sha1').update(file).digest('hex').slice(0, 6);
 return Object.entries(styles).map(([local, scoped]) => [scoped, `_${local}_${hash}`] as const);
}));

const host=rs.hoisted(()=>({cursor:0,mounted:false,slots:[] as {value:unknown}[],effects:[] as (()=>void|(()=>void))[]}));
rs.mock('react',()=>({...rstestOriginal0,
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
 useCallback:(callback:unknown)=>callback,
 useEffect:(effect:()=>void|(()=>void))=>{if(!host.mounted)host.effects.push(effect);},
}));
rs.mock('./clean/top-bar-slot',()=>({useTopBarSlot:()=>null}));
rs.mock('next/navigation',()=>({useSearchParams:()=>null}));
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
beforeEach(()=>{host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];rs.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance']});rs.stubGlobal('window',new EventTarget());rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));rs.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{host2.cleanup?.();host2.cleanup=undefined;rs.unstubAllGlobals();rs.useRealTimers();});
const views=[{employeeCorporate:false,signature:false},{employeeCorporate:true,signature:false},{employeeCorporate:false,signature:true},{employeeCorporate:true,signature:true}];
const fixtures:Record<string,unknown[]>={'no time':[card('E1')],'closed punch with a role':[withEntries('E1',[entry])],'open punch':[withEntries('E1',[open])]};
// Review B1 (NV-118, Nov 10, 2026): the snapshot was refreshed once for the shell's one icon weight (NavIcon is Phosphor bold
// by default); only the icon path data changed, every element, class and word is the same. Refreshed again on Nov 15, 2026
// for SY-012 (every Phosphor icon draws bold): again only the icon path data differs.
it('renders every employee Timecards view exactly as before the upscale (UI-9, UX4)',async()=>{
 const out:string[]=[];
 for(const view of views)for(const [name,cards] of Object.entries(fixtures)){
  host.cursor=0;host.mounted=false;host.slots=[];host.effects=[];
  rs.stubGlobal('fetch',async()=>Response.json({state:'ready',observedAt:'2026-09-24T12:00:00Z',validForMs:45000,cards}));
  const render=()=>{host.cursor=0;return Timecards({initialPeriod:period,manager:false,actorId:'E1',...view});};
  render();host.mounted=true;host2.cleanup=host.effects[0]();await rs.advanceTimersByTimeAsync(0);
  out.push(`<!-- ${JSON.stringify(view)} · ${name} -->\n${renderToStaticMarkup(render())}`);
  host2.cleanup?.();host2.cleanup=undefined;
 }
 const html=out.join('\n')+'\n';
 expect(html).not.toContain('people with no time yet');
 for(const part of out)expect(part).toContain('Your timecard');
 // Preserve the original snapshot's CSS module naming without changing its
 // element, class order or source module checks. Unknown classes stay intact.
 const legacyMarkup = html.replace(/ class="([^"]*)"/g, (_, value: string) =>
  ` class="${value.split(' ').map(token => scopedClasses.get(token) ?? token).join(' ')}"`);
 await expect(legacyMarkup).toMatchFileSnapshot('./__snapshots__/timecards-employee-unchanged.html');
});
