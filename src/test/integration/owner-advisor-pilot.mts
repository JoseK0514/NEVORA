import { constants, closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
export const PILOT = Object.freeze({
    pilotId: 'owner-advisor-20261022',
    baseUrl: 'https://br-blue-firefly-b759kjzm-api.ai.c-13.us-east-1.aws.neon.tech',
    model: 'gpt-6-1-sol', budgetMicrodollars: 5000000, reservationMicrodollars: 250000,
});
export const PILOT_ENDPOINT = PILOT.baseUrl + '/openai/v1/responses';
export type OwnerAdvisorPilot = {
    pilotId: string;
    baseUrl: string;
    model: string;
    credential: string;
    ledgerPath: string;
};
function fail(): never { throw Error('Owner advisor pilot guard refused operation'); }
export function validatePilot(p: OwnerAdvisorPilot) {
    if (p.pilotId !== PILOT.pilotId || p.baseUrl !== PILOT.baseUrl || p.model !== PILOT.model || !p.credential || p.credential.trim() !== p.credential || /[\r\n]/.test(p.credential) || !isAbsolute(p.ledgerPath) || resolve(p.ledgerPath) !== p.ledgerPath || !p.ledgerPath.endsWith('/ledger.json'))
        fail();
}
function safe(path: string, directory: boolean) {
    const s = lstatSync(path);
    if (s.isSymbolicLink() || (directory ? !s.isDirectory() : !s.isFile()) || s.uid !== process.getuid?.() || (s.mode & 0o077) !== 0 || (!directory && s.nlink !== 1))
        fail();
    if (realpathSync(path) !== path)
        fail();
}
function durable(path: string, value: unknown) {
    const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
        writeFileSync(fd, JSON.stringify(value));
        fsyncSync(fd);
    }
    finally {
        closeSync(fd);
    }
}
function syncDirectory(path: string) { const fd = openSync(path, constants.O_RDONLY); try {
    fsyncSync(fd);
}
finally {
    closeSync(fd);
} }
/** Explicit one-time provisioning. Never called automatically by launch/preload. */
export function initializePilot(p: OwnerAdvisorPilot) {
    validatePilot(p);
    const directory = dirname(p.ledgerPath);
    // mkdir is exclusive: an existing directory, including a missing ledger, cannot reset a pilot.
    mkdirSync(directory, { mode: 0o700 });
    safe(directory, true);
    const initial = { ...PILOT, endpoint: PILOT_ENDPOINT, ledgerPath: p.ledgerPath, initializedAt: Date.now(), attempts: 0 };
    durable(join(directory, 'identity.json'), initial);
    durable(p.ledgerPath, initial);
    syncDirectory(directory);
}
function ledger(p: OwnerAdvisorPilot) {
    validatePilot(p);
    const directory = dirname(p.ledgerPath);
    safe(directory, true);
    safe(p.ledgerPath, false);
    const state = JSON.parse(readFileSync(p.ledgerPath, 'utf8'));
    safe(join(directory, 'identity.json'), false);
    if (readFileSync(join(directory, 'identity.json'), 'utf8') !== JSON.stringify({...state, attempts: 0})) fail();
    if (JSON.stringify(Object.keys(state).sort()) !== JSON.stringify([...Object.keys(PILOT), 'endpoint', 'ledgerPath', 'initializedAt', 'attempts'].sort()) || Object.entries({ ...PILOT, endpoint: PILOT_ENDPOINT, ledgerPath: p.ledgerPath }).some(([k, v]) => state[k] !== v) || !Number.isInteger(state.attempts) || state.attempts < 0 || state.attempts > 20 || !Number.isSafeInteger(state.initializedAt) || state.initializedAt > Date.now() || Date.now() - state.initializedAt >= 86400000)
        fail();
    return state;
}
export function assertPilotLedger(p: OwnerAdvisorPilot) { ledger(p); if (readdirSync(dirname(p.ledgerPath)).includes('reservation.lock'))
    fail(); }
export function reservePilot(p: OwnerAdvisorPilot) {
    ledger(p);
    const directory = dirname(p.ledgerPath), lock = join(directory, 'reservation.lock');
    // Contention and crash residue intentionally fail closed, with no stale lock recovery.
    durable(lock, { pilotId: PILOT.pilotId });
    const state = ledger(p);
    const names = readdirSync(directory).filter(n => n !== p.ledgerPath.slice(directory.length + 1) && n !== 'reservation.lock' && n !== 'identity.json').sort();
    if (names.length !== state.attempts)
        fail();
    if (names.length >= 20) {
        unlinkSync(lock);
        syncDirectory(directory);
        fail();
    }
    for (let i = 0; i < names.length; i++) {
        if (names[i] !== `reservation-${String(i + 1).padStart(2, '0')}.json`)
            fail();
        const path = join(directory, names[i]);
        safe(path, false);
        if (readFileSync(path, 'utf8') !== JSON.stringify({ ...state, attempts: i + 1, attempt: i + 1, reservedMicrodollars: (i + 1) * PILOT.reservationMicrodollars }))
            fail();
    }
    durable(join(directory, `reservation-${String(names.length + 1).padStart(2, '0')}.json`), { ...state, attempts: names.length + 1, attempt: names.length + 1, reservedMicrodollars: (names.length + 1) * PILOT.reservationMicrodollars });
    durable(join(directory, 'ledger.pending'), { ...state, attempts: names.length + 1 });
    renameSync(join(directory, 'ledger.pending'), p.ledgerPath);
    syncDirectory(directory);
    unlinkSync(lock);
    syncDirectory(directory);
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function only(v: Record<string, unknown>, keys: string[]) { if (Object.keys(v).some(k => !keys.includes(k)))
    fail(); }
function inputItem(v: unknown) {
    if (!object(v))
        fail();
    if (v.type === 'function_call') {
        only(v, ['type', 'id', 'call_id', 'name', 'arguments', 'status']);
        if (typeof v.call_id !== 'string' || typeof v.name !== 'string' || typeof v.arguments !== 'string')
            fail();
    }
    else if (v.type === 'function_call_output') {
        only(v, ['type', 'call_id', 'output']);
        if (typeof v.call_id !== 'string' || typeof v.output !== 'string')
            fail();
    }
    else if (v.type === 'reasoning') {
        only(v, ['type', 'id', 'summary', 'encrypted_content', 'status']);
        if (typeof v.id !== 'string' || !Array.isArray(v.summary) || v.summary.some(s => !object(s) || s.type !== 'summary_text' || typeof s.text !== 'string' || Object.keys(s).some(k => !['type', 'text'].includes(k))) || (v.encrypted_content !== undefined && typeof v.encrypted_content !== 'string'))
            fail();
    }
    else {
        only(v, ['type', 'id', 'role', 'content', 'status']);
        if (v.type !== undefined && v.type !== 'message')
            fail();
        if (!['user', 'assistant', 'system', 'developer'].includes(String(v.role)))
            fail();
        if (typeof v.content !== 'string') {
            if (!Array.isArray(v.content) || v.content.some(c => !object(c) || !['input_text', 'output_text'].includes(String(c.type)) || typeof c.text !== 'string' || Object.keys(c).some(k => !['type', 'text', 'annotations', 'logprobs'].includes(k)) || (c.annotations !== undefined && (!Array.isArray(c.annotations) || c.annotations.length !== 0))))
                fail();
        }
    }
}
export function guardedFetch(p: OwnerAdvisorPilot, transport: typeof fetch): typeof fetch {
    validatePilot(p);
    assertPilotLedger(p);
    return async (input, init) => {
        const request = new Request(input, init), url = new URL(request.url);
        if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
            // Never let an internal endpoint redirect around remote validation/reservation.
            const response = await transport(request, { redirect: 'error' });
            if (response.redirected || (response.status >= 300 && response.status < 400)) fail();
            return response;
        }
        if (request.url === PILOT.baseUrl + '/v1/models' && request.method === 'GET' && request.redirect === 'error' && request.headers.get('authorization') === `Bearer ${p.credential}`)
            return transport(request);
        if (request.url !== PILOT_ENDPOINT || request.method !== 'POST' || request.redirect !== 'error' || request.headers.get('authorization') !== `Bearer ${p.credential}` || request.headers.get('content-type') !== 'application/json')
            fail();
        // Bound reading even for Request/stream bodies produced by Next's fetch wrapper.
        const reader = request.clone().body?.getReader();
        if (!reader)
            fail();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                size += value.byteLength;
                if (size > 65536) {
                    void reader.cancel();
                    fail();
                }
                chunks.push(value);
            }
        }
        finally {
            reader.releaseLock();
        }
        const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        if (!object(body))
            fail();
        only(body, ['model', 'store', 'stream', 'include', 'instructions', 'input', 'tools', 'parallel_tool_calls', 'max_output_tokens']);
        if (body.model !== PILOT.model || body.store !== false || (body.stream !== undefined && body.stream !== false) || !Number.isInteger(body.max_output_tokens) || Number(body.max_output_tokens) < 1 || Number(body.max_output_tokens) > 4096 || typeof body.instructions !== 'string' || !Array.isArray(body.input) || !Array.isArray(body.tools) || body.parallel_tool_calls !== false || JSON.stringify(body.include) !== '["reasoning.encrypted_content"]')
            fail();
        body.input.forEach(inputItem);
        for (const tool of body.tools) {
            if (!object(tool))
                fail();
            only(tool, ['type', 'name', 'description', 'parameters', 'strict']);
            if (tool.type !== 'function' || typeof tool.name !== 'string' || !object(tool.parameters))
                fail();
        }
        reservePilot(p);
        const response = await transport(request);
        if (response.redirected || (response.status >= 300 && response.status < 400))
            fail();
        return response;
    };
}
