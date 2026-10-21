import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import ExchangePage from './page';
import type { ExchangeRecord } from '../../../lib/data/exchanges';
import type { CalloutRecord } from '../../../lib/data/callouts';
const f=vi.hoisted(()=>({activity:[] as ExchangeRecord[],callouts:[] as CalloutRecord[],selected:null as ExchangeRecord|null,selectedCallout:null as CalloutRecord|null,allowed:['2'],assigned:[] as ReturnType<typeof exchange>['sourceShift'][],reviewed:null as {source:Record<string,string|boolean|number>;sourceTermsFingerprint:string;target:null;targetTermsFingerprint:null}|null,coverageAllowed:false,coverageNotice:'Coverage unavailable',operation:null as {status:'pending'|'completed';operationId:string;requestId:string;revision:number}|null}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/scheduling/validate-shift',()=>({schedulingIssueMessage:()=>''}));
vi.mock('@/components/manager-shift-requests',()=>({ManagerShiftRequests:()=>null}));
vi.mock('@/components/nav-icon',()=>({NavIcon:()=>null}));
vi.mock('@/components/status-pill',()=>import('../../../components/status-pill'));
vi.mock('@/lib/auth/permissions',()=>({isManagerRole:()=>false}));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'self',role:'EMPLOYEE'}),requireSessionMutationProof:async()=>({employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/lib/exchange-marketplace',()=>import('../../../lib/exchange-marketplace'));
vi.mock('@/lib/notifications/destinations',()=>import('../../../lib/notifications/destinations'));
vi.mock('@/lib/data/notification-state',()=>({sqlNotificationStateRepository:()=>({recipientAccess:async()=>({employeeId:'self',role:'EMPLOYEE',active:true,allowedLocationIds:f.allowed})})}));
vi.mock('@/lib/data/callouts',()=>({listEmployeeCallouts:async()=>f.callouts,getCallout:async()=>f.selectedCallout}));
vi.mock('@/lib/data/exchanges',()=>({listEmployeeExchangeActivity:async()=>f.activity,listEmployeePublishedShifts:async()=>f.assigned,listIncomingSwaps:async()=>[],listOpenCoverage:async()=>[],getExchange:async()=>f.selected}));
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:vi.fn(),reconcileShiftChangeAction:vi.fn(async()=>{throw new Error('Action cache invalidation is forbidden during render');}),cancelExchangeAction:vi.fn(),claimCoverageAction:vi.fn(),offerCoverageAction:vi.fn(),respondSwapAction:vi.fn()}));
vi.mock('@/app/app/exchange/callout/actions',()=>({cancelCalloutAction:vi.fn()}));
function exchange(id:string,owner='self'):ExchangeRecord{return {id,kind:'SWAP',status:'APPROVED',requestedByEmployeeId:owner,targetEmployeeId:'self',requestedByName:'Fictional',requestedByRole:'EMPLOYEE',sourceShift:{id:'shift',scheduleId:'week',employeeId:owner,employeeName:'Fictional',locationId:'2',locationName:'Drive',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'},createdAt:'2026-10-03T12:00:00Z'};}
beforeEach(()=>{f.activity=Array.from({length:10},(_,i)=>exchange(`row-${i}`));f.callouts=[];f.selected=null;f.selectedCallout=null;f.allowed=['2'];f.assigned=[];f.reviewed=null;f.coverageAllowed=false;f.operation=null;vi.clearAllMocks();});
async function html(requestId?:string){return renderToStaticMarkup(await ExchangePage({searchParams:Promise.resolve({tab:'requests',requestId})}));}
it.each(['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'] as const)('ordinary employee %s request status stays neutral',async status=>{
 f.activity=[{...exchange('pending'),status}];
 expect(await html()).toMatch(/class="status-pill neutral">(?:Offered|Awaiting employee|Manual review)</);
});
it('default retains first eight; an authorized selected later row is included and focusable',async()=>{
 expect(await html()).not.toContain('id="request-row-9"');expect(await html('row-9')).toContain('id="request-row-9" tabindex="-1"');
});
it('selected authorized partner outcome uses existing section without requester actions',async()=>{
 f.activity=[];f.selected=exchange('partner','other');const result=await html('partner');expect(result).toContain('id="request-partner"');expect(result).toContain('Completed');expect(result).not.toContain('<form');
});
it('forged foreign account and access-lost selected rows are excluded',async()=>{
 f.selected={...exchange('foreign','other'),targetEmployeeId:'different'};expect(await html('foreign')).not.toContain('id="request-foreign"');
 f.selected=exchange('lost','other');f.allowed=[];expect(await html('lost')).not.toContain('id="request-lost"');
});
it('selected partner pending row never acquires requester cancel authority',async()=>{
 f.activity=[];f.selected={...exchange('pending','other'),status:'OPEN'};expect(await html('pending')).not.toContain('id="request-pending"');
});
it('selected own callout beyond ordinary six is included without expanding default',async()=>{
 f.callouts=Array.from({length:8},(_,i)=>({id:`callout-${i}`,shiftId:'shift',employeeId:'self',employeeName:'Fictional',locationId:'2',locationName:'Drive',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00',reasonCode:'OTHER',status:'APPROVED',createdAt:'2026-10-03T12:00:00Z'}));
 expect(await html()).not.toContain('id="request-callout-7"');expect(await html('callout-7')).toContain('id="request-callout-7"');
});

vi.mock("@/lib/data/workspaces",()=>({getWorkspace:async()=>({timeZone:"America/Puerto_Rico"})}));

vi.mock("@/lib/business-time",()=>import("../../../lib/business-time"));

it('forged URL flags cannot claim a persisted success',async()=>{
 const result=renderToStaticMarkup(await ExchangePage({searchParams:Promise.resolve({offered:'1',claimed:'1',calloutSubmitted:'1'})}));
 expect(result).not.toContain('Your shift is now available');expect(result).not.toContain('Coverage request sent');
});
it('trade displays both reviewed slots with position and Lead context',async()=>{
 f.activity=[{...exchange('both'),sourceShift:{...exchange('both').sourceShift,positionName:'Drive-through coordinator',isDesignatedLead:true},targetShift:{...exchange('both').sourceShift,id:'other',date:'2026-10-06',startTime:'16:00',endTime:'20:00',locationName:'East Terrace',positionName:'Kitchen coordinator'}}];
 const result=await html();expect(result).toContain('East Terrace');expect(result).toContain('Kitchen coordinator');expect(result).toContain('Drive-through coordinator');expect(result).toContain('Designated lead');
});
it('effective expired lifecycle never offers cancellation',async()=>{
 f.activity=[{...exchange('expired'),status:'OPEN',actionable:false,attention:'EXPIRED'}];
 expect(await html()).not.toContain('>Cancel<');
});

vi.mock('@/components/shift-change-form',()=>import('../../../components/shift-change-form'));
vi.mock('@/components/shift-slot',()=>import('../../../components/shift-slot'));
vi.mock('@/components/shift-change-history',()=>import('../../../components/shift-change-history'));
vi.mock('@/components/shift-change-form-state',()=>import('../../../components/shift-change-form-state'));
vi.mock('@/lib/data/shift-change-views',()=>({readShiftChangeHistoryView:async()=>[],readShiftChangeOperationView:vi.fn(async()=>f.operation)}));
vi.mock('@/lib/data/shift-change-snapshot',()=>({readShiftChangeTerms:async()=>f.reviewed}));
vi.mock('@/lib/data/shift-changes',()=>({readShiftChangeAvailability:vi.fn(async()=>({allowed:f.coverageAllowed,notice:f.coverageNotice}))}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));

import {reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {readShiftChangeOperationView} from '@/lib/data/shift-change-views';
vi.mock('@/lib/workspace-presentation/service', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/workspace-presentation/service')>()), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on
function assignedReview(){
 const shift={...exchange('source').sourceShift,date:'2035-10-05',timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode-current',termsRevision:1,positionId:'cashier',positionName:'Cashier',isDesignatedLead:true};f.assigned=[shift];
 f.reviewed={source:{timeZone:shift.timeZone,termsRevision:shift.termsRevision,shiftId:shift.id,scheduleId:shift.scheduleId,employeeId:shift.employeeId,locationId:shift.locationId,weekStart:shift.weekStart,date:shift.date,startTime:shift.startTime,endTime:shift.endTime,positionId:shift.positionId,isDesignatedLead:shift.isDesignatedLead,assignmentEpisodeId:'episode-current'},sourceTermsFingerprint:'v1:current',target:null,targetTermsFingerprint:null};
}
it.each(['unknown coverage policy','elapsed coverage submission cutoff'])('trade builder navigation remains independent of %s',async refusal=>{
 assignedReview();f.coverageAllowed=false;f.coverageNotice=refusal;const result=await html();expect(result).toContain('>Request a swap<');expect(result).not.toContain('value="OFFER_COVERAGE"');expect(result).toContain('>Unable to work<');
});
it('builder navigation itself does not declare swap eligibility when only coverage is valid',async()=>{
 assignedReview();f.coverageAllowed=true;const result=await html();expect(result).toContain('value="OFFER_COVERAGE"');expect(result).not.toContain('Eligible to trade');
});
it.each<Record<string, string | boolean | number>>([{timeZone:'America/New_York'},{termsRevision:2},{assignmentEpisodeId:'new-episode'},{startTime:'10:00',endTime:'18:00'},{locationId:'replacement-site'},{positionId:'replacement-position'},{employeeId:'new-owner'},{date:'2035-10-06'},{scheduleId:'replacement-schedule'},{weekStart:'2035-10-08'},{isDesignatedLead:false}])('inter-read material source change %j refuses undisplayed creation consent',async change=>{
 assignedReview();f.coverageAllowed=true;f.reviewed!.source={...f.reviewed!.source,...change};const result=await html();expect(result).not.toContain('value="OFFER_COVERAGE"');expect(result).not.toContain('value="v1:current"');expect(result).not.toContain('>Request a swap<');expect(result).toContain('Stale assignment');
});
it.each(['pending','completed'] as const)('URL result render performs read-only %s lookup rather than cache-invalidating action',async status=>{
 const operationId='11111111-1111-4111-8111-111111111111';f.operation={status,operationId,requestId:'r1',revision:2};const result=renderToStaticMarkup(await ExchangePage({searchParams:Promise.resolve({operationId})}));expect(result).toContain(status==='pending'?'Request recorded':'Completed.');expect(reconcileShiftChangeAction).not.toHaveBeenCalled();expect(readShiftChangeOperationView).toHaveBeenCalledWith(expect.objectContaining({sessionTokenHash:'a'.repeat(64)}),operationId);
});

it('H04 requester can cancel stale active offers independently of completion eligibility',async()=>{f.activity=[{...exchange('stale'),status:'OPEN',actionable:false,requestRevision:1}];expect(await html()).toContain('value="CANCEL"');});
it('H09 approved historical callouts never imply current release',async()=>{f.callouts=[{id:'old',shiftId:'shift',employeeId:'self',employeeName:'Fictional',locationId:'2',locationName:'Drive',weekStart:'2035-10-01',date:'2035-10-05',startTime:'08:00',endTime:'12:00',reasonCode:'OTHER',status:'APPROVED',releaseApplies:false,createdAt:'2026-10-03T12:00:00Z'}];const result=await html();expect(result).toContain('Previously approved — review current assignment');expect(result).not.toContain('Released — check coverage');});

it('H10 explanatory notices stay outside employee action grids while recovery controls remain',async()=>{
 assignedReview();f.coverageAllowed=false;
 f.activity=[{...exchange('stale'),status:'OPEN',actionable:false,requestRevision:1}];
 f.callouts=[{id:'legacy',shiftId:'shift',employeeId:'self',employeeName:'Fictional',locationId:'2',locationName:'Drive',weekStart:'2035-10-01',date:'2035-10-05',startTime:'08:00',endTime:'12:00',reasonCode:'OTHER',status:'APPROVED',releaseApplies:false,createdAt:'2026-10-03T12:00:00Z'}];
 const result=await html();const actions=[...result.matchAll(/<div class="employee-shift-entry-actions"[^>]*>([\s\S]*?)<\/div>/g)].map(match=>match[1]);
 expect(actions.length).toBeGreaterThanOrEqual(3);
 for(const group of actions){expect(group).not.toContain('shift-change-unavailable');expect(group).not.toContain('review current assignment');}
 expect(result).toContain('value="CANCEL"');expect(result).toContain('Unable to work');expect(result).toContain('Historical approval does not release the current assignment');
});
