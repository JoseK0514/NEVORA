import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {createPayrollExport,parseExportCommand} from '@/lib/payroll-export/service';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-payroll-export',65536);if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
 let command;try{command=parseExportCommand(await readCorrectionJson(request,65536));}catch{return correctionJson({state:'invalid'},400);}
 const result=await createPayrollExport(await requireSessionMutationProof(),command);return correctionJson({state:'generated',export:result});
 }catch(error){const message=error instanceof Error?error.message:'';if(message.includes('nevora_export_ALREADY_GENERATED'))return correctionJson({state:'already_generated'},409);return correctionJson({state:message.includes('CONFLICT')?'conflict':'unavailable'},message.includes('CONFLICT')?409:503);}
}
