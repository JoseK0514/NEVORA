import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {failed} from '@/lib/observability/log.server';
import {readReports} from '@/lib/reports/service';
import {parseReportPeriod} from '@/lib/reports/period';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{
 const boundary=correctionBoundary(request,true,'x-nevora-reports');
 if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  const session=await getSession();
  if(!session)return correctionJson({state:'unavailable'},401);
  if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
  let period;
  try{period=parseReportPeriod(await readCorrectionJson(request));}catch{return correctionJson({state:'invalid'},400);}
  const result=await readReports(await requireSessionMutationProof(),period);
  return correctionJson(result.state==='ready'?{state:'ready',source:result.source,validForMs:result.validForMs}:result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch(error){return failed('/api/reports',error,correctionJson({state:'unavailable'},503));}
}
