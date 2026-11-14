import 'server-only';
import {mutationTransaction} from '../data/transaction-composition';
import {createHash} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '@/lib/notifications/types';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import type {UserRole} from '@/lib/domain';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import {prepareEmployeeProfileMutation,prepareEmployeeCreationMutation} from '@/lib/data/employees';

import {normalizePhoneNumber} from '@/lib/phone';
import {readOperationalAuthority,operationalScopeStatements,withOperationalCompany} from './operational-scope.server';
import {parseScopeSelection} from './scope-selection';
import type {CoreProfileInput,EmployeeCoreAccessCommand,EmployeeCoreAccessReceipt,EmployeeCoreAccessResult,CreateEmployeeWithAccessCommand,ScopeSelection} from './model';
const roles:UserRole[]=['OWNER','MANAGER','LEAD','EMPLOYEE'];
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&[...v].length<=max&&!/[\p{Cc}\p{Cf}]/u.test(v);
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&BigInt(v)<=BigInt('9223372036854775807');
const revision=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<2147483647;
const object=(v:unknown,required:string[],optional:string[]=[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&required.every(k=>Object.prototype.hasOwnProperty.call(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const invalid=(field:string,message:string):EmployeeCoreAccessResult=>({state:'invalid',fieldErrors:[{field,message}]});
function profile(v:unknown):CoreProfileInput|null {
 if(!object(v,['firstName','lastName','phone','email','role','primaryLocationId','active']))return null;
 if(typeof v.firstName!=='string'||typeof v.lastName!=='string'||typeof v.phone!=='string'||typeof v.primaryLocationId!=='string')return null;
 const firstName=v.firstName.trim(),lastName=v.lastName.trim(),phone=normalizePhoneNumber(v.phone),primaryLocationId=v.primaryLocationId.trim();
 const email=v.email===null?null:typeof v.email==='string'?v.email.trim()||null:undefined;
 if(!text(firstName,160)||!text(lastName,160)||!phone||!text(primaryLocationId,200)||typeof v.active!=='boolean'||!roles.includes(v.role as UserRole)||email===undefined
  ||(email!==null&&(!text(email,254)||/\s/.test(email)||!/^[^@]+@[^@]+$/.test(email))))return null;
 return {firstName,lastName,phone,email,primaryLocationId,active:v.active,role:v.role as UserRole};
}
function parseUpdate(value:unknown):EmployeeCoreAccessCommand|null {
 if(!object(value,['operationId','employeeId','expectedEmployeeUpdatedAt','profile'],['managerTransitionScope'])||!uuid(value.operationId)||!text(value.employeeId,128)||!text(value.expectedEmployeeUpdatedAt,100))return null;
 const p=profile(value.profile);if(!p)return null;
 const base={operationId:value.operationId.toLowerCase(),employeeId:value.employeeId.trim(),expectedEmployeeUpdatedAt:value.expectedEmployeeUpdatedAt,profile:p};
 if(value.managerTransitionScope===undefined)return base;
 const t=value.managerTransitionScope;
 if(!object(t,['expectedScopeRevision','expectedRoleGeneration','scope'])||!revision(t.expectedScopeRevision)||!generation(t.expectedRoleGeneration))return null;
 const scope=parseScopeSelection(t.scope);return scope?{...base,managerTransitionScope:{expectedScopeRevision:t.expectedScopeRevision,expectedRoleGeneration:t.expectedRoleGeneration,scope}}:null;
}
export function parseCreateEmployeeWithAccessCommand(value:unknown):CreateEmployeeWithAccessCommand|null {
 if(!object(value,['operationId','employee'],['initialManagerScope'])||!uuid(value.operationId))return null;
 const e=value.employee;
 if(!object(e,['id','firstName','lastName','phone','email','role','primaryLocationId','eligibleLocationIds','positionIds'])||!text(e.id,128))return null;
 const p=profile({firstName:e.firstName,lastName:e.lastName,phone:e.phone,email:e.email,role:e.role,primaryLocationId:e.primaryLocationId,active:true});
 const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=1000&&v.every(id=>text(id,200)&&id===id.trim());
 if(!p||!ids(e.eligibleLocationIds)||!ids(e.positionIds))return null;
 const scope=value.initialManagerScope===undefined?undefined:parseScopeSelection(value.initialManagerScope);if(scope===null)return null;
 return {operationId:value.operationId.toLowerCase(),employee:{id:e.id.trim().toUpperCase(),firstName:p.firstName,lastName:p.lastName,phone:p.phone,email:p.email,role:p.role,primaryLocationId:p.primaryLocationId,
  eligibleLocationIds:[...new Set([p.primaryLocationId,...e.eligibleLocationIds])].sort(),positionIds:[...new Set(e.positionIds)].sort()},...(scope?{initialManagerScope:scope}:{})};
}
function cleanReceipt(value:unknown):EmployeeCoreAccessReceipt|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const r=value as Record<string,unknown>,scope=r.scope===null?null:parseScopeSelection(r.scope);
 if(!uuid(r.operationId)||!text(r.employeeId,128)||!text(r.updatedAt,100)||!roles.includes(r.role as UserRole)||typeof r.active!=='boolean'||!generation(r.roleGeneration)
  ||typeof r.scopeRevision!=='number'||!Number.isInteger(r.scopeRevision)||r.scopeRevision<0||!['ASSIGNED','UNASSIGNED','REVOKED','LIFECYCLE_CHANGED'].includes(String(r.scopeState))
  ||(r.scopeState==='ASSIGNED'?!scope:r.scope!==null))return null;
 return {operationId:r.operationId,employeeId:r.employeeId,updatedAt:r.updatedAt,role:r.role as UserRole,active:r.active,roleGeneration:r.roleGeneration,scopeRevision:r.scopeRevision,
  scopeState:r.scopeState as EmployeeCoreAccessReceipt['scopeState'],scope};
}
type Operation={kind:string;hash:string;receipt:unknown};
async function lookup(proof:SessionMutationProof,operationId:string,ex:SqlExecutor,ownerInspection=false):Promise<Operation|null> {
 const result=await withOperationalCompany(proof,()=>ex.query<Operation>({text:`SELECT o.kind,o.command_hash AS hash,o.receipt FROM company_access_operations o JOIN workspaces w ON w.id=o.workspace_id
  WHERE w.singleton AND w.active AND o.operation_id=$1 AND(o.actor_employee_id=$2 OR($3::boolean AND EXISTS(SELECT 1 FROM employees actor WHERE actor.id=$2 AND actor.active AND actor.role='OWNER'))) ORDER BY o.actor_employee_id LIMIT 2`,values:[operationId,proof.employee.id,ownerInspection]}),ex);
 if(result.state!=='ready'||result.data.length>1)throw Error('operational_authorization');
 return result.data[0]??null;
}
function replay(row:Operation,hash:string):EmployeeCoreAccessResult {
 if(row.kind!=='EMPLOYEE'||row.hash!==hash)return {state:'conflict',reason:'changed_replay'};
 const receipt=cleanReceipt(row.receipt);return receipt?{state:'saved',receipt}:{state:'unavailable'};
}
/** Recover a committed profile receipt under current Company access. The actor
 * can inspect their own operation; an Owner may inspect another actor's unique
 * match. Ambiguous matches are withheld rather than selecting a receipt. */
export async function readEmployeeCoreAccessOperation(proof:SessionMutationProof,operationId:string,ex:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeCoreAccessResult> {
 if(!uuid(operationId))return invalid('operationId','Invalid operation.');
 try {const row=await lookup(proof,operationId,ex,true),receipt=row?.kind==='EMPLOYEE'?cleanReceipt(row.receipt):null;return receipt?{state:'saved',receipt}:{state:'unavailable'};}
 catch{return {state:'unavailable'};}
}
type Target={role:UserRole;active:boolean;roleGeneration:string;scopeRevision:number;employeeVersion:string};
async function target(proof:SessionMutationProof,employeeId:string,ex:SqlExecutor):Promise<Target|null> {
 const read=await withOperationalCompany(proof,()=>ex.query<Target>({text:`SELECT e.role,e.active,e.updated_at::text AS "employeeVersion",v.generation::text AS "roleGeneration",COALESCE(g.revision,0) AS "scopeRevision"
  FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN workspaces w ON w.id=l.workspace_id JOIN operational_subject_versions v ON v.workspace_id=w.id AND v.employee_id=e.id
  LEFT JOIN operational_scopes_current g ON g.workspace_id=w.id AND g.employee_id=e.id WHERE w.singleton AND w.active AND e.id=$1`,values:[employeeId]}),ex);
 if(read.state!=='ready')throw Error('operational_authorization');return read.data[0]??null;
}
function check(expression:string,values:readonly unknown[],reason:string):SqlStatement{return {text:`SELECT(CASE WHEN ${expression} THEN '1' ELSE '${reason}' END)::integer`,values};}
function operationAbsent(workspaceId:string,proof:SessionMutationProof,id:string){return check('NOT EXISTS(SELECT 1 FROM company_access_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3)',[workspaceId,proof.employee.id,id],'company_access_profile_replay');}
/** Append after the employee mutation so the new scope uses the resulting role
 * generation. Execute in the same transaction; do not assign it as a later step. */
function scopeAppend(workspaceId:string,employeeId:string,proof:SessionMutationProof,id:string,prior:number,scope:ScopeSelection):SqlStatement {
 return {text:`INSERT INTO operational_scope_revisions(workspace_id,employee_id,revision,role_generation,action,mode,location_ids,source,actor_employee_id,operation_id)
  SELECT $1,$2,company_access_next_revision($3),v.generation,'ASSIGN',$4,$5,'OWNER_ASSIGNMENT',$6,$7 FROM operational_subject_versions v WHERE v.workspace_id=$1 AND v.employee_id=$2`,values:[workspaceId,employeeId,prior,scope.mode,scope.locationIds,proof.employee.id,id]};
}
function receiptStatement(workspaceId:string,proof:SessionMutationProof,id:string,employeeId:string,hash:string):SqlStatement {
 const valid=`g.action='ASSIGN' AND g.role_generation=v.generation AND((g.mode='COMPANY' AND cardinality(g.location_ids)=0) OR(g.mode='LOCATIONS' AND cardinality(g.location_ids) BETWEEN 1 AND 100
  AND g.location_ids=ARRAY(SELECT l.id FROM locations l WHERE l.workspace_id=$1 AND l.active AND l.id=ANY(g.location_ids) ORDER BY l.id)))`;
 return {text:`INSERT INTO company_access_operations(workspace_id,actor_employee_id,operation_id,employee_id,kind,command_hash,receipt)
  SELECT $1::text,$2::text,$3::uuid,$4::text,'EMPLOYEE',$5::text,jsonb_build_object('operationId',$3::uuid::text,'employeeId',e.id,'updatedAt',e.updated_at::text,'role',e.role,'active',e.active,
   'roleGeneration',v.generation::text,'scopeRevision',COALESCE(g.revision,0),'scopeState',CASE WHEN g.revision IS NULL THEN 'UNASSIGNED' WHEN g.role_generation<>v.generation THEN 'LIFECYCLE_CHANGED'
    WHEN g.action='REVOKE' THEN 'REVOKED' WHEN ${valid} THEN 'ASSIGNED' ELSE 'UNASSIGNED' END,
   'scope',CASE WHEN ${valid} THEN jsonb_build_object('mode',g.mode,'locationIds',g.location_ids) ELSE NULL END)
  FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id AND v.workspace_id=$1 LEFT JOIN operational_scopes_current g ON g.workspace_id=$1 AND g.employee_id=e.id
  WHERE e.id=$4 RETURNING receipt`,values:[workspaceId,proof.employee.id,id,employeeId,hash]};
}
async function failure(error:unknown,proof:SessionMutationProof,id:string,hash:string,attempted:boolean,ex:SqlExecutor):Promise<EmployeeCoreAccessResult> {
 const message=error instanceof Error?error.message:'';
 // The same operation may have won after our last lookup but before a stale-version guard.
 if(message.includes('employee_profile_stale')||message.includes('company_access_profile_generation_changed')||message.includes('company_access_profile_scope_changed')){
  try{const row=await lookup(proof,id,ex);if(row)return replay(row,hash);}catch{return {state:'outcome_unknown',operationId:id};}
 }
 if(message.includes('company_access_profile_replay')){try{const row=await lookup(proof,id,ex);if(row)return replay(row,hash);}catch{}return {state:'outcome_unknown',operationId:id};}
 if(message.includes('employee_profile_stale')||message.includes('company_access_profile_generation_changed'))return {state:'conflict',reason:'employee_changed'};
 if(message.includes('company_access_profile_scope_changed'))return {state:'conflict',reason:'scope_changed'};
 if(message.includes('employee_profile_last_owner'))return invalid('role','Keep at least one active Owner in the company.');
 if(message.includes('company_access_scope_locations')||message.includes('employee_profile_location_invalid')||message.includes('employee_location_invalid')||message.includes('employee_position_invalid'))return invalid('profile','Choose valid company locations and positions.');
 const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
 if(code==='23505')return invalid('employee','Employee ID or email is already in use.');
 return attempted&&!(/^[0-9A-Z]{5}$/.test(code)&&!code.startsWith('08'))?{state:'outcome_unknown',operationId:id}:{state:'unavailable'};
}

/** Compose canonical employee writes with Company authority, lifecycle/scope
 * conflict checks and an idempotency receipt in one transaction. An Owner's
 * Manager activation/role transition also appends the explicitly chosen scope
 * against its resulting generation. A saved receipt is historical outcome, not
 * a grant to repeat the mutation with different input. */
export async function saveEmployeeCoreAccessProfile(proof:SessionMutationProof,value:EmployeeCoreAccessCommand,ex:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeCoreAccessResult> {
 const c=parseUpdate(value);if(!c)return invalid('profile','Complete all required employee details and versions.');
 const hash=createHash('sha256').update(JSON.stringify({kind:'UPDATE',command:c})).digest('hex');let attempted=false;
 try {
  const prior=await lookup(proof,c.operationId,ex);if(prior)return replay(prior,hash);
  const actor=await readOperationalAuthority(proof,ex);if(actor.state!=='ready'||actor.scope?.mode!=='COMPANY')return {state:'unavailable'};
  const old=await target(proof,c.employeeId,ex);if(!old)return {state:'unavailable'};
  const concurrent=await lookup(proof,c.operationId,ex);if(concurrent)return replay(concurrent,hash);
  const transition=c.profile.role==='MANAGER'&&c.profile.active&&(old.role!=='MANAGER'||!old.active);
  if(actor.role==='OWNER'&&transition&&!c.managerTransitionScope)return invalid('scope','Choose Company or selected locations for this Manager transition.');
  if(c.managerTransitionScope&&(!transition||actor.role!=='OWNER'))return invalid('scope','Only an Owner may choose scope for a Manager transition.');
  if(c.managerTransitionScope&&(c.managerTransitionScope.expectedRoleGeneration!==old.roleGeneration||c.managerTransitionScope.expectedScopeRevision!==old.scopeRevision))return {state:'conflict',reason:'scope_changed'};
  const batch=await prepareEmployeeProfileMutation({employeeId:c.employeeId,expectedUpdatedAt:c.expectedEmployeeUpdatedAt,...c.profile,email:c.profile.email??undefined,actorEmployeeId:proof.employee.id,proof},ex);
  const statements:SqlStatement[]=[{text:'SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE',values:[]},...batch.guards,
   ...operationalScopeStatements(proof,batch.workspace,{kind:'COMPANY'},actor.authority),operationAbsent(batch.workspace.id,proof,c.operationId),
   check('EXISTS(SELECT 1 FROM operational_subject_versions v JOIN employees e ON e.id=v.employee_id WHERE v.workspace_id=$1 AND e.id=$2 AND v.generation::text=$3 AND e.role=$4 AND e.active=$5)',[batch.workspace.id,c.employeeId,old.roleGeneration,old.role,old.active],'company_access_profile_generation_changed'),
   ...(c.managerTransitionScope?[check('COALESCE((SELECT max(revision) FROM operational_scope_revisions WHERE workspace_id=$1 AND employee_id=$2),0)=$3',[batch.workspace.id,c.employeeId,c.managerTransitionScope.expectedScopeRevision],'company_access_profile_scope_changed')]:[]),
   ...batch.writes,
   ...(c.managerTransitionScope?[scopeAppend(batch.workspace.id,c.employeeId,proof,c.operationId,c.managerTransitionScope.expectedScopeRevision,c.managerTransitionScope.scope)]:[]),
   receiptStatement(batch.workspace.id,proof,c.operationId,c.employeeId,hash),batch.finalAuthority];
  attempted=true;const result=await mutationTransaction(ex,statements),receipt=cleanReceipt((result[statements.length-2]?.[0] as {receipt:unknown}|undefined)?.receipt);
  return receipt?{state:'saved',receipt}:{state:'outcome_unknown',operationId:c.operationId};
 }catch(error){return failure(error,proof,c.operationId,hash,attempted,ex);}
}
/** Create the employee, any Owner-selected initial Manager scope and the operation
 * receipt atomically. Account credentials/invitation delivery are separate flows;
 * retry this command with the same operation ID to resolve an uncertain outcome. */
export async function createEmployeeWithAccess(proof:SessionMutationProof,value:CreateEmployeeWithAccessCommand,ex:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeCoreAccessResult> {
 const c=parseCreateEmployeeWithAccessCommand(value);if(!c)return invalid('employee','Complete all required employee details.');
 const hash=createHash('sha256').update(JSON.stringify({kind:'CREATE',command:c})).digest('hex');let attempted=false;
 try {
  const prior=await lookup(proof,c.operationId,ex);if(prior)return replay(prior,hash);
  const actor=await readOperationalAuthority(proof,ex);if(actor.state!=='ready'||actor.scope?.mode!=='COMPANY')return {state:'unavailable'};
  if(c.employee.role==='MANAGER'&&actor.role==='OWNER'&&!c.initialManagerScope)return invalid('scope','Choose Company or selected locations for the new Manager.');
  if(c.initialManagerScope&&(actor.role!=='OWNER'||c.employee.role!=='MANAGER'))return invalid('scope','Only an Owner may assign a new Manager scope.');
  const batch=await prepareEmployeeCreationMutation({...c.employee,email:c.employee.email??undefined,actorEmployeeId:proof.employee.id,proof},ex);
  const statements:SqlStatement[]=[{text:'SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE',values:[]},...batch.guards,
   ...operationalScopeStatements(proof,batch.workspace,{kind:'COMPANY'},actor.authority),operationAbsent(batch.workspace.id,proof,c.operationId),...batch.writes,
   ...(c.initialManagerScope?[scopeAppend(batch.workspace.id,c.employee.id,proof,c.operationId,0,c.initialManagerScope)]:[]),receiptStatement(batch.workspace.id,proof,c.operationId,c.employee.id,hash),...batch.finalAuthority];
  const index=statements.length-batch.finalAuthority.length-1;
  attempted=true;const result=await mutationTransaction(ex,statements),receipt=cleanReceipt((result[index]?.[0] as {receipt:unknown}|undefined)?.receipt);
  return receipt?{state:'saved',receipt}:{state:'outcome_unknown',operationId:c.operationId};
 }catch(error){return failure(error,proof,c.operationId,hash,attempted,ex);}
}
