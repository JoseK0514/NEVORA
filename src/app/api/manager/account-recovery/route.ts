import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {failed} from '@/lib/observability/log.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {issueAssistedRecovery} from '@/lib/auth/recovery.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
  if(!['OWNER','MANAGER'].includes(session.role)||request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
  let body:unknown;try{body=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid'},400);}if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='attestation,employeeId'||!('employeeId' in body)||!('attestation' in body)||typeof body.employeeId!=='string'||typeof body.attestation!=='string')return correctionJson({state:'invalid'},400);
  const result=await issueAssistedRecovery(await requireSessionMutationProof(),body.employeeId,body.attestation);return correctionJson(result,result.state==='issued'?200:503);
 }catch(error){return failed('/api/manager/account-recovery',error,correctionJson({state:'unavailable'},503));}
}
