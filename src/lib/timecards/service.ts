import {assertOperationalAccess,operationalScopeStatements,isOperationalAuthorizationError,readOperationalAuthority,operationalMembersStatements} from '../company-access/operational-scope.server';
import {scopeFootprint,footprintIds,employeeInScopeSql} from '../company-access/scope-sql';
import type {OperationalFootprint} from '../company-access/model';
import { createHash } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, isManagementAuthorizationError, managementSessionStatements } from '../data/management-session';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { parsePeriod, type Period } from './project';
import type { TimecardActionCapture } from '../action-center/canonical-source';
import { parseTimecardsResponse, type TimecardsResult } from './read-model';
import { resolveBreakPay, type BreakPayQuery } from '../payroll/native/break-pay';
export type { TimecardsResult } from './read-model';

export type TimecardCommand = Period & { operationId:string;employeeId:string;expectedRevision:number;
  expectedSourceHash:string;action:'APPROVE'|'FINALIZE'|'REOPEN';note?:string };
export type TimecardMutation = { status:'approved'|'finalized'|'reopened';operationId:string;revision:number } |
  {status:'blocked';reason:'self_review'|'unresolved_time'|'approval_required'|'period_state'|'overlapping_period'|'payroll_approved'|'outside_scope'|'company_required'} |
  {status:'conflict'|'unavailable'} | {status:'outcome-unknown';operationId:string};
const object = (v:unknown):v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v:unknown):v is string => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const sourceHash = (v:unknown):v is string => typeof v==='string' && /^[a-f0-9]{32}$/.test(v);
const safeText=(v:unknown,max=300):v is string=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const manager = (proof:SessionMutationProof) => ['OWNER','MANAGER'].includes(proof.employee.role);

export function parseTimecardCommand(v:unknown):TimecardCommand {
  if(!object(v)||!uuid(v.operationId)||!safeText(v.employeeId,200)||!Number.isSafeInteger(v.expectedRevision)||Number(v.expectedRevision)<0||
    !sourceHash(v.expectedSourceHash)||!['APPROVE','FINALIZE','REOPEN'].includes(String(v.action))||
    !(v.note===undefined||safeText(v.note,500))||Object.keys(v).some(k=>!['operationId','employeeId','startDate','endDate','expectedRevision','expectedSourceHash','action','note'].includes(k))) throw new Error('Invalid timecard command');
  if(v.action==='REOPEN'&&!v.note)throw new Error('Reopen requires a reason');
  const period=parsePeriod(String(v.startDate),String(v.endDate));
  return {...period,operationId:v.operationId,employeeId:v.employeeId,expectedRevision:Number(v.expectedRevision),
    expectedSourceHash:v.expectedSourceHash,action:v.action as TimecardCommand['action'],...(v.note?{note:v.note as string}:{})};
}

// Internal only: retain native correction locations omitted from TimecardSource.
// Roots are the exact request IDs in current source and every retained period
// snapshot; the connected missing-entry traversal is the canonical D2 UNION
// ancestor/descendant closure, not the public last-five decision list.
const timecardCorrectionCaptureSql = `(WITH RECURSIVE captured_ids AS (
  SELECT c->>'id' AS id FROM jsonb_array_elements(s.current_source->'corrections') c
  UNION SELECT c->>'id' FROM timecard_revisions h
    CROSS JOIN LATERAL jsonb_array_elements(h.snapshot->'corrections') c
    WHERE h.workspace_id=$1 AND h.employee_id=s.id AND h.start_date=$4::date AND h.end_date=$5::date
), roots AS MATERIALIZED (
  SELECT r.* FROM time_correction_requests r WHERE r.id::text IN (SELECT id FROM captured_ids)
    AND r.workspace_id=$1 AND r.employee_id=s.id
), chain AS (
  SELECT a.id,a.request_id,a.supersedes_adjustment_id FROM time_correction_adjustments a
    WHERE a.workspace_id=$1 AND a.employee_id=s.id AND a.kind='MISSING_ENTRY'
      AND (a.request_id IN (SELECT id FROM roots WHERE kind='MISSING_ENTRY')
        OR a.id IN (SELECT base_adjustment_id FROM roots WHERE kind='MISSING_ENTRY'))
  UNION
  SELECT a.id,a.request_id,a.supersedes_adjustment_id FROM time_correction_adjustments a JOIN chain c
    ON a.supersedes_adjustment_id=c.id OR c.supersedes_adjustment_id=a.id
    WHERE a.workspace_id=$1 AND a.employee_id=s.id AND a.kind='MISSING_ENTRY'
), requests AS MATERIALIZED (
  SELECT r.* FROM time_correction_requests r WHERE r.workspace_id=$1 AND r.employee_id=s.id
    AND (r.id IN (SELECT id FROM roots) OR r.id IN (SELECT request_id FROM chain)
      OR EXISTS (SELECT 1 FROM roots base WHERE base.kind<>'MISSING_ENTRY' AND r.kind=base.kind
        AND r.time_entry_id IS NOT DISTINCT FROM base.time_entry_id AND r.break_entry_id IS NOT DISTINCT FROM base.break_entry_id))
), adjustments AS MATERIALIZED (
  SELECT a.* FROM time_correction_adjustments a WHERE a.workspace_id=$1 AND a.employee_id=s.id
    AND (a.request_id IN (SELECT id FROM requests) OR a.id IN (SELECT id FROM chain))
), location_ids AS (
  SELECT location_id AS id FROM requests
  UNION SELECT source_snapshot->>'locationId' FROM requests
  UNION SELECT location_id FROM adjustments
  UNION SELECT source_snapshot->>'locationId' FROM adjustments
  UNION SELECT t.location_id FROM time_entries t WHERE t.id IN (SELECT time_entry_id FROM requests)
)
SELECT jsonb_build_object(
  'referencedRequestIds',COALESCE((SELECT jsonb_agg(id ORDER BY id COLLATE "C") FROM captured_ids),'[]'::jsonb),
  'requests',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id::text,
    'workspaceId',r.workspace_id,'employeeId',r.employee_id,'locationId',r.location_id,
    'snapshotLocationId',r.source_snapshot->>'locationId','revision',e.revision)
    ORDER BY r.id) FROM requests r LEFT JOIN LATERAL (
      SELECT revision FROM time_correction_events WHERE request_id=r.id ORDER BY revision DESC LIMIT 1
    ) e ON true),'[]'::jsonb),
  'adjustments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id::text,
    'workspaceId',a.workspace_id,'employeeId',a.employee_id,'locationId',a.location_id,
    'snapshotLocationId',a.source_snapshot->>'locationId','requestId',a.request_id::text,
    'sourceRevision',a.source_revision,'supersedesId',a.supersedes_adjustment_id::text)
    ORDER BY a.id) FROM adjustments a),'[]'::jsonb),
  'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ids.id,'workspaceId',l.workspace_id)
    ORDER BY ids.id COLLATE "C") FROM location_ids ids LEFT JOIN locations l ON l.id=ids.id
    WHERE ids.id IS NOT NULL),'[]'::jsonb)
))`;

// Finalization freezes the reviewed source. Approval remains tied to the current
// source hash, so subsequent changes surface as NEEDS_REVIEW rather than approval.
// B-12: a scoped read adds $6, the actor's location scope (NULL for Company and for an employee's own card); the
// filter runs in the same statement, inside the transaction that re-proves that scope. Unscoped text is unchanged,
// because period close embeds and fingerprints it.
const inScope=(scoped:boolean,employee:string,ids='$6::text[]')=>scoped?` AND ${employeeInScopeSql(employee,'$1',ids)}`:'';
const outsideScopeSql=`
  'outsideScope',$6::text[] IS NOT NULL AND (
    EXISTS(SELECT 1 FROM jsonb_array_elements((CASE WHEN s.action='FINALIZE' THEN s.snapshot ELSE s.current_source END)->'entries') x WHERE NOT (x->>'locationId'=ANY($6::text[])))
    OR EXISTS(SELECT 1 FROM jsonb_array_elements((CASE WHEN s.action='FINALIZE' THEN s.snapshot ELSE s.current_source END)->'corrections') c
      JOIN time_correction_requests r ON r.id::text=c->>'id' WHERE r.workspace_id=$1 AND NOT (r.location_id=ANY($6::text[])))),`;
const timecardReadSqlFor=(includeInternalCapture = false,scoped = false)=>`WITH scope AS (
  SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id
  WHERE l.workspace_id=$1 AND ($2::boolean OR e.id=$3)${inScope(scoped,'e.id')}
), sources AS (
  SELECT s.id,nevora_timecard_source($1,s.id,$4::date,$5::date) AS current_source,
    c.revision,c.action,c.source_hash,c.snapshot
  FROM scope s LEFT JOIN nevora_timecard_latest c ON c.workspace_id=$1 AND c.employee_id=s.id AND c.start_date=$4::date AND c.end_date=$5::date
)
SELECT clock_timestamp()::text AS "observedAt",COALESCE(jsonb_agg(jsonb_build_object(
  'source',CASE WHEN s.action='FINALIZE' THEN s.snapshot ELSE s.current_source END,
  'sourceHash',CASE WHEN s.action='FINALIZE' THEN s.source_hash ELSE md5(s.current_source::text) END,${scoped?outsideScopeSql:''}
  'revision',COALESCE(s.revision,0),'state',CASE WHEN s.action='FINALIZE' THEN 'FINALIZED'
    WHEN s.action='REOPEN' THEN 'REOPENED' WHEN s.action='APPROVE' AND s.source_hash=md5(s.current_source::text) THEN 'APPROVED'
    WHEN s.action='APPROVE' THEN 'NEEDS_REVIEW' ELSE 'DRAFT' END,
  'history',COALESCE((SELECT jsonb_agg(jsonb_build_object('operationId',h.operation_id,'revision',h.revision,
    'action',h.action,'occurredAt',h.occurred_at::text,'actorName',trim(a.first_name||' '||a.last_name),
    'note',h.note,'sourceHash',h.source_hash,'snapshot',h.snapshot) ORDER BY h.revision DESC)
    FROM timecard_revisions h JOIN employees a ON a.id=h.actor_employee_id
    WHERE h.workspace_id=$1 AND h.employee_id=s.id AND h.start_date=$4::date AND h.end_date=$5::date),'[]'::jsonb)
) ORDER BY s.id),'[]'::jsonb) AS cards${includeInternalCapture ? `,
COALESCE(jsonb_agg(jsonb_build_object('employeeId',s.id,'source',s.current_source,'sourceHash',md5(s.current_source::text),'correctionFootprint',${timecardCorrectionCaptureSql}) ORDER BY s.id),'[]'::jsonb) AS "internalCurrentSources"` : ''} FROM sources s`;
export const timecardReadSql=timecardReadSqlFor();
// Pay treatment of each recorded break comes from the employee's payroll break rules,
// read beside the hashed source (never inside it) and resolved on the server.
const timecardBreakTypesSql=(scoped:boolean)=>`SELECT b.id,b.break_type_id AS "typeId",t.employee_id AS "employeeId" FROM break_entries b
  JOIN time_entries t ON t.id=b.time_entry_id JOIN employees e ON e.id=t.employee_id JOIN locations l ON l.id=e.primary_location_id
  WHERE l.workspace_id=$1 AND ($2::boolean OR e.id=$3)${inScope(scoped,'e.id')} AND t.clock_in_at<($5::date+3)::timestamptz
    AND (t.clock_out_at IS NULL OR t.clock_out_at>($4::date-2)::timestamptz) ORDER BY b.id`;
const timecardPayProfilesSql=(scoped:boolean)=>`SELECT p.employee_id AS "employeeId",p.payload AS configuration FROM native_payroll_profiles_current p
  JOIN employees e ON e.id=p.employee_id JOIN locations l ON l.id=e.primary_location_id
  WHERE p.workspace_id=$1 AND l.workspace_id=$1 AND ($2::boolean OR e.id=$3)${inScope(scoped,'e.id','$4::text[]')} ORDER BY p.employee_id`;
const missingPayProfiles=(error:unknown)=>object(error)&&String(error.code)==='42P01'&&/native_payroll_profiles_current/.test(String(error.message));
function withBreakPay(row:unknown,types:unknown[],profiles:unknown[]):unknown{
  if(!object(row)||!Array.isArray(row.cards))return row;
  const typeIds=new Map<string,{typeId:string|null;employeeId:string}>();
  for(const t of types)if(object(t)&&typeof t.id==='string'&&typeof t.employeeId==='string')typeIds.set(t.id,{typeId:typeof t.typeId==='string'?t.typeId:null,employeeId:t.employeeId});
  const rows=profiles.filter(object).map(p=>({employeeId:String(p.employeeId),configuration:p.configuration}));
  return {...row,cards:row.cards.map(card=>{
    if(!object(card)||!object(card.source)||!Array.isArray(card.source.entries))return card;
    const employeeId=String(card.source.employeeId);
    const breaks:BreakPayQuery[]=card.source.entries.filter(object).flatMap(e=>Array.isArray(e.breaks)?e.breaks.filter(object).flatMap(b=>{
      const known=typeIds.get(String(b.id));
      if(!known||known.employeeId!==employeeId||typeof b.startAt!=='string'||!(b.endAt===null||typeof b.endAt==='string'))return [];
      return [{id:String(b.id),employeeId,typeId:known.typeId,locationId:String(e.locationId),startAt:b.startAt,endAt:b.endAt as string|null}];
    }):[]);
    try{return {...card,breakPay:resolveBreakPay(rows.filter(r=>r.employeeId===employeeId),breaks)};}catch{return {...card,breakPay:{}};}
  })};
}

async function readTimecardsCore(proof:SessionMutationProof,requested:Period,executor:SqlExecutor=neonNotificationExecutor(),capture?: (value: TimecardActionCapture) => void,scoped=false):Promise<TimecardsResult> {
  try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
  const period=parsePeriod(requested.startDate,requested.endDate);
  const readRoles=manager(proof)?['OWNER','MANAGER'] as const:['EMPLOYEE','LEAD'] as const;
  try {
    const workspace=await getWorkspace(executor),started=performance.now();
    // B-12: a scoped read covers the Manager's or Owner's current operational scope (Company, or the employees of
    // their locations) and re-proves that exact authority digest inside the read transaction, before and after the
    // rows. Unscoped reads are for callers that already hold Company authority (payroll export, Owner review).
    let footprint:OperationalFootprint|null=null,authority:string|undefined,scopeBudget=Infinity;
    if(scoped&&manager(proof)){
      const view=await readOperationalAuthority(proof,executor);
      if(view.state!=='ready')return {state:'unavailable',reason:view.reason==='access_denied'?'access_denied':'read_failed'};
      if(!view.scope)return {state:'unavailable',reason:'access_denied'};
      footprint=scopeFootprint(view.scope);authority=view.authority;scopeBudget=view.validForMs;
    }
    const ids=footprint?footprintIds(footprint):null;
    const scopeGuard=()=>footprint?operationalScopeStatements(proof,workspace,footprint,authority):[];
    const guards=[...workspaceReadGuard(workspace),
      {text:'SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE l.workspace_id=$1 AND ($2::boolean OR e.id=$3) ORDER BY e.id FOR SHARE OF e',values:[workspace.id,manager(proof),proof.employee.id]},
      ...managementSessionStatements(proof,proof.employee.id,readRoles),...scopeGuard(),
    ];
    const base=[workspace.id,manager(proof),proof.employee.id,period.startDate,period.endDate],values=scoped?[...base,ids]:base;
    const read=(withProfiles:boolean)=>executor.transaction([...guards,{text:capture||scoped ? timecardReadSqlFor(!!capture,scoped) : timecardReadSql,values},
      {text:timecardBreakTypesSql(scoped),values},...(withProfiles?[{text:timecardPayProfilesSql(scoped),values:scoped?[...base.slice(0,3),ids]:base.slice(0,3)}]:[]),
      ...managementSessionStatements(proof,proof.employee.id,readRoles),...scopeGuard()]);
    let results,withProfiles=true;
    try{results=await read(true);}catch(error){if(!missingPayProfiles(error))throw error;withProfiles=false;results=await read(false);}
    const result=parseTimecardsResponse(withBreakPay(results[guards.length]?.[0],results[guards.length+1]??[],withProfiles?results[guards.length+2]??[]:[]),period);
    if(!manager(proof)&&result.cards.some(c=>c.card.employeeId!==proof.employee.id))throw new Error('Incorrect scope');
    const session=await executor.query<{remaining:number}>({text:`SELECT floor(LEAST(45000,EXTRACT(epoch FROM(s.expires_at-clock_timestamp()))*1000))::integer AS remaining
      FROM employee_sessions s JOIN employees e ON e.id=s.employee_id JOIN locations l ON l.id=e.primary_location_id
      WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role=ANY($3::text[]) AND l.workspace_id=$4 AND s.expires_at>clock_timestamp()`,values:[proof.sessionTokenHash,proof.employee.id,readRoles,workspace.id]});
    if(!session[0])return {state:'unavailable',reason:'access_denied'};
    // A scoped projection crosses the admitted authority once more before it is returned.
    if(footprint)await executor.transaction([...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},...scopeGuard()]);
    const validForMs=Math.floor(Math.min(session[0].remaining,scopeBudget)-(performance.now()-started));if(validForMs<1)throw Error('Timecards expired');
    if (capture) {
      const capturedRow = results[guards.length]?.[0] as { internalCurrentSources?: unknown } | undefined;
      const raw = capturedRow?.internalCurrentSources;
      // Validation/coherence remains in the pure capture parser; do not copy private rows to view.
      capture({ workspaceId: workspace.id, actorEmployeeId: proof.employee.id, projection: result, currentSources: raw,
        validForMs });
    }
    return {...result,validForMs};
  }catch(error){
    if(isManagementAuthorizationError(error)||isOperationalAuthorizationError(error))return {state:'unavailable',reason:'access_denied'};
    const message=error instanceof Error?error.message:'';
    const code=object(error)?String(error.code):'';
    return {state:'unavailable',reason:/SOURCE_LIMIT|source limit/.test(message)?'source_limit':['42P01','42883'].includes(code)?'schema_missing':'read_failed'};
  }
}

/** Reopening hours that an approved payroll already paid would leave the run, YTD and published pay statements on
 * the old hours with nothing flagging it. While the latest payroll run for an overlapping period is APPROVED and pays
 * this person, reopen is refused; starting a payroll correction for that period (which recalculates from current
 * hours until it's approved) lifts the block. Runs list people in rows (provider import) or nativeCalculation. */
export function payrollApprovedGuard(workspaceId:string,employeeId:string,startDate:string,endDate:string){
  return {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id
    WHERE r.workspace_id=$1 AND r.start_date<=$4::date AND r.end_date>=$3::date AND c.payload->>'status'='APPROVED'
     AND NOT EXISTS(SELECT 1 FROM payroll_runs child WHERE child.workspace_id=r.workspace_id AND child.correction_of=r.id)
     AND (EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c.payload->'rows')='array' THEN c.payload->'rows' ELSE '[]'::jsonb END) x WHERE x->>'employeeId'=$2)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c.payload->'nativeCalculation'->'employees')='array' THEN c.payload->'nativeCalculation'->'employees' ELSE '[]'::jsonb END) x WHERE x->>'employeeId'=$2)))
    THEN 'nevora_timecard_PAYROLL_APPROVED' ELSE '1' END)::integer`,values:[workspaceId,employeeId,startDate,endDate]};
}

/** B-12, location-scoped Managers only (Company adds nothing). Reopening finalized, payroll-facing time stays with
 * Owners and company-wide Managers. Approve and finalize also need every entry and correction on the card to be at a
 * location in the scope: the card being reviewed is the live source the command function hashes, read here in the
 * same transaction. */
function locationScopedTimecardStatements(workspaceId:string,command:TimecardCommand,footprint:OperationalFootprint){
  const ids=footprintIds(footprint);
  if(ids===null)return [];
  if(command.action==='REOPEN')return [{text:"SELECT 'nevora_timecard_COMPANY_REQUIRED'::integer",values:[]}];
  return [{text:`WITH source AS (SELECT nevora_timecard_source($1,$2,$3::date,$4::date) AS s)
    SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM source,jsonb_array_elements(source.s->'entries') x WHERE NOT (x->>'locationId'=ANY($5::text[])))
      AND NOT EXISTS(SELECT 1 FROM source,jsonb_array_elements(source.s->'corrections') c JOIN time_correction_requests r ON r.id::text=c->>'id'
        WHERE r.workspace_id=$1 AND NOT (r.location_id=ANY($5::text[])))
    THEN '1' ELSE 'nevora_timecard_OUTSIDE_SCOPE' END)::integer`,values:[workspaceId,command.employeeId,command.startDate,command.endDate,ids]}];
}

/**
 * Submit one revision/hash-bound command to the database lifecycle authority.
 * Employee locks precede fresh company-scope guards; transient lock failures retry
 * the same operation identity. An uncertain transport outcome must be recovered
 * with that identity, because the database may already have committed the command.
 * Malformed commands throw before any mutation is attempted.
 */
export async function mutateTimecard(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<TimecardMutation> {
  try{assertManagementProof(proof,proof?.employee?.id);}catch{return {status:'unavailable'};}
  if(!manager(proof))return {status:'unavailable'};
  const command=parseTimecardCommand(input);
  let workspace;
  let authority:string;
  let footprint:OperationalFootprint;
  // B-12: admit the actor's actual scope (Company or Locations), never a wider one.
  try{const access=await assertOperationalAccess(proof,undefined,executor);workspace=access.workspace;authority=access.authority;footprint=scopeFootprint(access.scope);}catch{return {status:'unavailable'};}
  const actor=proof.employee.id;
  const statements=[...workspaceReadGuard(workspace),
    {text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([actor,command.employeeId])].sort()]},
    ...operationalScopeStatements(proof,workspace,footprint,authority),
    // An out-of-scope employee fails here with the same receipt as an unknown one.
    ...operationalMembersStatements(workspace,footprint,[command.employeeId]),
    ...locationScopedTimecardStatements(workspace.id,command,footprint),
    ...(command.action==='REOPEN'?[payrollApprovedGuard(workspace.id,command.employeeId,command.startDate,command.endDate)]:[]),
    {text:'SELECT nevora_timecard_command($1::uuid,$2,$3,$4,$5::date,$6::date,$7::integer,$8,$9,$10,$11) AS result',
      values:[command.operationId,workspace.id,command.employeeId,actor,command.startDate,command.endDate,command.expectedRevision,
        command.expectedSourceHash,command.action,command.note??null,createHash('sha256').update(JSON.stringify(command)).digest('hex')]},
    ...operationalScopeStatements(proof,workspace,footprint,authority),
  ];
  for(let attempt=0;attempt<3;attempt++){
    try{
      const result=await executor.transaction(statements);
      const row=result[statements.findIndex(s=>s.text.includes('nevora_timecard_command'))]?.[0];
      const v=object(row)?row.result:null;
      if(!object(v)||!['approved','finalized','reopened'].includes(String(v.status))||v.operationId!==command.operationId||!Number.isSafeInteger(v.revision)||Number(v.revision)<1)throw new Error('Invalid timecard receipt');
      return {status:v.status as 'approved'|'finalized'|'reopened',operationId:command.operationId,revision:Number(v.revision)};
    }catch(error){
      if(isManagementAuthorizationError(error)||isOperationalAuthorizationError(error))return {status:'unavailable'};
      const message=error instanceof Error?error.message:'';const code=object(error)?String(error.code??''):'';
      if(/nevora_timecard_CONFLICT/.test(message)||code==='23505')return {status:'conflict'};
      const reasons=[['OUTSIDE_SCOPE','outside_scope'],['COMPANY_REQUIRED','company_required'],['SELF_REVIEW','self_review'],['UNRESOLVED','unresolved_time'],['APPROVAL_REQUIRED','approval_required'],['PAYROLL_APPROVED','payroll_approved'],['STATE','period_state'],['OVERLAPPING_PERIOD','overlapping_period']] as const;
      for(const [pattern,reason] of reasons)if(message.includes('nevora_timecard_'+pattern))return {status:'blocked',reason};
      if(['40001','40P01','55P03'].includes(code)){if(attempt<2)continue;return {status:'conflict'};}
      if(/AUTH_REQUIRED|SOURCE_LIMIT|INVALID/.test(message)||['42P01','42883','23503','23514'].includes(code))return {status:'unavailable'};
      if(!code||/^(ECONN|ETIMEDOUT|UND_ERR|57014)/.test(code))return {status:'outcome-unknown',operationId:command.operationId};
      return {status:'unavailable'};
    }
  }
  return {status:'conflict'};
}

/** B-12: the team timecards of the actor's current operational scope (Company, or the people of a location-scoped
 * Manager's locations), with the scope re-proved inside the read. An Employee or Lead gets their own card. */
export async function readScopedTimecards(proof:SessionMutationProof,requested:Period,executor:SqlExecutor=neonNotificationExecutor()):Promise<TimecardsResult> {
 return readTimecardsCore(proof,requested,executor,undefined,true);
}
/** Return a session-bounded view; consumers must stop treating it as current after validForMs. Managers' callers
 * must already hold current Company authority; use readScopedTimecards otherwise. */
export async function readTimecards(proof:SessionMutationProof,requested:Period,executor:SqlExecutor=neonNotificationExecutor()):Promise<TimecardsResult> {
 return readTimecardsCore(proof,requested,executor);
}
/** Keep action-center source/authority evidence server-side and separate from the public view. */
export async function readTimecardsWithInternalCapture(proof:SessionMutationProof,requested:Period,executor:SqlExecutor=neonNotificationExecutor()) {
 const retained: {capture: TimecardActionCapture | null} = {capture:null};
 const view=await readTimecardsCore(proof,requested,executor,value => { retained.capture=value; });
 return { view, capture: view.state==='ready' ? retained.capture : null };
}
