import {after} from 'next/server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {requestPasswordRecovery} from '@/lib/auth/recovery.server';
import {recoveryDelivery} from '@/lib/auth/recovery-delivery.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const recoveryMessage='If these details match an active account and its registered recovery channel is available, recovery instructions will be sent. If you cannot use that channel, contact your manager or Owner for assisted recovery.';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'invalid'},boundary);
 let body:unknown;try{body=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='email,employeeId'||!('employeeId' in body)||!('email' in body)||typeof body.employeeId!=='string'||typeof body.email!=='string'||body.employeeId.length>200||body.email.length>254)return correctionJson({state:'invalid'},400);
 const {employeeId,email}=body;
 // Work happens after the identical response: SMTP/account lookup latency is
 // never an account-existence timing signal in this request.
 after(()=>requestPasswordRecovery(employeeId,email,recoveryDelivery()));
 return correctionJson({state:'accepted',message:recoveryMessage},202);
}
