import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {readTimecards} from '@/lib/timecards/service';
import {parsePeriod} from '@/lib/timecards/project';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{
  const boundary=correctionBoundary(request,true,'x-nevora-timecards');
  if(boundary)return correctionJson({state:'unavailable'},boundary);
  try{
    const session=await getSession();
    if(!session)return correctionJson({state:'unavailable'},401);
    if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
    let period;
    try{
      const body=await readCorrectionJson(request);
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||
        !('startDate' in body)||!('endDate' in body)||typeof body.startDate!=='string'||typeof body.endDate!=='string')throw new Error('Invalid period');
      period=parsePeriod(body.startDate,body.endDate);
    }catch{return correctionJson({state:'invalid'},400);}
    const result=await readTimecards(await requireSessionMutationProof(),period);
    return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
  }catch{return correctionJson({state:'unavailable'},503);}
}
