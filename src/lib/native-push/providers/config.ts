import 'server-only';
import {createPrivateKey, type KeyObject} from 'node:crypto';
import {readNativeRegistrationConfig} from '../config';
import type {ApnsConfig} from './apns';
import type {NativeProviderScope} from './types';
import {validGoogleCredential, type GoogleAccessTokenConfig} from './oauth';

export type NativeProviderConfig = {
  deliveryEnabled: boolean;
  testAccountIds: readonly string[];
  apns: ApnsConfig | null;
  fcm: (GoogleAccessTokenConfig & NativeProviderScope & {projectId: string}) | null;
};
function key(value: string | undefined): KeyObject | null {
  try {
    if (typeof value !== 'string' || value.length > 8192 || !value.startsWith('-----BEGIN PRIVATE KEY-----\n')) return null;
    return createPrivateKey(value);
  } catch { return null; }
}
/** Server-only configuration. Parsing never starts a connection. Registration,
 * actual provider credentials, delivery and test-account gates are independent. */
export function readNativeProviderConfig(env: Record<string, string | undefined>): NativeProviderConfig {
  const off: NativeProviderConfig = {deliveryEnabled: false, testAccountIds: [], apns: null, fcm: null};
  const registration = readNativeRegistrationConfig(env);
  if (!registration || env.NATIVE_PUSH_DELIVERY_ENABLED !== 'true') return off;
  let testAccountIds: string[] = [];
  if (registration.environment === 'test') {
    const raw = env.NATIVE_PUSH_TEST_ACCOUNT_IDS;
    if (env.NATIVE_PUSH_TEST_DELIVERY_ENABLED !== 'true' || typeof raw !== 'string' || raw.length > 4096) return off;
    const values = raw.split(',').map(value => value.trim());
    if (!values.length || values.length > 32 || values.some(value => !/^[A-Za-z0-9_-]{1,128}$/.test(value))) return off;
    testAccountIds = [...new Set(values)];
  }
  const scope = {origin: registration.origin, environment: registration.environment};
  const apnsKey = key(env.NATIVE_APNS_PRIVATE_KEY), teamId = env.NATIVE_APNS_TEAM_ID, keyId = env.NATIVE_APNS_KEY_ID;
  const provider = registration.applications.ios.provider;
  const apns: ApnsConfig | null = provider !== 'fcm' && apnsKey?.type === 'private' && apnsKey.asymmetricKeyType === 'ec'
    && apnsKey.asymmetricKeyDetails?.namedCurve === 'prime256v1' && typeof teamId === 'string' && /^[A-Z0-9]{10}$/.test(teamId)
    && typeof keyId === 'string' && /^[A-Z0-9]{10}$/.test(keyId) ? {...scope, appId: registration.applications.ios.appId, provider, teamId, keyId, privateKey: apnsKey} : null;
  const privateKey = key(env.NATIVE_FCM_PRIVATE_KEY), projectId = env.NATIVE_FCM_PROJECT_ID;
  const credential = privateKey && {clientEmail: env.NATIVE_FCM_CLIENT_EMAIL ?? '', keyId: env.NATIVE_FCM_KEY_ID ?? '', privateKey};
  const fcm = credential && typeof projectId === 'string' && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) && validGoogleCredential(credential)
    ? {...scope, ...credential, projectId, appId: registration.applications.android.appId} : null;
  return {deliveryEnabled: !!apns || !!fcm, testAccountIds, apns, fcm};
}
