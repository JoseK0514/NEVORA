import 'server-only';
import {isIP} from 'node:net';
import {parseNativeMaterialBinding} from './protocol';
import type {NativeEnvironment, NativePlatform, NativeProvider} from './types';

export type NativeRegistrationConfig = Readonly<{
  origin: string;
  environment: NativeEnvironment;
  encryptionKey: Uint8Array;
  applications: Record<NativePlatform, {appId: string; provider: NativeProvider}>;
}>;
/** Registration readiness only. No provider credentials, outbound transport or
 * delivery flags are enabled here. Release origins are canonical HTTPS DNS.
 * Owned loopback execution requires its separate reviewed test context. */
export function readNativeRegistrationConfig(env: Record<string, string | undefined>): NativeRegistrationConfig | null {
  try {
    if (env.NATIVE_PUSH_REGISTRATION_ENABLED !== 'true') return null;
    const environment = env.NATIVE_PUSH_ENVIRONMENT;
    if (environment !== 'test' && environment !== 'production') return null;
    if (environment === 'production' && (process.env.NODE_ENV !== 'production' || env.NODE_ENV !== 'production'
      || (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== 'production'))) return null;
    const origin = env.NATIVE_PUSH_ORIGIN;
    if (!origin) return null;
    const url = new URL(origin), host = url.hostname;
    const labels = host.split('.');
    const deploymentHost = host.length <= 253 && labels.length >= 2 && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
      && /^[a-z]/.test(labels.at(-1) ?? '');
    if (url.origin !== origin || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/'
      || isIP(host.replace(/^\[|\]$/g, '')) || !deploymentHost || host.startsWith('127.') || host.endsWith('.localhost') || host.endsWith('.local')) return null;
    const provider = environment === 'production' ? 'apns-production' : 'apns-sandbox';
    if (env.NATIVE_PUSH_IOS_PROVIDER !== provider) return null;
    const applications = {
      ios: {appId: env.NATIVE_PUSH_IOS_APP_ID ?? '', provider},
      android: {appId: env.NATIVE_PUSH_ANDROID_APP_ID ?? '', provider: 'fcm' as const},
    };
    for (const platform of ['ios', 'android'] as const) {
      parseNativeMaterialBinding({origin, environment, platform, ...applications[platform], keyFingerprint: '0'.repeat(64), generation: '00000000-0000-4000-8000-000000000000'});
    }
    const encoded = env.NATIVE_PUSH_TOKEN_ENCRYPTION_KEY;
    if (typeof encoded !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(encoded)) return null;
    const encryptionKey = Buffer.from(encoded, 'base64url');
    if (encryptionKey.length !== 32 || encryptionKey.toString('base64url') !== encoded) return null;
    return {origin, environment, applications: applications as NativeRegistrationConfig['applications'], encryptionKey};
  } catch { return null; }
}
