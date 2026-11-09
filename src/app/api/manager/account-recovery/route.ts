import {publicWorkspaceToken} from '@/lib/workspace-routing/token-envelope.server';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {issueAssistedRecovery} from '@/lib/auth/recovery.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
  if(!['OWNER','MANAGER'].includes(session.role)||request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
  const body=await readCorrectionJson(request);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='attestation,employeeId'||!('employeeId' in body)||!('attestation' in body)||typeof body.employeeId!=='string'||typeof body.attestation!=='string')return correctionJson({state:'invalid'},400);
  const result=await issueAssistedRecovery(await requireSessionMutationProof(),body.employeeId,body.attestation);if(result.state==='issued')result.proof=await publicWorkspaceToken('RECOVERY',result.proof,Date.parse(result.expiresAt));return correctionJson(result,result.state==='issued'?200:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
