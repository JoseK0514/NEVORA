import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {mutateTimecard,parseTimecardCommand} from '@/lib/timecards/service';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{
  const boundary=correctionBoundaryResponse(request,true,'x-nevora-timecards',8192,{status:'unavailable'});
  if(boundary)return boundary;
  try{
    const session=await getSession();
    if(!session)return correctionJson({status:'unavailable'},401);
    if(!['OWNER','MANAGER'].includes(session.role)||request.headers.get('x-nevora-actor')!==session.id)return correctionJson({status:'unavailable'},403);
    let command;
    try{command=parseTimecardCommand(await readCorrectionJson(request));}catch{return correctionJson({status:'invalid'},400);}
    const result=await mutateTimecard(await requireSessionMutationProof(),command);
    return correctionJson(result,['approved','finalized','reopened'].includes(result.status)?200:
      result.status==='blocked'||result.status==='conflict'?409:503);
  }catch{return correctionJson({status:'unavailable'},503);}
}
