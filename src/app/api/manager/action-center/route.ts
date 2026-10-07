import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {readActionCenter} from '@/lib/action-center/service';
import {isValidWeekStart} from '@/lib/date-utils';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-action-center');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(!['OWNER','MANAGER'].includes(session.role)||request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
  const body=await readCorrectionJson(request);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!('weekStart' in body)||typeof body.weekStart!=='string'||!isValidWeekStart(body.weekStart))return correctionJson({state:'invalid'},400);
  const result=await readActionCenter(await requireSessionMutationProof(),body.weekStart);return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
