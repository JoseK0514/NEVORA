import type {UserRole} from '@/lib/domain';
import type {EmployeeManagementProfile} from '@/lib/data/employees';
import type {ScopeSelection,OwnerScopeContext,CoreProfileInput,EmployeeCoreAccessCommand,CreateEmployeeWithAccessCommand,InvitationStatusResult,InvitationResult,ScopeResult,EmployeeCoreAccessResult,AccessFailure} from '@/lib/company-access/model';
import {normalizePhoneNumber} from '@/lib/phone';
const roles=['OWNER','MANAGER','LEAD','EMPLOYEE'] as const;
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Current information could not be read.');return v as Record<string,unknown>;}
function text(v:unknown):string{if(typeof v!=='string'||!v||v.length>2048)throw new Error('Current information could not be read.');return v;}
function choice<T extends string>(v:unknown,values:readonly T[]):T{if(typeof v!=='string'||!values.includes(v as T))throw new Error('Current information could not be read.');return v as T;}
function revision(v:unknown,zero=true):number{if(!Number.isSafeInteger(v)||Number(v)<(zero?0:1))throw new Error('Current information could not be read.');return Number(v);}
function date(v:unknown):string{const s=text(v);if(!Number.isFinite(Date.parse(s)))throw new Error('Current information could not be read.');return s;}
function bool(v:unknown):boolean{if(typeof v!=='boolean')throw new Error('Current information could not be read.');return v;}
function list(v:unknown):string[]{if(!Array.isArray(v)||v.length>100)throw new Error('Current information could not be read.');const result=v.map(text);if(new Set(result).size!==result.length)throw new Error('Current information could not be read.');return result;}
export function readScope(v:unknown):ScopeSelection|null {
 if(v===null)return null;const o=object(v),ids=list(o.locationIds);
 if(o.mode==='COMPANY'&&!ids.length)return {mode:'COMPANY',locationIds:[]};
 if(o.mode==='LOCATIONS'&&ids.length)return {mode:'LOCATIONS',locationIds:ids};
 throw new Error('Choose at least one management location.');
}
function selectedScope(v:ScopeSelection|null):ScopeSelection{if(!v)throw new Error('Choose management access explicitly.');return readScope(v)!;}
function profile(f:FormData):CoreProfileInput {
 const active=choice(f.get('active'),['true','false']);
 const phone=normalizePhoneNumber(text(f.get('phone')));if(!phone)throw new Error('Enter a valid contact phone number.');
 return {firstName:text(f.get('firstName')).trim(),lastName:text(f.get('lastName')).trim(),phone,email:String(f.get('email')??'').trim()||null,role:choice(f.get('role'),roles),primaryLocationId:text(f.get('primaryLocationId')),active:active==='true'};
}
export function coreCommandFromForm(f:FormData,employee:EmployeeManagementProfile,current:OwnerScopeContext|null,actorRole:UserRole,scope:ScopeSelection|null,operationId:string):EmployeeCoreAccessCommand {
 const next=profile(f);const command:EmployeeCoreAccessCommand={operationId,employeeId:employee.id,expectedEmployeeUpdatedAt:employee.updatedAt,profile:next};
 if(actorRole==='OWNER'&&next.role==='MANAGER'&&next.active&&(employee.role!=='MANAGER'||!employee.active)){
  if(!current||current.employeeId!==employee.id||current.employeeUpdatedAt!==employee.updatedAt)throw new Error('Reload current management access before this role change.');
  command.managerTransitionScope={expectedScopeRevision:current.scopeRevision,expectedRoleGeneration:current.roleGeneration,scope:selectedScope(scope)};
 }
 return command;
}
export function createCommandFromForm(f:FormData,actorRole:UserRole,scope:ScopeSelection|null,operationId:string):CreateEmployeeWithAccessCommand {
 const p=profile(f);const {active:_,...facts}=p;void _;
 const command:CreateEmployeeWithAccessCommand={operationId,employee:{id:text(f.get('id')).trim().toUpperCase(),...facts,eligibleLocationIds:f.getAll('eligibleLocationIds').map(String),positionIds:f.getAll('positionIds').map(String)}};
 if(p.role==='MANAGER'&&actorRole==='OWNER')command.initialManagerScope=selectedScope(scope);
 return command;
}
const failure=(v:unknown):AccessFailure=>choice(v,['access_denied','not_configured','source_changed','read_failed','source_limit']);
export function readInvitationStatus(value:unknown,employeeId:string):InvitationStatusResult {
 const o=object(value);if(o.state==='unavailable')return {state:'unavailable',reason:failure(o.reason)};
 if(o.state!=='ready'||o.employeeId!==employeeId)throw new Error('Current invitation information could not be read.');
 if(!Array.isArray(o.allowedCommands))throw new Error('Current invitation information could not be read.');
 const invitation=o.invitation===null?null:object(o.invitation);
 return {state:'ready',employeeId,employeeVersion:text(o.employeeVersion),eligibility:choice(o.eligibility,['INVITABLE','NO_EMAIL','ALREADY_ACTIVATED','INACTIVE','SELF_ISSUE_DENIED']),registeredEmailMasked:o.registeredEmailMasked===null?null:text(o.registeredEmailMasked),invitationRevision:revision(o.invitationRevision),invitation:invitation?{id:text(invitation.id),state:choice(invitation.state,['ISSUED','CONSUMED','REVOKED','EXPIRED','INVALIDATED']),issuedAt:date(invitation.issuedAt),expiresAt:date(invitation.expiresAt),issuerName:text(invitation.issuerName)}:null,delivery:choice(o.delivery,['UNAVAILABLE','PREPARED','PROVIDER_ACCEPTED','UNKNOWN','FAILED']),allowedCommands:o.allowedCommands.map(v=>choice(v,['ISSUE','REVOKE'])),retryAfterMs:o.retryAfterMs===null?null:revision(o.retryAfterMs)};
}
function receipt(value:unknown,operationId:string,employeeId?:string){const o=object(value);if(o.operationId!==operationId||(employeeId!==undefined&&o.employeeId!==employeeId))throw new Error('The action outcome could not be confirmed.');return o;}
function errors(value:unknown):{field:string;message:string}[]{if(!Array.isArray(value)||value.length>30)throw new Error('The action outcome could not be read.');return value.map(v=>{const e=object(v);return {field:text(e.field),message:text(e.message)};});}
function unknownOperation(o:Record<string,unknown>,operationId:string){if(o.operationId!==operationId)throw new Error('The action outcome could not be confirmed.');return {state:'outcome_unknown' as const,operationId};}
export function readInvitationResult(value:unknown,operationId:string,employeeId:string):InvitationResult {
 const o=object(value);
 if(o.state==='saved'){const r=receipt(o.receipt,operationId,employeeId);return {state:'saved',receipt:{operationId,employeeId,invitationId:text(r.invitationId),revision:revision(r.revision,false),action:choice(r.action,['ISSUE','REVOKE']),committedAt:date(r.committedAt),expiresAt:r.expiresAt===null?null:date(r.expiresAt),delivery:choice(r.delivery,['PREPARED','PROVIDER_ACCEPTED','UNKNOWN','FAILED'])}};}
 if(o.state==='limited')return {state:'limited',retryAfterMs:revision(o.retryAfterMs)};
 if(o.state==='conflict')return {state:'conflict',reason:choice(o.reason,['employee_changed','invitation_changed','changed_replay'])};
 if(o.state==='invalid')return {state:'invalid',fieldErrors:errors(o.fieldErrors)};
 if(o.state==='unavailable')return {state:'unavailable',reason:choice(o.reason,['delivery_unavailable','source_unavailable'])};
 if(o.state==='outcome_unknown')return unknownOperation(o,operationId);
 throw new Error('The invitation outcome could not be read.');
}
export function readScopeResult(value:unknown,operationId:string,employeeId:string):ScopeResult {
 const o=object(value);
 if(o.state==='saved'){const r=receipt(o.receipt,operationId,employeeId),scope=readScope(r.scope),action=choice(r.action,['ASSIGN','REVOKE']);if((action==='ASSIGN')!==!!scope)throw new Error('The saved access outcome is incomplete.');return {state:'saved',receipt:{operationId,employeeId,revision:revision(r.revision,false),roleGeneration:text(r.roleGeneration),committedAt:date(r.committedAt),action,scope}};}
 if(o.state==='conflict')return {state:'conflict',reason:choice(o.reason,['employee_changed','scope_changed','changed_replay'])};
 if(o.state==='invalid')return {state:'invalid',fieldErrors:errors(o.fieldErrors)};
 if(o.state==='unavailable')return {state:'unavailable'};
 if(o.state==='outcome_unknown')return unknownOperation(o,operationId);
 throw new Error('The access outcome could not be read.');
}
export function readEmployeeResult(value:unknown,operationId:string,employeeId?:string):EmployeeCoreAccessResult {
 const o=object(value);
 if(o.state==='saved'){const r=receipt(o.receipt,operationId,employeeId);return {state:'saved',receipt:{operationId,employeeId:text(r.employeeId),updatedAt:text(r.updatedAt),role:choice(r.role,roles),active:bool(r.active),roleGeneration:text(r.roleGeneration),scopeRevision:revision(r.scopeRevision),scopeState:choice(r.scopeState,['ASSIGNED','UNASSIGNED','REVOKED','LIFECYCLE_CHANGED']),scope:readScope(r.scope)}};}
 if(o.state==='conflict')return {state:'conflict',reason:choice(o.reason,['employee_changed','scope_changed','changed_replay'])};
 if(o.state==='invalid')return {state:'invalid',fieldErrors:errors(o.fieldErrors)};
 if(o.state==='unavailable')return {state:'unavailable'};
 if(o.state==='outcome_unknown')return unknownOperation(o,operationId);
 throw new Error('The employee save outcome could not be read.');
}
