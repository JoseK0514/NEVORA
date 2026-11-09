import 'server-only';
import { randomBytes } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import { authenticateClockerDevice, clockerCredentialWasIssued, ClockerDeviceError, redeemClockerEnrollment } from './devices.server';

export type ClockerCookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: {
    httpOnly: boolean; secure: boolean; sameSite: 'strict'; path: string; maxAge: number;
  }): void;
};
export type ClockerSecurity = { production: boolean; origin?: string };
type Failure = { status: number; error: string };
const SETUP_LIFETIME = 600;
const DEVICE_LIFETIME = 365 * 86400;
const MAX_BODY_BYTES = 2048;
export function clockerSecurity(): ClockerSecurity {
  return { production: process.env.NODE_ENV === 'production', origin: process.env.NEVORA_CLOCKER_ORIGIN };
}
export function clockerCookieNames(production: boolean) {
  const prefix = production ? '__Host-' : '';
  return { device: `${prefix}nevora_clocker`, setup: `${prefix}nevora_clocker_setup` };
}
/** Production never trusts an arbitrary forwarded host as the allowed origin. */
export function clockerOriginFailure(headers: Headers, security: ClockerSecurity): Failure | null {
  let allowed: URL;
  try {
    if (security.origin) {
      allowed = new URL(security.origin);
      if (allowed.username || allowed.password || allowed.pathname !== '/' || allowed.search || allowed.hash ||
          !['http:', 'https:'].includes(allowed.protocol) || (security.production && allowed.protocol !== 'https:')) throw Error();
    } else {
      if (security.production) throw Error();
      const host = headers.get('host');
      if (!host) throw Error();
      allowed = new URL(`http://${host}`);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(allowed.hostname) || allowed.host !== host) throw Error();
    }
  } catch { return { status: 503, error: 'Clocker setup is not configured for this environment.' }; }
  if (headers.get('origin') !== allowed.origin || headers.get('sec-fetch-site') === 'cross-site') {
    return { status: 403, error: 'Open Clocker directly on this site and try again.' };
  }
  return null;
}
function response(body: object, status = 200) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  } });
}
function failure(result: Failure) { return response({ error: result.error }, result.status); }
function validCredential(value: unknown): value is string {
  return typeof value === 'string' && /^nev_dev_[a-f0-9]{64}$/.test(value);
}
type SetupInput = { step: 'prepare' } | { step: 'status' } | { step: 'redeem'; enrollmentToken: string };
async function readInput(request: Request): Promise<SetupInput> {
  const reader = request.body?.getReader();
  if (!reader) throw Error('input');
  let size = 0, text = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw Error('input'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('input');
  const record = data as Record<string, unknown>;
  if (record.step === 'redeem') {
    if (Object.keys(record).some(key => key !== 'step' && key !== 'enrollmentToken') ||
        typeof record.enrollmentToken !== 'string' || !/^nev_enr_[a-f0-9]{64}$/.test(record.enrollmentToken)) throw Error('input');
    return { step: 'redeem', enrollmentToken: record.enrollmentToken };
  }
  if ((record.step !== 'prepare' && record.step !== 'status') || Object.keys(record).length !== 1) throw Error('input');
  return { step: record.step };
}

/** The route supplies the actual cookie store; body data can never choose a credential. */
export async function handleClockerSetup(request: Request, locationKey: string, deps: {
  cookies: ClockerCookieStore; executor: SqlExecutor; security: ClockerSecurity;
  finishPortalSession(): Promise<void>;
}): Promise<Response> {
  const originError = clockerOriginFailure(request.headers, deps.security);
  if (originError) return failure(originError);
  if (request.method !== 'POST' || request.headers.get('x-nevora-clocker') !== '1' ||
      request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return failure({ status: 403, error: 'Open Clocker directly on this site and try again.' });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey) || locationKey.length > 64) {
    return failure({ status: 400, error: 'Choose a valid Clocker location.' });
  }
  let input: SetupInput;
  try { input = await readInput(request); }
  catch { return failure({ status: 400, error: 'Check the setup code and try again.' }); }
  const names = clockerCookieNames(deps.security.production);
  const options = (maxAge: number) => ({ httpOnly: true, secure: deps.security.production, sameSite: 'strict' as const, path: '/', maxAge });
  const prepared = deps.cookies.get(names.setup)?.value;
  const current = deps.cookies.get(names.device)?.value;
  const authenticate = (credential: string) => authenticateClockerDevice({ credential, locationKey }, deps.executor);
  async function finish(credential: string, deviceName: string) {
    // Do not leave an Owner/Manager portal session on an unattended shared tablet.
    // Failure retains the setup proof, allowing a later status request to retry.
    await deps.finishPortalSession();
    deps.cookies.set(names.device, credential, options(DEVICE_LIFETIME));
    deps.cookies.set(names.setup, '', options(0));
    return response({ state: 'connected', deviceName });
  }
  async function reconcile() {
    for (const credential of [...new Set([prepared, current])]) {
      if (!validCredential(credential)) continue;
      const grant = await authenticate(credential);
      if (grant) return finish(credential, grant.device.name);
    }
    return null;
  }
  try {
    const connected = await reconcile();
    if (connected) return connected;
    if (input.step === 'status') return response({ state: 'unregistered' });
    if (input.step === 'prepare') {
      // Already-registered credentials are never recycled for a replacement.
      const reusable = validCredential(prepared) && !(await clockerCredentialWasIssued(prepared, deps.executor));
      const value = reusable ? prepared : `nev_dev_${randomBytes(32).toString('hex')}`;
      deps.cookies.set(names.setup, value, options(SETUP_LIFETIME));
      return response({ state: 'prepared' });
    }
    if (!validCredential(prepared)) {
      return failure({ status: 428, error: 'Allow cookies, then start tablet setup again.' });
    }
    try {
      const result = await redeemClockerEnrollment({
        enrollmentToken: input.enrollmentToken, locationKey, preparedCredential: prepared,
      }, deps.executor);
      return await finish(prepared, result.device.name);
    } catch (error) {
      // Another request may have committed, or the database reply may have been lost.
      // Only an authenticated cookie for this location can turn ambiguity into success.
      const recovered = await reconcile();
      if (recovered) return recovered;
      if (error instanceof ClockerDeviceError && ['ENROLLMENT_INVALID', 'OWNER_REQUIRED', 'LOCATION_INVALID'].includes(error.code)) {
        return failure({ status: 409, error: 'This setup code is expired, already used, or for another location. Ask the Owner for a new code.' });
      }
      throw error;
    }
  } catch {
    return failure({ status: 503, error: 'We could not confirm tablet setup. Check the connection, then choose Check Setup. Do not enter a new code yet.' });
  }
}
