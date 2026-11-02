import 'server-only';
import {nativeTokenDigest, parseNativeMaterialBinding} from '../protocol';
import {NativeTransportError, type NativeTransportResponse} from './transport';
import type {NativeProviderResult, NativeProviderScope, NativePushInput} from './types';
import type {NativePlatform, NativeProvider} from '../types';

type ErrorCode = 'provider_configuration' | 'provider_rejected' | 'provider_response' | 'provider_unavailable' | 'provider_throttled' | 'invalid_payload';
export class NativeProviderFailure extends Error {
  constructor(readonly kind: 'retry' | 'failed', readonly code: ErrorCode, readonly retryAfterSeconds?: number) {super(code);}
  result(): NativeProviderResult {return {kind: this.kind, errorClass: this.code, ...(this.kind === 'retry' && this.retryAfterSeconds !== undefined ? {retryAfterSeconds: this.retryAfterSeconds} : {})};}
}
function closed(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) {
    throw new NativeProviderFailure('failed', 'invalid_payload');
  }
}
/** Detach every mutable input before awaiting credential/network work. DTOs have
 * no account/profile/message/URL fields and native token data never enters JS. */
export function validateNativeSend(input: NativePushInput, scope: NativeProviderScope, platform: NativePlatform, provider: NativeProvider) {
  try {
    closed(input.installation, ['origin', 'environment', 'platform', 'provider', 'appId', 'keyFingerprint', 'generation', 'token']);
    const {token, ...binding} = input.installation, material = parseNativeMaterialBinding(binding);
    nativeTokenDigest(material.platform, token);
    if (material.origin !== scope.origin || material.environment !== scope.environment || material.appId !== scope.appId || material.platform !== platform || material.provider !== provider) {
      throw new NativeProviderFailure('failed', 'provider_configuration');
    }
    closed(input.payload, ['notificationId', 'generation']);
    if (typeof input.payload.notificationId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.payload.notificationId)
      || input.payload.generation !== material.generation || !Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 1 || input.ttlSeconds > 7 * 86400
      || (input.urgency !== 'normal' && input.urgency !== 'high')) throw new NativeProviderFailure('failed', 'invalid_payload');
    return {installation: {...material, token}, payload: {notificationId: input.payload.notificationId, generation: material.generation}, ttlSeconds: input.ttlSeconds, urgency: input.urgency};
  } catch (error) {if (error instanceof NativeProviderFailure) throw error; throw new NativeProviderFailure('failed', 'invalid_payload');}
}
export function validateNativeResponse(value: NativeTransportResponse): NativeTransportResponse {
  if (!Number.isInteger(value.statusCode) || value.statusCode < 200 || value.statusCode > 599 || !Buffer.isBuffer(value.body) || value.body.length > 8192
    || (value.retryAfter !== undefined && (typeof value.retryAfter !== 'string' || value.retryAfter.length > 256))) throw new NativeProviderFailure('failed', 'provider_response');
  return value;
}
export function responseObject(body: Buffer): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(body));
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
/** Preserve representable Retry-After delays, never cap them to an earlier send.
 * An unrepresentable/malformed window is terminal instead of retrying early. */
export function retryDelay(raw: string | undefined, now: Date, minimum: number): number {
  if (raw === undefined) return minimum;
  const seconds = /^\d+$/.test(raw) ? Number(raw) : /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(raw) ? Math.ceil((Date.parse(raw) - now.getTime()) / 1000) : NaN;
  if (!Number.isSafeInteger(seconds) || seconds > 2147483647) throw new NativeProviderFailure('failed', 'provider_response');
  return Math.max(minimum, seconds);
}
/** Includes credential waits in the total attempt budget. A late supplier may
 * settle after timeout; callers must check the returned signal before any IO. */
export async function boundedNativeOperation<T>(signal: AbortSignal, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (signal.aborted) throw new NativeTransportError('transport_timeout');
  const controller = new AbortController();
  let timedOut!: (error: NativeTransportError) => void;
  const cancelled = new Promise<never>((_, reject) => {timedOut = reject;});
  const abort = () => {controller.abort(); timedOut(new NativeTransportError('transport_timeout'));};
  const timer = setTimeout(abort, 8000);
  signal.addEventListener('abort', abort, {once: true});
  try {
    if (signal.aborted) {abort(); return await cancelled;}
    return await Promise.race([run(controller.signal), cancelled]);
  } catch (error) {
    if (controller.signal.aborted) throw new NativeTransportError('transport_timeout');
    if (error instanceof NativeProviderFailure || error instanceof NativeTransportError) throw error;
    throw new NativeTransportError('transport_error');
  } finally {clearTimeout(timer); signal.removeEventListener('abort', abort); controller.abort();}
}
export async function boundedNativeSend(signal: AbortSignal, run: (signal: AbortSignal) => Promise<NativeProviderResult>): Promise<NativeProviderResult> {
  try {return await boundedNativeOperation(signal, run);}
  catch (error) {
    if (signal.aborted) return {kind: 'retry', errorClass: 'transport_timeout'};
    if (error instanceof NativeProviderFailure) return error.result();
    if (error instanceof NativeTransportError) return {kind: error.code === 'request_invalid' ? 'failed' : 'retry',
      errorClass: error.code === 'request_invalid' ? 'provider_configuration' : error.code === 'transport_timeout' ? 'transport_timeout'
        : error.code === 'response_headers' || error.code === 'response_too_large' ? 'provider_response' : 'transport_error'};
    return {kind: 'retry', errorClass: 'transport_error'};
  }
}
