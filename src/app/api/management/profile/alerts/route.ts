import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {saveManagementAlertChoice} from '@/lib/data/management-profile.server';
import {parseManagementAlertChoice} from '@/lib/management-profile';
import {isManagementAuthorizationError} from '@/lib/data/management-session';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  const boundary=correctionBoundary(request,true,'x-nevora-profile-alerts',1024);
  if(boundary)return correctionJson({ok:false},boundary);
  try {
    const session=await getSession();
    if(!session)return correctionJson({ok:false},401);
    if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({ok:false},403);
    let value:unknown;
    try{value=parseManagementAlertChoice(await readCorrectionJson(request,1024),session.role);}catch{return correctionJson({ok:false},400);}
    const proof=await requireSessionMutationProof();
    if(proof.employee.id!==session.id||proof.employee.role!==session.role)return correctionJson({ok:false},403);
    await saveManagementAlertChoice(proof,value);
    return correctionJson({ok:true});
  }catch(error){return correctionJson({ok:false},isRedirectError(error)?401:isManagementAuthorizationError(error)?403:503);}
}
