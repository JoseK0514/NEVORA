import {getSession} from '@/lib/auth/session';
import {getClockMonitor} from '@/lib/data/time-clock';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:object,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request):Promise<Response>{
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-nevora-monitor')!=='1')return json({state:'unavailable',reason:'access_denied'},403);
 try{
  const session=await getSession();
  if(!session)return json({state:'unavailable',reason:'access_denied'},401);
  if(session.role!=='OWNER'&&session.role!=='MANAGER')return json({state:'unavailable',reason:'access_denied'},403);
  const monitor=await getClockMonitor();
  return json(monitor,monitor.state==='ready'?200:monitor.reason==='access_denied'?403:503);
 }catch{return json({state:'unavailable',reason:'read_failed'},503);}
}
