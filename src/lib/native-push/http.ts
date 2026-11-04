import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {NativeInstallationRepository} from '../data/native-installations';
import type {NativeRegistrationConfig} from './config';
import {parseNativePublicKey} from './protocol';

type Deps = {config: NativeRegistrationConfig | null; session(): Promise<SessionMutationProof | null>; repository(): NativeInstallationRepository};
type Flat = Record<string, string | null>;
class RequestError extends Error {constructor(readonly status: number) {super('Invalid native request');}}
const reject = (status = 400): never => {throw new RequestError(status);};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const fingerprint = /^[a-f0-9]{64}$/;
function text(value: unknown, pattern: RegExp, max: number): string {
  return typeof value === 'string' && value.length <= max && pattern.test(value) ? value : reject();
}
function fields(value: Flat, names: readonly string[]) {
  if (Object.keys(value).length !== names.length || Object.keys(value).some(key => !names.includes(key))) reject();
}
/** JSON.parse establishes valid grammar first. Because this protocol is flat,
 * scan only complete quoted tokens followed by ':' to detect duplicate decoded
 * keys (including escaped aliases). Quoted token values cannot become keys. */
function flatJson(source: string): Flat {
  const value: unknown = JSON.parse(source);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.values(value).some(v => v !== null && typeof v !== 'string')) return reject();
  const keys = new Set<string>();
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '"') continue;
    const start = i++;
    for (; i < source.length && source[i] !== '"'; i++) if (source[i] === '\\') i++;
    const end = i;
    let next = end + 1;
    while (/\s/.test(source[next] ?? '') && next < source.length) next++;
    if (source[next] !== ':') continue;
    const key = JSON.parse(source.slice(start, end + 1)) as string;
    if (keys.has(key)) return reject();
    keys.add(key);
  }
  return value as Flat;
}
/** Total deadline and streamed byte budget also cover a missing/false length.
 * Rejected/stalled input is cancelled without waiting for an untrusted producer. */
async function readBody(request: Request): Promise<Flat> {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^(0|[1-9][0-9]*)$/.test(length) || Number(length) > 16384)) return reject(413);
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return reject(415);
  if (request.signal.aborted) return reject();
  const reader = request.body?.getReader(); if (!reader) return reject();
  let stop!: (error: Error) => void;
  const stopped = new Promise<never>((_, fail) => {stop = fail;});
  const abort = () => stop(new RequestError(400));
  const timer = setTimeout(abort, 2000);
  request.signal.addEventListener('abort', abort, {once: true});
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    if (request.signal.aborted) return reject();
    for (;;) {
      const next = await Promise.race([reader.read(), stopped]);
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 16384) return reject(413);
      chunks.push(next.value);
    }
    if (length !== null && Number(length) !== bytes) return reject();
    try { return flatJson(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks))); }
    catch (error) {if (error instanceof RequestError) throw error; return reject();}
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer); request.signal.removeEventListener('abort', abort); reader.releaseLock();
  }
}
function reply(value: unknown, status: number) {
  return Response.json(value, {status, headers: {'Cache-Control': 'no-store, private', 'Vary': 'Cookie, Origin',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'}});
}
const statuses = {denied: 403, conflict: 409, unavailable: 503, throttled: 429, off: 200, active: 200, complete: 200, challenge: 200} as const;
/** Browser enrollment/status derive authority from the real HttpOnly session.
 * Native completion/maintenance accepts no cookies and never reads a session.
 * All current authorization and replay/generation checks remain in SQL. */
export function createNativeRegistrationHandlers(deps: Deps) {
  async function handle(request: Request, action: 'status' | 'challenge' | 'complete'): Promise<Response> {
    try {
      const config = deps.config;
      if (!config) return reply({state: 'unavailable'}, 503);
      if (request.method !== 'POST') return reject(405);
      const url = new URL(request.url);
      if (url.origin !== config.origin) return reject(403);
      if (url.search || url.pathname !== `/api/mobile/v1/notifications/${action}`) return reject();
      const origin = request.headers.get('origin'), site = request.headers.get('sec-fetch-site');
      if ((origin !== null && origin !== config.origin) || (site !== null && site !== 'same-origin' && site !== 'none')) return reject(403);
      // Status has no unauthenticated mode. Do this before reading its body.
      if (action === 'status' && (origin !== config.origin || (site !== null && site !== 'same-origin'))) return reject(403);
      if (action === 'complete' && request.headers.has('cookie')) return reject(403);
      const body = await readBody(request);
      let result;
      if (action === 'complete') {
        fields(body, ['challengeId', 'nonce', 'token', 'signature']);
        const challengeId = text(body.challengeId, uuid, 36), nonce = text(body.nonce, /^[A-Za-z0-9_-]{43}$/, 43);
        const signature = text(body.signature, /^[A-Za-z0-9_-]+$/, 96);
        if (body.token !== null && (typeof body.token !== 'string' || body.token.length < 1 || body.token.length > 4096)) return reject();
        result = await deps.repository().complete({challengeId, nonce, token: body.token, signature});
      } else if (action === 'challenge' && (body.operation === 'rotate' || body.operation === 'detach')) {
        if (request.headers.has('cookie')) return reject(403);
        fields(body, ['operation', 'keyFingerprint', 'expectedGeneration', 'operationId']);
        result = await deps.repository().issueMaintenance({operation: body.operation, keyFingerprint: text(body.keyFingerprint, fingerprint, 64),
          expectedGeneration: text(body.expectedGeneration, uuid, 36), operationId: text(body.operationId, uuid, 36)});
      } else {
        if (origin !== config.origin || (site !== null && site !== 'same-origin')) return reject(403);
        if (action === 'status') fields(body, ['keyFingerprint']);
        else fields(body, ['operation', 'platform', 'spki', 'operationId', 'expectedGeneration']);
        if (action === 'challenge' && ((!['enroll','reconcile'].includes(body.operation ?? '')) || (body.platform !== 'ios' && body.platform !== 'android')
          || body.operation === 'reconcile' && body.expectedGeneration !== null)) return reject();
        const proof = await deps.session();
        if (!proof || !['EMPLOYEE', 'OWNER'].includes(proof.employee.role)) return reject(403);
        if (action === 'status') result = await deps.repository().status({proof, keyFingerprint: text(body.keyFingerprint, fingerprint, 64)});
        else {
          const platform = body.platform as 'ios' | 'android';
          let key;
          try { key = parseNativePublicKey(body.spki); } catch { return reject(); }
          if (body.expectedGeneration !== null) text(body.expectedGeneration, uuid, 36);
          result = await deps.repository().issueEnrollment({proof, spki: key.spki, operationId: text(body.operationId, uuid, 36), expectedGeneration: body.expectedGeneration,
            ...(body.operation === 'reconcile' ? {reconcile: true} : {}),
            binding: {origin: config.origin, environment: config.environment, platform, ...config.applications[platform], keyFingerprint: key.keyFingerprint}});
        }
      }
      return reply(result, statuses[result.state]);
    } catch (error) {
      return error instanceof RequestError ? reply({state: 'denied'}, error.status) : reply({state: 'unavailable'}, 503);
    }
  }
  return {status: (request: Request) => handle(request, 'status'), challenge: (request: Request) => handle(request, 'challenge'), complete: (request: Request) => handle(request, 'complete')};
}
