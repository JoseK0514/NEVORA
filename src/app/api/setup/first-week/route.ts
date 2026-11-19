import { readFirstWeek } from '@/lib/activation/first-week.server';
import { readSessionMutationProof } from '@/lib/auth/session';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { correctionBoundaryResponse, correctionJson } from '@/lib/time-corrections/http.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const denied = correctionBoundaryResponse(request, false, 'x-nevora-first-week');
  if (denied) return denied;
  const unavailable = { state: 'unavailable' } as const;
  try {
    const proof = await readSessionMutationProof();
    if (!proof) return correctionJson(unavailable, 401);
    if (proof.employee.role !== 'OWNER') return correctionJson(unavailable, 403);
    return correctionJson(await readFirstWeek(proof));
  } catch (error) {
    return correctionJson(unavailable, isManagementAuthorizationError(error) ? 403 : 503);
  }
}
