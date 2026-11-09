import { ClockerPhotoError, PHOTO_MAX_BYTES, type PhotoNotice, type PhotoPolicy } from './contracts';
import { parsePhotoCommand, parsePhotoNotice, parsePhotoUploadSnapshot } from './validation';
import type { ClockerIdentityProof } from '../pin-identity.server';
import { ClockerPhotoService, type PhotoManagementProof } from './service';

const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (body: object, status = 200) => Response.json(body, { status, headers });
export type PhotoTransportSecurity = { portalOrigin: string; production: boolean };
/** Authenticate from the trusted cookie/current-proof transport, never request JSON. */
export type PhotoTransportDeps = {
  enabled: boolean;
  security: PhotoTransportSecurity;
  service: ClockerPhotoService;
  authenticate(request: Request, locationKey: string): Promise<ClockerIdentityProof | null>;
  /** Future current-company binder supplies verified effective notice and
   * cleanup/backup disclosures. Never consume request company/contact values. */
  readNotice?(proof: ClockerIdentityProof, policy: PhotoPolicy): Promise<unknown>;
};
export type PhotoSettingsTransportDeps = {
  enabled: boolean;
  security: PhotoTransportSecurity;
  service: ClockerPhotoService;
  authenticate(request: Request): Promise<PhotoManagementProof | null>;
};
function permitted(request: Request, security: PhotoTransportSecurity): boolean {
  try {
    const origin = new URL(security.portalOrigin);
    if (origin.origin !== security.portalOrigin || origin.username || origin.password ||
        (security.production && origin.protocol !== 'https:') ||
        request.headers.get('origin') !== origin.origin || request.headers.get('x-nevora-clocker') !== '1' ||
        request.method !== 'POST') return false;
    const fetchSite = request.headers.get('sec-fetch-site');
    return fetchSite === null || fetchSite === 'same-origin';
  } catch { return false; }
}
function failed(error: unknown): Response {
  const safe = error instanceof ClockerPhotoError ? error : new ClockerPhotoError('UNAVAILABLE');
  const status = safe.code === 'INVALID_INPUT' ? 400 : safe.code === 'AUTH_REQUIRED' ? 401 : safe.code === 'UNAVAILABLE' ? 503 : 409;
  return json({ state: status === 503 ? 'unknown' : 'rejected', code: safe.code, error: safe.message }, status);
}
/** Reads at most the stated limit, cancels on limit/timeout; never logs content. */
export async function readBoundedPhotoBody(request: Request, maxBytes: number, timeoutMs = 15_000): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new ClockerPhotoError('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new ClockerPhotoError('INVALID_INPUT');
  const parts: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { expired = true; reject(new ClockerPhotoError('INVALID_INPUT')); void reader.cancel().catch(() => {}); }, timeoutMs);
  });
  try {
    while (true) {
      const part = await Promise.race([reader.read(), timedOut]);
      if (expired) throw new ClockerPhotoError('INVALID_INPUT');
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new ClockerPhotoError('INVALID_INPUT'); }
      parts.push(part.value);
    }
    if (!total) throw new ClockerPhotoError('INVALID_INPUT');
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
  } finally { if (timer) clearTimeout(timer); reader.releaseLock(); }
}
async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const bytes = await readBoundedPhotoBody(request, 2048);
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ClockerPhotoError('INVALID_INPUT');
    return value as Record<string, unknown>;
  } catch { throw new ClockerPhotoError('INVALID_INPUT'); }
}
async function effectiveNotice(deps: PhotoTransportDeps, proof: ClockerIdentityProof, policy: PhotoPolicy): Promise<PhotoNotice | null> {
  try { return parsePhotoNotice(await (deps.readNotice ? deps.readNotice(proof, policy) : deps.service.punchNotice(proof, policy)), policy); }
  catch { return null; }
}
/** Owner metadata/remove transport, never a public image or time-writing route. */
export async function handleClockerPhotoOwnerReview(request: Request, deps: PhotoSettingsTransportDeps): Promise<Response> {
  if (!deps.enabled) return json({ state: 'disabled' }, 503);
  if (!permitted(request, deps.security)) return json({ state: 'rejected' }, 403);
  try {
    const proof = await deps.authenticate(request);
    if (!proof) throw new ClockerPhotoError('AUTH_REQUIRED');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ClockerPhotoError('INVALID_INPUT');
    const input = await jsonBody(request);
    if (Object.keys(input).length !== 2) throw new ClockerPhotoError('INVALID_INPUT');
    if (input.operation === 'list' && Object.hasOwn(input, 'query')) return json({ page: await deps.service.listPhotos(proof, input.query) });
    if (input.operation === 'detail' && Object.hasOwn(input, 'reference')) return json({ record: await deps.service.photoDetail(proof, input.reference) });
    if (input.operation === 'remove' && Object.hasOwn(input, 'reference')) return json({ result: await deps.service.removePhoto(proof, input.reference) });
    if (input.operation === 'cleanup' && Object.hasOwn(input, 'limit')) return json({ result: await deps.service.cleanupPhotoEvidence(proof, input.limit as number) });
    throw new ClockerPhotoError('INVALID_INPUT');
  } catch (error) { return failed(error); }
}

/** Separate image endpoint: inherited 2 KiB punch endpoint stays unchanged. */
export async function handleClockerPhoto(request: Request, locationKey: string, deps: PhotoTransportDeps): Promise<Response> {
  if (!deps.enabled) return json({ state: 'disabled', error: 'Punch photo collection is not enabled in this environment.' }, 503);
  if (!permitted(request, deps.security)) return json({ state: 'rejected', error: 'Open Clocker directly on this site.' }, 403);
  if (locationKey.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey) || locationKey.endsWith('\n')) return failed(new ClockerPhotoError('INVALID_INPUT'));
  try {
    const proof = await deps.authenticate(request, locationKey);
    if (!proof) throw new ClockerPhotoError('AUTH_REQUIRED');
    const media = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (media === 'image/jpeg') {
      const command = parsePhotoCommand({ commandId: request.headers.get('x-nevora-photo-command'), verificationId: request.headers.get('x-nevora-photo-verification') });
      const versionHeader = (key: string) => { const value = request.headers.get(key); return value !== null && /^[1-9][0-9]{0,9}$/.test(value) ? Number(value) : null; };
      const snapshot = parsePhotoUploadSnapshot({ policyVersion: versionHeader('x-nevora-photo-policy-version'), profileVersion: versionHeader('x-nevora-photo-profile-version') });
      const policy = await deps.service.policy(proof);
      const notice = await effectiveNotice(deps, proof, policy);
      if (!notice) throw new ClockerPhotoError('UNAVAILABLE');
      if (snapshot.policyVersion !== notice.policyVersion || snapshot.profileVersion !== notice.profileVersion) throw new ClockerPhotoError('POLICY_CHANGED');
      const bytes = await readBoundedPhotoBody(request, PHOTO_MAX_BYTES);
      return json(await deps.service.upload(proof, command, bytes, media, snapshot));
    }
    if (media !== 'application/json') throw new ClockerPhotoError('INVALID_INPUT');
    const input = await jsonBody(request);
    if (input.operation === 'policy' && Object.keys(input).length === 1) {
      const policy = await deps.service.policy(proof);
      return json({ policy, notice: await effectiveNotice(deps, proof, policy) });
    }
    if (Object.keys(input).length === 2 && Object.hasOwn(input, 'command')) {
      if (input.operation === 'status') return json(await deps.service.status(proof, input.command));
      if (input.operation === 'missing') return json(await deps.service.failure(proof, input.command));
    }
    throw new ClockerPhotoError('INVALID_INPUT');
  } catch (error) { return failed(error); }
}

/** Candidate management endpoint: all operations require current portal proof.
 * Review/deletion scheduling is not enabled by the existence of this helper. */
export async function handleClockerPhotoSettings(request: Request, deps: PhotoSettingsTransportDeps): Promise<Response> {
  if (!deps.enabled) return json({ state: 'disabled' }, 503);
  if (!permitted(request, deps.security)) return json({ state: 'rejected', error: 'Open company settings directly on this site.' }, 403);
  try {
    const proof = await deps.authenticate(request);
    if (!proof) throw new ClockerPhotoError('AUTH_REQUIRED');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ClockerPhotoError('INVALID_INPUT');
    const input = await jsonBody(request);
    if (input.operation === 'read' && Object.keys(input).length === 1) return json({ policy: await deps.service.managementPolicy(proof) });
    if (input.operation === 'save' && Object.keys(input).length === 2 && Object.hasOwn(input, 'policy')) return json({ policy: await deps.service.savePolicy(proof, input.policy) });
    if (input.operation === 'photo' && Object.keys(input).length === 2 && Object.hasOwn(input, 'reference')) {
      const photo = await deps.service.readPrivatePhoto(proof, input.reference);
      return photo === null ? json({ state: 'unavailable' }, 404) : new Response(photo as BodyInit, { headers: { ...headers, 'Content-Type': 'image/jpeg' } });
    }
    if (input.operation === 'cleanup' && Object.keys(input).length === 2 && Object.hasOwn(input, 'limit')) return json({ removed: await deps.service.cleanupExpired(proof, input.limit as number) });
    throw new ClockerPhotoError('INVALID_INPUT');
  } catch (error) { return failed(error); }
}

export async function handleClockerPhotoReview(request: Request, locationKey: string, commandId: string, deps: PhotoSettingsTransportDeps): Promise<Response> {
  if (!deps.enabled) return json({ state: 'disabled' }, 503);
  if (!permitted(request, deps.security)) return json({ state: 'rejected' }, 403);
  try {
    const proof = await deps.authenticate(request);
    if (!proof) throw new ClockerPhotoError('AUTH_REQUIRED');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ClockerPhotoError('INVALID_INPUT');
    const input = await jsonBody(request);
    if (input.operation !== 'photo' || Object.keys(input).length !== 2 || !input.reference || typeof input.reference !== 'object' || Array.isArray(input.reference) ||
        (input.reference as Record<string, unknown>).commandId !== commandId) throw new ClockerPhotoError('INVALID_INPUT');
    const photo = await deps.service.readPrivatePhoto(proof, input.reference, locationKey);
    return photo === null ? json({ state: 'unavailable' }, 404) : new Response(photo as BodyInit, { headers: { ...headers, 'Content-Type': 'image/jpeg' } });
  } catch (error) { return failed(error); }
}
