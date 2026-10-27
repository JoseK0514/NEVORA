'use server';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {submitEmployeeHoursCorrection} from '@/lib/data/employee-hours-write.server';
import type {HoursCorrectionResult} from '@/lib/employee-hours';
import {revalidatePath} from 'next/cache';
export async function saveEmployeeHoursCorrection(input:unknown):Promise<HoursCorrectionResult>{
 const session=await getSession();if(!session||!['EMPLOYEE','LEAD'].includes(session.role))return {status:'denied'};
 const result=await submitEmployeeHoursCorrection(await requireSessionMutationProof(),input);
 if(result.status==='recorded'){revalidatePath('/app/my-time');revalidatePath('/app/timecards');}
 return result;
}
