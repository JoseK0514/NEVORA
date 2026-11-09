import {businessDate,localDateTimeToInstant,shiftBoundaryInstants} from '../business-time';
import {addDays} from '../date-utils';
import {canAuthorCommunication,type CommunicationPolicyContext} from './policy';
import type {CommunicationDraft} from './types';
export type AudienceGrant={employeeId:string;kind:'LOCATION'|'ASSIGNMENT';sourceShiftId?:string;assignmentEpisodeId?:string;termsFingerprint?:string};
export type CommunicationFacts={
 actor:CommunicationPolicyContext['actor'];location:CommunicationPolicyContext['location'];
 members:{id:string}[];assignments:{employeeId:string;sourceShiftId:string;assignmentEpisodeId:string;termsFingerprint:string;date:string;startTime:string;endTime:string;published:boolean;released:boolean}[];
};
/** Pure projection of server-observed facts into sorted grants. Location grants use
 * current members; day/shift grants pin an exact published assignment episode and
 * terms fingerprint. Overnight overlap uses workspace-local day boundaries. */
export function projectCommunicationAudience(draft:CommunicationDraft,facts:CommunicationFacts,workspace:{id:string;active:boolean;timeZone:string},observedAt:string){
 if(!facts?.actor||!facts.location||!Array.isArray(facts.members)||!Array.isArray(facts.assignments)||facts.members.length>1000||facts.assignments.length>1000)throw Error('communication_source_unavailable');
 const assignments=facts.assignments.map(a=>({...a,workspaceId:workspace.id,locationId:facts.location.id,...shiftBoundaryInstants(a,workspace.timeZone)}));
 const context:CommunicationPolicyContext={actor:facts.actor,workspaceId:workspace.id,workspaceActive:workspace.active,timeZone:workspace.timeZone,observedAt,location:facts.location,assignments};
 const members=new Set(facts.members.map(m=>m.id));
 const day=draft.scope.kind==='TODAYS_TEAM'?draft.scope.businessDate:businessDate(new Date(observedAt),workspace.timeZone),first=Date.parse(localDateTimeToInstant(`${day}T00:00`,workspace.timeZone)),after=Date.parse(localDateTimeToInstant(`${addDays(day,1)}T00:00`,workspace.timeZone));
 const scope=draft.scope;
 const eligible=assignments.filter(a=>a.published&&!a.released&&members.has(a.employeeId)&&
  (scope.kind==='SHIFT'?a.sourceShiftId===scope.sourceShiftId&&a.assignmentEpisodeId===scope.assignmentEpisodeId&&a.termsFingerprint===scope.termsFingerprint:Date.parse(a.startAt)<after&&Date.parse(a.endAt)>first));
 const grants:AudienceGrant[]=scope.kind==='LOCATION'?facts.members.map(m=>({employeeId:m.id,kind:'LOCATION'})):
  [...new Map(eligible.sort((a,b)=>a.sourceShiftId.localeCompare(b.sourceShiftId)).map(a=>[a.employeeId,{employeeId:a.employeeId,kind:'ASSIGNMENT' as const,sourceShiftId:a.sourceShiftId,assignmentEpisodeId:a.assignmentEpisodeId,termsFingerprint:a.termsFingerprint}])).values()];
 return {context,grants:grants.sort((a,b)=>a.employeeId.localeCompare(b.employeeId)),allowed:canAuthorCommunication(draft,context)};
}
