/** Portal adapters derive the actor from the actual cookie; shared services still enforce fresh database authority and lifecycle rules. */
import 'server-only';

import { requireSessionMutationProof } from '../auth/session';
import {
  type CorrectionRequestCommand,
  type CorrectionReviewCommand,
} from '../time-corrections/validation';
import {
  reviewTimeCorrection,
  submitTimeCorrection,
  submitDelegatedTimeCorrection,
  type CorrectionMutationResult,
} from '../time-corrections/service';
import type {
  EmployeeTimeCorrections,
  ManagerTimeCorrections,
} from '../time-corrections/read-model';
import {
  readEmployeeTimeCorrections,
  readManagerTimeCorrections,
  readDelegatedTimeCorrections,
} from './time-corrections.server';
import type {DelegatedTimeCorrections} from '../time-corrections/delegated';

const selfRoles = ['EMPLOYEE','LEAD'] as const;
const managerRoles = ['OWNER','MANAGER'] as const;

export async function getDelegatedTimeCorrections(employeeId:string):Promise<DelegatedTimeCorrections>{
 try{return await readDelegatedTimeCorrections(await requireSessionMutationProof(),employeeId);}catch{return {state:'unavailable',reason:'read_failed'};}
}
export async function submitManagerDelegatedTimeCorrection(employeeId:string,input:CorrectionRequestCommand):Promise<CorrectionMutationResult>{
 return submitDelegatedTimeCorrection(await requireSessionMutationProof(),employeeId,input);
}

export async function getEmployeeTimeCorrections(): Promise<EmployeeTimeCorrections> {
  try {
    const proof=await requireSessionMutationProof();
    if (!selfRoles.includes(proof.employee.role as 'EMPLOYEE'|'LEAD')) {
      return {state:'unavailable',reason:'access_denied'};
    }
    return await readEmployeeTimeCorrections(proof);
  } catch {
    return {state:'unavailable',reason:'read_failed'};
  }
}

export async function submitEmployeeTimeCorrection(
  input: CorrectionRequestCommand,
): Promise<CorrectionMutationResult> {
  const proof=await requireSessionMutationProof();
  if (!selfRoles.includes(proof.employee.role as 'EMPLOYEE'|'LEAD')) return {status:'unavailable'};
  return submitTimeCorrection(proof,input);
}

export async function getManagerTimeCorrections(): Promise<ManagerTimeCorrections> {
  try {
    const proof=await requireSessionMutationProof();
    if (!managerRoles.includes(proof.employee.role as 'OWNER'|'MANAGER')) {
      return {state:'unavailable',reason:'access_denied'};
    }
    return await readManagerTimeCorrections(proof);
  } catch {
    return {state:'unavailable',reason:'read_failed'};
  }
}

export async function reviewManagerTimeCorrection(
  input: CorrectionReviewCommand,
): Promise<CorrectionMutationResult> {
  const proof=await requireSessionMutationProof();
  if (!managerRoles.includes(proof.employee.role as 'OWNER'|'MANAGER')) return {status:'unavailable'};
  return reviewTimeCorrection(proof,input);
}
