"use server";

import { projectGenerationSetup, type GenerationSetupException } from '../../../lib/scheduling/generation/setup';
import { revalidatePath } from 'next/cache';
import { MANAGER_ROLES, requireRoles } from '@/lib/auth/permissions';
import { getWorkspace } from '@/lib/data/workspaces';
import { listLocations } from '@/lib/data/employees';
import { listPositions } from '@/lib/data/positions';
import { generateWeekDraft, type GenerationResult } from '@/lib/data/schedule-generation';
import { clearGenerationExclusion } from '@/lib/data/generation-exclusions';
import { GenerationConflictError, GenerationPermissionError, GenerationScopeError, GenerationTargetNotDraftError } from '@/lib/data/generation-guards';
import { weekStartFor } from '@/lib/date-utils';
import { schedulingIssueMessage } from '@/lib/scheduling/validate-shift';

export type GenerationActionState = {
  status:'idle'|'success'|'error'; message:string;
  result?: {
    status:GenerationResult['status']; changed:boolean;
    summary:Pick<GenerationResult['summary'],'added'|'removed'|'preserved'|'coverage'> & {attempted:number;needsSetup:number};
    gaps:{locationName:string;date:string;startTime:string;endTime:string;missingStaff:number;missingLead:boolean;positions:{name:string;missing:number}[]}[];
    notices:string[]; setupExceptions?:GenerationSetupException[];
  };
};
function validMonday(value:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value && weekStartFor(value)===value;
}
function fields(form:FormData,allowed:readonly string[]) {
  for(const [key,value] of form) {
    // Next preserves reserved SSR action metadata in hydrated fetch FormData.
    // It is transport only: never read it as identity, scope or solver input.
    if(key.startsWith('$ACTION_')) continue;
    if(!allowed.includes(key) || typeof value!=='string' || form.getAll(key).length!==1) throw new GenerationScopeError();
  }
}
function value(form:FormData,key:string) {const v=form.get(key);return typeof v==='string'?v:'';}
function failure(error:unknown):GenerationActionState {
  const message=error instanceof GenerationTargetNotDraftError?`Automatic scheduling requires Draft targets. Review: ${error.locationNames.join(', ')}.`:error instanceof GenerationConflictError?'Scheduling inputs changed or are busy. Reload this week and try again.':error instanceof GenerationPermissionError?'Your scheduling permission changed. Reload and try again.':error instanceof GenerationScopeError?'Choose a valid Monday, location scope and Draft schedule.':'The schedule could not be updated. Please try again.';
  return {status:'error',message};
}
function projection(result:GenerationResult,locations:{id:string;shortName:string}[],positions:{id:string;name:string}[]):NonNullable<GenerationActionState['result']> {
  const locationName=(id:string)=>locations.find(l=>l.id===id)?.shortName || 'Location unavailable';
  const positionName=(id:string)=>positions.find(p=>p.id===id)?.name || 'Position unavailable';
  const messages:Record<string,string>={MANAGER_EXCLUDED:'Manager excluded · Automatic fill off.',COUPLED_RESERVATION:'A Lead assignment would recreate Manager-excluded staffing.',NO_AUTOMATIC_CAPACITY:'No legal automatic capacity remains.',BUDGET_EXHAUSTED:'Search limit reached. Review remaining gaps.',LOCATION_NOT_READY:'Location needs setup.',TARGET_NOT_DRAFT:'Automatic scheduling requires a Draft target.',UNREPRESENTABLE_PERIOD:'A required period cannot be assigned automatically.'};
  const notices=[...result.explanations.filter(e=>e.code!=='LOCATION_NOT_READY'||!result.excludedLocations.some(l=>l.locationId===e.locationId)).map(e=>`${e.locationId?`${locationName(e.locationId)} · `:''}${e.distinctEmployeeCount?`${e.distinctEmployeeCount} employees unavailable for this constraint. `:''}${messages[e.code] || schedulingIssueMessage(e.code) || 'A scheduling constraint prevented automatic assignment.'}`),...result.warnings.map(w=>schedulingIssueMessage(w.code) || 'Review a scheduling warning.')];
  return {status:result.status,changed:result.changed,setupExceptions:projectGenerationSetup(result.excludedLocations,locations),summary:{added:result.summary.added,removed:result.summary.removed,preserved:result.summary.preserved,coverage:{requiredMinutes:result.summary.coverage.requiredMinutes,coveredMinutes:result.summary.coverage.coveredMinutes,percentage:result.summary.coverage.percentage,unavailable:result.summary.coverage.unavailable},attempted:result.locationIds.length,needsSetup:result.excludedLocations.length},gaps:result.gaps.map(g=>({locationName:locationName(g.locationId),date:g.date,startTime:g.startTime,endTime:g.endTime,missingStaff:g.missingStaff,missingLead:g.missingLead,positions:g.positions.map(p=>({name:positionName(p.positionId),missing:p.missing}))})),notices:[...new Set(notices)]};
}
export async function generateWeekAction(_previous:GenerationActionState,form:FormData):Promise<GenerationActionState> {
  // Redirecting authentication remains outside error handling.
  const session=await requireRoles(MANAGER_ROLES);
  try {
    fields(form,['weekStart','mode','scope','locationId']);
    const weekStart=value(form,'weekStart'),mode=value(form,'mode'),scope=value(form,'scope'),locationId=value(form,'locationId');
    if(!validMonday(weekStart) || !['BUILD_WEEK','FILL_GAPS_ONLY'].includes(mode) || !['ALL','SELECTED'].includes(scope) || (scope==='ALL'?form.has('locationId'):!locationId.trim())) throw new GenerationScopeError();
    const [workspace,locations,positions]=await Promise.all([getWorkspace(),listLocations({includeInactive:true}),listPositions({includeInactive:true})]);
    if(scope==='SELECTED'&&!locations.some(l=>l.id===locationId)) throw new GenerationScopeError();
    const result=await generateWeekDraft({workspaceId:workspace.id,actorEmployeeId:session.id,weekStart,mode:mode as 'BUILD_WEEK'|'FILL_GAPS_ONLY',locationScope:scope==='ALL'?{kind:'ALL'}:{kind:'SELECTED',locationIds:[locationId]}});
    if(result.changed) revalidatePath('/app/schedule');
    const message=result.status==='INVALID'?'Needs setup. No automatic assignments were made.':result.status==='BUDGET_EXHAUSTED'?'Search limit reached. Review the partial draft and remaining gaps.':result.status==='PARTIAL'?result.summary.added===0?'No legal additions were found. Review the remaining gaps.':'Partial draft saved. Review the remaining gaps.':result.changed?'Draft complete for configured coverage. Review before publishing.':'No changes needed. Configured coverage is complete.';
    return {status:'success',message,result:projection(result,locations,positions)};
  } catch(error) {return failure(error);}
}
export async function clearGenerationExclusionAction(_previous:GenerationActionState,form:FormData):Promise<GenerationActionState> {
  const session=await requireRoles(MANAGER_ROLES);
  try {
    fields(form,['weekStart','locationId','exclusionId']);
    const weekStart=value(form,'weekStart'),locationId=value(form,'locationId'),exclusionId=value(form,'exclusionId');
    if(!validMonday(weekStart)||!locationId.trim()||!exclusionId.trim()) throw new GenerationScopeError();
    const workspace=await getWorkspace();
    await clearGenerationExclusion({workspaceId:workspace.id,actorEmployeeId:session.id,weekStart,locationId,exclusionId});
    revalidatePath('/app/schedule');
    return {status:'success',message:'Automatic fill allowed for this need. Run Build Week or Fill Gaps Only when ready.'};
  } catch(error) {return failure(error);}
}
