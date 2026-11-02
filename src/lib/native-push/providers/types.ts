import type {NativeEnvironment, NativeMaterialBinding, NativeProvider} from '../types';
import type {ProviderResult} from '../../notifications/types';

export type NativeProviderResult = Exclude<ProviderResult, {kind: 'invalid_subscription'}>
  | {kind: 'invalid_registration'; invalidatedAt?: number};
export type NativePushInput = {
  installation: NativeMaterialBinding & {token: string};
  payload: {notificationId: string; generation: string};
  ttlSeconds: number;
  urgency: 'normal' | 'high';
  signal: AbortSignal;
};
export type NativePushSender = {send(input: NativePushInput): Promise<NativeProviderResult>};
export type NativeProviderScope = {origin: string; environment: NativeEnvironment; appId: string};
export type NativeApnsScope = NativeProviderScope & {provider: Exclude<NativeProvider, 'fcm'>};
