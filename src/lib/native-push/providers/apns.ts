import 'server-only';
import {createHash, sign, type KeyObject} from 'node:crypto';
import {parseNativeMaterialBinding} from '../protocol';
import type {NativeApnsScope, NativePushSender, NativeProviderResult} from './types';
import {createNodeNativeTransport, type NativeTransport, type NativeTransportResponse} from './transport';
import {boundedNativeSend, nativeHandoff, responseObject, retryDelay, validateNativeResponse, validateNativeSend} from './common';

export type ApnsConfig = NativeApnsScope & {teamId: string; keyId: string; privateKey: KeyObject; clock?(): Date};
function validConfig(config: ApnsConfig): boolean {
  try {
    parseNativeMaterialBinding({origin: config.origin, environment: config.environment, appId: config.appId, platform: 'ios', provider: config.provider, keyFingerprint: '0'.repeat(64), generation: '00000000-0000-4000-8000-000000000000'});
    return /^[A-Z0-9]{10}$/.test(config.teamId) && /^[A-Z0-9]{10}$/.test(config.keyId)
      && config.privateKey.type === 'private' && config.privateKey.asymmetricKeyType === 'ec' && config.privateKey.asymmetricKeyDetails?.namedCurve === 'prime256v1'
      && (config.environment === 'test' ? config.provider === 'apns-sandbox' : config.provider === 'apns-production');
  } catch { return false; }
}
function outcome(response: NativeTransportResponse, now: Date): NativeProviderResult {
  const {statusCode: status} = validateNativeResponse(response);
  if (status === 200) return {kind: 'accepted'};
  const body = responseObject(response.body), reason = body?.reason;
  if (status === 400 && reason === 'BadDeviceToken') return {kind: 'invalid_registration'};
  if (status === 410) {
    const timestamp = body?.timestamp;
    return reason === 'Unregistered' && Number.isSafeInteger(timestamp) && Number(timestamp) >= 0 && Number(timestamp) <= now.getTime()
      ? {kind: 'invalid_registration', invalidatedAt: Number(timestamp)} : {kind: 'failed', errorClass: 'provider_response'};
  }
  if (status === 403 || status === 401 || (status === 400 && reason === 'DeviceTokenNotForTopic')) return {kind: 'failed', errorClass: 'provider_configuration'};
  if (status === 429) return {kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: retryDelay(response.retryAfter, now, reason === 'TooManyProviderTokenUpdates' ? 1200 : 60)};
  if (status >= 500) return {kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: retryDelay(response.retryAfter, now, 900)};
  return {kind: 'failed', errorClass: body || status >= 300 && status < 400 ? 'provider_rejected' : 'provider_response'};
}
/** Separate provider JWT (server only) from the installation's DER registration
 * signature. The provider receives only generic text and opaque tap metadata. */
export function createApnsSender(config: ApnsConfig | null, transport: NativeTransport = createNodeNativeTransport()): NativePushSender {
  const ready = config && validConfig(config) ? {...config} : null;
  let cached: {token: string; issued: number} | null = null;
  function providerToken(now: Date): string {
    const issued = Math.floor(now.getTime() / 1000);
    if (cached && issued >= cached.issued && issued < cached.issued + 3000) return cached.token;
    const header = Buffer.from(JSON.stringify({alg: 'ES256', typ: 'JWT', kid: ready!.keyId})).toString('base64url');
    const claims = Buffer.from(JSON.stringify({iss: ready!.teamId, iat: issued})).toString('base64url');
    const unsigned = header + '.' + claims;
    const signature = sign('sha256', Buffer.from(unsigned), {key: ready!.privateKey, dsaEncoding: 'ieee-p1363'}).toString('base64url');
    cached = {token: unsigned + '.' + signature, issued}; return cached.token;
  }
  return {send(input) {return boundedNativeSend(input.signal, async signal => {
    if (!ready) return {kind: 'failed', errorClass: 'provider_configuration'};
    const value = validateNativeSend(input, ready, 'ios', ready.provider), now = ready.clock?.() ?? new Date();
    if (!Number.isFinite(now.getTime())) return {kind: 'failed', errorClass: 'provider_configuration'};
    const jwt = providerToken(now);
    const ttl = await nativeHandoff(value, signal); if (ttl === null) return {kind: 'not_sent'};
    const handoffAt = ready.clock?.() ?? new Date();
    if (!Number.isFinite(handoffAt.getTime())) return {kind: 'failed', errorClass: 'provider_configuration'};
    const response = await transport({endpoint: `https://${ready.provider === 'apns-sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'}/3/device/${value.installation.token}`,
      headers: {'content-type': 'application/json', authorization: 'bearer ' + jwt, 'apns-topic': ready.appId, 'apns-push-type': 'alert',
        'apns-priority': value.urgency === 'high' ? '10' : '5', 'apns-expiration': String(Math.floor(handoffAt.getTime() / 1000) + ttl),
        'apns-collapse-id': createHash('sha256').update(JSON.stringify([value.payload.notificationId, value.payload.generation])).digest('hex')},
      body: Buffer.from(JSON.stringify({aps: {alert: {title: 'NEVORA', body: 'Open NEVORA.'}}, nevora: {version: 1, ...value.payload}}))}, signal);
    return outcome(response, ready.clock?.() ?? new Date());
  });}};
}
