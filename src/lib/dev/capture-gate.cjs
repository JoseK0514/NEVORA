// Synchronous, conditional require supports the existing tsx/CJS worker CLI.
// Production callers erase that require; no static import retains this source.
const { isAbsolute } = require('node:path');
function captureDirectory(env) {
  if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production' || env.NEVORA_DEV_CAPTURE_DELIVERY !== '1') return undefined;
  const out = env.NEVORA_DEV_CAPTURE_OUT;
  try {
    const url = new URL(env.FUEL_PORTAL_ORIGIN ?? '');
    if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !out || !isAbsolute(out)) return null;
  } catch { return null; }
  return out;
}
function captureNotificationRuntime(config, env) {
  const directory = captureDirectory(env);
  return directory && config.environment === 'test' && config.featureEnabled && config.testAccountIds.length
    ? { ...config, deliveryEnabled: true, testDeliveryEnabled: true, localCapture: { directory, origin: env.FUEL_PORTAL_ORIGIN } } : config;
}
module.exports = { captureDirectory, captureNotificationRuntime };
