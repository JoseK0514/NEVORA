import { randomUUID } from 'node:crypto';
import { weekStartFor } from '../date-utils';
import { affectedWorkweeks, businessDateStart, shiftPeriod } from '../scheduling/periods';
import { canonicalCivilMinute, validateGenerationClaims, type GenerationClaims } from '../scheduling/generation-claims';
import { isProtectedAssignment, normalizeAssignmentOrigin } from '../scheduling/generation-provenance';
import type { SqlExecutor } from '../notifications/types';
import { neonNotificationExecutor } from './notification-transactions';
import { GenerationPermissionError, GenerationScopeError, generationMutationGuards, generationSourceGuard, readGenerationSource, withGenerationRetry, type GenerationSource } from './generation-guards';

export type GenerationExclusion = {
  id:string; workspaceId:string; weekStart:string; locationId:string;
  assignmentStart:string; assignmentEnd:string; positionId:string|null; claims:GenerationClaims;
  deletedSourceShiftId:string|null; createdBy:string; createdAt:string; clearedBy:string|null; clearedAt:string|null;
};
type ScopeInput={workspaceId:string;weekStart:string;locationId:string;actorEmployeeId:string};
function validateInput(input:ScopeInput) {
  if([input.workspaceId,input.locationId,input.actorEmployeeId].some(v=>!v?.trim())) throw new GenerationScopeError();
  businessDateStart(input.weekStart);
  if(weekStartFor(input.weekStart)!==input.weekStart) throw new GenerationScopeError();
}
function authorize(source:GenerationSource,input:ScopeInput) {
  const workspace=source.workspaces.find(w=>w.id===input.workspaceId && w.active===true);
  const actor=source.employees.find(e=>e.id===input.actorEmployeeId && e.active===true && ['OWNER','MANAGER'].includes(String(e.role)));
  if(!workspace || !actor) throw new GenerationPermissionError();
  const location=source.locations.find(l=>l.id===input.locationId && l.workspace_id===workspace.id);
  const schedule=source.schedules.find(s=>s.location_id===input.locationId && s.week_start===input.weekStart);
  if(!location || !schedule || schedule.status!=='DRAFT') throw new GenerationScopeError();
  return {workspace,schedule};
}
export async function deleteGeneratedDraftShift(input:ScopeInput & {shiftId:string},executor:SqlExecutor=neonNotificationExecutor()):Promise<{status:'deleted'|'absent'|'protected';exclusionId?:string}> {
  validateInput(input);
  if(!input.shiftId?.trim()) throw new GenerationScopeError();
  return withGenerationRetry(async()=>{
    const {source,changedAt}=await readGenerationSource(executor);
    const {workspace,schedule}=authorize(source,input);
    const shift=source.shifts.find(s=>s.id===input.shiftId);
    const guards=generationMutationGuards(source,[input.weekStart]);
    if(!shift) {await executor.transaction(guards);return {status:'absent'};}
    if(shift.schedule_id!==schedule.id) throw new GenerationScopeError();
    const protectedAssignment=isProtectedAssignment({assignmentOrigin:normalizeAssignmentOrigin(shift.assignment_origin),
      hasExchangeHistory:source.shift_exchanges.some(x=>x.source_shift_id===shift.id || x.target_shift_id===shift.id),
      hasCalloutHistory:source.shift_callouts.some(c=>c.shift_id===shift.id),
      hasPublicationHistory:source.schedule_publication_revision_shifts.some(r=>r.source_shift_id===shift.id),
    });
    if(protectedAssignment){await executor.transaction(guards);return {status:'protected'};}
    const parent={positionId:shift.position_id as string|null,isDesignatedLead:shift.is_designated_lead===true,date:String(shift.date),startTime:String(shift.start_time).slice(0,5),endTime:String(shift.end_time).slice(0,5)};
    validateGenerationClaims(shift.generated_claims,{...input,timeZone:String(workspace.time_zone)},parent);
    const period=shiftPeriod(parent), id=randomUUID();
    const assignmentStart=new Date(period.start*60000).toISOString().slice(0,19), assignmentEnd=new Date(period.end*60000).toISOString().slice(0,19);
    const event={id,workspace_id:input.workspaceId,week_start:input.weekStart,location_id:input.locationId,assignment_start:assignmentStart,assignment_end:assignmentEnd,
      position_id:shift.position_id ?? null,claims:shift.generated_claims,deleted_source_shift_id:shift.id,created_by:input.actorEmployeeId,created_at:changedAt,cleared_by:null,cleared_at:null};
    const after=structuredClone(source);
    after.shifts=after.shifts.filter(s=>s.id!==shift.id);
    after.schedule_generation_exclusions.push(event);
    after.schedule_generation_exclusions.sort((a,b)=>String(a.id)<String(b.id)?-1:1);
    await executor.transaction([
      ...generationMutationGuards(source,[input.weekStart,...affectedWorkweeks(period)]),
      {text:`INSERT INTO schedule_generation_exclusions(id,workspace_id,week_start,location_id,assignment_start,assignment_end,position_id,claims,deleted_source_shift_id,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,values:[id,input.workspaceId,input.weekStart,input.locationId,assignmentStart,assignmentEnd,shift.position_id ?? null,JSON.stringify(shift.generated_claims),shift.id,input.actorEmployeeId,changedAt]},
      {text:'DELETE FROM shifts WHERE id=$1',values:[shift.id]},
      generationSourceGuard(after),
    ]);
    return {status:'deleted',exclusionId:id};
  });
}
export async function clearGenerationExclusion(input:ScopeInput & {exclusionId:string},executor:SqlExecutor=neonNotificationExecutor()):Promise<{status:'cleared'|'already-cleared'}> {
  validateInput(input);
  if(!input.exclusionId?.trim()) throw new GenerationScopeError();
  return withGenerationRetry(async()=>{
    const {source,changedAt}=await readGenerationSource(executor);
    authorize(source,input);
    const event=source.schedule_generation_exclusions.find(e=>e.id===input.exclusionId && e.workspace_id===input.workspaceId && e.week_start===input.weekStart && e.location_id===input.locationId);
    if(!event) throw new GenerationScopeError();
    const start=canonicalCivilMinute(String(event.assignment_start).slice(0,16)),end=canonicalCivilMinute(String(event.assignment_end).slice(0,16));
    // Events are created only after validating the original persisted shift.
    // A retained LEAD claim therefore proves its original designated flag was
    // true. Clearing needs no deleted-row lookup or extra headcount/capability rule.
    const originalWasDesignatedLead=(event.claims as GenerationClaims).claims.some(claim=>claim.kind==='LEAD');
    validateGenerationClaims(event.claims,{...input,timeZone:String(source.workspaces[0].time_zone)},{positionId:event.position_id as string|null,isDesignatedLead:originalWasDesignatedLead,date:start.slice(0,10),startTime:start.slice(11),endDate:end.slice(0,10),endTime:end.slice(11)});
    const guards=generationMutationGuards(source,[input.weekStart]);
    if(event.cleared_at!==null){await executor.transaction(guards);return {status:'already-cleared'};}
    const after=structuredClone(source);
    Object.assign(after.schedule_generation_exclusions.find(e=>e.id===event.id)!,{cleared_by:input.actorEmployeeId,cleared_at:changedAt});
    await executor.transaction([...guards,
      {text:'UPDATE schedule_generation_exclusions SET cleared_by=$2,cleared_at=$3 WHERE id=$1 AND cleared_at IS NULL',values:[input.exclusionId,input.actorEmployeeId,changedAt]},
      generationSourceGuard(after),
    ]);
    return {status:'cleared'};
  });
}
