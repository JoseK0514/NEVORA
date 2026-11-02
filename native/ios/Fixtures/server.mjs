// Invocation-owned transport fixture for the native container, not a substitute
// for Next.js/backend acceptance. Binds only loopback; no database or provider.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';

const sessions = new Map();
const page = (body, context) => '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + `<p>${context}</p></body></html>`;
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store, private');
  const cookie = request.headers.cookie?.match(/(?:^|;\s*)fuel_session=([^;]+)/)?.[1];
  const role = sessions.get(cookie);
  const authenticated = Boolean(role);
  const marker = request.headers['user-agent'] ?? '';
  const context = /(?:^|\s)NEVORA-Native\/iOS\/1(?:\s|$)/.test(marker) ? 'Native iOS v1'
    : /(?:^|\s)NEVORA-Native\/Android\/1(?:\s|$)/.test(marker) ? 'Native Android v1' : 'Web fixture';
  if (request.url === '/__test/revoke-all' && request.method === 'POST') {
    sessions.clear(); response.writeHead(204); response.end(); return;
  }
  if (request.url === '/api/mobile/v1/session') {
    response.writeHead(authenticated ? 200 : 401, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({protocolVersion: 1, state: authenticated ? 'authenticated' : 'unauthenticated'}));
    return;
  }
  if (request.url === '/login' && request.method === 'POST') {
    let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 8192) { response.writeHead(413); response.end(); return; } }
    const fields = new URLSearchParams(body);
    const employee = fields.get('employeeId');
    if (!['FICTIONAL', 'FICTIONAL-OWNER'].includes(employee) || fields.get('password') !== 'fictional-test-password') { response.writeHead(401); response.end('Invalid'); return; }
    const token = randomUUID(); sessions.set(token, employee === 'FICTIONAL-OWNER' ? 'OWNER' : 'EMPLOYEE');
    response.writeHead(303, {'Location': '/app', 'Set-Cookie': `fuel_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`});
    response.end(); return;
  }
  if (request.url === '/logout') {
    if (request.method !== 'POST') { response.writeHead(405, {'Allow': 'POST'}); response.end('Use POST'); return; }
    sessions.delete(cookie); response.writeHead(303, {'Location': '/login', 'Set-Cookie': 'fuel_session=; Path=/; HttpOnly; Max-Age=0'}); response.end(); return;
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (request.url === '/login') {
    response.end(page('<h1>Fictional sign in</h1><form method="post" action="/login"><label>Employee ID<input name="employeeId" autocapitalize="off" autocorrect="off"></label><label>Password<input type="password" name="password"></label><button>Sign in</button></form>', context)); return;
  }
  if (!authenticated) { response.writeHead(303, {'Location': '/login'}); response.end(); return; }
  response.end(page(request.url === '/app/schedule'
    ? '<h1>Fictional Schedule</h1><p>Monday 9:00–17:00</p><a href="/app">Home</a>'
    : `<h1>${role === 'OWNER' ? 'Fictional Owner Home' : 'Fictional Home'}</h1><a href="/app/schedule">My Schedule</a><form method="post" action="/logout"><button>Sign out</button></form>`, context));
});
const unavailable = createServer((_request, response) => {
  response.writeHead(503, {'Content-Type': 'application/json'});
  response.end(JSON.stringify({protocolVersion: 1, state: 'unavailable'}));
});
await Promise.all([server, unavailable].map(s => new Promise(resolve => s.listen(0, '127.0.0.1', resolve))));
console.log(JSON.stringify({origin: `http://127.0.0.1:${server.address().port}`, unavailableOrigin: `http://127.0.0.1:${unavailable.address().port}`}));
process.on('SIGTERM', () => { server.close(); unavailable.close(); });
process.on('SIGINT', () => { server.close(); unavailable.close(); });
