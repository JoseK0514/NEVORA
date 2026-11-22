import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import { createServer } from 'node:https';
import { join } from 'node:path';
import { OWNED_COLLAB_ORIGIN } from '../../src/test/integration/owned-collab-origin';

/** Real HTTPS for the loopback production fixture. Forward only to its owned
 * Next process. Keep the browser's origin and cookies intact. */
export async function startCollabHttps(directory: string) {
  const publicAddress = new URL(OWNED_COLLAB_ORIGIN);
  const key = join(directory, 'loopback-key.pem');
  const cert = join(directory, 'loopback-cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=' + publicAddress.hostname, '-addext', 'subjectAltName=IP:127.0.0.1,DNS:' + publicAddress.hostname,
    '-keyout', key, '-out', cert], { stdio: 'pipe', timeout: 15_000 });
  const tls = { key: await readFile(key), cert: await readFile(cert) };
  let upstream: URL | undefined;
  const host = publicAddress.host;
  const server = createServer(tls, (incoming, outgoing) => {
    if (incoming.headers.host !== host || !incoming.url?.startsWith('/') || incoming.url.startsWith('//')) {
      outgoing.writeHead(400).end();
      return;
    }
    if (!upstream) {
      outgoing.writeHead(503).end();
      return;
    }
    const headers = {
      ...incoming.headers,
      'x-forwarded-host': host,
      'x-forwarded-proto': 'https',
      'x-forwarded-port': '443',
      'x-forwarded-for': '127.0.0.1',
    };
    delete headers.forwarded;
    const pending = request({
      hostname: upstream.hostname, port: upstream.port, path: incoming.url, method: incoming.method, headers,
    }, response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    pending.setTimeout(30_000, () => pending.destroy());
    pending.on('error', () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    outgoing.once('close', () => pending.destroy());
    incoming.pipe(pending);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No owned HTTPS port');
  return {
    origin: publicAddress.origin,
    proxyPort: address.port,
    spki: createHash('sha256').update(new X509Certificate(tls.cert).publicKey.export({ type: 'spki', format: 'der' })).digest('base64'),
    tls,
    certificatePath: cert,
    forwardTo(url: string) {
      if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw Error('Expected an owned loopback Next origin');
      upstream = new URL(url);
    },
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    },
  };
}
