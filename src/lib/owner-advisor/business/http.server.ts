import 'server-only';
import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { neonNotificationExecutor } from '@/lib/data/sql-executor';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { isOperationalAuthorizationError } from '@/lib/company-access/operational-scope.server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { correctionBoundary, correctionJson, correctionResponseHeaders } from '@/lib/time-corrections/http.server';
import { AdvisorError } from '../contracts';
import { BUSINESS_INPUT_BYTES, uuid } from './parse';
import { businessExecution, businessSourceService, BusinessValidationError, readBusinessVersion } from './service.server';
async function readBody(request: Request, signal: AbortSignal): Promise<unknown> {
  if (request.body?.locked) throw new AdvisorError('invalid');
  const reader = request.body?.getReader(); if (!reader) throw new AdvisorError('invalid');
  const cancel = () => { void reader.cancel().catch(() => {}); }; signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true }); let text = '', bytes = 0;
  try {
    signal.throwIfAborted();
    while (true) { const chunk = await reader.read(); signal.throwIfAborted(); if (chunk.done) break;
      bytes += chunk.value.byteLength; if (bytes > BUSINESS_INPUT_BYTES) throw new AdvisorError('invalid'); text += decoder.decode(chunk.value, { stream: true }); }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch { cancel(); throw new AdvisorError(signal.aborted ? 'cancelled' : 'invalid'); }
  finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
/** One entry deadline spans authentication, streamed bytes and SQL. Navigation
 * reads source text only; it cannot issue a publication review handle. */
export async function businessHttp(request: Request, navigation?: { params: Promise<{ sourceId: string; versionId: string }> }): Promise<Response> {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20000)]); let abort = () => {};
  const execute = async () => {
    signal.throwIfAborted(); const write = request.method === 'POST';
    if (navigation ? request.method !== 'GET' : !['GET','POST'].includes(request.method)) return correctionJson({ state: 'error', code: 'invalid' }, 405);
    let boundaryRequest = request;
    if (navigation) {
      const headers = new Headers(request.headers), site = headers.get('sec-fetch-site');
      if (site && !['same-origin','none'].includes(site)) return correctionJson({ state: 'error', code: 'forbidden' }, 403);
      headers.set('x-nevora-business-evidence','1'); if (site === 'none') headers.delete('sec-fetch-site');
      boundaryRequest = new Request(request.url, { headers, signal: request.signal });
    }
    const denied = correctionBoundary(boundaryRequest, write, 'x-nevora-business-evidence', BUSINESS_INPUT_BYTES);
    if (denied) return correctionJson({ state: 'error', code: denied === 403 ? 'forbidden' : denied === 503 ? 'unavailable' : 'invalid' }, denied);
    const session = await getSession(); signal.throwIfAborted();
    if (!session) return correctionJson({ state: 'error', code: 'forbidden' }, 401);
    if (session.role !== 'OWNER') throw new AdvisorError('forbidden');
    const proof = await requireSessionMutationProof(); signal.throwIfAborted();
    if (proof.employee.id !== session.id || proof.employee.role !== 'OWNER') throw new AdvisorError('forbidden');
    const { ex } = businessExecution(neonNotificationExecutor(), signal);
    if (navigation) {
      const params = await navigation.params; signal.throwIfAborted(); let sourceId: string, versionId: string;
      try { sourceId = uuid(params.sourceId); versionId = uuid(params.versionId); } catch { throw new AdvisorError('invalid'); }
      const version = await readBusinessVersion(proof, ex, process.env, signal, sourceId, versionId); signal.throwIfAborted();
      const input = version.input!;
      const status = version.status === 'DRAFT' ? 'Unpublished draft; not used by Rondo' : version.current ? 'Latest published version for this reported window; freshness is evaluated separately' : 'Historical version; not eligible for new Rondo investigations';
      return new Response(`Rondo business evidence\n${input.source.name}\n${status}\nSource ID: ${version.sourceId}\nVersion: ${version.versionId}\nSource SHA-256: ${version.digest}\nBusiness timezone: ${version.timeZone}\nCoverage: [${input.window.fromAt}, ${input.window.toAt})\nSource as of: ${input.sourceAsOf}\nCompleteness: ${input.completeness} (Owner-reported claim)\nOrigin: Owner import; not independent verification\n\nExact imported records follow. This read issues no approval handle.\n\n${JSON.stringify(input, null, 2)}\n`, { headers: { ...correctionResponseHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Nevora-Source-SHA256': version.digest } });
    }
    const value = write ? await readBody(request, signal) : undefined; signal.throwIfAborted();
    const result = await businessSourceService(proof, ex, process.env, signal, value); signal.throwIfAborted(); return correctionJson(result);
  };
  try {
    return await Promise.race([execute(), new Promise<never>((_, reject) => { abort = () => {
      if (request.body && !request.body.locked) void request.body.cancel().catch(() => {}); reject(new AdvisorError('cancelled'));
    }; signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort(); })]);
  } catch (error) {
    if (isRedirectError(error)) return correctionJson({ state: 'error', code: 'forbidden' }, 401);
    const code = isManagementAuthorizationError(error) || isOperationalAuthorizationError(error) ? 'forbidden' : signal.aborted ? 'cancelled' : error instanceof AdvisorError ? error.code : 'unavailable';
    return correctionJson({ state: 'error', code, ...(error instanceof BusinessValidationError ? { detail: error.detail } : {}) }, code === 'forbidden' ? 403 : code === 'invalid' ? 400 : code === 'conflict' ? 409 : code === 'limit' ? 429 : 503);
  } finally { signal.removeEventListener('abort', abort); }
}
