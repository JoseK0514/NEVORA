import {matchesCorrectionAuthority} from '@/lib/time-corrections/authority.server';
import { getSession } from '@/lib/auth/session';
import {
  getManagerTimeCorrections,
  reviewManagerTimeCorrection,
} from '@/lib/data/time-corrections';
import {
  correctionBoundary,
  correctionJson,
  readCorrectionJson,
} from '@/lib/time-corrections/http.server';
import { parseCorrectionReviewCommand } from '@/lib/time-corrections/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const boundary=correctionBoundary(request,false);
  if (boundary) return correctionJson({state:'unavailable'},boundary);
  try {
    const session=await getSession();
    if (!session) return correctionJson({state:'unavailable'},401);
    if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
    if (session.role!=='OWNER' && session.role!=='MANAGER') return correctionJson({state:'unavailable'},403);
    const binding=request.headers.get('x-nevora-correction-authority');
    if(binding&&!await matchesCorrectionAuthority(binding))return correctionJson({state:'unavailable'},403);
    const result=await getManagerTimeCorrections();
    if (result.state==='ready') return correctionJson(result);
    return correctionJson(result,result.reason==='access_denied'?403:503);
  } catch {
    return correctionJson({state:'unavailable'},503);
  }
}

export async function POST(request: Request): Promise<Response> {
  const boundary=correctionBoundary(request,true);
  if (boundary) return correctionJson({state:'unavailable'},boundary);
  try {
    const session=await getSession();
    if (!session) return correctionJson({state:'unavailable'},401);
    if(request.headers.get('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
    if (session.role!=='OWNER' && session.role!=='MANAGER') return correctionJson({state:'unavailable'},403);
    if(!await matchesCorrectionAuthority(request.headers.get('x-nevora-correction-authority')))return correctionJson({state:'unavailable'},403);
    let command;
    try {
      command=parseCorrectionReviewCommand(await readCorrectionJson(request));
    } catch {
      return correctionJson({state:'invalid'},400);
    }
    const result=await reviewManagerTimeCorrection(command);
    if (result.status==='approved' || result.status==='rejected') {
      return correctionJson({
        state:result.status,
        operationId:result.operationId,
        requestId:result.requestId,
        revision:result.revision,
        ...(result.status==='approved'?{adjustmentId:result.adjustmentId}:{}),
      });
    }
    if (result.status==='conflict') return correctionJson({state:'conflict'},409);
    if (result.status==='blocked') return correctionJson({state:'blocked',reason:result.reason},409);
    if (result.status==='outcome-unknown') {
      return correctionJson({state:'outcome_unknown',operationId:result.operationId},503);
    }
    return correctionJson({state:'unavailable'},503);
  } catch {
    return correctionJson({state:'unavailable'},503);
  }
}
