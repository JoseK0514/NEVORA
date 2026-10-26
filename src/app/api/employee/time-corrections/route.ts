import {matchesCorrectionAuthority} from '@/lib/time-corrections/authority.server';
import {failed} from '@/lib/observability/log.server';
import { getSession } from '@/lib/auth/session';
import {
  getEmployeeTimeCorrections,
  submitEmployeeTimeCorrection,
} from '@/lib/data/time-corrections';
import {
  correctionBoundary,
  correctionJson,
  readCorrectionJson,
} from '@/lib/time-corrections/http.server';
import { parseCorrectionRequestCommand } from '@/lib/time-corrections/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const boundary=correctionBoundary(request,false);
  if (boundary) return correctionJson({state:'unavailable'},boundary);
  try {
    const session=await getSession();
    if (!session) return correctionJson({state:'unavailable'},401);
    if (session.role!=='EMPLOYEE' && session.role!=='LEAD') return correctionJson({state:'unavailable'},403);
    const binding=request.headers.get('x-nevora-correction-authority');
    if(binding&&!await matchesCorrectionAuthority(binding))return correctionJson({state:'unavailable'},403);
    const result=await getEmployeeTimeCorrections();
    if (result.state==='ready') return correctionJson(result);
    return correctionJson(result,result.reason==='access_denied'?403:503);
  } catch(error){return failed('/api/employee/time-corrections',error,correctionJson({state:'unavailable'},503));}
}

export async function POST(request: Request): Promise<Response> {
  const boundary=correctionBoundary(request,true);
  if (boundary) return correctionJson({state:'unavailable'},boundary);
  try {
    const session=await getSession();
    if (!session) return correctionJson({state:'unavailable'},401);
    if (session.role!=='EMPLOYEE' && session.role!=='LEAD') return correctionJson({state:'unavailable'},403);
    if(!await matchesCorrectionAuthority(request.headers.get('x-nevora-correction-authority')))return correctionJson({state:'unavailable'},403);
    let command;
    try {
      command=parseCorrectionRequestCommand(await readCorrectionJson(request));
    } catch {
      return correctionJson({state:'invalid'},400);
    }
    const result=await submitEmployeeTimeCorrection(command);
    if (result.status==='pending') {
      return correctionJson({
        state:'pending',
        operationId:result.operationId,
        requestId:result.requestId,
        revision:result.revision,
      },202);
    }
    if (result.status==='conflict') return correctionJson({state:'conflict'},409);
    if (result.status==='blocked') return correctionJson({state:'blocked',reason:result.reason},409);
    if (result.status==='outcome-unknown') {
      return correctionJson({state:'outcome_unknown',operationId:result.operationId},503);
    }
    return correctionJson({state:'unavailable'},503);
  } catch(error){return failed('/api/employee/time-corrections',error,correctionJson({state:'unavailable'},503));}
}
