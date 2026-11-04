import { describe, it, expect, vi } from 'vitest';
import { NativeDeviceController, type NativeDeviceRuntime } from './device-client';
const generation = 'a0eb37ac-e8a2-4f72-9f01-74eaa15eaa11';
function fixture() {
    const hello = { state: 'ready', platform: 'ios', nonce: generation, spki: 'public-key', keyFingerprint: 'a'.repeat(64), permission: 'granted', generation: null, revision:null,maintenance:false };
    const request = vi.fn<NativeDeviceRuntime['request']>(async (method) => method === 'hello' ? hello : method === 'notifications.complete' ? { state: 'active', generation } : { state: 'complete', generation });
    const api = vi.fn<NativeDeviceRuntime['api']>(async (action) => action === 'challenge' ? { state: 'challenge', challenge: { operation: 'enroll' } } : { state: 'off' });
    const runtime = { request, api, close: vi.fn() } as unknown as NativeDeviceRuntime;
    return { hello, request, api, runtime, client: new NativeDeviceController(runtime, () => { }) };
}
describe('native device ownership', () => {
    it('waits for bounded native rotation without enrolling or calling it revoked, and retires its retry on pause',async()=>{
        vi.useFakeTimers();try {
            const f=fixture();f.hello.maintenance=true;await f.client.start();expect(f.client.snapshot.state).toBe('loading');expect(f.api).not.toHaveBeenCalled();
            f.hello.maintenance=false;Object.assign(f.hello,{generation,revision:generation});f.api.mockResolvedValue({state:'active',generation});
            await vi.advanceTimersByTimeAsync(1000);expect(f.client.snapshot.state).toBe('enabled');
            f.hello.maintenance=true;await f.client.start();const count=f.request.mock.calls.length;f.client.pause();await vi.advanceTimersByTimeAsync(2000);expect(f.request).toHaveBeenCalledTimes(count);f.client.dispose();
        }finally{vi.useRealTimers();}
    });
    it('accepts detached tombstone revisions and reenrolls with that revision', async () => {
        const f = fixture(), tombstone = 'b0eb37ac-e8a2-4f72-9f01-74eaa15eaa11';
        Object.assign(f.hello, { generation, revision:generation });
        f.api.mockResolvedValue({ state: 'active', generation });
        await f.client.start();
        f.request.mockImplementation(async (method) => { if (method === 'notifications.detach') {
            Object.assign(f.hello, { generation: null, revision:tombstone });
            f.api.mockResolvedValue({ state: 'off' });
            return { state: 'complete', generation: tombstone };
        } return f.hello; });
        await f.client.turnOff(generation);
        expect(f.client.snapshot.state).toBe('ready');
        f.api.mockImplementation(async (action, body) => { if (action === 'challenge') {
            expect(body).toMatchObject({ operation: 'enroll', expectedGeneration: tombstone });
            return { state: 'challenge', challenge: { operation: 'enroll' } };
        } return { state: 'off' }; });
        await f.client.enable();
        expect(f.api.mock.calls.some(c => c[0] === 'challenge')).toBe(true);
    });
    it('explicit recovery uses a fresh reconciliation challenge after a lost active receipt', async () => {
        const f = fixture();
        f.api.mockImplementation(async (action) => action === 'status' ? { state: 'active', generation } : { state: 'challenge', challenge: { operation: 'enroll' } });
        await f.client.start();
        expect(f.client.snapshot.state).toBe('revoked');
        f.request.mockImplementation(async (method) => { if (method === 'notifications.complete') {
            Object.assign(f.hello, { generation, revision:generation });
            return { state: 'active', generation };
        } return f.hello; });
        await f.client.enable(true);
        expect(f.api.mock.calls.find(c => c[0] === 'challenge')?.[1]).toMatchObject({ operation: 'reconcile', expectedGeneration: null });
        expect(f.client.snapshot.state).toBe('enabled');
    });
    it('requires both authenticated server and native generation before saying alerts are on', async () => {
        const f = fixture();
        f.api.mockResolvedValue({ state: 'active', generation });
        await f.client.start();
        expect(f.client.snapshot.state).toBe('revoked');
        Object.assign(f.hello, { generation, revision:generation });
        await f.client.start();
        expect(f.client.snapshot.state).toBe('enabled');
    });
    it('enables only on explicit action and keeps tokens out of browser requests', async () => {
        const f = fixture();
        await f.client.start();
        expect(f.api).toHaveBeenCalledTimes(1);
        expect(f.request).not.toHaveBeenCalledWith('notifications.complete', expect.anything());
        f.request.mockImplementation(async (method: string) => { if (method === 'hello')
            return f.hello; if (method === 'notifications.complete') {
            Object.assign(f.hello, { generation, revision:generation });
            f.api.mockResolvedValue({ state: 'active', generation });
            return { state: 'active', generation };
        } return { state: 'permission', permission: 'granted' }; });
        await f.client.enable();
        expect(f.client.snapshot.state).toBe('enabled');
        expect(f.api.mock.calls.find(c => c[0] === 'challenge')?.[1]).toEqual({ operation: 'enroll', platform: 'ios', spki: 'public-key', operationId: expect.any(String), expectedGeneration: null });
        expect(JSON.stringify(f.api.mock.calls)).not.toContain('token');
    });
    it('never completes a challenge from a retired account/page', async () => {
        const f = fixture();
        await f.client.start();
        let resolve!: (v: Record<string, unknown>) => void;
        f.api.mockImplementation(async (action: string) => action === 'challenge' ? new Promise(r => { resolve = r; }) : { state: 'off' });
        const pending = f.client.enable();
        await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
        f.client.dispose();
        resolve({ state: 'challenge', challenge: { operation: 'enroll' } });
        await pending;
        expect(f.request.mock.calls.some(c => c[0] === 'notifications.complete')).toBe(false);
    });
    it('fences turn-off confirmation and verifies server off after native detach', async () => {
        const f = fixture();
        Object.assign(f.hello, { generation, revision:generation });
        f.api.mockResolvedValue({ state: 'active', generation });
        await f.client.start();
        await f.client.turnOff('b0eb37ac-e8a2-4f72-9f01-74eaa15eaa11');
        expect(f.request.mock.calls.some(c => c[0] === 'notifications.detach')).toBe(false);
        await f.client.start();
        await f.client.turnOff(generation);
        expect(f.request).toHaveBeenCalledWith('notifications.detach', generation);
        expect(f.client.snapshot.state).toBe('error');
        f.api.mockResolvedValue({ state: 'off' });
        await f.client.start();
        expect(f.client.snapshot.state).toBe('ready');
    });
    it('permission dialog retirement never authorizes the next page automatically', async () => {
        const f = fixture();
        f.hello.permission = 'default';
        await f.client.start();
        f.request.mockImplementation(async (method: string) => { if (method === 'notifications.permission') {
            f.client.dispose();
            return { state: 'permission', permission: 'granted' };
        } return f.hello; });
        await f.client.enable();
        expect(f.api.mock.calls.some(c => c[0] === 'challenge')).toBe(false);
    });
});
