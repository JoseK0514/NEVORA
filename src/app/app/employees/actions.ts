"use server";
import {assertOperationalAccess,isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {parseOperationalProfileForm} from '@/lib/shift-changes/policy-form';
import {saveOperationalRuleProfile} from '@/lib/data/shift-change-policy';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import {revalidatePath} from 'next/cache';
import {MANAGER_ROLES,requireRoles} from '@/lib/auth/permissions';
import {saveEmployeeSchedulingProfile} from '@/lib/data/employees';
import {saveEmployeeCoreAccessProfile,createEmployeeWithAccess} from '@/lib/company-access/employee-profile.server';
import type {EmployeeCoreAccessCommand,CreateEmployeeWithAccessCommand,EmployeeCoreAccessResult} from '@/lib/company-access/model';

/** Bounds one serialized command; detailed validation remains with the company-access service. */
function readEmployeeCommand(data:FormData):unknown {
 const keys=[...data.keys()].filter(key=>!key.startsWith('$ACTION_'));
 const value=data.get('command');
 if(keys.length!==1||keys[0]!=='command'||typeof value!=='string'||Buffer.byteLength(value,'utf8')>8192)return null;
 try{return JSON.parse(value);}catch{return null;}
}
function refreshEmployee(receipt:Extract<EmployeeCoreAccessResult,{state:'saved'}>['receipt']) {
 try{revalidatePath('/app/employees');revalidatePath(`/app/employees/${encodeURIComponent(receipt.employeeId)}`);}catch{/* A committed receipt remains committed if refresh fails. */}
}
/** Saves core identity/access through the receipt-based service; refresh failure cannot undo a receipt. */
export async function saveEmployeeCoreProfileAction(data:FormData):Promise<EmployeeCoreAccessResult> {
 const command=readEmployeeCommand(data);
 if(command===null)return {state:'invalid',fieldErrors:[{field:'command',message:'Submit one complete employee command.'}]};
 try{
  const proof=await requireSessionMutationProof();
  const result=await saveEmployeeCoreAccessProfile(proof,command as EmployeeCoreAccessCommand);
  if(result.state==='saved')refreshEmployee(result.receipt);return result;
 }catch{return {state:'unavailable'};}
}
/** Creates an employee with explicit access configuration using the authenticated actor's proof. */
export async function createEmployeeFormAction(data:FormData):Promise<EmployeeCoreAccessResult> {
 const command=readEmployeeCommand(data);
 if(command===null)return {state:'invalid',fieldErrors:[{field:'command',message:'Submit one complete employee command.'}]};
 try{
  const proof=await requireSessionMutationProof();
  const result=await createEmployeeWithAccess(proof,command as CreateEmployeeWithAccessCommand);
  if(result.state==='saved')refreshEmployee(result.receipt);return result;
 }catch{return {state:'unavailable'};}
}
export async function createEmployeeAction(data:FormData):Promise<EmployeeCoreAccessResult>{return createEmployeeFormAction(data);}

/**
 * Updates scheduling qualifications and eligible locations separately from core
 * access roles. expectedUpdatedAt protects a concurrently edited profile; return
 * the committed version so the next edit uses the new concurrency token.
 */
export async function saveEmployeeSchedulingProfileAction(formData: FormData) {
  const actor = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  try {
    await assertOperationalAccess(proof,{kind:'COMPANY'});
    const employeeId = String(formData.get("employeeId") ?? "");
    const written = await saveEmployeeSchedulingProfile({
      employeeId,
      positionIds: formData.getAll("positionIds").map(String),
      eligibleLocationIds: formData.getAll("eligibleLocationIds").map(String),
      actorEmployeeId: actor.id,
      proof,
      expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
    });
    try{revalidatePath('/app/employees');revalidatePath(`/app/employees/${encodeURIComponent(employeeId)}`);}catch{/* The returned write version establishes a committed save. */}
    return { success: "Scheduling profile updated.", updatedAt: written.updatedAt };
  } catch (error) {
    if(isOperationalAuthorizationError(error))return {error:'Operational access is unavailable. Reload and try again.'};
    if (error instanceof Error && error.message.includes('profile_stale')) return { error: 'This employee changed since you opened the profile. Reload and review the latest scheduling details.' };
    return {
      error:
        "Profile could not be saved. Choose active positions and locations; existing inactive references may be retained.",
    };
  }
}


/** Owner-only operational-policy form; configured/unknown rule states must be explicit. */
export async function saveOperationalRulesAction(data:FormData):Promise<import('@/lib/shift-changes/types').PolicyWriteResult>{
 const input=parseOperationalProfileForm(data);if(!input)return {status:'invalid',fieldErrors:[{field:'profile',message:'Choose every rule status explicitly and complete configured values, time basis and routing.'}]};
 const proof=await requireSessionMutationProof();if(proof.employee.role!=='OWNER')return {status:'invalid',fieldErrors:[{field:'authorization',message:'Only an active Owner can review operational rules.'}]};
 const result=await saveOperationalRuleProfile({...input,proof},neonNotificationExecutor());if(result.status==='saved'){revalidatePath('/app/employees');revalidatePath(`/app/employees/${encodeURIComponent(input.employeeId)}`);revalidatePath('/app/exchange');revalidatePath('/app/schedule');revalidatePath('/app');}return result;
}
