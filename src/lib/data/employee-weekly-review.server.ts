import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type {EmployeeScheduleRead} from './employee-schedule';
import type {PublishedShiftSnapshot} from '../assistance/publication-diff';
import {buildAcknowledgementState,type EmployeeAcknowledgementState} from '../assistance/acknowledgement-state';
import {ownPublicationChanges} from '../notifications/device-state';
import {isValidWeekStart} from '../date-utils';
import {assertEmployeeViewProof,employeeReadLimits,readEmployeeWorkspace} from './employee-profile.server';
import {attentionGuards,attentionIntent,type AttentionIntent} from './employee-attention-receipts.server';
import {employeeAllowedLocationsSql} from './employee-schedule';
import {neonNotificationExecutor} from './notification-transactions';

export type EmployeeWeeklyReview=EmployeeScheduleRead&{displayedRevisionId:string|null;acknowledgement:EmployeeAcknowledgementState;intent:AttentionIntent|null;readIntent:AttentionIntent|null;read:boolean;publicationChanges:ReturnType<typeof ownPublicationChanges>};
const unavailable:EmployeeWeeklyReview={state:'unavailable',shifts:[],locations:[],displayedRevisionId:null,acknowledgement:{acknowledged:false,needsAcknowledgement:false},intent:null,readIntent:null,read:false,publicationChanges:[]};
type Observation={read:boolean;revisionId:string|null;acknowledgedRevisionId:string|null;complete:boolean;shifts:EmployeeScheduleRead['shifts'];locations:EmployeeScheduleRead['locations'];before:PublishedShiftSnapshot[];after:PublishedShiftSnapshot[]};
const snapshot=(revision:string)=>`SELECT rs.source_shift_id AS "sourceShiftId",rs.location_id AS "locationId",rs.employee_id AS "employeeId",rs.date::text AS date,
 left(rs.start_time::text,5) AS "startTime",left(rs.end_time::text,5) AS "endTime",rs.position_id AS "positionId",rs.position_name AS "positionName",
 rs.is_designated_lead AS "isDesignatedLead",rs.is_callout_approved AS "isCalloutApproved"
 FROM schedule_publication_revision_shifts rs JOIN allowed l ON l.id=rs.location_id WHERE rs.employee_id=$2 AND rs.revision_id=${revision} ORDER BY rs.source_shift_id`;
/** One SQL observation binds displayed published content, revision and canonical
 * acknowledgement. Final source/authority comparison discards any changed read. */
export async function readEmployeeWeeklyReview(proof:SessionMutationProof,weekStart:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeWeeklyReview>{
 try{
  assertEmployeeViewProof(proof);if(!isValidWeekStart(weekStart))return unavailable;
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),ref={kind:'SCHEDULE' as const,id:weekStart,version:''};
  const guards=[...employeeReadLimits,...attentionGuards(proof,workspace,ref)];
  const source={text:`WITH allowed AS MATERIALIZED(${employeeAllowedLocationsSql()}),
   latest AS (SELECT id FROM schedule_publication_revisions WHERE week_start=$3::date ORDER BY revision_number DESC LIMIT 1),
   ack AS (SELECT publication_revision_id AS id FROM schedule_acknowledgements WHERE week_start=$3::date AND employee_id=$2),
   before AS (${snapshot('(SELECT id FROM ack)')}),after AS (${snapshot('(SELECT id FROM latest)')}),
   own AS (SELECT rs.source_shift_id AS id,rs.schedule_id AS "scheduleId",rs.employee_id AS "employeeId",''::text AS "employeeName",
    rs.location_id AS "locationId",rs.date::text AS date,left(rs.start_time::text,5) AS "startTime",left(rs.end_time::text,5) AS "endTime",
    rs.position_id AS "positionId",rs.is_designated_lead AS "isDesignatedLead",rs.is_callout_approved AS "isCalloutApproved",'PUBLISHED'::text AS "scheduleStatus"
    FROM schedule_publication_revision_shifts rs JOIN allowed l ON l.id=rs.location_id WHERE rs.employee_id=$2 AND rs.revision_id=(SELECT id FROM latest)
    ORDER BY rs.date,rs.start_time,rs.source_shift_id LIMIT 501)
   SELECT EXISTS(SELECT 1 FROM employee_attention_receipts WHERE workspace_id=$1 AND employee_id=$2 AND source_kind='SCHEDULE' AND source_id=$3::text AND source_version=(SELECT id FROM latest)) AS read,(SELECT id FROM latest) AS "revisionId",(SELECT id FROM ack) AS "acknowledgedRevisionId",
    (SELECT count(*)>0 AND bool_and(EXISTS(SELECT 1 FROM schedules s WHERE s.location_id=l.id AND s.week_start=$3::date AND s.status='PUBLISHED')) FROM allowed l) AS complete,
    COALESCE((SELECT jsonb_agg(to_jsonb(own)) FROM own),'[]'::jsonb) AS shifts,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'shortName',short_name) ORDER BY id) FROM allowed),'[]'::jsonb) AS locations,
    COALESCE((SELECT jsonb_agg(to_jsonb(before)) FROM before),'[]'::jsonb) AS before,
    COALESCE((SELECT jsonb_agg(to_jsonb(after)) FROM after),'[]'::jsonb) AS after`,values:[workspace.id,proof.employee.id,weekStart]};
  const results=await executor.transaction([...guards,source],signal),row=results[guards.length]?.[0] as Observation|undefined;
  if(!row||!Array.isArray(row.shifts)||row.shifts.length>500||!Array.isArray(row.locations)||row.shifts.some(s=>s.employeeId!==proof.employee.id||!row.locations.some(l=>l.id===s.locationId)))return unavailable;
  const final=await executor.transaction([...guards,source],signal);
  if(JSON.stringify(final[guards.length]?.[0])!==JSON.stringify(row))return unavailable;
  const acknowledgement=buildAcknowledgementState({employeeId:proof.employee.id,latestRevisionId:row.revisionId??undefined,
   acknowledgementRevisionId:row.acknowledgedRevisionId??undefined,acknowledgedRevisionShifts:row.before,latestRevisionShifts:row.after});
  return {read:row.read,readIntent:row.revisionId&&row.shifts.length&&acknowledgement.acknowledged?attentionIntent(proof,workspace.id,'MARK_READ',{...ref,version:row.revisionId}):null,state:row.complete?'published':'unpublished',shifts:row.shifts,locations:row.locations,displayedRevisionId:row.revisionId,acknowledgement,
   intent:row.revisionId&&row.shifts.length&&acknowledgement.needsAcknowledgement?attentionIntent(proof,workspace.id,'CONFIRM_WEEK',{...ref,version:row.revisionId}):null,
   publicationChanges:acknowledgement.needsAcknowledgement?ownPublicationChanges(row.before,row.after,proof.employee.id):[]};
 }catch{return unavailable;}
}
