import 'server-only';
import {createHash} from 'node:crypto';
import type {Workspace,UserRole} from '@/lib/domain';
import type {SqlExecutor,SqlStatement} from '@/lib/notifications/types';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import {neonNotificationExecutor} from '@/lib/data/sql-executor';
import {getWorkspace,workspaceReadGuard} from '@/lib/data/workspaces';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from '@/lib/data/management-session';
import {parseScopeSelection} from './scope-selection';
import type {ScopeSelection,ScopeCommand,ScopeReceipt,ScopeResult,OperationalFootprint,OperationalAuthorityView,OperationalRead,OwnerOperationalScopeData,OwnerScopeContext,OwnerScopeHistoryEntry} from './model';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const safeId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&v===v.trim()&&!/[\p{Cc}\p{Cf}]/u.test(v);
const validRevision=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<2147483647;
const validGeneration=(v:unknown):v is string=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&BigInt(v)<=BigInt('9223372036854775807');
const adopted=`EXISTS(SELECT 1 FROM company_access_adoption a WHERE a.workspace_id=w.id AND a.protocol_version=1 AND a.state='ENFORCED' AND a.owner_policy_receipt_id='01a13cda-e556-7652-8469-a18a77094364')`;
const validSelectionSql=`((g.action='REVOKE' AND g.mode IS NULL AND cardinality(g.location_ids)=0)
 OR(g.action='ASSIGN' AND g.mode='COMPANY' AND cardinality(g.location_ids)=0)
 OR(g.action='ASSIGN' AND g.mode='LOCATIONS' AND cardinality(g.location_ids) BETWEEN 1 AND 100
  AND g.location_ids=ARRAY(SELECT l.id FROM locations l WHERE l.workspace_id=w.id AND l.active AND l.id=ANY(g.location_ids) ORDER BY l.id)))`;
const authoritySql=`encode(sha256(convert_to(concat_ws(chr(31),'NEVORA operational authority v1',w.id,w.updated_at::text,e.id,e.role,v.generation::text,COALESCE(g.revision,0)::text,s.token_hash),'UTF8')),'hex')`;
const joins=`FROM employees e JOIN locations home ON home.id=e.primary_location_id JOIN workspaces w ON w.id=home.workspace_id
 JOIN operational_subject_versions v ON v.workspace_id=w.id AND v.employee_id=e.id
 LEFT JOIN operational_scopes_current g ON g.workspace_id=w.id AND g.employee_id=e.id
 JOIN employee_sessions s ON s.employee_id=e.id`;
const current=`w.id=$1 AND w.singleton AND w.active AND e.id=$2 AND e.active AND s.token_hash=$3 AND s.expires_at>clock_timestamp() AND ${adopted}`;
const allowedCompany=`(e.role='OWNER' OR(e.role='MANAGER' AND g.role_generation=v.generation AND g.action='ASSIGN' AND g.mode='COMPANY' AND ${validSelectionSql}))`;

export class OperationalAuthorizationError extends Error {constructor(){super('operational_authorization');}}
/** Exact authorization diagnostics only; database/validation failures retain their meaning. */
export function isOperationalAuthorizationError(error:unknown):boolean {
 return error instanceof OperationalAuthorizationError || (error!==null&&typeof error==='object'
  &&'code'in error&&error.code==='22P02'&&'message'in error
  &&error.message==='invalid input syntax for type integer: "operational_authorization"');
}
/** Admission before private validation. Writers MUST also append the current
 * operational guard inside their business transaction, after all lock waits. */
export async function assertOperationalAccess(proof:SessionMutationProof,footprint:OperationalFootprint|undefined,executor:SqlExecutor=neonNotificationExecutor()) {
 const view=await readOperationalAuthority(proof,executor);
 if(view.state!=='ready'||!view.scope||!['OWNER','MANAGER'].includes(view.role))throw new OperationalAuthorizationError();
 const actual=footprint??(view.scope.mode==='COMPANY'?{kind:'COMPANY'} as const:{kind:'LOCATIONS',locationIds:view.scope.locationIds} as const);
 const workspace=await getWorkspace(executor);
 await executor.transaction([...workspaceReadGuard(workspace),
  {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
  ...operationalScopeStatements(proof,workspace,actual,view.authority)]);
 return {workspace,authority:view.authority,scope:view.scope,observedAt:view.observedAt,validForMs:view.validForMs};
}
/** Append after the caller's workspace, sorted employee and business locks. Keep generic session/finance guards separate. */
export function operationalScopeStatements(proof:SessionMutationProof,workspace:Workspace,footprint:OperationalFootprint,expectedAuthority?:string):SqlStatement[] {
 assertManagementProof(proof,proof?.employee?.id);
 let ids:string[]=[];
 if(footprint.kind==='LOCATIONS') {
  if(!Array.isArray(footprint.locationIds)||footprint.locationIds.length<1||footprint.locationIds.length>1000||footprint.locationIds.some(id=>!safeId(id)))throw new OperationalAuthorizationError();
  ids=[...new Set(footprint.locationIds)].sort();
 } else if(footprint.kind!=='COMPANY')throw new OperationalAuthorizationError();
 if(expectedAuthority!==undefined&&!/^[a-f0-9]{64}$/.test(expectedAuthority))throw new OperationalAuthorizationError();
 const permitted=footprint.kind==='COMPANY'?allowedCompany:`(${allowedCompany} OR(e.role='MANAGER' AND g.role_generation=v.generation AND g.action='ASSIGN' AND g.mode='LOCATIONS' AND ${validSelectionSql} AND g.location_ids @> $4::text[]))
 AND NOT EXISTS(SELECT 1 FROM unnest($4::text[]) requested(id) WHERE NOT EXISTS(SELECT 1 FROM locations l WHERE l.id=requested.id AND l.workspace_id=w.id))`;
 return [...managementSessionStatements(proof,proof.employee.id),{text:`SELECT(CASE WHEN EXISTS(SELECT 1 ${joins} WHERE ${current} AND (${permitted}) AND $4::text[] IS NOT NULL AND ($5::text IS NULL OR ${authoritySql}=$5)) THEN '1' ELSE 'operational_authorization' END)::integer`,
  values:[workspace.id,proof.employee.id,proof.sessionTokenHash,ids,expectedAuthority??null]}];
}
function locks(proof:SessionMutationProof,workspace:Workspace,ids:readonly string[],owner=false):SqlStatement[] {
 assertManagementProof(proof,proof?.employee?.id);
 return [{text:'SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE',values:[]},...workspaceReadGuard(workspace).slice(1),
  {text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([proof.employee.id,...ids])].sort()]},
  ...managementSessionStatements(proof,proof.employee.id,owner?['OWNER']:['OWNER','MANAGER','LEAD','EMPLOYEE']),
  {text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM workspaces w WHERE w.id=$1 AND w.active AND ${adopted}) THEN '1' ELSE 'operational_authorization' END)::integer`,values:[workspace.id]}];
}
type Row={employeeId:string;role:UserRole;employeeUpdatedAt:string;active:boolean;roleGeneration:string;scopeRevision:number;grantGeneration:string|null;
 action:'ASSIGN'|'REVOKE'|null;mode:'COMPANY'|'LOCATIONS'|null;locationIds:string[];source:'LEGACY_ADOPTION'|'OWNER_ASSIGNMENT'|null;
 selectionValid:boolean|null;authority:string;observedAt:string;validForMs:number;locations:{id:string;name:string;shortName:string}[]};
function currentRow(workspaceId:string,employeeId:string,sessionHash:string):SqlStatement {
 return {text:`SELECT e.id AS "employeeId",e.role,e.updated_at::text AS "employeeUpdatedAt",e.active,v.generation::text AS "roleGeneration",COALESCE(g.revision,0) AS "scopeRevision",g.role_generation::text AS "grantGeneration",g.action,g.mode,COALESCE(g.location_ids,'{}') AS "locationIds",g.source,${validSelectionSql} AS "selectionValid",${authoritySql} AS authority,
 clock_timestamp()::text AS "observedAt",LEAST(15000,floor(EXTRACT(epoch FROM(s.expires_at-clock_timestamp()))*1000))::integer AS "validForMs",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'shortName',l.short_name) ORDER BY l.id) FROM locations l WHERE l.workspace_id=w.id AND l.active
   AND(e.role='OWNER' OR(g.action='ASSIGN' AND g.role_generation=v.generation AND(g.mode='COMPANY' OR l.id=ANY(g.location_ids))))),'[]'::jsonb) AS locations
 ${joins} WHERE ${current}`,values:[workspaceId,employeeId,sessionHash]};
}
function effective(row:Pick<Row,'roleGeneration'|'grantGeneration'|'scopeRevision'|'action'|'mode'|'locationIds'|'selectionValid'>):{state:OwnerScopeContext['scopeState'];scope:ScopeSelection|null;invalid:boolean} {
 if(row.scopeRevision===0)return {state:'UNASSIGNED',scope:null,invalid:false};
 if(row.grantGeneration!==row.roleGeneration)return {state:'LIFECYCLE_CHANGED',scope:null,invalid:false};
 if(!row.selectionValid)return {state:'UNASSIGNED',scope:null,invalid:true};
 if(row.action==='REVOKE')return {state:'REVOKED',scope:null,invalid:false};
 const scope=parseScopeSelection({mode:row.mode,locationIds:row.locationIds});
 return scope?{state:'ASSIGNED',scope,invalid:false}:{state:'UNASSIGNED',scope:null,invalid:true};
}
export async function readOperationalAuthority(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<OperationalAuthorityView> {
 try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
 try {
  const workspace=await getWorkspace(executor),start=locks(proof,workspace,[]);
  const result=await executor.transaction([...start,currentRow(workspace.id,proof.employee.id,proof.sessionTokenHash),...managementSessionStatements(proof,proof.employee.id,['OWNER','MANAGER','LEAD','EMPLOYEE'])]);
  const row=result[start.length]?.[0] as Row|undefined;
  if(!row||row.validForMs<=0)return {state:'unavailable',reason:'access_denied'};
  const grant=effective(row);
  if(row.role==='MANAGER'&&grant.invalid)return {state:'unavailable',reason:'read_failed'};
  const scope:ScopeSelection|null=row.role==='OWNER'?{mode:'COMPANY',locationIds:[]}:row.role==='MANAGER'?grant.scope:null;
  const source:Extract<OperationalAuthorityView,{state:'ready'}>['source']=row.role==='OWNER'?'OWNER_ROLE':row.role!=='MANAGER'?'UNASSIGNED':grant.state==='ASSIGNED'?row.source!:
   grant.state==='LIFECYCLE_CHANGED'?'LIFECYCLE_CHANGED':grant.state==='REVOKED'?'REVOKED':'UNASSIGNED';
  return {state:'ready',employeeId:row.employeeId,role:row.role,source,scope,scopeRevision:row.scopeRevision,authority:row.authority,
   locations:scope?row.locations:[],observedAt:new Date(row.observedAt).toISOString(),validForMs:row.validForMs};
 }catch(error){return {state:'unavailable',reason:isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}

export async function readOwnerOperationalScope(proof:SessionMutationProof,employeeId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<OwnerOperationalScopeData>> {
 if(!safeId(employeeId))return {state:'unavailable',reason:'access_denied'};
 try {
  const workspace=await getWorkspace(executor),start=locks(proof,workspace,[employeeId],true);
  const rows=await executor.transaction([...start,currentRow(workspace.id,proof.employee.id,proof.sessionTokenHash),
   {text:`SELECT e.id AS "employeeId",e.updated_at::text AS "employeeUpdatedAt",e.role,e.active,v.generation::text AS "roleGeneration",COALESCE(g.revision,0) AS "scopeRevision",
     g.role_generation::text AS "grantGeneration",g.action,g.mode,COALESCE(g.location_ids,'{}') AS "locationIds",${validSelectionSql} AS "selectionValid"
     FROM employees e JOIN locations home ON home.id=e.primary_location_id JOIN workspaces w ON w.id=home.workspace_id
     JOIN operational_subject_versions v ON v.workspace_id=w.id AND v.employee_id=e.id LEFT JOIN operational_scopes_current g ON g.workspace_id=w.id AND g.employee_id=e.id
     WHERE w.id=$1 AND e.id=$2`,values:[workspace.id,employeeId]},
   {text:'SELECT revision,role_generation::text AS "roleGeneration",action,mode,location_ids AS "locationIds",source,created_at::text AS "createdAt" FROM operational_scope_revisions WHERE workspace_id=$1 AND employee_id=$2 ORDER BY revision DESC LIMIT 101',values:[workspace.id,employeeId]},
   ...managementSessionStatements(proof,proof.employee.id,['OWNER'])]);
  const actor=rows[start.length]?.[0] as Row|undefined,target=rows[start.length+1]?.[0] as Row|undefined;
  if(!actor||!target||actor.validForMs<=0)return {state:'unavailable',reason:'access_denied'};
  const grant=effective(target);
  const current:OwnerScopeContext={employeeId:target.employeeId,employeeUpdatedAt:target.employeeUpdatedAt,role:target.role,active:target.active,roleGeneration:target.roleGeneration,
   scopeRevision:target.scopeRevision,scopeState:grant.state,scope:grant.scope};
  const history=rows[start.length+2] as (OwnerScopeHistoryEntry&{mode:unknown;locationIds:unknown})[];
  return {state:'ready',data:{current,history:history.slice(0,100).map(h=>({revision:h.revision,roleGeneration:h.roleGeneration,action:h.action,scope:h.action==='ASSIGN'?parseScopeSelection({mode:h.mode,locationIds:h.locationIds}):null,source:h.source,createdAt:h.createdAt})),historyTruncated:history.length>100},
   coverage:{kind:'COMPANY',locationIds:[]},authority:actor.authority,observedAt:new Date(actor.observedAt).toISOString(),validForMs:actor.validForMs};
 }catch{return {state:'unavailable',reason:'read_failed'};}
}
function parseCommand(value:unknown):ScopeCommand|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>,keys='action,expectedEmployeeVersion,expectedRoleGeneration,expectedScopeRevision,operationId';
 if(!uuid(v.operationId)||!validRevision(v.expectedScopeRevision)||!validGeneration(v.expectedRoleGeneration)||typeof v.expectedEmployeeVersion!=='string'||!v.expectedEmployeeVersion||v.expectedEmployeeVersion.length>100)return null;
 const base={operationId:v.operationId,expectedScopeRevision:v.expectedScopeRevision,expectedRoleGeneration:v.expectedRoleGeneration,expectedEmployeeVersion:v.expectedEmployeeVersion};
 if(v.action==='REVOKE'&&Object.keys(v).sort().join(',')===keys)return {...base,action:'REVOKE'};
 const scope=parseScopeSelection(v.scope);
 return v.action==='ASSIGN'&&Object.keys(v).sort().join(',')===keys+',scope'&&scope?{...base,action:'ASSIGN',scope}:null;
}
function operation(workspaceId:string,actorId:string,operationId:string):SqlStatement {
 return {text:"SELECT command_hash AS hash,kind,receipt FROM company_access_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3",values:[workspaceId,actorId,operationId]};
}
function scopeReceipt(value:unknown):ScopeReceipt|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const r=value as Record<string,unknown>,scope=r.scope===null?null:parseScopeSelection(r.scope);
 if(!uuid(r.operationId)||!safeId(r.employeeId)||!validGeneration(r.roleGeneration)||typeof r.revision!=='number'||!Number.isInteger(r.revision)||r.revision<1||typeof r.committedAt!=='string'
  ||!['ASSIGN','REVOKE'].includes(String(r.action))||(r.action==='ASSIGN'&&!scope)||(r.action==='REVOKE'&&r.scope!==null))return null;
 return {operationId:r.operationId,employeeId:r.employeeId,revision:r.revision,roleGeneration:r.roleGeneration,committedAt:r.committedAt,action:r.action as 'ASSIGN'|'REVOKE',scope};
}
export async function assignOperationalScope(proof:SessionMutationProof,employeeId:string,value:ScopeCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<ScopeResult> {
 const command=parseCommand(value);
 if(!command||!safeId(employeeId))return {state:'invalid',fieldErrors:[{field:'scope',message:'Choose an explicit valid scope or revocation.'}]};
 let attempted=false;
 let workspace:Workspace|undefined;
 const hash=createHash('sha256').update(JSON.stringify({employeeId,command})).digest('hex');
 try {
  workspace=await getWorkspace(executor);
  const start=locks(proof,workspace,[employeeId],true);
  const prior=await executor.transaction([...start,operation(workspace.id,proof.employee.id,command.operationId),...managementSessionStatements(proof,proof.employee.id,['OWNER'])]);
  const old=prior[start.length]?.[0] as {hash:string;kind:string;receipt:unknown}|undefined;
  if(old){const saved=scopeReceipt(old.receipt);return old.kind!=='SCOPE'||old.hash!==hash?{state:'conflict',reason:'changed_replay'}:saved?{state:'saved',receipt:saved}:{state:'unavailable'};}
  const scope=command.action==='ASSIGN'?command.scope:null;
  const statements:SqlStatement[]=[...start,
   {text:"SELECT(CASE WHEN NOT EXISTS(SELECT 1 FROM company_access_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3) THEN '1' ELSE 'company_access_scope_replay' END)::integer",values:[workspace.id,proof.employee.id,command.operationId]},
   {text:"SELECT(CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id AND v.workspace_id=$1 WHERE e.id=$2 AND e.active AND e.role='MANAGER' AND e.updated_at::text=$3 AND v.generation::text=$4) THEN '1' ELSE 'company_access_scope_employee_changed' END)::integer",values:[workspace.id,employeeId,command.expectedEmployeeVersion,command.expectedRoleGeneration]},
   {text:"SELECT(CASE WHEN COALESCE((SELECT max(revision) FROM operational_scope_revisions WHERE workspace_id=$1 AND employee_id=$2),0)=$3 THEN '1' ELSE 'company_access_scope_changed' END)::integer",values:[workspace.id,employeeId,command.expectedScopeRevision]},
   {text:`INSERT INTO operational_scope_revisions(workspace_id,employee_id,revision,role_generation,action,mode,location_ids,source,actor_employee_id,operation_id)
    VALUES($1,$2,company_access_next_revision($3),$4::bigint,$5,$6,$7,'OWNER_ASSIGNMENT',$8,$9)`,values:[workspace.id,employeeId,command.expectedScopeRevision,command.expectedRoleGeneration,command.action,scope?.mode??null,scope?.locationIds??[],proof.employee.id,command.operationId]},
   {text:`INSERT INTO company_access_operations(workspace_id,actor_employee_id,operation_id,employee_id,kind,command_hash,receipt)
    SELECT $1::text,$2::text,$3::uuid,$4::text,'SCOPE',$5::text,jsonb_build_object('operationId',$3::uuid::text,'employeeId',$4::text,'revision',s.revision,
    'roleGeneration',s.role_generation::text,'committedAt',s.created_at::text,'action',s.action,'scope',CASE WHEN s.action='REVOKE' THEN NULL ELSE jsonb_build_object('mode',s.mode,'locationIds',s.location_ids) END)
    FROM operational_scope_revisions s WHERE s.workspace_id=$1 AND s.employee_id=$4 AND s.revision=company_access_next_revision($6) RETURNING receipt`,values:[workspace.id,proof.employee.id,command.operationId,employeeId,hash,command.expectedScopeRevision]},
  ];
  const index=statements.length-1;statements.push(...managementSessionStatements(proof,proof.employee.id,['OWNER']));
  attempted=true;const result=await executor.transaction(statements),saved=scopeReceipt((result[index]?.[0] as {receipt:unknown}|undefined)?.receipt);
  return saved?{state:'saved',receipt:saved}:{state:'outcome_unknown',operationId:command.operationId};
 }catch(error){
  const message=error instanceof Error?error.message:'';
  if(message.includes('company_access_scope_replay')&&workspace){
   try{
    const guards=locks(proof,workspace,[employeeId],true);
    const result=await executor.transaction([...guards,operation(workspace.id,proof.employee.id,command.operationId),...managementSessionStatements(proof,proof.employee.id,['OWNER'])]);
    const row=result[guards.length]?.[0] as {hash:string;kind:string;receipt:unknown}|undefined;
    if(row){const saved=scopeReceipt(row.receipt);return row.kind!=='SCOPE'||row.hash!==hash?{state:'conflict',reason:'changed_replay'}:saved?{state:'saved',receipt:saved}:{state:'unavailable'};}
   }catch{}
   return {state:'outcome_unknown',operationId:command.operationId};
  }
  if(message.includes('company_access_scope_employee_changed'))return {state:'conflict',reason:'employee_changed'};
  if(message.includes('company_access_scope_changed'))return {state:'conflict',reason:'scope_changed'};
  if(message.includes('company_access_scope_locations'))return {state:'invalid',fieldErrors:[{field:'scope',message:'Choose active locations from this company.'}]};
  const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  return attempted&&!(/^[0-9A-Z]{5}$/.test(code)&&!code.startsWith('08'))?{state:'outcome_unknown',operationId:command.operationId}:{state:'unavailable'};
 }
}

/** Read-only company-wide loaders only. Never use a projection wrapper around mutations. */
export async function withOperationalCompany<T>(proof:SessionMutationProof,load:()=>Promise<T>,executor:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<T>> {
 try {
  const workspace=await getWorkspace(executor),view=await readOperationalAuthority(proof,executor);
  if(view.state!=='ready')return view;
  if(view.scope?.mode!=='COMPANY')return {state:'unavailable',reason:'access_denied'};
  const data=await load();
  await executor.transaction([...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
   ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},view.authority)]);
  return {state:'ready',data,coverage:{kind:'COMPANY',locationIds:[]},authority:view.authority,observedAt:view.observedAt,validForMs:view.validForMs};
 }catch(error){
  const message=error instanceof Error?error.message:'';
  return {state:'unavailable',reason:message.includes('operational_authorization')||message.includes('management_authorization')?'access_denied':'read_failed'};
 }
}
