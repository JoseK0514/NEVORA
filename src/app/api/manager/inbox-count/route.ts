import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {failed} from '@/lib/observability/log.server';
import {readInboxCount} from '@/lib/data/inbox-count.server';
import {correctionJson} from '@/lib/time-corrections/http.server';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  if(new URL(request.url).search)return correctionJson({state:'unavailable'},400);
  const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin'&&site!=='none')return correctionJson({state:'unavailable'},403);
  try {
    const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
    if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
    const proof=await requireSessionMutationProof();
    if(proof.employee.id!==session.id||proof.employee.role!==session.role)return correctionJson({state:'unavailable'},403);
    const result=await readInboxCount(proof);
    // B17: an unconfirmed count is a 503, so monitoring and retries see the failure (the badge already hides it).
    return correctionJson(result,result.state==='ready'?200:503);
  }catch(error){return isRedirectError(error)?correctionJson({state:'unavailable'},401):failed('/api/manager/inbox-count',error,correctionJson({state:'unavailable'},503));}
}
