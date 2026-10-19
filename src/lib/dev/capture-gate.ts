import { isAbsolute } from 'node:path';
import type { PushRuntimeConfig } from '../notifications/types';
import { localDevEnabled, loopbackOrigin } from './local-only';

// Pure configuration helpers: no delivery module is loaded by the CLI config
// reader. All callers are inside the compile-time non-production branch.
export function captureDirectory(env: Record<string, string | undefined>): string | null | undefined {
  if (!localDevEnabled(env, 'NEVORA_DEV_CAPTURE_DELIVERY')) return undefined;
  const out = env.NEVORA_DEV_CAPTURE_OUT;
  if (!loopbackOrigin(env.FUEL_PORTAL_ORIGIN) || !out || !isAbsolute(out)) return null;
  return out;
}
export function captureNotificationRuntime(config: PushRuntimeConfig, env: Record<string, string | undefined>): PushRuntimeConfig {
  const directory = captureDirectory(env);
  return directory && config.environment === 'test' && config.featureEnabled && config.testAccountIds.length
    ? { ...config, deliveryEnabled: true, testDeliveryEnabled: true, localCapture: { directory, origin: env.FUEL_PORTAL_ORIGIN! } } : config;
}
