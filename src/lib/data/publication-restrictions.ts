import type {GuardedWeekState,WeekMutationBatch} from './notification-transactions';
import {restrictionRules,firstRestrictionConflict} from '../scheduling/restrictions';
import {ManualAssignmentConflictError} from './manual-assignment-validation';
/** First publication changes retained Draft rows into employee assignments.
 * Check the new firm-rule facts captured in the existing publication snapshot;
 * legacy availability/preferences and historical published rows are untouched. */
export function validatePublicationRestrictions(state:GuardedWeekState,batch:WeekMutationBatch){
 const published=new Set(batch.afterSchedules.filter(s=>s.status==='PUBLISHED'&&state.schedules.some(old=>old.id===s.id&&old.status==='DRAFT')).map(s=>s.id));
 if(!published.size)return;
 const documents=new Map((state.assignmentFacts.schedulingRestrictionDocuments??[]).map(r=>[r.employeeId,r.document]));
 for(const assignment of batch.afterShifts){
  if(!published.has(assignment.scheduleId)||assignment.isCalloutApproved)continue;
  const rules=restrictionRules(documents.get(assignment.employeeId));
  if(firstRestrictionConflict(assignment,rules))throw new ManualAssignmentConflictError('AGREED_RESTRICTION','This draft contains an assignment that conflicts with an effective management-approved restriction. Repair it before publishing.');
 }
}
