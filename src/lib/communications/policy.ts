import {businessDate,localDateTimeToInstant} from '../business-time';
import {addDays} from '../date-utils';
import {validateCommunicationDraft} from './validation';
/** Internal current server observation, never a client assertion or notification grant.
 * Tasks7–8 must derive and recheck these facts under protected source/session locks. */
export type CommunicationPolicyContext={
 actor:{id:string;role:string;active:boolean;workspaceId:string};workspaceId:string;workspaceActive:boolean;
 timeZone:string;observedAt:string;location:{id:string;workspaceId:string;active:boolean};
 assignments:readonly {employeeId:string;workspaceId:string;locationId:string;sourceShiftId:string;assignmentEpisodeId:string;termsFingerprint:string;published:boolean;released:boolean;startAt:string;endAt:string}[];
};
export function canAuthorCommunication(input:unknown,c:CommunicationPolicyContext):boolean{
 try{
  const parsed=validateCommunicationDraft(input);if(!parsed.ok)return false;const d=parsed.value;
  if(!c.workspaceActive||!c.actor.active||c.actor.workspaceId!==c.workspaceId||!c.location.active||c.location.workspaceId!==c.workspaceId||c.location.id!==d.scope.locationId)return false;
  const now=new Date(c.observedAt),today=businessDate(now,c.timeZone);
  if(d.expiresAt!==null&&Date.parse(d.expiresAt)<=now.getTime())return false;
  const management=['OWNER','MANAGER'].includes(c.actor.role);
  if(!management&&!['EMPLOYEE','LEAD'].includes(c.actor.role))return false;
  if(!management&&(d.type!=='TODAYS_TEAM'||d.acknowledgement==='REQUIRED'))return false;
  const eligible=c.assignments.filter(a=>a.workspaceId===c.workspaceId&&a.locationId===c.location.id&&a.published&&!a.released&&Number.isFinite(Date.parse(a.startAt))&&Date.parse(a.startAt)<Date.parse(a.endAt));
  if(d.scope.kind==='TODAYS_TEAM'){
   if(d.scope.businessDate!==today)return false;
   const first=Date.parse(localDateTimeToInstant(`${today}T00:00`,c.timeZone)),after=Date.parse(localDateTimeToInstant(`${addDays(today,1)}T00:00`,c.timeZone));
   return management||eligible.some(a=>a.employeeId===c.actor.id&&Date.parse(a.startAt)<after&&Date.parse(a.endAt)>first);
  }
  if(d.scope.kind==='SHIFT'){
   const s=d.scope;return management&&eligible.some(a=>a.sourceShiftId===s.sourceShiftId&&a.assignmentEpisodeId===s.assignmentEpisodeId&&a.termsFingerprint===s.termsFingerprint);
  }
  return management;
 }catch{return false;}
}
