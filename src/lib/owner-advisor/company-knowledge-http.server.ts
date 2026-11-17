import 'server-only';
import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { neonNotificationExecutor } from '@/lib/data/sql-executor';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { isOperationalAuthorizationError } from '@/lib/company-access/operational-scope.server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { correctionBoundary, correctionJson } from '@/lib/time-corrections/http.server';
import type { SqlExecutor } from '@/lib/notifications/types';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import { AdvisorError } from './contracts';

const maximumBodyBytes = 1048576;
async function readBody(request: Request, signal: AbortSignal) {
  const reader = request.body?.getReader();
  if (!reader) throw new AdvisorError('invalid');
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '', bytes = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read(); signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maximumBodyBytes) throw new AdvisorError('invalid');
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch {
    cancel(); throw new AdvisorError(signal.aborted ? 'cancelled' : 'invalid');
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
/** Common private transport, with an entry deadline spanning authentication,
 * streamed bytes and SQL. No source text or upstream error is logged. */
export async function knowledgeHttp(request: Request, action: (proof: SessionMutationProof, ex: SqlExecutor, signal: AbortSignal, value?: unknown) => Promise<Response>, options: { write?: boolean; navigation?: boolean } = {}) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30000)]);
  let abort = () => {};
  const execute = async () => {
    signal.throwIfAborted();
    let boundaryRequest = request;
    if (options.navigation) {
      const headers = new Headers(request.headers), site = headers.get('sec-fetch-site');
      if (site && site !== 'same-origin' && site !== 'none') return correctionJson({ state: 'error', code: 'forbidden' }, 403);
      headers.set('x-nevora-company-knowledge', '1');
      if (site === 'none') headers.delete('sec-fetch-site');
      boundaryRequest = new Request(request.url, { headers, signal: request.signal });
    }
    const denied = correctionBoundary(boundaryRequest, !!options.write, 'x-nevora-company-knowledge', maximumBodyBytes);
    if (denied) return correctionJson({ state: 'error', code: 'invalid' }, denied);
    const session = await getSession(); signal.throwIfAborted();
    if (!session) return correctionJson({ state: 'error', code: 'forbidden' }, 401);
    if (session.role !== 'OWNER') throw new AdvisorError('forbidden');
    const proof = await requireSessionMutationProof(); signal.throwIfAborted();
    if (proof.employee.id !== session.id || proof.employee.role !== 'OWNER') throw new AdvisorError('forbidden');
    const value = options.write ? await readBody(request, signal) : undefined;
    const raw = neonNotificationExecutor();
    const ex: SqlExecutor = {
      query: (statement, other) => raw.query(statement, other ? AbortSignal.any([signal, other]) : signal),
      transaction: (statements, other) => raw.transaction(statements, other ? AbortSignal.any([signal, other]) : signal),
    };
    signal.throwIfAborted();
    return action(proof, ex, signal, value);
  };
  try {
    return await Promise.race([execute(), new Promise<never>((_, reject) => {
      abort = () => reject(new AdvisorError('cancelled'));
      signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
    })]);
  } catch (error) {
    if (isRedirectError(error)) return correctionJson({ state: 'error', code: 'forbidden' }, 401);
    const code = isManagementAuthorizationError(error) || isOperationalAuthorizationError(error) ? 'forbidden' : error instanceof AdvisorError ? error.code : signal.aborted ? 'cancelled' : 'unavailable';
    return correctionJson({ state: 'error', code }, code === 'forbidden' ? 403 : code === 'invalid' ? 400 : code === 'conflict' ? 409 : code === 'limit' ? 429 : 503);
  } finally { signal.removeEventListener('abort', abort); }
}
