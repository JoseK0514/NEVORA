import type { NativeDeviceRuntime, NativeMethod } from './device-client';
type Reply = Record<string, unknown>;
type MessagePort = {
    postMessage(body: string): unknown;
    onmessage?: ((event: {
        data: string;
    }) => void) | null;
};
type NativeWindow = Window & {
    nevoraCapabilities?: MessagePort;
    webkit?: {
        messageHandlers?: {
            nevoraCapabilities?: MessagePort;
        };
    };
};
const dispatchers = new WeakMap<MessagePort, Map<string, (value: unknown) => void>>();
/** A per-document request map. No global callback name, evaluation operation,
 * arbitrary URL/header, native token, private storage or service worker shim. */
export function nativeDeviceRuntime(host: NativeWindow = window as NativeWindow): NativeDeviceRuntime {
    let nonce = '';
    const pending = new Map<string, {
        resolve(value: Reply): void;
        reject(error: Error): void;
    }>();
    const android = host.nevoraCapabilities, wk = host.webkit?.messageHandlers?.nevoraCapabilities;
    let dispatcher = android ? dispatchers.get(android) : undefined;
    if (android && !dispatcher) {
        dispatcher = new Map();
        dispatchers.set(android, dispatcher);
        const replies = dispatcher;
        android.onmessage = event => { if (typeof event.data !== 'string' || new TextEncoder().encode(event.data).length > 4096)
            return; try {
            const value = JSON.parse(event.data);
            if (typeof value?.id === 'string')
                replies.get(value.id)?.(value);
        }
        catch { /* Unsolicited malformed messages have no owner. */ } };
    }
    const receive = (value: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            return;
        const reply = value as Reply;
        if (reply.version !== 1 || typeof reply.id !== 'string')
            return;
        const waiting = pending.get(reply.id);
        if (!waiting)
            return;
        if (typeof reply.nonce === 'string' && /^[a-f0-9-]{36}$/.test(reply.nonce))
            nonce = reply.nonce;
        pending.delete(reply.id);
        dispatcher?.delete(reply.id);
        waiting.resolve(reply);
    };
    return {
        request(method: NativeMethod, payload = '') {
            if (!wk && !android)
                return Promise.reject(Error('Native channel unavailable'));
            if (pending.size >= 4 || payload.length > 8192)
                return Promise.reject(Error('Native channel busy'));
            const id = crypto.randomUUID();
            return new Promise<Reply>((resolve, reject) => {
                const timer = setTimeout(() => { pending.delete(id); dispatcher?.delete(id); reject(Error('Native request timed out')); }, 9000);
                dispatcher?.set(id, receive);
                pending.set(id, { resolve(value) { clearTimeout(timer); resolve(value); }, reject(error) { clearTimeout(timer); reject(error); } });
                try {
                    const message = JSON.stringify({ version: 1, id, nonce: method === 'hello' ? '' : nonce, method, payload });
                    if (wk)
                        Promise.resolve(wk.postMessage(message)).then(receive, () => { pending.get(id)?.reject(Error('Native request unavailable')); pending.delete(id); dispatcher?.delete(id); });
                    else
                        android!.postMessage(message);
                }
                catch {
                    pending.get(id)?.reject(Error('Native request unavailable'));
                    pending.delete(id);
                    dispatcher?.delete(id);
                }
            });
        },
        async api(action, body, signal) {
            const controller = new AbortController(), cancel = () => controller.abort();
            signal.addEventListener("abort", cancel, { once: true });
            if (signal.aborted)
                cancel();
            const timer = setTimeout(cancel, 8000);
            try {
                const response = await fetch(`/api/mobile/v1/notifications/${action}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
                if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'application/json')
                    throw Error('Native setup unavailable');
                const reader = response.body?.getReader();
                if (!reader)
                    throw Error('Native setup unavailable');
                let bytes = 0;
                const chunks: Uint8Array[] = [];
                try {
                    for (;;) {
                        const next = await reader.read();
                        if (next.done)
                            break;
                        bytes += next.value.byteLength;
                        if (bytes > 4096)
                            throw Error('Native reply too large');
                        chunks.push(next.value);
                    }
                }
                catch (error) {
                    void reader.cancel();
                    throw error;
                }
                finally {
                    reader.releaseLock();
                }
                const all = new Uint8Array(bytes);
                let offset = 0;
                for (const chunk of chunks) {
                    all.set(chunk, offset);
                    offset += chunk.length;
                }
                const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all));
                if (!value || typeof value !== 'object' || Array.isArray(value))
                    throw Error('Native reply invalid');
                return value as Reply;
            }
            finally {
                clearTimeout(timer);
                signal.removeEventListener("abort", cancel);
            }
        },
        close() { nonce = ''; for (const [id, value] of pending) {
            dispatcher?.delete(id);
            value.reject(Error('Native document retired'));
        } pending.clear(); },
    };
}
