import {privateWorkspaceToken} from '@/lib/workspace-routing/token-envelope.server';
import {workspaceRuntimeEnvironment} from '@/lib/workspace-routing/runtime-config.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {resetPasswordWithProof} from '@/lib/auth/recovery.server';
import {recoveryDelivery} from '@/lib/auth/recovery-delivery.server';
import {reportHandledServerError,withServerErrorDiagnostics} from '@/lib/server-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Unexpected failures (503) carry X-Nevora-Request-Id for the Support reference block; refusals carry none. */
export async function POST(request:Request){return withServerErrorDiagnostics('/api/auth/reset-access',async()=>{
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'invalid'},boundary);
 try{
  const body=await readCorrectionJson(request);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='password,proof'||!('proof' in body)||!('password' in body)||typeof body.proof!=='string'||typeof body.password!=='string')return correctionJson({state:'invalid'},400);
  const inner=await privateWorkspaceToken('RECOVERY',body.proof);if(!inner)return correctionJson({state:'invalid'},400);
  const result=await resetPasswordWithProof(inner,body.password,undefined,recoveryDelivery(await workspaceRuntimeEnvironment(),request.headers));return correctionJson(result,result.state==='reset'?200:result.state==='invalid'?400:503);
 }catch(error){reportHandledServerError(error,'/api/auth/reset-access');return correctionJson({state:'unavailable'},503);}
});}
