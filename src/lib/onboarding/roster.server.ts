import 'server-only';
import {createHash} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {WorkspaceBinding} from '../workspace-routing/resolver.server';
import {assertWorkspaceBindingCurrent} from '../workspace-routing/resolver.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import {getWorkspace} from '../data/workspaces';
import {readOperationalAuthority} from '../company-access/operational-scope.server';
import {mutationTransaction} from '../data/transaction-composition';
import {parseCreateEmployeeWithAccessCommand,prepareEmployeeWithAccessCreation} from '../company-access/employee-profile.server';
import {isClosedRecord,parseOnboardingCommand,type OnboardingResult,type FieldError} from './contracts';
import {onboardingCommandReceipt,onboardingMutationExecutor,onboardingOwnerGuards,readOnboardingSetup,readOnboardingState} from './setup.server';
import {parseRosterTable,ROSTER_MAX_ROWS,type RosterPerson,type RosterTableResult} from './roster';

export type RosterSaved=Extract<OnboardingResult,{state:'saved'}>&{createdEmployeeIds:string[]};
export type RosterResult=Exclude<OnboardingResult,{state:'saved'}>|RosterSaved;
export type RosterPreview=Extract<RosterTableResult,{state:'ready'}>&{schemaVersion:1;expectedVersion:string;positions:{id:string;name:string}[];capacity:{activeEmployees:number;employeeLimit:number|null;remaining:number|null;importAdds:number}};
const parseId='00000000-0000-4000-8000-000000000001';
function people(value:unknown):{people:RosterPerson[]}|null{
 if(!isClosedRecord(value,['people'])||!Array.isArray(value.people)||!value.people.length||value.people.length>ROSTER_MAX_ROWS)return null;
 const parsed:RosterPerson[]=[],seenIds=new Set<string>(),seenEmails=new Set<string>();
 for(const v of value.people){
  if(!isClosedRecord(v,['employee'],['initialManagerScope']))return null;
  const p=parseCreateEmployeeWithAccessCommand({operationId:parseId,...v});if(!p||p.employee.role==='OWNER'||seenIds.has(p.employee.id)||p.employee.email!==null&&seenEmails.has(p.employee.email.toLowerCase()))return null;
  if(p.employee.role==='MANAGER'&&!p.initialManagerScope)return null;
  seenIds.add(p.employee.id);if(p.employee.email!==null)seenEmails.add(p.employee.email.toLowerCase());
  parsed.push({employee:p.employee,...(p.initialManagerScope?{initialManagerScope:p.initialManagerScope}:{})});
 }
 return {people:parsed};
}
/** Deterministic company/actor/import/index-bound child operations; no bearer or PII. */
export function rosterChildOperationId(workspaceId:string,actorId:string,operationId:string,index:number):string{
 const b=createHash('sha256').update(JSON.stringify(['NEVORA roster import v1',workspaceId,actorId,operationId,index])).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const h=b.toString('hex');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
export async function previewOnboardingRoster(proof:SessionMutationProof,binding:WorkspaceBinding,value:unknown,ex?:SqlExecutor):Promise<RosterPreview|Exclude<OnboardingResult,{state:'saved'}>>{
 if(!isClosedRecord(value,['schemaVersion','format','text'],['defaults'])||value.schemaVersion!==1)return {state:'invalid',fieldErrors:[{field:'request',code:'INVALID_TABLE'}]};
 const parsed=parseRosterTable({format:value.format,text:value.text,...(value.defaults===undefined?{}:{defaults:value.defaults})});if(parsed.state==='invalid')return parsed;
 try{
  const setup=await readOnboardingSetup(proof,binding,ex),c=setup.configuration,byId=new Set(c.people.map(p=>p.id.toUpperCase())),emails=new Set(c.people.map(p=>p.email).filter((s):s is string=>s!==null).map(s=>s.toLowerCase())),locations=new Set(c.locations.filter(l=>l.active).map(l=>l.id)),positions=new Set(c.positions.filter(p=>p.active).map(p=>p.id));
  for(const row of parsed.rows){const p=row.person;if(!p)continue;const issue=(field:string,code:string)=>row.fieldErrors.push({field,code});
   if(byId.has(p.employee.id))issue('id','ID_IN_USE');if(p.employee.email&&emails.has(p.employee.email.toLowerCase()))issue('email','EMAIL_IN_USE');
   if(p.employee.eligibleLocationIds.some(id=>!locations.has(id)))issue('eligibleLocationIds','LOCATION_UNAVAILABLE');
   if(p.employee.positionIds.some(id=>!positions.has(id)))issue('positionIds','POSITION_UNAVAILABLE');
   if(p.initialManagerScope?.mode==='LOCATIONS'&&p.initialManagerScope.locationIds.some(id=>!locations.has(id)))issue('initialManagerScope','LOCATION_UNAVAILABLE');
  }
  const activeEmployees=c.people.filter(p=>p.active&&p.role!=='OWNER').length,employeeLimit=c.employeeLimit??null;
  const current=await readOnboardingSetup(proof,binding,ex);if(current.snapshot.version!==setup.snapshot.version||current.configuration.employeeLimit!==c.employeeLimit)return {state:'conflict',reason:'version_changed'};
  return {positions:c.positions.filter(p=>p.active).map(p=>({id:p.id,name:p.name})),capacity:{activeEmployees,employeeLimit,remaining:employeeLimit===null?null:Math.max(0,employeeLimit-activeEmployees),importAdds:parsed.rows.filter(r=>r.person!==null&&!r.fieldErrors.length).length},...parsed,valid:parsed.rows.every(r=>!r.fieldErrors.length),schemaVersion:1,expectedVersion:setup.snapshot.version};
 }catch{return {state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};}
}
export async function saveOnboardingRoster(proof:SessionMutationProof,binding:WorkspaceBinding,value:unknown,ex?:SqlExecutor):Promise<RosterResult>{
 const c=parseOnboardingCommand(value,people);if(!c)return {state:'invalid',fieldErrors:[{field:'people',code:'INVALID_ROSTER'}]};
 const sql=ex??getWorkspaceDb(binding),kind='IMPORT_EMPLOYEES',hash=createHash('sha256').update(JSON.stringify({kind,command:c})).digest('hex');let attempted=false;
 const recover=async():Promise<RosterResult|null>=>{const prior=await onboardingCommandReceipt(proof,binding,c.operationId,sql);if(!prior)return null;return prior.kind===kind&&prior.hash===hash?{state:'saved',receipt:prior.receipt,snapshot:await readOnboardingState(proof,binding,sql),createdEmployeeIds:c.payload.people.map(p=>p.employee.id)}:{state:'conflict',reason:'changed_replay'};};
 let versionChanged=false;
 try{
  const prior=await recover();if(prior)return prior;
  const f=await assertWorkspaceBindingCurrent(binding);if(f.purpose!=='APP')return {state:'unavailable',reasonCode:'ACCESS_DENIED'};
  const actor=await readOperationalAuthority(proof,sql);if(actor.state!=='ready'||actor.role!=='OWNER'||actor.scope?.mode!=='COMPANY')return {state:'unavailable',reasonCode:'ACCESS_DENIED'};
  const context={actor,workspace:await getWorkspace(sql)};
  const composed=onboardingMutationExecutor({proof,binding,operationId:c.operationId,expectedVersion:c.expectedVersion,kind,hash},sql),statements:SqlStatement[]=[...onboardingOwnerGuards(proof,f.record.id,true)];
  for(const [i,p] of c.payload.people.entries()){
   const prepared=await prepareEmployeeWithAccessCreation(proof,{operationId:rosterChildOperationId(f.record.id,proof.employee.id,c.operationId,i),...p},sql,context);
   if(prepared.state!=='prepared')return prepared.state==='invalid'?{state:'invalid',fieldErrors:prepared.fieldErrors.map((e):FieldError=>({field:`people.${i}.${e.field}`,code:'CANONICAL_VALIDATION_FAILED',params:{underlyingCode:e.code??'INVALID_EMPLOYEE_PROFILE',underlyingMessage:e.message}}))}:{state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};
   statements.push(...prepared.statements);
  }
  statements.push(...onboardingOwnerGuards(proof,f.record.id,true));attempted=true;
  try{await mutationTransaction(composed.executor,statements);}catch(error){versionChanged=composed.failureReason()==='version_changed';throw error;}
  return await recover()??{state:'outcome_unknown',operationId:c.operationId};
 }catch(error){
  try{const prior=await recover();if(prior)return prior;}catch{return attempted?{state:'outcome_unknown',operationId:c.operationId}:{state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};}
  if(versionChanged)return {state:'conflict',reason:'version_changed'};
  const code=error&&typeof error==='object'&&'code'in error?String(error.code):'',message=error instanceof Error?error.message:'';
  if(code==='23505')return {state:'invalid',fieldErrors:[{field:'people',code:'ID_OR_EMAIL_IN_USE'}]};
  if(message.includes('commerce_employee_limit'))return {state:'invalid',fieldErrors:[{field:'people',code:'EMPLOYEE_LIMIT'}]};
  if(/employee_(location|position)_invalid|company_access_scope_locations/.test(message))return {state:'invalid',fieldErrors:[{field:'people',code:'CATALOGUE_CHANGED'}]};
  return attempted&&(!/^[0-9A-Z]{5}$/.test(code)||code.startsWith('08'))&&!/authorization|permission/.test(message)?{state:'outcome_unknown',operationId:c.operationId}:{state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};
 }
}
