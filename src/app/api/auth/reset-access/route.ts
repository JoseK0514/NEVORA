import {privateWorkspaceToken} from '@/lib/workspace-routing/token-envelope.server';
import {workspaceRuntimeEnvironment} from '@/lib/workspace-routing/runtime-config.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {isPublicAccountProof} from '@/lib/auth/public-proof';
import {isPasswordTooLong,MIN_PASSWORD_CHARACTERS,passwordLength} from '@/lib/auth/password-requirements';
import {resetPasswordWithProof} from '@/lib/auth/recovery.server';
import {recoveryDelivery} from '@/lib/auth/recovery-delivery.server';
import {reportHandledServerError,withServerErrorDiagnostics} from '@/lib/server-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Unexpected failures (503) carry X-Nevora-Request-Id for the Support reference block; refusals carry none. */
export async function POST(request:Request){return withServerErrorDiagnostics('/api/auth/reset-access',async()=>{
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'invalid'},boundary);
 let body:unknown;
 try{body=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='password,proof'||!('proof' in body)||!('password' in body)||typeof body.proof!=='string'||typeof body.password!=='string')return correctionJson({state:'invalid'},400);
 try{
  // Public syntax and context-independent length need neither registry nor company storage.
  if(!isPublicAccountProof(body.proof))return correctionJson({state:'invalid'},400);
  if(isPasswordTooLong(body.password))return correctionJson({state:'invalid',passwordReason:'too_long'},400);
  if(passwordLength(body.password)<MIN_PASSWORD_CHARACTERS)return correctionJson({state:'invalid',passwordReason:'too_short'},400);
  const inner=await privateWorkspaceToken('RECOVERY',body.proof);if(!inner)return correctionJson({state:'invalid'},400);
  const result=await resetPasswordWithProof(inner,body.password,undefined,recoveryDelivery(await workspaceRuntimeEnvironment(),request.headers));return correctionJson(result,result.state==='reset'?200:result.state==='invalid'?400:503);
 }catch(error){reportHandledServerError(error,'/api/auth/reset-access');return correctionJson({state:'unavailable'},503);}
});}
