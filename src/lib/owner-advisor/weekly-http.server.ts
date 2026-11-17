import 'server-only';
import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { neonNotificationExecutor } from '@/lib/data/sql-executor';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { isOperationalAuthorizationError } from '@/lib/company-access/operational-scope.server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { correctionBoundary, correctionJson } from '@/lib/time-corrections/http.server';
import type { SqlExecutor } from '@/lib/notifications/types';
import { AdvisorError } from './contracts';
import { weeklyService } from './weekly-service.server';

const bodyLimit = 16384;
async function readBody(request: Request, signal: AbortSignal) {
  const reader = request.body?.getReader(); if (!reader) throw new AdvisorError('invalid');
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '', bytes = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read(); signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength; if (bytes > bodyLimit) throw new AdvisorError('invalid');
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch {
    cancel(); throw new AdvisorError(signal.aborted ? 'cancelled' : 'invalid');
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}

/** One private entry deadline covers authentication, streamed bytes and SQL.
 * An uncertain commit is recovered with its existing operation identity. */
export async function weeklyHttp(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20000)]);
  let onAbort = () => {};
  const execute = async () => {
    signal.throwIfAborted();
    if (request.method !== 'POST') return correctionJson({ state: 'error', code: 'invalid' }, 405);
    const denied = correctionBoundary(request, true, 'x-nevora-owner-advisor', bodyLimit);
    if (denied) return correctionJson({ state: 'error', code: denied === 403 ? 'forbidden' : denied === 503 ? 'unavailable' : 'invalid' }, denied);
    const session = await getSession(); signal.throwIfAborted();
    if (!session) return correctionJson({ state: 'error', code: 'forbidden' }, 401);
    if (session.role !== 'OWNER') throw new AdvisorError('forbidden');
    const proof = await requireSessionMutationProof(); signal.throwIfAborted();
    if (proof.employee.id !== session.id || proof.employee.role !== 'OWNER') throw new AdvisorError('forbidden');
    const value = await readBody(request, signal); signal.throwIfAborted();
    const raw = neonNotificationExecutor();
    const ex: SqlExecutor = { query: (statement, other) => raw.query(statement, other ? AbortSignal.any([signal, other]) : signal),
      transaction: (statements, other) => raw.transaction(statements, other ? AbortSignal.any([signal, other]) : signal) };
    const result = await weeklyService(proof, ex, process.env, signal, value);
    signal.throwIfAborted(); return correctionJson(result);
  };
  try {
    return await Promise.race([execute(), new Promise<never>((_, reject) => {
      onAbort = () => {
        if (request.body && !request.body.locked) void request.body.cancel().catch(() => {});
        reject(new AdvisorError('cancelled'));
      };
      signal.addEventListener('abort', onAbort, { once: true }); if (signal.aborted) onAbort();
    })]);
  } catch (error) {
    if (isRedirectError(error)) return correctionJson({ state: 'error', code: 'forbidden' }, 401);
    const code = isManagementAuthorizationError(error) || isOperationalAuthorizationError(error) ? 'forbidden' :
      signal.aborted ? 'cancelled' : error instanceof AdvisorError ? error.code : 'unavailable';
    return correctionJson({ state: 'error', code }, code === 'forbidden' ? 403 : code === 'invalid' ? 400 : code === 'conflict' ? 409 : code === 'limit' ? 429 : 503);
  } finally { signal.removeEventListener('abort', onAbort); }
}
