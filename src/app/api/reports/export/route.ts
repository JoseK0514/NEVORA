import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {readReports} from '@/lib/reports/service';
import {reportCsv} from '@/lib/reports/csv';
import {parsePeriod} from '@/lib/timecards/project';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{
 const boundary=correctionBoundary(request,true,'x-nevora-reports');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
  let period;
  try{const body=await readCorrectionJson(request);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||!('startDate' in body)||!('endDate' in body)||typeof body.startDate!=='string'||typeof body.endDate!=='string')throw new Error();period=parsePeriod(body.startDate,body.endDate);}catch{return correctionJson({state:'invalid'},400);}
  const result=await readReports(await requireSessionMutationProof(),period);if(result.state!=='ready')return correctionJson(result,result.reason==='access_denied'?403:503);
  return new Response(reportCsv(result.report),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="nevora-reports-${period.startDate}-${period.endDate}.csv"`,'cache-control':'private, no-store, max-age=0','pragma':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
 }catch{return correctionJson({state:'unavailable'},503);}
}
