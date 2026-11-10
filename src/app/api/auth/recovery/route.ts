import {after} from 'next/server';
import {workspaceMode} from '@/lib/workspace-routing/config.server';
import {currentWorkspaceBinding,withWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {workspaceRuntimeEnvironment} from '@/lib/workspace-routing/runtime-config.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {requestPasswordRecovery} from '@/lib/auth/recovery.server';
import {recoveryDelivery} from '@/lib/auth/recovery-delivery.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const recoveryMessage='If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help.';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'invalid'},boundary);
 let body:unknown;try{body=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='email,employeeId'||!('employeeId' in body)||!('email' in body)||typeof body.employeeId!=='string'||typeof body.email!=='string'||body.employeeId.length>200||body.email.length>254)return correctionJson({state:'invalid'},400);
 const {employeeId,email}=body;
 // Work happens after the identical response: SMTP/account lookup latency is
 // never an account-existence timing signal in this request.
 const binding=workspaceMode()==='isolated'?await currentWorkspaceBinding():null;
 const work=async()=>requestPasswordRecovery(employeeId,email,recoveryDelivery(await workspaceRuntimeEnvironment(),request.headers));
 after(()=>binding?withWorkspaceBinding(binding,work):work());
 return correctionJson({state:'accepted',message:recoveryMessage},202);
}
