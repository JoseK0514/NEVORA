import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {failed} from '@/lib/observability/log.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {readClockerRecoveryReview} from '@/lib/clocker/recovery-review.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Reads a saved punch command's recovery evidence using one bounded commandId.
 * This is a protected review read, not a punch retry or a manual time correction.
 * The service decides whether the current actor can inspect that command.
 */
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-clocker-recovery');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  // B14: anonymous is 401 (requireSessionMutationProof would redirect, which this catch used to turn into 503).
  if(!await getSession())return correctionJson({state:'unavailable',reason:'access_denied'},401);
  const proof=await requireSessionMutationProof();if(request.headers.get('x-nevora-actor')!==proof.employee.id)return correctionJson({state:'unavailable',reason:'access_denied'},403);
  let input:unknown;try{input=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!('commandId' in input)||typeof input.commandId!=='string'||!UUID.test(input.commandId))return correctionJson({state:'invalid'},400);
  const result=await readClockerRecoveryReview(proof,input.commandId);return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch(error){return failed('/api/manager/clocker-recovery',error,correctionJson({state:'unavailable'},503));}
}
