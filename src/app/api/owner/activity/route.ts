import {readSessionMutationProof} from '@/lib/auth/session';
import {readOwnerActivityPage} from '@/lib/activity/owner-feed.server';
import {parseOwnerActivityPage} from '@/lib/activity/owner-feed-page.server';
import {correctionBoundaryResponse, correctionJson, readCorrectionJson} from '@/lib/time-corrections/http.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rejected = correctionBoundaryResponse(request, true, 'x-nevora-activity', 4096, {state: 'request_rejected'});
  if (rejected) return rejected;
  try {
    const proof = await readSessionMutationProof();
    if (!proof) return correctionJson({state: 'authentication_required'}, 401);
    if (proof.employee.role !== 'OWNER') return correctionJson({state: 'access_denied'}, 403);
    let input: unknown;
    try {
      input = await readCorrectionJson(request, 4096);
    } catch {
      return correctionJson({state: 'invalid_request'}, 400);
    }
    const page = parseOwnerActivityPage(input);
    if (!page) return correctionJson({state: 'invalid_request'}, 400);
    const result = await readOwnerActivityPage(proof, page);
    return correctionJson(result, result.state === 'ready' ? 200 : result.state === 'access_denied' ? 403 : 503);
  } catch {
    return correctionJson({state: 'unavailable'}, 503);
  }
}
