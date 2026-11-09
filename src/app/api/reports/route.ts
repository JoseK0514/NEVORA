import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {readReports} from '@/lib/reports/service';
import {parseReportPeriod} from '@/lib/reports/period';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{
 const boundary=correctionBoundaryResponse(request,true,'x-nevora-reports');
 if(boundary)return boundary;
 try{
  const session=await getSession();
  if(!session)return correctionJson({state:'unavailable'},401);
  if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
  let period;
  try{period=parseReportPeriod(await readCorrectionJson(request));}catch{return correctionJson({state:'invalid'},400);}
  const result=await readReports(await requireSessionMutationProof(),period);
  return correctionJson(result.state==='ready'?{state:'ready',source:result.source,validForMs:result.validForMs}:result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
