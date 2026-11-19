import 'server-only';
import {readSessionMutationProof} from '../auth/session';
import {boundary, failure, json} from '../payroll/http';
import {PayrollError} from '../payroll/model';
import type {SessionMutationProof} from '../shift-changes/types';
import {readCorrectionJson} from '../time-corrections/http.server';

/** The existing private financial transport, independent of payroll activation. */
export async function compensationRequest(request: Request, action: (proof: SessionMutationProof, body: unknown) => Promise<object>) {
  const rejected = boundary(request, true);
  if (rejected) return json({error: 'REQUEST_REJECTED'}, rejected);
  try {
    const proof = await readSessionMutationProof();
    if (!proof) throw new PayrollError('AUTHENTICATION_REQUIRED', 401);
    if (proof.employee.role !== 'OWNER') throw new PayrollError('ACCESS_DENIED', 403);
    let body: unknown;
    try { body = await readCorrectionJson(request, 131072); }
    catch { throw new PayrollError('INVALID_INPUT', 400); }
    return json(await action(proof, body));
  } catch (error) { return failure(error, '/api/compensation'); }
}
