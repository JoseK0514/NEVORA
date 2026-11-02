import 'server-only';
import {parseNativeMaterialBinding} from '../protocol';
import type {NativeProviderResult, NativeProviderScope, NativePushSender} from './types';
import {createNodeNativeTransport, type NativeTransport, type NativeTransportResponse} from './transport';
import {boundedNativeSend, responseObject, retryDelay, validateNativeResponse, validateNativeSend} from './common';

export type FcmConfig = NativeProviderScope & {projectId: string; accessToken(signal: AbortSignal): Promise<string>; clock?(): Date};
export const FCM_NOTIFICATION_CHANNEL = 'nevora_notifications';
function validConfig(config: FcmConfig): boolean {
  try {
    parseNativeMaterialBinding({origin: config.origin, environment: config.environment, appId: config.appId, platform: 'android', provider: 'fcm', keyFingerprint: '0'.repeat(64), generation: '00000000-0000-4000-8000-000000000000'});
    return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId) && typeof config.accessToken === 'function';
  } catch { return false; }
}
function record(value: unknown): value is Record<string, unknown> {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function outcome(response: NativeTransportResponse, projectId: string, now: Date): NativeProviderResult {
  const {statusCode: status} = validateNativeResponse(response), body = responseObject(response.body);
  if (status === 200) {
    const prefix = `projects/${projectId}/messages/`, name = body?.name;
    return typeof name === 'string' && name.startsWith(prefix) && /^[A-Za-z0-9_:%.~-]{1,256}$/.test(name.slice(prefix.length))
      ? {kind: 'accepted'} : {kind: 'retry', errorClass: 'provider_response'};
  }
  if (status === 401 || status === 403) return {kind: 'failed', errorClass: 'provider_configuration'};
  if (status === 429) return {kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: retryDelay(response.retryAfter, now, 60)};
  if (status === 408 || status >= 500) return {kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: retryDelay(response.retryAfter, now, 60)};
  const error = body?.error;
  // INVALID_ARGUMENT can describe the payload. Only the typed FCM registration
  // failure is permission to retire this claimed token generation.
  if (status === 404 && record(error) && error.code === 404 && error.status === 'NOT_FOUND' && Array.isArray(error.details)
    && error.details.some(detail => record(detail) && detail['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && detail.errorCode === 'UNREGISTERED')) return {kind: 'invalid_registration'};
  return {kind: 'failed', errorClass: 'provider_rejected'};
}
/** Supported HTTPv1 AndroidConfig, with a server-only bounded token supplier.
 * No arbitrary notification text, topic, destination or account selector. */
export function createFcmSender(config: FcmConfig | null, transport: NativeTransport = createNodeNativeTransport()): NativePushSender {
  const ready = config && validConfig(config) ? {...config} : null;
  return {send(input) {return boundedNativeSend(input.signal, async signal => {
    if (!ready) return {kind: 'failed', errorClass: 'provider_configuration'};
    const value = validateNativeSend(input, ready, 'android', 'fcm');
    signal.throwIfAborted();
    const token = await ready.accessToken(signal);
    signal.throwIfAborted();
    if (typeof token !== 'string' || token.length > 4096 || !/^[A-Za-z0-9._~+/-]+={0,2}$/.test(token)) return {kind: 'failed', errorClass: 'provider_configuration'};
    const response = await transport({endpoint: `https://fcm.googleapis.com/v1/projects/${ready.projectId}/messages:send`,
      headers: {'content-type': 'application/json', authorization: 'Bearer ' + token},
      body: Buffer.from(JSON.stringify({message: {token: value.installation.token, notification: {title: 'NEVORA', body: 'Open NEVORA.'},
        data: {nevoraProtocol: '1', ...value.payload}, android: {restricted_package_name: ready.appId, priority: value.urgency === 'high' ? 'HIGH' : 'NORMAL',
          ttl: `${value.ttlSeconds}s`, notification: {channel_id: FCM_NOTIFICATION_CHANNEL, visibility: 'PRIVATE'}}}}))}, signal);
    const now = ready.clock?.() ?? new Date();
    if (!Number.isFinite(now.getTime())) return {kind: 'failed', errorClass: 'provider_configuration'};
    return outcome(response, ready.projectId, now);
  });}};
}
