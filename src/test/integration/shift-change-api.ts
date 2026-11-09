/** Explicit fictional test client for the required review/proof/operation contract. */
import {randomUUID,createHash} from 'node:crypto';
import * as exchanges from '../../lib/data/exchanges';
import * as callouts from '../../lib/data/callouts';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {SessionMutationProof,ShiftChangeCommand,ShiftTerms} from '../../lib/shift-changes/types';
import {sourceShiftTerms,shiftTermsFingerprint} from '../../lib/shift-changes/terms';
import {fictionalProfile} from '../fixtures/shift-changes';
import {installFixtureCompanyAccess} from './fixture-company-access';
export async function configureFictionalShiftChanges(executor:SqlExecutor){
 const scope={revision:1,mode:'MANAGER_REVIEW',submissionAdvanceMinutes:0,completionAdvanceMinutes:0};
 await executor.query({text:'UPDATE workspaces SET shift_change_policy=$1',values:[JSON.stringify({version:1,revision:1,swap:scope,coverage:scope})]});
 await executor.query({text:'INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) SELECT id,80,$1 FROM employees ON CONFLICT(employee_id) DO UPDATE SET operational_rule_profile=$1',values:[JSON.stringify(fictionalProfile())]});
 await executor.query({text:"UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false; INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) SELECT 'fixture-window-'||l.id||'-'||d,l.id,d,'00:00','24:00' FROM locations l CROSS JOIN generate_series(0,6) d ON CONFLICT(id) DO NOTHING; INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'fixture-hours-'||e.id||'-'||d,e.id,d,'00:00','24:00' FROM employees e CROSS JOIN generate_series(0,6) d ON CONFLICT(id) DO NOTHING",values:[]});
}
export async function reviewedFixtureTerms(executor:SqlExecutor,id:string):Promise<ShiftTerms>{
 const [r]=await executor.query<{shift:Record<string,unknown>;schedule:{id:string;locationId:string;weekStart:string;status:'PUBLISHED'};workspaceId:string;timeZone:string}>({text:`SELECT to_jsonb(sh) AS shift,jsonb_build_object('id',s.id,'locationId',s.location_id,'weekStart',s.week_start::text,'status',s.status) AS schedule,l.workspace_id AS "workspaceId",w.time_zone AS "timeZone" FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id JOIN workspaces w ON w.id=l.workspace_id WHERE sh.id=$1`,values:[id]});
 return sourceShiftTerms(r.shift,r.schedule,r.workspaceId,r.timeZone);
}
export async function reviewedFixtureSource(executor:SqlExecutor,id:string){
 const terms=await reviewedFixtureTerms(executor,id);
 return {sourceShiftId:id,sourceEpisodeId:terms.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(terms)};
}
export async function fixtureProof(executor:SqlExecutor,id:string):Promise<SessionMutationProof>{
 await installFixtureCompanyAccess(executor);
 const [employee]=await executor.query<SessionMutationProof['employee']>({text:'SELECT id,first_name AS "firstName",last_name AS "lastName",role,primary_location_id AS "primaryLocationId" FROM employees WHERE id=$1',values:[id]});
 const sessionTokenHash=createHash('sha256').update('owned-integration-proof:'+id).digest('hex');
 await executor.query({text:"INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day') ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at",values:[sessionTokenHash,id]});return {employee,sessionTokenHash};
}
export async function bindFixtureCallout(executor:SqlExecutor,id:string){
 const [c]=await executor.query<{shift_id:string}>({text:'SELECT shift_id FROM shift_callouts WHERE id=$1',values:[id]});const t=await reviewedFixtureTerms(executor,c.shift_id);
 await executor.query({text:'UPDATE shift_callouts SET legacy_manual=false,assignment_episode_id=$2,source_terms=$3,reviewed_terms_fingerprint=$4 WHERE id=$1',values:[id,t.assignmentEpisodeId,JSON.stringify(t),shiftTermsFingerprint(t)]});
}
async function run(name:keyof typeof exchanges|keyof typeof callouts,input:Record<string,unknown>,executor:SqlExecutor){
 const actorId=String(input.managerId??input.employeeId??input.requestedByEmployeeId);const proof=await fixtureProof(executor,actorId);
 const kinds:Record<string,ShiftChangeCommand['kind']>={createCoverageOffer:'OFFER_COVERAGE',createSwapProposal:'PROPOSE_SWAP',claimCoverage:'ACCEPT',respondToSwap:input.accept?'ACCEPT':'DECLINE',denyExchange:'MANAGER_DECLINE',approveCoverageExchange:'MANAGER_APPROVE',approveSwapExchange:'MANAGER_APPROVE',cancelExchange:'CANCEL',createCallout:'SUBMIT_CALLOUT',approveCalloutAndOpenCoverage:'APPROVE_CALLOUT',denyCallout:'DECLINE_CALLOUT',cancelPendingCallout:'CANCEL_CALLOUT'};
 const kind=kinds[name];let command:ShiftChangeCommand;
 if(kind==='OFFER_COVERAGE'||kind==='PROPOSE_SWAP'){
  const a=await reviewedFixtureTerms(executor,String(input.sourceShiftId)),b=kind==='PROPOSE_SWAP'?await reviewedFixtureTerms(executor,String(input.targetShiftId)):null;
  command={kind,operationId:randomUUID(),sourceShiftId:a.shiftId,sourceEpisodeId:a.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(a),...(b?{targetShiftId:b.shiftId,targetEpisodeId:b.assignmentEpisodeId,targetTermsFingerprint:shiftTermsFingerprint(b)}:{})} as ShiftChangeCommand;
 }else if(kind==='SUBMIT_CALLOUT')command={kind,operationId:randomUUID(),...await reviewedFixtureSource(executor,String(input.shiftId)),reasonCode:input.reasonCode as 'ILLNESS',reasonNote:input.reasonNote as string|undefined};
 else {const id=String(input.exchangeId??input.calloutId);const [r]=await executor.query<{request_revision:number}>({text:`SELECT request_revision FROM ${kind.endsWith('CALLOUT')?'shift_callouts':'shift_exchanges'} WHERE id=$1`,values:[id]});command={kind,operationId:randomUUID(),requestId:id,expectedRevision:r.request_revision};}
 const fn=(name in exchanges?exchanges[name as keyof typeof exchanges]:callouts[name as keyof typeof callouts]) as (input:unknown,executor:SqlExecutor)=>Promise<unknown>;
 return fn({...input,proof,command},executor);
}

export const createCoverageOffer=(input:Record<string,unknown>,executor:SqlExecutor)=>run('createCoverageOffer',input,executor) as Promise<string>;
export const createSwapProposal=(input:Record<string,unknown>,executor:SqlExecutor)=>run('createSwapProposal',input,executor) as Promise<string>;
export const claimCoverage=(input:Record<string,unknown>,executor:SqlExecutor)=>run('claimCoverage',input,executor) as Promise<boolean>;
export const respondToSwap=(input:Record<string,unknown>,executor:SqlExecutor)=>run('respondToSwap',input,executor) as Promise<boolean>;
export const denyExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('denyExchange',input,executor) as Promise<boolean>;
export const approveCoverageExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('approveCoverageExchange',input,executor) as Promise<boolean>;
export const approveSwapExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('approveSwapExchange',input,executor) as Promise<boolean>;
export const cancelExchange=(input:Record<string,unknown>,executor:SqlExecutor)=>run('cancelExchange',input,executor) as Promise<boolean>;
export const createCallout=(input:Record<string,unknown>,executor:SqlExecutor)=>run('createCallout',input,executor) as Promise<string|null>;
export const approveCalloutAndOpenCoverage=(input:Record<string,unknown>,executor:SqlExecutor)=>run('approveCalloutAndOpenCoverage',input,executor) as Promise<boolean>;
export const denyCallout=(input:Record<string,unknown>,executor:SqlExecutor)=>run('denyCallout',input,executor) as Promise<boolean>;
export const cancelPendingCallout=(input:Record<string,unknown>,executor:SqlExecutor)=>run('cancelPendingCallout',input,executor) as Promise<boolean>;
