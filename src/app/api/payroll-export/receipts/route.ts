import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import {listOwnPayrollExportReceipts,readOwnPayrollExportReceipt} from '@/lib/payroll-export/service';
import {payrollExportLaunchRefusal} from '@/lib/payroll-export/launch-guard.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export const runtime='nodejs';export const dynamic='force-dynamic';

/** QA A3-03 (Nov 21, 2026): the person's own past exports, so a file isn't lost when the page clears it. GET lists the
 * latest ten (period, people, when; no names or hours); POST {operationId} returns that receipt's stored file. Same
 * admission as /api/payroll-export: session, the same actor, Owner or Manager, and current company access. */
async function admitted(request:Request){
 const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
 if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
 if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
 return payrollExportLaunchRefusal();
}
const refused=(error:unknown)=>isOperationalAuthorizationError(error)||(error instanceof Error&&error.message==='Export access denied');

export async function GET(request:Request){
 const boundary=correctionBoundary(request,false,'x-nevora-payroll-export');if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{const denied=await admitted(request);if(denied)return denied;
  return correctionJson({state:'ready',receipts:await listOwnPayrollExportReceipts(await requireSessionMutationProof())});}
 catch(error){return correctionJson({state:'unavailable'},refused(error)?403:503);}
}

export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-payroll-export',4096);if(boundary)return correctionJson({state:'unavailable'},boundary);
 try{const denied=await admitted(request);if(denied)return denied;
  let operationId:string;
  try{const body=await readCorrectionJson(request,4096);operationId=body&&typeof body==='object'&&!Array.isArray(body)&&typeof (body as {operationId?:unknown}).operationId==='string'?(body as {operationId:string}).operationId:'';if(!operationId)throw new Error();}
  catch{return correctionJson({state:'invalid'},400);}
  const receipt=await readOwnPayrollExportReceipt(await requireSessionMutationProof(),operationId);
  return receipt?correctionJson({state:'ready',export:receipt}):correctionJson({state:'not_found'},404);
 }catch(error){
  if(error instanceof Error&&error.message==='nevora_export_INVALID_RECEIPT')return correctionJson({state:'invalid'},400);
  return correctionJson({state:'unavailable'},refused(error)?403:503);
 }
}
