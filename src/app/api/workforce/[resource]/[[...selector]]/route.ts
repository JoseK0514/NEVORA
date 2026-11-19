import { requireSessionMutationProof } from '@/lib/auth/session';
import { isOperationalAuthorizationError } from '@/lib/company-access/operational-scope.server';
import { readOperationalPlanningWeek } from '@/lib/company-access/operational-read.server';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { listWorkforceLeave } from '@/lib/data/requests';
import { correctionBoundaryResponse, correctionJson, readCorrectionJson } from '@/lib/time-corrections/http.server';
import { isWorkforceId } from '@/lib/workforce/contracts';
import { listWorkforcePermissions } from '@/lib/workforce/authority.server';
import { applyWorkforceCommand, readPtoAccount, readWorkforceSettings } from '@/lib/workforce/settings.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ resource: string; selector?: string[] }> };
const headers = 'x-nevora-workforce';
const unavailable = { state:'unavailable' };
const invalid = { state:'invalid' };

async function handle(request: Request, context: Context, write: boolean) {
  const blocked = correctionBoundaryResponse(request, write, headers);
  if (blocked) return blocked;
  const { resource, selector = [] } = await context.params;
  if (selector.length > 1 || (write && (resource !== 'settings' || selector.length))) return correctionJson(invalid, 400);
  let proof;
  try { proof = await requireSessionMutationProof(); } catch { return correctionJson(unavailable, 401); }
  try {
    if (write) {
      let value: unknown;
      try { value = await readCorrectionJson(request); } catch { return correctionJson(invalid, 400); }
      const outcome = await applyWorkforceCommand(proof, value);
      const status = { saved:200, conflict:409, invalid:400, unknown:503 }[outcome.state];
      return correctionJson(outcome, status);
    }
    const [key] = selector;
    if (resource === 'settings' && !key) {
      return correctionJson({state:'ready',data:await readWorkforceSettings(proof)});
    }
    if (resource === 'permissions' && !key) {
      const {permissions} = await listWorkforcePermissions(proof);
      return correctionJson({state:'ready',permissions,wholeWeekPublication:proof.employee.role==='OWNER'});
    }
    if (resource === 'pto' && (!key || isWorkforceId(key))) {
      const account = await readPtoAccount(proof, key);
      return account ? correctionJson({state:'ready',data:account}) : correctionJson(unavailable, 403);
    }
    if (resource === 'calendar') {
      const result = await readOperationalPlanningWeek(proof, key ?? 'current');
      return correctionJson(result, result.state==='ready' ? 200 : result.reason==='access_denied' ? 403 : 503);
    }
    if (resource === 'leave' && (key==='PENDING' || key==='APPROVED' || key==='DENIED' || key==='CANCELLED')) {
      const result = await listWorkforceLeave(proof, key);
      return correctionJson(result, result.state==='ready' ? 200 : result.reason==='access_denied' ? 403 : 503);
    }
    return correctionJson(invalid, 400);
  } catch (error) {
    if (isManagementAuthorizationError(error) || isOperationalAuthorizationError(error)) return correctionJson(unavailable, 403);
    return correctionJson(unavailable, 503);
  }
}

export async function GET(request: Request, context: Context) { return handle(request, context, false); }
export async function POST(request: Request, context: Context) { return handle(request, context, true); }
