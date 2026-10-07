import { createHash } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, isManagementAuthorizationError, managementSessionStatements } from '../data/management-session';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { parsePeriod, type Period } from './project';
import { parseTimecardsResponse, type TimecardsResult } from './read-model';
export type { TimecardsResult } from './read-model';

export type TimecardCommand = Period & { operationId:string;employeeId:string;expectedRevision:number;
  expectedSourceHash:string;action:'APPROVE'|'FINALIZE'|'REOPEN';note?:string };
export type TimecardMutation = { status:'approved'|'finalized'|'reopened';operationId:string;revision:number } |
  {status:'blocked';reason:'self_review'|'unresolved_time'|'approval_required'|'period_state'|'overlapping_period'} |
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

const readSql=`WITH scope AS (
  SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id
  WHERE l.workspace_id=$1 AND ($2::boolean OR e.id=$3)
), sources AS (
  SELECT s.id,nevora_timecard_source($1,s.id,$4::date,$5::date) AS current_source,
    c.revision,c.action,c.source_hash,c.snapshot
  FROM scope s LEFT JOIN nevora_timecard_latest c ON c.workspace_id=$1 AND c.employee_id=s.id AND c.start_date=$4::date AND c.end_date=$5::date
)
SELECT clock_timestamp()::text AS "observedAt",COALESCE(jsonb_agg(jsonb_build_object(
  'source',CASE WHEN s.action='FINALIZE' THEN s.snapshot ELSE s.current_source END,
  'sourceHash',CASE WHEN s.action='FINALIZE' THEN s.source_hash ELSE md5(s.current_source::text) END,
  'revision',COALESCE(s.revision,0),'state',CASE WHEN s.action='FINALIZE' THEN 'FINALIZED'
    WHEN s.action='REOPEN' THEN 'REOPENED' WHEN s.action='APPROVE' AND s.source_hash=md5(s.current_source::text) THEN 'APPROVED'
    WHEN s.action='APPROVE' THEN 'NEEDS_REVIEW' ELSE 'DRAFT' END,
  'history',COALESCE((SELECT jsonb_agg(jsonb_build_object('operationId',h.operation_id,'revision',h.revision,
    'action',h.action,'occurredAt',h.occurred_at::text,'actorName',trim(a.first_name||' '||a.last_name),
    'note',h.note,'sourceHash',h.source_hash,'snapshot',h.snapshot) ORDER BY h.revision DESC)
    FROM timecard_revisions h JOIN employees a ON a.id=h.actor_employee_id
    WHERE h.workspace_id=$1 AND h.employee_id=s.id AND h.start_date=$4::date AND h.end_date=$5::date),'[]'::jsonb)
) ORDER BY s.id),'[]'::jsonb) AS cards FROM sources s`;

export async function readTimecards(proof:SessionMutationProof,requested:Period,executor:SqlExecutor=neonNotificationExecutor()):Promise<TimecardsResult> {
  try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
  const period=parsePeriod(requested.startDate,requested.endDate);
  const readRoles=manager(proof)?['OWNER','MANAGER'] as const:['EMPLOYEE','LEAD'] as const;
  try {
    const workspace=await getWorkspace(executor);
    const guards=[...workspaceReadGuard(workspace),
      {text:'SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE l.workspace_id=$1 AND ($2::boolean OR e.id=$3) ORDER BY e.id FOR SHARE OF e',values:[workspace.id,manager(proof),proof.employee.id]},
      ...managementSessionStatements(proof,proof.employee.id,readRoles),
    ];
    const results=await executor.transaction([...guards,{text:readSql,values:[workspace.id,manager(proof),proof.employee.id,period.startDate,period.endDate]},
      ...managementSessionStatements(proof,proof.employee.id,readRoles)]);
    const result=parseTimecardsResponse(results[guards.length]?.[0],period);
    if(!manager(proof)&&result.cards.some(c=>c.card.employeeId!==proof.employee.id))throw new Error('Incorrect scope');
    return result;
  }catch(error){
    if(isManagementAuthorizationError(error))return {state:'unavailable',reason:'access_denied'};
    const message=error instanceof Error?error.message:'';
    const code=object(error)?String(error.code):'';
    return {state:'unavailable',reason:/SOURCE_LIMIT|source limit/.test(message)?'source_limit':['42P01','42883'].includes(code)?'schema_missing':'read_failed'};
  }
}

export async function mutateTimecard(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<TimecardMutation> {
  try{assertManagementProof(proof,proof?.employee?.id);}catch{return {status:'unavailable'};}
  if(!manager(proof))return {status:'unavailable'};
  const command=parseTimecardCommand(input);
  let workspace;
  try{workspace=await getWorkspace(executor);}catch{return {status:'unavailable'};}
  const actor=proof.employee.id;
  const statements=[...workspaceReadGuard(workspace),
    {text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([actor,command.employeeId])].sort()]},
    ...managementSessionStatements(proof,actor,['OWNER','MANAGER']),
    {text:'SELECT nevora_timecard_command($1::uuid,$2,$3,$4,$5::date,$6::date,$7::integer,$8,$9,$10,$11) AS result',
      values:[command.operationId,workspace.id,command.employeeId,actor,command.startDate,command.endDate,command.expectedRevision,
        command.expectedSourceHash,command.action,command.note??null,createHash('sha256').update(JSON.stringify(command)).digest('hex')]},
    ...managementSessionStatements(proof,actor,['OWNER','MANAGER']),
  ];
  for(let attempt=0;attempt<3;attempt++){
    try{
      const result=await executor.transaction(statements);
      const row=result[statements.findIndex(s=>s.text.includes('nevora_timecard_command'))]?.[0];
      const v=object(row)?row.result:null;
      if(!object(v)||!['approved','finalized','reopened'].includes(String(v.status))||v.operationId!==command.operationId||!Number.isSafeInteger(v.revision)||Number(v.revision)<1)throw new Error('Invalid timecard receipt');
      return {status:v.status as 'approved'|'finalized'|'reopened',operationId:command.operationId,revision:Number(v.revision)};
    }catch(error){
      if(isManagementAuthorizationError(error))return {status:'unavailable'};
      const message=error instanceof Error?error.message:'';const code=object(error)?String(error.code??''):'';
      if(/nevora_timecard_CONFLICT/.test(message)||code==='23505')return {status:'conflict'};
      const reasons=[['SELF_REVIEW','self_review'],['UNRESOLVED','unresolved_time'],['APPROVAL_REQUIRED','approval_required'],['STATE','period_state'],['OVERLAPPING_PERIOD','overlapping_period']] as const;
      for(const [pattern,reason] of reasons)if(message.includes('nevora_timecard_'+pattern))return {status:'blocked',reason};
      if(['40001','40P01','55P03'].includes(code)){if(attempt<2)continue;return {status:'conflict'};}
      if(/AUTH_REQUIRED|SOURCE_LIMIT|INVALID/.test(message)||['42P01','42883','23503','23514'].includes(code))return {status:'unavailable'};
      if(!code||/^(ECONN|ETIMEDOUT|UND_ERR|57014)/.test(code))return {status:'outcome-unknown',operationId:command.operationId};
      return {status:'unavailable'};
    }
  }
  return {status:'conflict'};
}
