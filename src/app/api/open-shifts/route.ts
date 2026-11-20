import { isOperationalAuthorizationError } from '@/lib/company-access/operational-scope.server';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { executeOpenShift, listClaimableOpenShifts, readManagedOpenShifts } from '@/lib/data/open-shifts.server';
import { correctionBoundaryResponse, correctionJson, readCorrectionJson } from '@/lib/time-corrections/http.server';
import { moduleEnabled } from '@/lib/workspace-presentation/current.server';

export const dynamic = 'force-dynamic';

const intent = 'x-nevora-open-shifts';
const limit = 2048;

export async function GET(request: Request) {
  const boundary = correctionBoundaryResponse(request, false, intent, limit);
  if (boundary) return boundary;
  try {
    const session = await getSession();
    if (!session) return correctionJson({state: 'unavailable'}, 401);
    if (!await moduleEnabled('marketplace')) return correctionJson({state: 'forbidden'}, 403);
    const proof = await requireSessionMutationProof();
    if (proof.employee.id !== session.id || proof.employee.role !== session.role) {
      return correctionJson({state: 'forbidden'}, 403);
    }
    const data = session.role === 'OWNER' || session.role === 'MANAGER'
      ? await readManagedOpenShifts(proof)
      : { shifts: await listClaimableOpenShifts(proof) };
    return correctionJson({state: 'ready', ...data});
  } catch (error) {
    if (isOperationalAuthorizationError(error) || isManagementAuthorizationError(error)) {
      return correctionJson({state: 'forbidden'}, 403);
    }
    return correctionJson({state: 'unavailable'}, 503);
  }
}

export async function POST(request: Request) {
  const boundary = correctionBoundaryResponse(request, true, intent, limit);
  if (boundary) return boundary;
  try {
    const session = await getSession();
    if (!session) return correctionJson({state: 'unavailable'}, 401);
    if (request.headers.get('x-nevora-actor') !== session.id || !await moduleEnabled('marketplace')) {
      return correctionJson({state: 'forbidden'}, 403);
    }
    const proof = await requireSessionMutationProof();
    if (proof.employee.id !== session.id || proof.employee.role !== session.role) {
      return correctionJson({state: 'forbidden'}, 403);
    }
    let input: unknown;
    try { input = await readCorrectionJson(request, limit); }
    catch { return correctionJson({state: 'invalid'}, 400); }
    const result = await executeOpenShift(proof, input);
    const statuses = {
      posted: 200, claimed: 200, withdrawn: 200, filled: 409, expired: 410,
      ineligible: 409, conflict: 409, outcome_unknown: 503, invalid: 400, forbidden: 403, unavailable: 404,
    };
    // A stale claim sees a withdrawn conflict. Retrying a withdrawal succeeds.
    const status = result.state === 'withdrawn' && input && typeof input === 'object' &&
      'kind' in input && input.kind === 'claim' ? 410 : statuses[result.state];
    return correctionJson(result, status);
  } catch {
    return correctionJson({state: 'unavailable'}, 503);
  }
}
