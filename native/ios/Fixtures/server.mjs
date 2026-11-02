// Invocation-owned transport fixture for the native container, not a substitute
// for Next.js/backend acceptance. Binds only loopback; no database or provider.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {nativeContentSecurityPolicy} from '../../../src/lib/native-shell/security.ts';

const sessions = new Map();
let outage = false;
let renderer = {foreign: 0, redirects: 0, sameOrigin: 0, complete: false};
const foreign = createServer((request, response) => {
  renderer.foreign++;
  response.setHeader('Access-Control-Allow-Origin', '*');
  if (request.url === '/script') { response.setHeader('Content-Type', 'application/javascript'); response.end('void 0;'); }
  else if (request.url === '/image') { response.setHeader('Content-Type', 'image/png'); response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1cAAAAASUVORK5CYII=', 'base64')); }
  else response.end('foreign fixture');
});
const attacks = `<p id="renderer-status">Checking containment</p><script>
const image = new Image(); const imageDone = new Promise(resolve => { image.onload = image.onerror = resolve; }); image.src='/__test/redirect/image';
const script = document.createElement('script'); const scriptDone = new Promise(resolve => { script.onload = script.onerror = resolve; }); script.src='/__test/redirect/script'; document.head.append(script);
Promise.allSettled([imageDone,scriptDone,fetch('/__test/redirect/connect')]).then(async () => {
 await fetch('/__test/same-ok'); await fetch('/__test/renderer-complete'); document.getElementById('renderer-status').textContent='Containment complete';
});</script>`;
const page = (body, context) => '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + `<p>${context}</p></body></html>`;
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store, private');
  const cookie = request.headers.cookie?.match(/(?:^|;\s*)fuel_session=([^;]+)/)?.[1];
  const role = sessions.get(cookie);
  const authenticated = Boolean(role);
  const marker = request.headers['user-agent'] ?? '';
  const context = /(?:^|\s)NEVORA-Native\/iOS\/1(?:\s|$)/.test(marker) ? 'Native iOS v1'
    : /(?:^|\s)NEVORA-Native\/Android\/1(?:\s|$)/.test(marker) ? 'Native Android v1' : 'Web fixture';
  if (context !== 'Web fixture' && request.url !== '/app/renderer-control') response.setHeader('Content-Security-Policy', nativeContentSecurityPolicy(false));
  if (request.url === '/__test/renderer-result') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(renderer)); return; }
  if (request.url?.startsWith('/__test/redirect/')) {
    renderer.redirects++; response.writeHead(302, {Location: `http://127.0.0.1:${foreign.address().port}/` + request.url.split('/').at(-1)}); response.end(); return;
  }
  if (request.url === '/__test/same-ok') { renderer.sameOrigin++; response.end('same origin'); return; }
  if (request.url === '/__test/renderer-complete') { renderer.complete = true; response.end('done'); return; }
  if (request.url === '/__test/renderer-reset' && request.method === 'POST') { renderer = {foreign: 0, redirects: 0, sameOrigin: 0, complete: false}; response.writeHead(204); response.end(); return; }
  if (request.url === '/__test/revoke-all' && request.method === 'POST') {
    sessions.clear(); response.writeHead(204); response.end(); return;
  }
  if (['/__test/outage-on', '/__test/outage-off'].includes(request.url) && request.method === 'POST') {
    outage = request.url.endsWith('-on'); response.writeHead(204); response.end(); return;
  }
  if (outage) {
    response.writeHead(503, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({protocolVersion: 1, state: 'unavailable'})); return;
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
    if (!['FICTIONAL', 'FICTIONAL-OWNER', 'FICTIONAL-MANAGER'].includes(employee) || fields.get('password') !== 'fictional-test-password') { response.writeHead(401); response.end('Invalid'); return; }
    const token = randomUUID(); sessions.set(token, employee === 'FICTIONAL-OWNER' ? 'OWNER' : employee === 'FICTIONAL-MANAGER' ? 'MANAGER' : 'EMPLOYEE');
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
  if (role === 'MANAGER' && context !== 'Web fixture') {
    response.end(page('<h1>Use NEVORA in your web browser</h1><p>This version supports Employee and Owner accounts.</p><form method="post" action="/logout"><button>Sign out</button></form>', context)); return;
  }
  if (request.url === '/app/renderer-control' || request.url === '/app/renderer-protected') {
    renderer = {foreign: 0, redirects: 0, sameOrigin: 0, complete: false};
    response.end(page(`<h1>Renderer ${request.url.endsWith('control') ? 'control' : 'protected'}</h1>${attacks}<a href="/app">Home</a>`, context)); return;
  }
  response.end(page(request.url === '/app/schedule'
    ? '<h1>Fictional Schedule</h1><p>Monday 9:00–17:00</p><a href="/app">Home</a>'
    : `<h1>${role === 'OWNER' ? 'Fictional Owner Home' : role === 'MANAGER' ? 'Fictional Manager Home' : 'Fictional Home'}</h1><a href="/app/schedule">My Schedule</a><p><a href="/app/renderer-control">Renderer control</a></p><p><a href="/app/renderer-protected">Renderer protected</a></p><form method="post" action="/logout"><button>Sign out</button></form>`, context));
});
const unavailable = createServer((_request, response) => {
  response.writeHead(503, {'Content-Type': 'application/json'});
  response.end(JSON.stringify({protocolVersion: 1, state: 'unavailable'}));
});
await Promise.all([server, unavailable, foreign].map(s => new Promise(resolve => s.listen(0, '127.0.0.1', resolve))));
console.log(JSON.stringify({origin: `http://127.0.0.1:${server.address().port}`, unavailableOrigin: `http://127.0.0.1:${unavailable.address().port}`, foreignOrigin: `http://127.0.0.1:${foreign.address().port}`}));
process.on('SIGTERM', () => { server.close(); unavailable.close(); foreign.close(); });
process.on('SIGINT', () => { server.close(); unavailable.close(); foreign.close(); });
