import type {NativeEnvironment, NativeMaterialBinding, NativeProvider} from '../types';
import type {ProviderResult} from '../../notifications/types';

export type NativeProviderResult = Exclude<ProviderResult, {kind: 'invalid_subscription'}>
  | {kind: 'invalid_registration'; invalidatedAt?: number} | {kind: 'not_sent'};
export type NativePushInput = {
  installation: NativeMaterialBinding & {token: string};
  payload: {notificationId: string; generation: string};
  ttlSeconds: number;
  urgency: 'normal' | 'high';
  signal: AbortSignal;
  /** Server-only attempt callback, after credentials and before real IO.
   * Returns the currently authorized TTL, or null after durable cancel/defer. */
  beforeHandoff(signal: AbortSignal): Promise<number | null>;
};
export type NativePushSender = {send(input: NativePushInput): Promise<NativeProviderResult>};
export type NativeProviderScope = {origin: string; environment: NativeEnvironment; appId: string};
export type NativeApnsScope = NativeProviderScope & {provider: Exclude<NativeProvider, 'fcm'>};
