import {afterEach, expect, it, vi} from 'vitest';
async function api() {
  const m = await import('./config').catch(() => ({}));
  expect(m).toHaveProperty('readNativeRegistrationConfig');
  return m as typeof import('./config');
}
const configured = () => ({NATIVE_PUSH_REGISTRATION_ENABLED: 'true', NATIVE_PUSH_ENVIRONMENT: 'test',
  NATIVE_PUSH_ORIGIN: 'https://nevora.example', NATIVE_PUSH_IOS_APP_ID: 'com.velani.nevora.development',
  NATIVE_PUSH_IOS_PROVIDER: 'apns-sandbox', NATIVE_PUSH_ANDROID_APP_ID: 'com.velani.nevora.development',
  NATIVE_PUSH_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString('base64url')});
afterEach(() => vi.unstubAllEnvs());
it('is disabled without every explicit registration setting; no provider delivery is enabled', async () => {
  const m = await api();
  expect(m.readNativeRegistrationConfig({})).toBeNull();
  for (const field of Object.keys(configured())) {
    const value = {...configured()}; delete value[field as keyof typeof value];
    expect(m.readNativeRegistrationConfig(value)).toBeNull();
  }
  const ready = m.readNativeRegistrationConfig(configured());
  expect(ready).toMatchObject({origin: 'https://nevora.example', environment: 'test', applications: {
    ios: {appId: 'com.velani.nevora.development', provider: 'apns-sandbox'}, android: {appId: 'com.velani.nevora.development', provider: 'fcm'},
  }});
  expect(ready && Object.keys(ready).sort()).toEqual(['applications', 'encryptionKey', 'environment', 'origin']);
});
it.each(['test ', 'Production', '', 'staging'])('rejects environment alias %s', async value => {
  expect((await api()).readNativeRegistrationConfig({...configured(), NATIVE_PUSH_ENVIRONMENT: value})).toBeNull();
});
it.each(['http://nevora.example', 'http://localhost:3000', 'https://localhost', 'https://127.0.0.1', 'https://[::1]',
  'https://nevora.example/', 'https://NEVORA.example', 'https://nevora.example:443', 'https://nevora.example/path', 'https://nevora.example?x=1'])('rejects unqualified release origin %s', async origin => {
  expect((await api()).readNativeRegistrationConfig({...configured(), NATIVE_PUSH_ORIGIN: origin})).toBeNull();
});
it.each(['https://bad..example', 'https://-bad.example', 'https://bad_.example', 'https://nevora.123abc', 'https://127.nevora.example'])('matches the shells\' release DNS policy for %s', async origin => {
  expect((await api()).readNativeRegistrationConfig({...configured(), NATIVE_PUSH_ORIGIN: origin})).toBeNull();
});
it('separates production config from test/preview processes and provider environments', async () => {
  const m = await api(); const production = {...configured(), NATIVE_PUSH_ENVIRONMENT: 'production', NATIVE_PUSH_IOS_PROVIDER: 'apns-production', NODE_ENV: 'production'};
  expect(m.readNativeRegistrationConfig(production)).toBeNull();
  vi.stubEnv('NODE_ENV', 'production');
  expect(m.readNativeRegistrationConfig({...production, VERCEL_ENV: 'preview'})).toBeNull();
  expect(m.readNativeRegistrationConfig({...production, VERCEL_ENV: 'development'})).toBeNull();
  expect(m.readNativeRegistrationConfig(production)?.environment).toBe('production');
  expect(m.readNativeRegistrationConfig({...configured(), NATIVE_PUSH_IOS_PROVIDER: 'apns-production'})).toBeNull();
  expect(m.readNativeRegistrationConfig({...production, NATIVE_PUSH_IOS_PROVIDER: 'apns-sandbox'})).toBeNull();
});
it.each(['', '!', Buffer.alloc(31).toString('base64url'), Buffer.alloc(33).toString('base64url'), Buffer.alloc(32).toString('base64')])('rejects invalid/noncanonical protection material without echoing it', async key => {
  expect((await api()).readNativeRegistrationConfig({...configured(), NATIVE_PUSH_TOKEN_ENCRYPTION_KEY: key})).toBeNull();
});
