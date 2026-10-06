import { readGenerationReviewSnapshot, type GenerationRequest } from './schedule-generation-snapshot';
import { projectGenerationSetup, type GenerationSetupException } from '../scheduling/generation/setup';
import { deriveGenerationDemand } from '../scheduling/generation/demand';
import { selectActiveGenerationReservations } from '../scheduling/generation/reservations';
import type { GenerationDemand } from '../scheduling/generation/types';
export type ScheduleGenerationReview = {
  editable:boolean; unavailable?:boolean; attempted:number; needsSetup:number;
  setupExceptions?:GenerationSetupException[]; blockedLocations?:string[];
  coverage:GenerationDemand['coverage']|null;
  exclusions:{id:string;locationId:string;locationName:string;date:string;startTime:string;endTime:string;positionName?:string;needsLead:boolean}[];
};
/** Read-only Manager projection: demand/reservation selectors only, never the solver or a mutation. */
export async function getScheduleGenerationReview(request:Omit<GenerationRequest,'mode'>):Promise<ScheduleGenerationReview> {
  const {input}=await readGenerationReviewSnapshot({...request,mode:'FILL_GAPS_ONLY'});
  const demand=deriveGenerationDemand(input);
  const reservations=selectActiveGenerationReservations(input,demand);
  const ids=[...new Set(reservations.map(r=>r.eventId))].sort();
  const blockedLocations=demand.issues.filter(i=>i.code==='TARGET_NOT_DRAFT').map(i=>input.locations.find(l=>l.id===i.locationId)?.shortName || 'Location unavailable');
  return {editable:demand.ready,blockedLocations,setupExceptions:projectGenerationSetup(demand.excludedLocations,input.locations),attempted:demand.locationIds.length,needsSetup:demand.excludedLocations.length,coverage:demand.coverage,
    exclusions:ids.map(id=>{const event=input.exclusions.find(e=>e.id===id)!;const matching=reservations.filter(r=>r.eventId===id);return {id,locationId:event.locationId,locationName:input.locations.find(l=>l.id===event.locationId)?.shortName || 'Location unavailable',date:event.assignmentStart.slice(0,10),startTime:event.assignmentStart.slice(11,16),endTime:event.assignmentEnd.slice(11,16),...(event.positionId?{positionName:input.positions.find(p=>p.id===event.positionId)?.name || 'Position unavailable'}:{}),needsLead:matching.some(r=>r.claim.kind==='LEAD')};})};
}
