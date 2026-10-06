// Test-only bridge supplies the newly mandatory reviewed command and server proof
// to legacy API contract scenarios. Production never synthesizes this authority.
import {randomUUID} from 'node:crypto';
import {vi} from 'vitest';
import * as exchanges from './exchanges';
import * as callouts from './callouts';
import {fixture as previousFixture} from './request-notification-fixtures.test-support';
export {intents,week} from './request-notification-fixtures.test-support';
import {fictionalProfile} from '../../test/fixtures/shift-changes';
import {sourceShiftTerms,shiftTermsFingerprint} from '../shift-changes/terms';
import type {GenerationSource} from './generation-guards';
import type {SessionMutationProof,ShiftChangeCommand} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
const registry=new WeakMap<SqlExecutor,ReturnType<typeof previousFixture>>();
export function fixture(kind:'EXCHANGE'|'CALLOUT',status='PENDING') {
 const r=previousFixture(kind,status);registry.set(r.executor,r);
 // Each original fixture's owner occupies a designated Lead slot.
 r.state.recipients[0].role='LEAD';
 vi.mocked(r.executor.query).mockImplementation(async statement=>{
  if(!statement.text.includes('AS source')) {if(statement.text.includes('AS state'))return [{state:structuredClone(r.state),read_at:'2030-10-07 12:00:00.123456+00'}] as never;return [{id:'northside',name:'Northside',timeZone:'America/New_York',active:true,createdAt:'2030-01-01 00:00:00+00',updatedAt:'2030-01-01 00:00:00.123456+00'}] as never;}
  const source=build(r,kind);
  return [{source,state:structuredClone(r.state),observedAt:'2030-10-07T12:00:00Z',workspaceUpdatedAt:'2030-01-01 00:00:00.123456+00',authorized:true}] as never;
 });
 return r;
}
function build(r:ReturnType<typeof previousFixture>,kind:'EXCHANGE'|'CALLOUT') {
 const state=r.state;
 if(r.row.kind==='SWAP'&&!r.row.target_shift_id){r.row.target_shift_id='s2';state.shifts.push({...state.shifts[0],sourceShiftId:'s2',employeeId:String(r.row.target_employee_id),date:'2030-10-12',isDesignatedLead:false});state.revisions[0].shifts.push({...state.shifts.at(-1)!});}
 const source=Object.fromEntries(['workspaces','locations','positions','employees','employee_location_eligibility','employee_positions','employee_scheduling_settings','location_staffing_settings','location_coverage_windows','coverage_window_position_requirements','availability_windows','weekly_availability_windows','weekly_availability_submissions','availability_exceptions','time_off_requests','schedule_week_settings','schedules','shifts','shift_callouts','shift_exchanges','schedule_publication_revisions','schedule_publication_revision_shifts','schedule_generation_exclusions','shift_change_participation','shift_change_events','shift_change_operations'].map(k=>[k,[]])) as unknown as GenerationSource;
 const scope={revision:1,mode:'MANAGER_REVIEW',submissionAdvanceMinutes:0,completionAdvanceMinutes:0};
 source.workspaces=[{id:'northside',name:'Northside',time_zone:'America/New_York',active:true,created_at:'2030-01-01T00:00:00Z',updated_at:'2030-01-01T00:00:00.123456Z',shift_change_policy:{version:1,revision:1,swap:scope,coverage:scope}}];
 source.locations=state.assignmentFacts.locations.map(l=>({id:l.id,workspace_id:'northside',active:l.active,name:l.id,short_name:l.id}));
 source.positions=state.assignmentFacts.positions.map(p=>({...p,workspace_id:'northside'}));
 source.employee_positions=state.assignmentFacts.memberships.map(m=>({employee_id:m.employeeId,position_id:m.positionId}));
 source.employees=state.recipients.map(e=>({id:e.employeeId,active:e.active,role:e.role,first_name:'Test',last_name:e.employeeId,primary_location_id:e.allowedLocationIds[0]}));
 source.employee_location_eligibility=state.recipients.flatMap(e=>e.allowedLocationIds.map(location_id=>({employee_id:e.employeeId,location_id})));
 source.employee_scheduling_settings=state.recipients.map(e=>({employee_id:e.employeeId,maximum_weekly_hours:80,operational_rule_profile:fictionalProfile()}));
 source.availability_windows=state.recipients.flatMap(e=>Array.from({length:7},(_,day_of_week)=>({id:e.employeeId+day_of_week,employee_id:e.employeeId,day_of_week,start_time:'00:00',end_time:'24:00'})));
 source.location_staffing_settings=source.locations.map(l=>({location_id:l.id,minimum_staff_per_shift:1,requires_designated_lead:false}));
 source.location_coverage_windows=source.locations.flatMap(l=>Array.from({length:7},(_,day_of_week)=>({id:String(l.id)+day_of_week,location_id:l.id,day_of_week,start_time:'00:00',end_time:'24:00'})));
 source.schedules=state.schedules.map(s=>({id:s.id,location_id:s.locationId,week_start:s.weekStart,status:s.status}));
 source.shifts=state.shifts.map((s,i)=>({id:s.sourceShiftId,schedule_id:s.scheduleId,employee_id:s.employeeId,date:s.date,start_time:s.startTime,end_time:s.endTime,position_id:s.positionId??null,is_designated_lead:s.isDesignatedLead,terms_revision:1,assignment_episode_id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}));
 const terms=(id:string)=>{const sh=source.shifts.find(s=>s.id===id);const p=state.schedules.find(s=>s.id===sh?.schedule_id);return sh&&p?sourceShiftTerms(sh,p,'northside','America/New_York'):null;};
 const a=terms(String(r.row.source_shift_id)),b=terms(String(r.row.target_shift_id));
 // Stored snapshots intentionally follow the old fixture's request projection,
 // so mutating the live state is a stale-terms test, not refreshed consent.
 if(a) Object.assign(a,{employeeId:String(r.row.requested_by_employee_id),locationId:String(r.row.source_location_id)});
 const consent={employeeId:r.row.requested_by_employee_id,consentedAt:'2030-10-07T11:00:00Z',source:a,target:b};
 const row={...r.row,request_revision:1,legacy_manual:false,source_terms:a,target_terms:b,requester_consent:consent,target_consent:{...consent,employeeId:r.row.target_employee_id},recorded_approval_mode:'MANAGER_REVIEW',completion_deadline:'2030-10-11T13:00:00Z',assignment_episode_id:a?.assignmentEpisodeId};
 if(kind==='EXCHANGE')source.shift_exchanges=[row];else source.shift_callouts=[row];
 return source;
}
async function run(name:keyof typeof exchanges|keyof typeof callouts,input:Record<string,unknown>,executor:SqlExecutor) {
 const r=registry.get(executor)!;const actorId=String(name==='cancelPendingCallout'?input.employeeId:input.managerId??input.employeeId??input.requestedByEmployeeId);
 input={...input};if(name==='cancelPendingCallout')delete input.managerId;else if(input.managerId)delete input.employeeId;const actor=r.state.recipients.find(e=>e.employeeId===actorId)!;
 const proof:SessionMutationProof={employee:{id:actorId,role:actor.role,firstName:'Test',lastName:actorId,primaryLocationId:'L'},sessionTokenHash:'a'.repeat(64)};
 const kinds:Record<string,ShiftChangeCommand['kind']>={createCoverageOffer:'OFFER_COVERAGE',createSwapProposal:'PROPOSE_SWAP',claimCoverage:'ACCEPT',respondToSwap:input.accept?'ACCEPT':'DECLINE',denyExchange:'MANAGER_DECLINE',approveCoverageExchange:'MANAGER_APPROVE',approveSwapExchange:'MANAGER_APPROVE',cancelExchange:'CANCEL',createCallout:'SUBMIT_CALLOUT',approveCalloutAndOpenCoverage:'APPROVE_CALLOUT',denyCallout:'DECLINE_CALLOUT',cancelPendingCallout:'CANCEL_CALLOUT'};
 const kind=kinds[name];let command:ShiftChangeCommand;
 if(kind==='OFFER_COVERAGE'||kind==='PROPOSE_SWAP') {
  const source=build(r,'EXCHANGE');const term=(id:unknown)=>{const sh=source.shifts.find(s=>s.id===id)!;return sourceShiftTerms(sh,r.state.schedules.find(s=>s.id===sh.schedule_id)!,'northside','America/New_York');};const a=term(input.sourceShiftId),b=kind==='PROPOSE_SWAP'?term(input.targetShiftId):null;
  command={kind,operationId:randomUUID(),sourceShiftId:a.shiftId,sourceEpisodeId:a.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(a),...(b?{targetShiftId:b.shiftId,targetEpisodeId:b.assignmentEpisodeId,targetTermsFingerprint:shiftTermsFingerprint(b)}:{})} as ShiftChangeCommand;
 }else if(kind==='SUBMIT_CALLOUT') {const source=build(r,'CALLOUT'),sh=source.shifts.find(s=>s.id===input.shiftId)!;const terms=sourceShiftTerms(sh,r.state.schedules.find(s=>s.id===sh.schedule_id)!,'northside','America/New_York');command={kind,operationId:randomUUID(),sourceShiftId:terms.shiftId,sourceEpisodeId:terms.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(terms),reasonCode:input.reasonCode as 'ILLNESS',reasonNote:input.reasonNote as string|undefined};}
 else command={kind,operationId:randomUUID(),requestId:String(input.exchangeId??input.calloutId),expectedRevision:1};
 const fn=(name in exchanges?exchanges[name as keyof typeof exchanges]:callouts[name as keyof typeof callouts]) as (input:unknown,executor:SqlExecutor)=>Promise<unknown>;
 return fn({...input,proof,command},executor);
}

export const createCoverageOffer=(input:Record<string,unknown>,executor:SqlExecutor)=>run('createCoverageOffer',input,executor);
export const createSwapProposal=(input:Record<string,unknown>,executor:SqlExecutor)=>run('createSwapProposal',input,executor);
export const claimCoverage=(input:Record<string,unknown>,executor:SqlExecutor)=>run('claimCoverage',input,executor);
export const respondToSwap=(input:Record<string,unknown>,executor:SqlExecutor)=>run('respondToSwap',input,executor);
export const denyExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('denyExchange',input,executor);
export const approveCoverageExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('approveCoverageExchange',input,executor);
export const approveSwapExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('approveSwapExchange',input,executor);
export const cancelExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('cancelExchange',input,executor);
export const createCallout=(input:Record<string,unknown>,executor:SqlExecutor)=>run('createCallout',input,executor);
export const approveCalloutAndOpenCoverage=(input:Record<string,unknown>,executor:SqlExecutor)=>run('approveCalloutAndOpenCoverage',input,executor);
export const denyCallout=(input:Record<string,unknown>,executor:SqlExecutor)=>run('denyCallout',input,executor);
export const cancelPendingCallout=(input:Record<string,unknown>,executor:SqlExecutor)=>run('cancelPendingCallout',input,executor);