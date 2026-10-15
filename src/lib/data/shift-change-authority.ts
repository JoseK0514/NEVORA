import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {assertOperationalAccess,operationalScopeStatements,isOperationalAuthorizationError} from '../company-access/operational-scope.server';
import {isManagementAuthorizationError} from './management-session';
import {workspaceReadGuard} from './workspaces';
export class ShiftChangeAuthorizationError extends Error {}
export const isShiftChangeAuthorizationError=(error:unknown)=>error instanceof ShiftChangeAuthorizationError||isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)||!!(error&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error&&error.message==='invalid input syntax for type integer: "shift_change_authorization"');
export type ShiftChangeCompanyAccess=Awaited<ReturnType<typeof assertOperationalAccess>>|null;
/** Custom Manager workflows inspect global scheduling/notification facts. Own
 * Employee/Lead and trusted maintenance retain their independent protocols. */
export async function admitShiftChangeCompany(proof:SessionMutationProof,executor:SqlExecutor):Promise<ShiftChangeCompanyAccess>{
 if(!['OWNER','MANAGER'].includes(proof.employee.role))return null;
 try{return await assertOperationalAccess(proof,{kind:'COMPANY'},executor);}
 catch(error){if(isShiftChangeAuthorizationError(error))throw new ShiftChangeAuthorizationError();throw error;}
}
export const shiftChangeCompanyStatements=(proof:SessionMutationProof,access:ShiftChangeCompanyAccess)=>access?operationalScopeStatements(proof,access.workspace,{kind:'COMPANY'},access.authority):[];
/** Final response check uses the original admission, including role generation
 * and scope revision. A committed receipt remains stored when response is denied. */
export async function shiftChangeCompanyFence(proof:SessionMutationProof,access:ShiftChangeCompanyAccess,executor:SqlExecutor){
 if(!access)return;
 try{await executor.transaction([{text:"SET LOCAL lock_timeout='1500ms'",values:[]},{text:"SET LOCAL statement_timeout='5000ms'",values:[]},...workspaceReadGuard(access.workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},...shiftChangeCompanyStatements(proof,access)]);}
 catch(error){if(isShiftChangeAuthorizationError(error))throw new ShiftChangeAuthorizationError();throw error;}
}
/** Read-only projection only; never wrap a business write in this helper. */
export async function readShiftChangeCompany<T>(proof:SessionMutationProof,load:()=>Promise<T>,executor:SqlExecutor):Promise<T>{
 const access=await admitShiftChangeCompany(proof,executor),data=await load();
 await shiftChangeCompanyFence(proof,access,executor);return data;
}
