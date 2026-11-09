import {afterEach, expect, it, vi} from 'vitest';
import {EventEmitter} from 'node:events';
const forbidden = vi.hoisted(() => vi.fn(() => {throw Error('Real network forbidden in native transport tests');}));
vi.mock('node:https', () => ({request: forbidden}));
vi.mock('node:http2', () => ({connect: forbidden}));
async function api() {
  const m = await import('./transport').catch(() => ({}));
  expect(m).toHaveProperty('createNodeNativeTransport');
  return m as typeof import('./transport');
}
const apns = 'https://api.sandbox.push.apple.com/3/device/a1b2';
const fcm = 'https://fcm.googleapis.com/v1/projects/fictional-test/messages:send';
const details = (endpoint = apns) => ({endpoint, headers: {'content-type': 'application/json', authorization: 'bearer fictional-not-a-credential'}, body: Buffer.from('{}')});
function fixture(kind: 'http2' | 'https') {
  const response = Object.assign(new EventEmitter(), {statusCode: 200, headers: {} as Record<string, string>, destroy: vi.fn()});
  const stream = Object.assign(new EventEmitter(), {end: vi.fn(), destroy: vi.fn()});
  const client = Object.assign(new EventEmitter(), {request: vi.fn(() => stream), destroy: vi.fn()});
  let respond!: (response: unknown) => void;
  const httpsRequest = vi.fn((_url: unknown, _options: unknown, callback: (response: unknown) => void) => {respond = callback; return stream;});
  const http2Connect = vi.fn(() => client);
  return {response, stream, client, httpsRequest, http2Connect,
    headers(values: Record<string, string | number> = {':status': 200}) {
      if (kind === 'http2') stream.emit('response', values);
      else {response.statusCode = values[':status'] as number ?? 200; response.headers = Object.fromEntries(Object.entries(values).filter(([key]) => key !== ':status').map(([key, value]) => [key, String(value)])); respond(response);}
    },
    chunk(bytes: Buffer) {(kind === 'http2' ? stream : response).emit('data', bytes);},
    end() {(kind === 'http2' ? stream : response).emit('end');},
  };
}
async function transport(f: ReturnType<typeof fixture>) {
  const m = await api();
  return m.createNodeNativeTransport({http2Connect: f.http2Connect, httpsRequest: f.httpsRequest} as unknown as Parameters<typeof m.createNodeNativeTransport>[0]);
}
afterEach(() => {vi.useRealTimers(); expect(forbidden).not.toHaveBeenCalled();});
for (const kind of ['http2', 'https'] as const) {
  const endpoint = kind === 'http2' ? apns : fcm;
  it(`${kind}: uses the fixed TLS POST target and bounded successful response`, async () => {
    const f = fixture(kind), run = await transport(f), input = details(endpoint);
    const pending = run(input, new AbortController().signal);
    f.headers({':status': 200, 'retry-after': '60'}); f.chunk(Buffer.from('{"ok":true}')); f.end();
    expect(await pending).toEqual({statusCode: 200, retryAfter: '60', body: Buffer.from('{"ok":true}')});
    expect(f.stream.end).toHaveBeenCalledWith(input.body);
    if (kind === 'http2') {
      expect(f.http2Connect).toHaveBeenCalledWith('https://api.sandbox.push.apple.com', expect.objectContaining({rejectUnauthorized: true, minVersion: 'TLSv1.2', maxHeaderListPairs: 64, settings: {enablePush: false, maxHeaderListSize: 16384}}));
      expect(f.client.request).toHaveBeenCalledWith(expect.objectContaining({':method': 'POST', ':path': '/3/device/a1b2', authorization: input.headers.authorization}));
      expect(f.client.destroy).toHaveBeenCalledOnce();
    } else expect(f.httpsRequest).toHaveBeenCalledWith(new URL(endpoint), expect.objectContaining({method: 'POST', rejectUnauthorized: true, minVersion: 'TLSv1.2', maxHeaderSize: 16384}), expect.any(Function));
  });
  it(`${kind}: abort before IO creates no connection`, async () => {
    const f = fixture(kind), run = await transport(f), controller = new AbortController(); controller.abort();
    await expect(run(details(endpoint), controller.signal)).rejects.toThrow('transport_timeout');
    expect(f.http2Connect).not.toHaveBeenCalled(); expect(f.httpsRequest).not.toHaveBeenCalled();
  });
  it(`${kind}: abort during body processing destroys owned IO without waiting for close`, async () => {
    const f = fixture(kind), run = await transport(f), controller = new AbortController();
    const pending = run(details(endpoint), controller.signal), assertion = expect(pending).rejects.toThrow('transport_timeout');
    f.headers(); f.chunk(Buffer.from('{')); controller.abort(); await assertion;
    expect(f.stream.destroy).toHaveBeenCalled();
    expect(kind === 'http2' ? f.client.destroy : f.response.destroy).toHaveBeenCalled();
    // Late diagnostics never change the settled outcome or become uncaught errors.
    f.stream.emit('error', Error('fictional secret provider diagnostics')); f.end();
  });
  it(`${kind}: times out a stalled header/body stream with one total deadline`, async () => {
    const f = fixture(kind), run = await transport(f); vi.useFakeTimers();
    const pending = run(details(endpoint), new AbortController().signal), assertion = expect(pending).rejects.toThrow('transport_timeout');
    f.headers(); f.chunk(Buffer.from('{')); await vi.advanceTimersByTimeAsync(8001); await assertion;
    expect(f.stream.destroy).toHaveBeenCalled();
  });
  it(`${kind}: rejects oversized declared/streamed bodies and oversized response headers`, async () => {
    for (const problem of ['length', 'stream', 'headers'] as const) {
      const f = fixture(kind), run = await transport(f), pending = run(details(endpoint), new AbortController().signal);
      const assertion = expect(pending).rejects.toThrow(problem === 'headers' ? 'response_headers' : 'response_too_large');
      f.headers(problem === 'length' ? {':status': 200, 'content-length': '8193'} : problem === 'headers' ? {':status': 200, 'x-large': 'x'.repeat(16385)} : {':status': 200});
      if (problem === 'stream') f.chunk(Buffer.alloc(8193));
      await assertion;
      expect(kind === 'http2' ? f.client.destroy : f.response.destroy).toHaveBeenCalled();
    }
  });
  it(`${kind}: passes a redirect response to classification without following its Location`, async () => {
    const f = fixture(kind), run = await transport(f), pending = run(details(endpoint), new AbortController().signal);
    f.headers({':status': 302, location: 'https://foreign.example/private-token'}); f.end();
    expect(await pending).toEqual({statusCode: 302, body: Buffer.alloc(0)});
    expect(f.http2Connect.mock.calls.length + f.httpsRequest.mock.calls.length).toBe(1);
  });
  it(`${kind}: reports premature closure with a stable redacted error`, async () => {
    const f = fixture(kind), run = await transport(f), pending = run(details(endpoint), new AbortController().signal);
    const assertion = expect(pending).rejects.toThrow('transport_error'); f.headers();
    (kind === 'http2' ? f.stream : f.response).emit('close'); await assertion;
  });
}
it.each(['https://foreign.example/3/device/a1b2', 'http://api.push.apple.com/3/device/a1b2',
  'https://api.push.apple.com:443/3/device/a1b2', 'https://api.push.apple.com/3/device/a1b2?x=1',
  'https://api.push.apple.com/3/device/a1b2#x', 'https://api.push.apple.com/3/device/A1B2',
  'https://fcm.googleapis.com/v1/projects/fictional-test/messages:send/extra', 'https://oauth2.googleapis.com/other'])('rejects a noncanonical or foreign endpoint before IO: %s', async endpoint => {
  const f = fixture('https'), run = await transport(f);
  await expect(run(details(endpoint), new AbortController().signal)).rejects.toThrow('request_invalid');
  expect(f.http2Connect).not.toHaveBeenCalled(); expect(f.httpsRequest).not.toHaveBeenCalled();
});
it('admits only the exact OAuth endpoint and rejects credential/header/body injection before IO', async () => {
  const f = fixture('https'), run = await transport(f), endpoint = 'https://oauth2.googleapis.com/token';
  const pending = run({...details(endpoint), headers: {'content-type': 'application/x-www-form-urlencoded'}}, new AbortController().signal);
  f.headers(); f.chunk(Buffer.from('{}')); f.end(); expect((await pending).statusCode).toBe(200);
  const invalid: Parameters<typeof run>[0][] = [{...details(), body: Buffer.alloc(16385)}, {...details(), headers: {cookie: 'fictional'}},
    {...details(), headers: {authorization: 'bearer x\r\nsecret: value'}}, {...details(), headers: {':path': '/foreign'}}];
  for (const input of invalid) {
    await expect(run(input, new AbortController().signal)).rejects.toThrow('request_invalid');
  }
  expect(f.httpsRequest).toHaveBeenCalledOnce(); expect(f.http2Connect).not.toHaveBeenCalled();
});
