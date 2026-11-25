import {withServerErrorDiagnostics,reportHandledServerError} from '@/lib/server-error';
import {isManagementAuthorizationError} from '@/lib/data/management-session';
import {isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {readActionCenter,readActionCenterForCurrentScope} from '@/lib/action-center/service';
import {isValidWeekStart} from '@/lib/date-utils';
export const runtime='nodejs';export const dynamic='force-dynamic';
/**
 * POST carries a bounded read selector, not a mutation: one Monday weekStart.
 * The actor header must match the cookie session; the service receives fresh
 * proof. Company scope is the default; assigned-location screens opt into their
 * current authorized projection with X-Nevora-Action-Center-Scope: assigned.
 */
export async function POST(request:Request){
 return withServerErrorDiagnostics('/api/manager/action-center',async()=>{
 const boundary=correctionBoundaryResponse(request,true,'x-nevora-action-center');if(boundary)return boundary;
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(!['OWNER','MANAGER'].includes(session.role)||request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
  const scope=request.headers.get('x-nevora-action-center-scope');
  if(scope!==null&&scope!=='assigned')return correctionJson({state:'invalid'},400);
  let body:unknown;try{body=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!('weekStart' in body)||typeof body.weekStart!=='string'||!isValidWeekStart(body.weekStart))return correctionJson({state:'invalid'},400);
  const reader=scope==='assigned'?readActionCenterForCurrentScope:readActionCenter;
  const result=await reader(await requireSessionMutationProof(),body.weekStart);return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch(error){if(!isManagementAuthorizationError(error)&&!isOperationalAuthorizationError(error))reportHandledServerError(error,'/api/manager/action-center');return correctionJson({state:'unavailable'},503);}
 });
}
