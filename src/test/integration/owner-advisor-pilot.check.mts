import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, realpathSync, readFileSync, rmSync, writeFileSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { PILOT, PILOT_ENDPOINT, guardedFetch, initializePilot, reservePilot, type OwnerAdvisorPilot } from './owner-advisor-pilot.mts';
function fixture() { const root = realpathSync(mkdtempSync(join(tmpdir(), 'pilot-'))); const p = { ...PILOT, credential: 'fictional-test-key', ledgerPath: join(root, 'private', 'ledger.json') }; initializePilot(p); return { p, cleanup: () => rmSync(root, { recursive: true, force: true }) }; }
function body() { return { model: PILOT.model, store: false, include: ['reasoning.encrypted_content'], instructions: 'Fictional demo', input: [{ role: 'user', content: 'hello' }], tools: [], parallel_tool_calls: false, max_output_tokens: 4096 }; }
function request(p: OwnerAdvisorPilot, changes: Record<string, unknown> = {}) { return { method: 'POST', redirect: 'error' as const, headers: { authorization: `Bearer ${p.credential}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...body(), ...changes }) }; }
function count(p: OwnerAdvisorPilot) { return JSON.parse(readFileSync(p.ledgerPath, 'utf8')).attempts; }
test('allowed real Request transport, free catalog, failure reservation, restart and twenty-call lifetime cap', async () => { const f = fixture(); try {
    let calls = 0;
    const transport: typeof fetch = async () => { calls++; return new Response('{}'); };
    let fetch = guardedFetch(f.p, transport);
    await fetch(new Request(PILOT_ENDPOINT, request(f.p)));
    assert.equal(count(f.p), 1);
    await fetch(PILOT.baseUrl + '/v1/models', { headers: { authorization: `Bearer ${f.p.credential}` }, redirect: 'error' });
    assert.equal(count(f.p), 1);
    fetch = guardedFetch(f.p, async () => { throw Error('offline'); });
    await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p)));
    assert.equal(count(f.p), 2);
    fetch = guardedFetch(f.p, transport);
    for (let i = 2; i < 20; i++)
        await fetch(PILOT_ENDPOINT, request(f.p));
    assert.equal(count(f.p), 20);
    await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p)));
    assert.equal(calls, 20);
    assert.equal(count(f.p), 20);
}
finally {
    f.cleanup();
} });
test('wrong endpoint, credential, redirects, models, body styles and output limits never reach transport', async () => { const f = fixture(); try {
    let calls = 0;
    const fetch = guardedFetch(f.p, async () => { calls++; return new Response('{}'); });
    for (const change of [{ model: 'other' }, { store: true }, { stream: true }, { max_output_tokens: 4097 }, { max_output_tokens: 0 }, { max_output_tokens: 1.5 }, { previous_response_id: 'x' }, { input: [{ type: 'input_image', image_url: 'https://example.com' }] }, { input: [{ role: 'user', content: [{ type: 'input_audio', data: 'x' }] }] }, { tools: [{ type: 'web_search' }] }, { instructions: 'é'.repeat(32768) }])
        await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p, change)));
    for (const url of ['https://api.openai.com/v1/responses', PILOT_ENDPOINT + '?x=1', PILOT.baseUrl + '/v1/chat/completions'])
        await assert.rejects(fetch(url, request(f.p)));
    await assert.rejects(fetch(PILOT_ENDPOINT, { ...request(f.p), redirect: 'follow' }));
    await assert.rejects(fetch(PILOT_ENDPOINT, { ...request(f.p), headers: { authorization: 'Bearer wrong', 'content-type': 'application/json' } }));
    await assert.rejects(fetch(PILOT_ENDPOINT, { ...request(f.p), body: new URLSearchParams({ x: 'y' }) }));
    assert.equal(calls, 0);
    assert.equal(count(f.p), 0);
}
finally {
    f.cleanup();
} });
test('redirect response is rejected and remains charged', async () => { const f = fixture(); try {
    const fetch = guardedFetch(f.p, async () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.invalid' } }));
    await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p)));
    assert.equal(count(f.p), 1);
}
finally {
    f.cleanup();
} });
test('investigator function, message and encrypted reasoning rounds are accepted', async () => { const f = fixture(); try {
    const fetch = guardedFetch(f.p, async () => new Response('{}'));
    await fetch(PILOT_ENDPOINT, request(f.p, { input: [{ type: 'reasoning', id: 'r', summary: [], encrypted_content: 'opaque' }, { type: 'function_call', id: 'f', call_id: 'c', name: 'company_briefing', arguments: '{}', status: 'completed' }, { type: 'function_call_output', call_id: 'c', output: '{}' }, { type: 'message', id: 'm', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'hello', annotations: [], logprobs: [] }] }], tools: [{ type: 'function', name: 'company_briefing', parameters: { type: 'object' }, strict: true }] }));
    assert.equal(count(f.p), 1);
}
finally {
    f.cleanup();
} });
for (const scenario of ['malformed', 'symlink', 'lock', 'missing', 'expired', 'tampered', 'missing-receipt', 'pending'])
    test(`fail closed: ${scenario}`, () => { const f = fixture(); try {
        const directory = join(f.p.ledgerPath, '..');
        if (scenario === 'malformed')
            writeFileSync(f.p.ledgerPath, '{');
        if (scenario === 'symlink') {
            rmSync(f.p.ledgerPath);
            symlinkSync('/dev/null', f.p.ledgerPath);
        }
        if (scenario === 'lock')
            writeFileSync(join(directory, 'reservation.lock'), '{}', { mode: 0o600 });
        if (scenario === 'pending')
            writeFileSync(join(directory, 'ledger.pending'), '{}', { mode: 0o600 });
        if (scenario === 'missing')
            rmSync(f.p.ledgerPath);
        if (scenario === 'expired' || scenario === 'tampered') {
            const s = JSON.parse(readFileSync(f.p.ledgerPath, 'utf8'));
            if (scenario === 'expired')
                s.initializedAt = Date.now() - 86400001;
            else
                s.budgetMicrodollars = 99;
            writeFileSync(f.p.ledgerPath, JSON.stringify(s));
        }
        if (scenario === 'missing-receipt') {
            reservePilot(f.p);
            rmSync(join(directory, 'reservation-01.json'));
        }
        assert.throws(() => reservePilot(f.p));
        assert.throws(() => initializePilot(f.p));
    }
    finally {
        f.cleanup();
    } });
test('multiple processes contend without exceeding twenty lifetime reservations', async () => { const f = fixture(); try {
    const moduleUrl = new URL('./owner-advisor-pilot.mts', import.meta.url).href;
    const runs = Array.from({ length: 6 }, () => new Promise<void>((resolve, reject) => { const child = spawn(process.execPath, ['--input-type=module', '-e', `import {reservePilot} from ${JSON.stringify(moduleUrl)};for(let i=0;i<20;i++){try{reservePilot(JSON.parse(process.env.TEST_PILOT));}catch{}}`], { env: { ...process.env, TEST_PILOT: JSON.stringify(f.p) }, stdio: 'pipe' }); child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error('child failed'))); }));
    await Promise.all(runs);
    const n = count(f.p);
    assert.ok(n > 0 && n <= 20);
    assert.equal(readdirSync(join(f.p.ledgerPath, '..')).filter(n => n.startsWith('reservation-')).length, n);
    for (let i = n; i < 20; i++)
        reservePilot(f.p);
    assert.equal(count(f.p), 20);
    assert.throws(() => reservePilot(f.p));
}
finally {
    f.cleanup();
} });
test('known Node preload installs before application code', async () => { const f = fixture(); try {
    const preload = fileURLToPath(new URL('./owner-advisor-pilot-preload.mts', import.meta.url));
    const { credential, ...config } = f.p;
    await new Promise<void>((resolve, reject) => { const child = spawn(process.execPath, ['--import', preload, '--input-type=module', '-e', "try { await fetch('https://forbidden.invalid/v1/responses'); process.exit(2); } catch (error) { if (error.message !== 'Owner advisor pilot guard refused operation') process.exit(3); console.log('BLOCKED_BEFORE_TRANSPORT'); }"], { env: { ...process.env, NEON_AI_GATEWAY_TOKEN: credential, NEVORA_OWNER_ADVISOR_PILOT: JSON.stringify(config) }, stdio: 'pipe' }); let output = ''; child.stdout.on('data', c => output += c); child.once('error', reject); child.once('exit', code => { try {
        assert.equal(code, 0);
        assert.match(output, /BLOCKED_BEFORE_TRANSPORT/);
        resolve();
    }
    catch (e) {
        reject(e);
    } }); });
    assert.equal(count(f.p), 0);
}
finally {
    f.cleanup();
} });
test('invalid UTF-8, unsafe permissions and expiry after guard creation reject before transport', async () => { const f = fixture(); try {
    let calls = 0;
    const fetch = guardedFetch(f.p, async () => { calls++; return new Response('{}'); });
    await assert.rejects(fetch(PILOT_ENDPOINT, { ...request(f.p), body: new Uint8Array([255]) }));
    chmodSync(f.p.ledgerPath, 0o644);
    await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p)));
    chmodSync(f.p.ledgerPath, 0o600);
    const state = JSON.parse(readFileSync(f.p.ledgerPath, 'utf8'));
    state.initializedAt = Date.now() - 86400001;
    writeFileSync(f.p.ledgerPath, JSON.stringify(state));
    await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p)));
    assert.equal(calls, 0);
}
finally {
    f.cleanup();
} });
test('changed receipt and ledger counter reject further reservations', () => { for (const target of ['receipt', 'counter']) {
    const f = fixture();
    try {
        reservePilot(f.p);
        if (target === 'receipt')
            writeFileSync(join(f.p.ledgerPath, '..', 'reservation-01.json'), '{}');
        else {
            const state = JSON.parse(readFileSync(f.p.ledgerPath, 'utf8'));
            state.attempts = 0;
            writeFileSync(f.p.ledgerPath, JSON.stringify(state));
        }
        assert.throws(() => reservePilot(f.p));
    }
    finally {
        f.cleanup();
    }
} });

test('unchanged pilot expires exactly 24 hours after initialization', async (t) => {
    t.mock.timers.enable({apis: ['Date'], now: Date.now()});
    const f = fixture();
    try {
        let calls = 0;
        const fetch = guardedFetch(f.p, async () => { calls++; return new Response('{}'); });
        t.mock.timers.tick(86400000);
        await assert.rejects(fetch(PILOT_ENDPOINT, request(f.p)));
        assert.equal(calls, 0);
        assert.equal(count(f.p), 0);
    } finally { f.cleanup(); t.mock.timers.reset(); }
});


test('real loopback redirects cannot reach a second server and nonredirect readiness still works', async () => {
    const f = fixture();
    let targetRequests = 0;
    const target = createServer((_req, res) => { targetRequests++; res.end('escaped'); });
    const listen = (server: Server) => new Promise<string>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') return reject(Error('No test port'));
            resolve(`http://127.0.0.1:${address.port}`);
        });
    });
    const close = (server: Server) => new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
    });
    let source: Server | undefined;
    try {
        const destination = await listen(target);
        source = createServer((req, res) => {
            if (req.url === '/ready') { res.end('ready'); return; }
            res.writeHead(req.url === '/307' ? 307 : 308, {location: destination});
            res.end();
        });
        const origin = await listen(source);
        const fetch = guardedFetch(f.p, globalThis.fetch);
        assert.equal(await (await fetch(origin + '/ready')).text(), 'ready');
        for (const status of [307, 308]) {
            for (const redirect of [undefined, 'follow', 'manual'] as const) {
                await assert.rejects(fetch(origin + '/' + status, {
                    method: 'POST', body: 'fictional-body', redirect,
                }));
                await assert.rejects(fetch(new Request(origin + '/' + status, {redirect})));
            }
        }
        assert.equal(targetRequests, 0);
        assert.equal(count(f.p), 0);
    } finally {
        if (source) await close(source);
        await close(target);
        f.cleanup();
    }
});
