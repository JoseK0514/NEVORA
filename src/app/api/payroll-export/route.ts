import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {createPayrollExport,parseExportCommand} from '@/lib/payroll-export/service';
import {payrollExportReviewReason} from '@/lib/payroll-export/errors';
import {payrollExportLaunchRefusal} from '@/lib/payroll-export/launch-guard.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-payroll-export',65536);if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
 const launchRefusal=payrollExportLaunchRefusal();
 if(launchRefusal)return launchRefusal;
 let command;try{command=parseExportCommand(await readCorrectionJson(request,65536));}catch(error){const reason=payrollExportReviewReason(error);return correctionJson({state:'invalid',...(reason?{reason}:{})},400);}
 const result=await createPayrollExport(await requireSessionMutationProof(),command);return correctionJson({state:'generated',export:result});
 }catch(error){const reason=payrollExportReviewReason(error);if(reason)return correctionJson({state:'invalid',reason},400);const message=error instanceof Error?error.message:'';if(message.includes('nevora_export_ALREADY_GENERATED'))return correctionJson({state:'already_generated'},409);return correctionJson({state:message.includes('CONFLICT')?'conflict':'unavailable'},message.includes('CONFLICT')?409:503);}
}
