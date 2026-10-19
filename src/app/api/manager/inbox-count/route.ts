import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
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
    return correctionJson(await readInboxCount(proof));
  }catch(error){return correctionJson({state:'unavailable'},isRedirectError(error)?401:200);}
}
