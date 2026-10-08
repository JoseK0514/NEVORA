import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {readExportProfiles,saveExportProfile} from '@/lib/payroll-export/service';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 const boundary=correctionBoundary(request,false,'x-nevora-payroll-export');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);return correctionJson({state:'ready',profiles:await readExportProfiles(await requireSessionMutationProof())});}catch{return correctionJson({state:'unavailable'},503);}
}
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-payroll-export',65536);if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
 const body=await readCorrectionJson(request,65536);const profile=await saveExportProfile(await requireSessionMutationProof(),body);return correctionJson({state:'saved',profile});
 }catch(error){const message=error instanceof Error?error.message:'';return correctionJson({state:message.includes('CONFLICT')?'conflict':'unavailable'},message.includes('CONFLICT')?409:503);}
}
