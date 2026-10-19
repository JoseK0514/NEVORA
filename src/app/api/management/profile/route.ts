import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {readManagementProfile} from '@/lib/data/management-profile.server';
import {correctionJson} from '@/lib/time-corrections/http.server';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  if(new URL(request.url).search)return correctionJson({state:'unavailable',reason:'invalid_request'},400);
  const site=request.headers.get('sec-fetch-site');
  if(site&&site!=='same-origin'&&site!=='none')return correctionJson({state:'unavailable',reason:'access_denied'},403);
  try {
    const session=await getSession();
    if(!session)return correctionJson({state:'unavailable',reason:'access_denied'},401);
    if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable',reason:'access_denied'},403);
    const proof=await requireSessionMutationProof();
    if(proof.employee.id!==session.id||proof.employee.role!==session.role)return correctionJson({state:'unavailable',reason:'access_denied'},403);
    const result=await readManagementProfile(proof);
    return correctionJson(result,result.state==='unavailable'&&result.reason==='access_denied'?403:200);
  }catch(error){return isRedirectError(error)?correctionJson({state:'unavailable',reason:'access_denied'},401):correctionJson({state:'unavailable',reason:'read_failed'});}
}
