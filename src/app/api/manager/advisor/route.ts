import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { neonNotificationExecutor } from '@/lib/data/sql-executor';
import { readFeatureFlags } from '@/lib/feature-flags';
import { MANAGER_ADVISOR_HEADER, type ManagerAdvisorResponse } from '@/lib/owner-advisor/manager-contracts';
import { parseManagerAdvisorView, readManagerAdvisor } from '@/lib/owner-advisor/manager.server';
import { correctionBoundaryResponse, correctionJson } from '@/lib/time-corrections/http.server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function respond(result: ManagerAdvisorResponse, status?: number) {
  const errors = { invalid: 400, forbidden: 403, disabled: 404, unavailable: 503 };
  return correctionJson(result, status ?? (result.state === 'error' ? errors[result.code] : 200));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const view = parseManagerAdvisorView(url.searchParams);
  url.search = '';
  const boundary = new Request(url, { headers: request.headers, signal: request.signal });
  const denied = correctionBoundaryResponse(boundary, false, MANAGER_ADVISOR_HEADER, undefined, { state: 'error', code: 'forbidden' });
  if (denied) return denied;

  try {
    const session = await getSession();
    if (!session) return respond({ state: 'error', code: 'forbidden' }, 401);
    if (session.role !== 'MANAGER') return respond({ state: 'error', code: 'forbidden' });
    const flags = readFeatureFlags(process.env);
    if (!flags.ownerAdvisor || !flags.managerAdvisor) return respond({ state: 'error', code: 'disabled' });
    const proof = await requireSessionMutationProof();
    if (proof.employee.id !== session.id || proof.employee.role !== 'MANAGER') return respond({ state: 'error', code: 'forbidden' });
    if (!view) return respond({ state: 'error', code: 'invalid' });
    return respond(await readManagerAdvisor(proof, view, neonNotificationExecutor()));
  } catch (error) {
    if (isRedirectError(error)) return respond({ state: 'error', code: 'forbidden' }, 401);
    return respond({ state: 'error', code: 'unavailable' });
  }
}
