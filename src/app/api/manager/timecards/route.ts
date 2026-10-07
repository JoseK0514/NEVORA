import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {mutateTimecard,parseTimecardCommand} from '@/lib/timecards/service';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{
  const boundary=correctionBoundary(request,true,'x-nevora-timecards');
  if(boundary)return correctionJson({status:'unavailable'},boundary);
  try{
    const session=await getSession();
    if(!session)return correctionJson({status:'unavailable'},401);
    if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({status:'unavailable'},403);
    let command;
    try{command=parseTimecardCommand(await readCorrectionJson(request));}catch{return correctionJson({status:'invalid'},400);}
    const result=await mutateTimecard(await requireSessionMutationProof(),command);
    return correctionJson(result,['approved','finalized','reopened'].includes(result.status)?200:
      result.status==='blocked'||result.status==='conflict'?409:503);
  }catch{return correctionJson({status:'unavailable'},503);}
}
