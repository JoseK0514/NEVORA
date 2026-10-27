'use server';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {mutateEmployeePlanning,reconcileEmployeePlanning} from '@/lib/data/employee-planning-write.server';
import type {PlanningResult} from '@/lib/employee-planning';
import {revalidatePath} from 'next/cache';
export async function saveEmployeePlanningAction(command:unknown):Promise<PlanningResult>{
 const session=await getSession();if(!session||!['EMPLOYEE','LEAD'].includes(session.role))return {state:'denied',requestId:null};
 const proof=await requireSessionMutationProof();
 const result=await mutateEmployeePlanning(proof,command);
 if(result.state==='complete'){revalidatePath('/app/requests');revalidatePath('/app/availability');revalidatePath('/app/requests/hub');}
 return result;
}
export async function checkEmployeePlanningAction(command:unknown):Promise<PlanningResult>{
 const session=await getSession();if(!session||!['EMPLOYEE','LEAD'].includes(session.role))return {state:'denied',requestId:null};
 return reconcileEmployeePlanning(await requireSessionMutationProof(),command);
}
