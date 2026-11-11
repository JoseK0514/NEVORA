import 'server-only';
import {getSession, requireSessionMutationProof} from '../auth/session';
import {correctionBoundary, correctionJson, readCorrectionJson} from '../time-corrections/http.server';
import {staffTaskAuthority, readStaffTaskContext, listStaffTasks, readStaffTask, executeStaffTaskCommand, findStaffTaskOperation} from './service.server';
import type {StaffTaskCommand, TaskQuery} from './types';
import {parseTaskContextQuery, parseTaskHistoryQuery} from './model';

type Action = 'context' | 'contextPage' | 'query' | 'history' | 'command' | 'read' | 'operation';
const bytes = 16384;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Browser admission is separate from current session/Company Access domain checks. */
export async function staffTaskHttp(request: Request, action: Action, id?: string): Promise<Response> {
  const post = action === 'query' || action === 'command' || action === 'history' || action === 'contextPage';
  if (request.method !== (post ? 'POST' : 'GET')) return correctionJson({state: 'unavailable', reason: 'method_not_allowed'}, 405);
  const boundary = correctionBoundary(request, post, 'x-nevora-staff-task', bytes);
  if (boundary) return correctionJson({state: 'blocked', reason: 'access_denied'}, boundary);
  let dispatchedOperation: string | undefined;
  try {
    request.signal.throwIfAborted();
    const session = await getSession();
    if (!session) return correctionJson({state: 'blocked', reason: 'access_denied'}, 401);
    if (!['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'].includes(session.role)) return correctionJson({state: 'blocked', reason: 'access_denied'}, 403);
    const proof = await requireSessionMutationProof();
    if (proof.employee.id !== session.id || proof.employee.role !== session.role || (action !== 'context' && request.headers.get('x-nevora-staff-task-authority') !== staffTaskAuthority(proof))) {
      return correctionJson({state: 'blocked', reason: 'access_denied'}, 403);
    }
    if ((action === 'read' || action === 'operation') && (!id || !uuid.test(id))) return correctionJson({state: 'blocked', reason: 'access_denied'}, 403);
    let value: unknown;
    if (post) {
      try { value = await readCorrectionJson(request, bytes); }
      catch { return correctionJson({status: 'invalid', reason: 'invalid_command'}, 400); }
    }
    request.signal.throwIfAborted();
    let result;
    if (action === 'context') result = await readStaffTaskContext(proof);
    else if (action === 'contextPage') {
      const query = parseTaskContextQuery(value);
      if (!query) return correctionJson({state: 'invalid', reason: 'invalid_query'}, 400);
      result = await readStaffTaskContext(proof, undefined, query);
    }
    else if (action === 'query') result = await listStaffTasks(proof, value as TaskQuery);
    else if (action === 'history') {
      const query = parseTaskHistoryQuery(value);
      if (!query) return correctionJson({state: 'invalid', reason: 'invalid_query'}, 400);
      result = await readStaffTask(proof, query.taskId, undefined, query.beforeCursor);
    }
    else if (action === 'read') result = await readStaffTask(proof, id!);
    else if (action === 'operation') result = await findStaffTaskOperation(proof, id!);
    else {
      if (value && typeof value === 'object' && 'operationId' in value && typeof value.operationId === 'string' && uuid.test(value.operationId)) dispatchedOperation = value.operationId;
      result = await executeStaffTaskCommand(proof, value as StaffTaskCommand);
    }
    const state = 'status' in result ? result.status : result.state;
    const status = state === 'ready' || state === 'committed' ? 200 : state === 'invalid' ? 400 : state === 'blocked' ? 403 : state === 'conflict' ? 409 : 503;
    return correctionJson(result, status);
  } catch {
    return correctionJson(dispatchedOperation ? {status: 'outcome_unknown', operationId: dispatchedOperation} : {state: 'unavailable', reason: 'read_failed'}, 503);
  }
}
