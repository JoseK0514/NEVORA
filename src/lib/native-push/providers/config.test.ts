import {afterEach, expect, it, vi} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
const forbidden = vi.hoisted(() => vi.fn(() => {throw Error('Real network forbidden in native provider config tests');}));
vi.mock('node:https', () => ({request: forbidden}));
vi.mock('node:http2', () => ({connect: forbidden}));
afterEach(() => expect(forbidden).not.toHaveBeenCalled());
async function api() {const m = await import('./config').catch(() => ({})); expect(m).toHaveProperty('readNativeProviderConfig'); return m as typeof import('./config');}
const ec = generateKeyPairSync('ec', {namedCurve: 'prime256v1'}), rsa = generateKeyPairSync('rsa', {modulusLength: 2048});
const configured = () => ({NATIVE_PUSH_REGISTRATION_ENABLED: 'true', NATIVE_PUSH_ENVIRONMENT: 'test', NATIVE_PUSH_ORIGIN: 'https://nevora.example',
  NATIVE_PUSH_IOS_APP_ID: 'com.velani.nevora.development', NATIVE_PUSH_IOS_PROVIDER: 'apns-sandbox', NATIVE_PUSH_ANDROID_APP_ID: 'com.velani.nevora.development',
  NATIVE_PUSH_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString('base64url'), NATIVE_PUSH_DELIVERY_ENABLED: 'true', NATIVE_PUSH_TEST_DELIVERY_ENABLED: 'true', NATIVE_PUSH_TEST_ACCOUNT_IDS: 'QA-NATIVE-E,QA-NATIVE-O',
  NATIVE_APNS_TEAM_ID: 'FAKETEAM01', NATIVE_APNS_KEY_ID: 'FAKEKEY001', NATIVE_APNS_PRIVATE_KEY: ec.privateKey.export({format: 'pem', type: 'pkcs8'}).toString(),
  NATIVE_FCM_PROJECT_ID: 'fictional-test', NATIVE_FCM_CLIENT_EMAIL: 'native-qa@fictional-test.iam.gserviceaccount.com', NATIVE_FCM_KEY_ID: 'a'.repeat(40), NATIVE_FCM_PRIVATE_KEY: rsa.privateKey.export({format: 'pem', type: 'pkcs8'}).toString()});
it('keeps delivery disabled without explicit registration/delivery/test/account gates', async () => {
  const m = await api(); expect(m.readNativeProviderConfig({})).toEqual({deliveryEnabled: false, testAccountIds: [], apns: null, fcm: null});
  for (const field of ['NATIVE_PUSH_REGISTRATION_ENABLED', 'NATIVE_PUSH_DELIVERY_ENABLED', 'NATIVE_PUSH_TEST_DELIVERY_ENABLED', 'NATIVE_PUSH_TEST_ACCOUNT_IDS']) {
    expect(m.readNativeProviderConfig({...configured(), [field]: ''}).deliveryEnabled).toBe(false);
  }
});
it('parses only the scoped server provider configuration without enabling a connection', async () => {
  const cfg = (await api()).readNativeProviderConfig(configured());
  expect(cfg.deliveryEnabled).toBe(true); expect(cfg.testAccountIds).toEqual(['QA-NATIVE-E', 'QA-NATIVE-O']);
  expect(cfg.apns).toMatchObject({environment: 'test', provider: 'apns-sandbox', origin: 'https://nevora.example', appId: 'com.velani.nevora.development'});
  expect(cfg.apns?.privateKey.type).toBe('private'); expect(cfg.fcm).toMatchObject({projectId: 'fictional-test', clientEmail: 'native-qa@fictional-test.iam.gserviceaccount.com'});
});
it('fails each provider closed on a wrong key algorithm or malformed private settings', async () => {
  const m = await api(), original = configured();
  for (const changed of [{NATIVE_APNS_PRIVATE_KEY: original.NATIVE_FCM_PRIVATE_KEY}, {NATIVE_APNS_KEY_ID: 'bad'}, {NATIVE_APNS_PRIVATE_KEY: 'fictional malformed secret'}]) expect(m.readNativeProviderConfig({...original, ...changed}).apns).toBeNull();
  for (const changed of [{NATIVE_FCM_PRIVATE_KEY: original.NATIVE_APNS_PRIVATE_KEY}, {NATIVE_FCM_PROJECT_ID: '../foreign'}, {NATIVE_FCM_CLIENT_EMAIL: 'person@foreign.example'}, {NATIVE_FCM_KEY_ID: 'bad'}]) expect(m.readNativeProviderConfig({...original, ...changed}).fcm).toBeNull();
});
it('does not accept a partly invalid test allowlist or expose any implicit all-account fallback', async () => {
  const m = await api();
  expect(m.readNativeProviderConfig({...configured(), NATIVE_PUSH_TEST_ACCOUNT_IDS: 'QA-NATIVE-E,foreign@example.com'}).deliveryEnabled).toBe(false);
  expect(m.readNativeProviderConfig({...configured(), NATIVE_PUSH_TEST_ACCOUNT_IDS: '*'}).deliveryEnabled).toBe(false);
});
