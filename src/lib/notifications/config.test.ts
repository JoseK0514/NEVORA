import { createECDH } from 'node:crypto';
import { expect, it } from 'vitest';
async function api() { const m = await import('./config').catch(() => ({})); expect(m).toHaveProperty('readNotificationConfig'); return m as typeof import('./config'); }
// Deterministic test scalar: generated ECDH private keys may serialize to fewer than 32 bytes.
export function validEnv() { const ecdh = createECDH('prime256v1'); ecdh.setPrivateKey(Buffer.alloc(32, 1)); return { FUEL_PORTAL_ORIGIN: 'https://fuel.example', PUSH_ENVIRONMENT: 'test', PUSH_FEATURE_ENABLED: 'true', PUSH_DELIVERY_ENABLED: 'true', PUSH_TEST_DELIVERY_ENABLED: 'true', PUSH_TEST_ACCOUNT_IDS: 'employee', PUSH_VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString('base64url'), PUSH_VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString('base64url'), PUSH_VAPID_SUBJECT: 'mailto:test@example.com', PUSH_SUBSCRIPTION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64url'), NOTIFICATION_WORKER_SECRET: 'w'.repeat(32) }; }
it('defaults_disable_all_delivery_without_credentials', async () => { const { readNotificationConfig: r } = await api(); const c = r({}); expect(c.featureEnabled).toBe(false); expect(c.deliveryEnabled).toBe(false); expect(c.testDeliveryEnabled).toBe(false); });
it('validates_keys_origin_environment_and_preview_isolation', async () => { const { readNotificationConfig: r } = await api(); const env = validEnv(); expect(r(env).testDeliveryEnabled).toBe(true); for (const patch of [{ PUSH_VAPID_PRIVATE_KEY: 'invalid' }, { PUSH_SUBSCRIPTION_ENCRYPTION_KEY: 'invalid' }, { FUEL_PORTAL_ORIGIN: 'http://fuel.example' }, { PUSH_ENVIRONMENT: 'unknown' }, { PUSH_ENVIRONMENT: 'production', VERCEL_ENV: 'preview' }, { PUSH_ENVIRONMENT: 'production', NODE_ENV: 'test' }]) {
    const c = r({ ...env, ...patch });
    expect(c.deliveryEnabled).toBe(false);
    expect(c.testDeliveryEnabled).toBe(false);
} expect(r({ ...env, PUSH_ENVIRONMENT: 'production' }).testDeliveryEnabled).toBe(false); });
it('runtime configuration has no business policy and binding respects inactive workspace',async()=>{
  const {readNotificationConfig,bindWorkspaceNotificationConfig}=await import('./config');
  const runtime=readNotificationConfig(validEnv());
  expect(runtime).not.toHaveProperty('policy');
  const workspace={id:'w',name:'Test',timeZone:'Asia/Tokyo',active:false,createdAt:'',updatedAt:''};
  const bound=bindWorkspaceNotificationConfig(runtime,workspace);
  expect(bound.policy.timeZone).toBe('Asia/Tokyo');
  expect(bound.featureEnabled).toBe(false);
  expect(bound.deliveryEnabled).toBe(false);
  expect(bound.testDeliveryEnabled).toBe(false);
});
