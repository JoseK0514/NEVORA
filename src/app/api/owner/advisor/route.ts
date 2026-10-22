import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {neonNotificationExecutor} from '@/lib/data/sql-executor';
import {isManagementAuthorizationError} from '@/lib/data/management-session';
import {isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {advisorService} from '@/lib/owner-advisor/service.server';
import {AdvisorError} from '@/lib/owner-advisor/contracts';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){
 const boundary=correctionBoundary(request,write,'x-nevora-owner-advisor',16384);if(boundary)return correctionJson({state:'error',code:'invalid'},boundary);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'error',code:'forbidden'},401);if(session.role!=='OWNER')return correctionJson({state:'error',code:'forbidden'},403);
  const proof=await requireSessionMutationProof();if(proof.employee.id!==session.id||proof.employee.role!=='OWNER')return correctionJson({state:'error',code:'forbidden'},403);
  let value:unknown;if(write){try{value=await readCorrectionJson(request,16384);}catch{return correctionJson({state:'error',code:'invalid'},400);}if(value===undefined)return correctionJson({state:'error',code:'invalid'},400);}
  return correctionJson(await advisorService(proof,neonNotificationExecutor(),process.env,AbortSignal.any([request.signal,AbortSignal.timeout(60000)]),value));
 }catch(error){
  if(isRedirectError(error))return correctionJson({state:'error',code:'forbidden'},401);
  if(isManagementAuthorizationError(error)||isOperationalAuthorizationError(error))return correctionJson({state:'error',code:'forbidden'},403);
  const code=error instanceof AdvisorError?error.code:error instanceof Error&&['AbortError','TimeoutError'].includes(error.name)?'cancelled':'unavailable';
  const status=code==='forbidden'?403:code==='disabled'?404:code==='invalid'?400:['conflict','busy','prior_attempt_failed'].includes(code)?409:code==='daily_limit'?429:503;
  return correctionJson({state:'error',code},status);
 }
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
