import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Duplex } from 'node:stream';
import { TLSSocket } from 'node:tls';
import { OWNED_CENTRAL_BILLING_ORIGIN, OWNED_COLLAB_ORIGIN } from './owned-collab-origin';

/** Browser CONNECT proxy for the owned test origins only. The browser keeps its
 * real HTTPS origin, Secure cookies and CORS. This proxy never resolves DNS. */
export async function startOwnedTlsProxy(mappings: Readonly<Record<string, string>>) {
  const routes = new Map<string, URL>();
  for (const [value, upstream] of Object.entries(mappings)) {
    const origin = new URL(value), socket = new URL(upstream);
    if (origin.origin !== value || origin.protocol !== 'https:' || origin.port ||
        !([OWNED_COLLAB_ORIGIN, OWNED_CENTRAL_BILLING_ORIGIN].includes(value) ||
          /^[a-z0-9-]+\.portal\.example\.invalid$/.test(origin.hostname)) ||
        socket.origin !== upstream || socket.protocol !== 'http:' ||
        socket.hostname !== '127.0.0.1' || !socket.port) {
      throw Error('Invalid owned TLS proxy mapping');
    }
    routes.set(origin.host, socket);
  }
  if (process.env.NODE_ENV !== 'test' || routes.size < 1 || routes.size > 2) {
    throw Error('Owned TLS proxy requires one or two exact test targets');
  }

  const directory = await mkdtemp(join(tmpdir(), 'nevora-owned-tls-'));
  const sockets = new Set<Duplex>();
  const servers: ReturnType<typeof createServer>[] = [];
  const track = (socket: Duplex) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  };
  const listen = async (server: ReturnType<typeof createServer>) => {
    servers.push(server);
    server.on('connection', track);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Owned TLS listener unavailable');
    return address.port;
  };
  const close = async () => {
    for (const socket of sockets) socket.destroy();
    try {
      await Promise.all(servers.filter(server => server.listening).map(server =>
        new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  };
  try {
    const key = join(directory, 'key.pem'), cert = join(directory, 'cert.pem');
    const hosts = [...routes.keys()];
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=' + hosts[0], '-addext', 'subjectAltName=' + hosts.map(host => 'DNS:' + host).join(','),
      '-keyout', key, '-out', cert], { stdio: 'pipe', timeout: 15000 });
    const tls = createHttpsServer({ key: await readFile(key), cert: await readFile(cert) }, (incoming, outgoing) => {
      const host = incoming.headers.host ?? '';
      const target = routes.get(host);
      if (!target || !(incoming.socket instanceof TLSSocket) || incoming.socket.servername !== host ||
          !incoming.url?.startsWith('/') || incoming.url.startsWith('//')) {
        outgoing.writeHead(403).end();
        return;
      }
      const headers = { ...incoming.headers, 'x-forwarded-host': host, 'x-forwarded-proto': 'https',
        'x-forwarded-port': '443', 'x-forwarded-for': '127.0.0.1' };
      delete (headers as Record<string, unknown>).forwarded;
      const pending = request({
        hostname: '127.0.0.1', port: target.port, path: incoming.url, method: incoming.method, headers,
      }, response => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      });
      pending.setTimeout(30000, () => pending.destroy());
      pending.on('error', () => {
        if (!outgoing.headersSent) outgoing.writeHead(502);
        outgoing.end();
      });
      outgoing.once('close', () => pending.destroy());
      incoming.pipe(pending);
    });
    tls.on('connect', (_req, socket) => socket.destroy());
    const tlsPort = await listen(tls);
    const proxy = createServer((_req, res) => res.writeHead(403).end());
    proxy.on('connect', (req, socket, head) => {
      if (!hosts.some(host => req.url === host + ':443')) {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      const local = connect(tlsPort, '127.0.0.1', () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) local.write(head);
        socket.pipe(local).pipe(socket);
      });
      track(local);
      local.on('error', () => socket.destroy());
      socket.on('error', () => local.destroy());
      local.once('close', () => socket.destroy());
      socket.once('close', () => local.destroy());
    });
    const port = await listen(proxy);
    return { server: 'http://127.0.0.1:' + port, close };
  } catch (error) {
    await close();
    throw error;
  }
}
