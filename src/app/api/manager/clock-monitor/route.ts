import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {readOperationalClockMonitor} from '@/lib/company-access/operational-read.server';
import type {ClockMonitor} from '@/lib/time-clock';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:object,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request):Promise<Response>{
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-nevora-monitor')!=='1')return json({state:'unavailable',reason:'access_denied'},403);
 if(new URL(request.url).search)return json({state:'unavailable',reason:'access_denied'},400);
 try{
  const session=await getSession();
  if(!session)return json({state:'unavailable',reason:'access_denied'},401);
  if(session.role!=='OWNER'&&session.role!=='MANAGER')return json({state:'unavailable',reason:'access_denied'},403);
  const result=await readOperationalClockMonitor(await requireSessionMutationProof());
  const monitor:ClockMonitor=result.state==='ready'
   ?{state:'ready',observedAt:result.observedAt,validForMs:result.validForMs,timeZone:result.data.timeZone,employees:result.data.employees}
   :{state:'unavailable',reason:result.reason==='source_changed'?'access_denied':result.reason==='source_limit'?'read_failed':result.reason};
  return json(monitor,monitor.state==='ready'?200:monitor.reason==='access_denied'?403:503);
 }catch{return json({state:'unavailable',reason:'read_failed'},503);}
}
