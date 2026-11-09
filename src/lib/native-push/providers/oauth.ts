import 'server-only';
import {sign, type KeyObject} from 'node:crypto';
import {boundedNativeOperation, NativeProviderFailure, responseObject, retryDelay, validateNativeResponse} from './common';
import {createNodeNativeTransport, type NativeTransport} from './transport';

export type GoogleAccessTokenConfig = {clientEmail: string; keyId: string; privateKey: KeyObject; clock?(): Date};
export function validGoogleCredential(config: GoogleAccessTokenConfig): boolean {
  return /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/.test(config.clientEmail)
    && /^[a-f0-9]{40}$/.test(config.keyId) && config.privateKey.type === 'private' && config.privateKey.asymmetricKeyType === 'rsa'
    && (config.privateKey.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048 && (config.privateKey.asymmetricKeyDetails?.modulusLength ?? 0) <= 4096;
}
/** Dedicated service-account OAuth, no end-user or domain-wide delegation.
 * Only in-memory short-lived access tokens; callers never serialize this value. */
export function createGoogleAccessTokenSupplier(config: GoogleAccessTokenConfig | null, transport: NativeTransport = createNodeNativeTransport()): (signal: AbortSignal) => Promise<string> {
  let ready: GoogleAccessTokenConfig | null = null;
  try {if (config && validGoogleCredential(config)) ready = {...config};} catch { /* Fail closed without reflecting credentials. */ }
  let cached: {token: string; issuedAt: number; expiresAt: number} | null = null;
  return signal => boundedNativeOperation(signal, async currentSignal => {
    if (!ready) throw new NativeProviderFailure('failed', 'provider_configuration');
    const now = ready.clock?.() ?? new Date(), started = now.getTime();
    if (!Number.isFinite(started)) throw new NativeProviderFailure('failed', 'provider_configuration');
    if (cached && started >= cached.issuedAt && started < cached.expiresAt - 60000) return cached.token;
    const issued = Math.floor(started / 1000);
    const header = Buffer.from(JSON.stringify({alg: 'RS256', typ: 'JWT', kid: ready.keyId})).toString('base64url');
    const claims = Buffer.from(JSON.stringify({iss: ready.clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token', iat: issued, exp: issued + 3600})).toString('base64url');
    const unsigned = header + '.' + claims;
    const assertion = unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), ready.privateKey).toString('base64url');
    currentSignal.throwIfAborted();
    const response = validateNativeResponse(await transport({endpoint: 'https://oauth2.googleapis.com/token', headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: Buffer.from(new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion}).toString())}, currentSignal));
    currentSignal.throwIfAborted();
    if (response.statusCode === 429 || response.statusCode >= 500) throw new NativeProviderFailure('retry', response.statusCode === 429 ? 'provider_throttled' : 'provider_unavailable', retryDelay(response.retryAfter, ready.clock?.() ?? new Date(), 60));
    if ([400, 401, 403].includes(response.statusCode)) throw new NativeProviderFailure('failed', 'provider_configuration');
    if (response.statusCode !== 200) throw new NativeProviderFailure('failed', 'provider_response');
    const body = responseObject(response.body), seconds = body?.expires_in, token = body?.access_token;
    if (typeof token !== 'string' || token.length > 4096 || !/^[A-Za-z0-9._~+/-]+={0,2}$/.test(token) || body?.token_type !== 'Bearer'
      || typeof seconds !== 'number' || !Number.isInteger(seconds) || seconds < 1 || seconds > 3600) throw new NativeProviderFailure('retry', 'provider_response');
    const received = (ready.clock?.() ?? new Date()).getTime();
    if (!Number.isFinite(received) || started + seconds * 1000 <= received + 1000) throw new NativeProviderFailure('retry', 'provider_response');
    cached = {token, issuedAt: started, expiresAt: started + seconds * 1000}; return token;
  });
}
