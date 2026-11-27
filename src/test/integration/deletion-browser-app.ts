import { OWNED_COLLAB_ORIGIN } from './owned-collab-origin';
import { createOwnedNextApp } from './owned-next-app';
import { startOwnedTlsProxy } from './owned-tls-proxy';

/** Secure session cookies need the owned HTTPS origin in WebKit as well as Chromium. */
export async function createDeletionBrowserApp(evidence: string) {
  const app = await createOwnedNextApp(evidence, { production: true, portalHttpsOrigin: OWNED_COLLAB_ORIGIN });
  const proxy = await startOwnedTlsProxy({ [OWNED_COLLAB_ORIGIN]: app.url }).catch(async error => {
    await app.close();
    throw error;
  });
  return {
    database: app.database,
    url: OWNED_COLLAB_ORIGIN,
    network: { proxy: { server: proxy.server }, ignoreHTTPSErrors: true },
    async close() { try { await proxy.close(); } finally { await app.close(); } },
  };
}
