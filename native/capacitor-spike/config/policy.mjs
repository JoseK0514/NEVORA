/** Remote content can access a native bridge. This spike accepts only local fictional runtimes. */
export function nativeConfig(env = process.env) {
  const raw = env.NEVORA_NATIVE_URL;
  const config = {
    appId: 'com.nevora.spike',
    appName: 'NEVORA Preview',
    webDir: 'dist',
    backgroundColor: '#F7F6F3',
    loggingBehavior: 'debug',
    android: { allowMixedContent: false, backgroundColor: '#F7F6F3' },
    ios: { contentInset: 'automatic', preferredContentMode: 'mobile', backgroundColor: '#F7F6F3' },
  };
  if (!raw) return config;
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash
      || !['/app', '/ui-preview/home'].includes(url.pathname)) {
    throw new Error('NEVORA_NATIVE_URL must be a local HTTP fictional runtime at /app or /ui-preview/home, with no credentials, query or fragment.');
  }
  // Capacitor passes server.url into Android's origin allowlist. A path there
  // invalidates the modern WebMessage listener rule. Keep the route separate.
  return { ...config, server: { url: url.origin, appStartPath: url.pathname, cleartext: true, allowNavigation: [] } };
}
