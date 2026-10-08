import {matchesCorrectionAuthority} from '@/lib/time-corrections/authority.server';
import {getSession} from '@/lib/auth/session';
import {getEmployeeTime} from '@/lib/data/employee-time';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:object,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request):Promise<Response>{
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-nevora-my-time')!=='1')return json({state:'unavailable',reason:'access_denied'},403);
 if(new URL(request.url).search)return json({state:'unavailable',reason:'access_denied'},400);
 try{
  const session=await getSession();
  if(!session)return json({state:'unavailable',reason:'access_denied'},401);
  if(session.role!=='EMPLOYEE'&&session.role!=='LEAD')return json({state:'unavailable',reason:'access_denied'},403);
  const binding=request.headers.get('x-nevora-correction-authority');
  if(binding&&!await matchesCorrectionAuthority(binding))return json({state:'unavailable',reason:'access_denied'},403);
  const time=await getEmployeeTime();
  return json(time,time.state==='ready'?200:time.reason==='access_denied'?403:503);
 }catch{return json({state:'unavailable',reason:'read_failed'},503);}
}
