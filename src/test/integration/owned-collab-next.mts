import { createServer } from 'node:http';
import next from 'next';
import { OWNED_COLLAB_ORIGIN } from './owned-collab-origin';
import { createOwnedInternalRedirectFetch } from './owned-internal-redirect';

const port = Number(process.argv[2]);
if (process.env.NODE_ENV !== 'production' || process.env.NEVORA_OWNED_COLLAB_ORIGIN !== OWNED_COLLAB_ORIGIN ||
    !Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid owned collab runtime');

const origin = new URL(OWNED_COLLAB_ORIGIN);
const upstream = 'http://127.0.0.1:' + port;
// Next needs the public identity to construct Request.url and the loopback
// socket for internal RSC redirect reads. Both are fixed by the test launcher.
process.env.__NEXT_PRIVATE_ORIGIN = upstream;
globalThis.fetch = createOwnedInternalRedirectFetch(upstream, origin.origin);
const app = next({ dev: false, dir: process.cwd(), hostname: origin.hostname, port: 443 });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((request, response) => {
  if (request.headers.host !== origin.host || request.headers['x-forwarded-host'] !== origin.host ||
      request.headers['x-forwarded-proto'] !== 'https') {
    response.writeHead(403).end();
    return;
  }
  void handle(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});
await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});
