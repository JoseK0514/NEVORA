import { it, expect, vi, afterEach } from 'vitest';
import { nativeDeviceRuntime } from './device-runtime';
afterEach(() => vi.unstubAllGlobals());
it('iOS and Android use closed versioned messages and drop retired replies', async () => {
    const bodies: string[] = [];
    let answer!: (value: object) => void;
    const host = { webkit: { messageHandlers: { nevoraCapabilities: { postMessage(body: string) { bodies.push(body); return new Promise(r => { answer = r; }); } } } } };
    const runtime = nativeDeviceRuntime(host as unknown as Window), pending = runtime.request('hello');
    const message = JSON.parse(bodies[0]);
    expect(Object.keys(message).sort()).toEqual(['id', 'method', 'nonce', 'payload', 'version']);
    runtime.close();
    await expect(pending).rejects.toThrow('retired');
    answer({ version: 1, id: message.id, state: 'ready', nonce: crypto.randomUUID() });
    const port = { postMessage: vi.fn(), onmessage: null as null | ((event: {
            data: string;
        }) => void) }, android = nativeDeviceRuntime({ nevoraCapabilities: port } as unknown as Window), request = android.request('hello');
    const sent = JSON.parse(port.postMessage.mock.calls[0][0]);
    port.onmessage?.({ data: JSON.stringify({ version: 1, id: sent.id, state: 'ready', nonce: crypto.randomUUID() }) });
    expect((await request).state).toBe('ready');
    android.close();
});
it('browser API has fixed endpoints and bounds/cancels oversized replies', async () => {
    vi.stubGlobal('AbortSignal', {}); // iOS16 has neither any nor timeout.
    const cancel = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4097)); }, cancel }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const runtime = nativeDeviceRuntime({} as Window);
    await expect(runtime.api('status', { keyFingerprint: 'public' }, new AbortController().signal)).rejects.toThrow('large');
    expect(cancel).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toBe('/api/mobile/v1/notifications/status');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'same-origin', redirect: 'error' });
});
it('mounted Android settings share replies without cancelling each other', async () => {
    const port = { postMessage: vi.fn(), onmessage: null as null | ((event: {
            data: string;
        }) => void) }, host = { nevoraCapabilities: port } as unknown as Window;
    const first = nativeDeviceRuntime(host), second = nativeDeviceRuntime(host), a = first.request('hello'), b = second.request('hello');
    second.close();
    await expect(b).rejects.toThrow('retired');
    const sent = JSON.parse(port.postMessage.mock.calls[0][0]);
    port.onmessage?.({ data: JSON.stringify({ version: 1, id: sent.id, state: 'ready', nonce: crypto.randomUUID() }) });
    expect((await a).state).toBe('ready');
    first.close();
});
