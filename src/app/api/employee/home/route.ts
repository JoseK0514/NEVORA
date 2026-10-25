import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {failed} from '@/lib/observability/log.server';
import {homeAuthority,readEmployeeHome} from '@/lib/data/employee-home.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:object,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
/**
 * Private Employee/Lead home read bound to the current session lifetime. Query
 * selectors are rejected: identity/scope come from proof, not URL parameters.
 * Preserve no-store headers and distinguish denied access from unavailable data.
 */
export async function GET(request:Request):Promise<Response>{
 if(new URL(request.url).search)return json({state:'unauthorized',reason:'access_denied'},400);
 if(request.headers.get('sec-fetch-site')==='cross-site')return json({state:'unauthorized',reason:'access_denied'},403);
 try{
  const session=await getSession();if(!session)return json({state:'unauthorized',reason:'access_denied'},401);
  if(!['EMPLOYEE','LEAD'].includes(session.role))return json({state:'unauthorized',reason:'access_denied'},403);
  const proof=await requireSessionMutationProof();
  if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-home')!==homeAuthority(proof))return json({state:'unauthorized',reason:'access_denied'},403);
  const read=await readEmployeeHome(proof);
  return json(read,read.state==='unauthorized'?403:read.state==='unavailable'?503:200);
 }catch(error){return failed('/api/employee/home',error,json({state:'unavailable',reason:'read_failed'},503));}
}
