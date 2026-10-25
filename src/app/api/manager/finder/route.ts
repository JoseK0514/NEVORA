import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {failed} from '@/lib/observability/log.server';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {listEmployees,listLocations} from '@/lib/data/employees';
import {employeeRoleLabel} from '@/lib/employee-display';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:object,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
/** Read-only names for the manager finder (⌘K). Owners and managers only,
 * same-origin, marked requests only. Returns the minimum to find a person or
 * place: id, name and role label. Never phone, email or a location's Clocker key. */
export async function GET(request:Request):Promise<Response>{
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-nevora-finder')!=='1')return json({state:'unavailable',reason:'access_denied'},403);
 try{
  const session=await getSession();
  if(!session)return json({state:'unavailable',reason:'access_denied'},401);
  if(session.role!=='OWNER'&&session.role!=='MANAGER')return json({state:'unavailable',reason:'access_denied'},403);
  const source=await withOperationalCompany(await requireSessionMutationProof(),()=>Promise.all([listEmployees(),listLocations()]));
  if(source.state==='unavailable')return json(source,source.reason==='access_denied'?403:503);
  const [employees,locations]=source.data;
  return json({state:'ready',
   people:employees.filter(e=>e.active).map(e=>({id:e.id,name:`${e.firstName} ${e.lastName}`.trim(),role:employeeRoleLabel(e.role)})),
   locations:locations.filter(l=>l.active).map(l=>({id:l.id,name:l.shortName||l.name}))});
 }catch(error){return failed('/api/manager/finder',error,json({state:'unavailable',reason:'read_failed'},503));}
}
