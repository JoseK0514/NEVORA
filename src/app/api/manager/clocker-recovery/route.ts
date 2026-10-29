import {listClockerReviewRequests,ClockerReviewError} from '@/lib/clocker/review-requests.server';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {readClockerRecoveryReview} from '@/lib/clocker/recovery-review.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/**
 * Reads a saved punch command's recovery evidence using one bounded commandId.
 * This is a protected review read, not a punch retry or a manual time correction.
 * The service decides whether the current actor can inspect that command.
 */
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-clocker-recovery');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  const proof=await requireSessionMutationProof();if(proof.employee.role!=='OWNER'||request.headers.get('x-nevora-actor')!==proof.employee.id)return correctionJson({state:'unavailable',reason:'access_denied'},403);
  const input=await readCorrectionJson(request);
  if(input&&typeof input==='object'&&!Array.isArray(input)&&'operation'in input&&input.operation==='requests'){
   if(Object.keys(input).some(k=>!['operation','limit','cursor'].includes(k))||'limit'in input&&typeof input.limit!=='number'||'cursor'in input&&typeof input.cursor!=='string')return correctionJson({state:'invalid'},400);
   const result=await listClockerReviewRequests(proof,{...('limit'in input?{limit:input.limit as number}:{}),...('cursor'in input?{cursor:input.cursor as string}:{})});return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
  }
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!('commandId' in input)||typeof input.commandId!=='string')return correctionJson({state:'invalid'},400);
  const result=await readClockerRecoveryReview(proof,input.commandId);return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch(error){return correctionJson({state:'unavailable'},error instanceof ClockerReviewError&&error.code==='INVALID'?400:503);}
}
