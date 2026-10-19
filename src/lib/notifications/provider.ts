import { request as httpsRequest, type RequestOptions } from 'node:https';
import type { ClientRequest, IncomingMessage, IncomingHttpHeaders } from 'node:http';
import webPush from 'web-push';
import { validatePushEndpoint, type ValidatedSubscription } from './subscription-service';
import type { NotificationConfig, ProviderResult, PushEnvelope } from './types';
const developmentCapture=process.env.NODE_ENV!=='production'?await import('../dev/capture.server'):null;
export type PushSender = {
    send(input: {
        subscription: ValidatedSubscription;
        payload: PushEnvelope;
        ttlSeconds: number;
        urgency: 'normal' | 'high';
        topic: string;
        signal: AbortSignal;
    }): Promise<ProviderResult>;
};
type RequestDetails = ReturnType<typeof webPush.generateRequestDetails>;
type TransportResponse = {
    statusCode: number;
    headers: IncomingHttpHeaders;
};
export type PushTransport = (details: RequestDetails, signal: AbortSignal) => Promise<TransportResponse>;
type RequestFactory = (url: URL, options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest;
class TransportError extends Error {
    constructor(readonly code: 'transport_timeout' | 'response_too_large' | 'transport_error') { super(code); }
}
const DEADLINE_MS = 8000;
const MAX_RESPONSE_BYTES = 32 * 1024;
/** Node HTTPS never follows redirects. Discard response bodies, including provider
 * errors: endpoints, credentials and provider diagnostics never leave this boundary. */
export function nodeHttpsTransport(details: RequestDetails, signal: AbortSignal, request: RequestFactory = httpsRequest): Promise<TransportResponse> {
    const url = validatePushEndpoint(details.endpoint);
    return new Promise((resolve, reject) => {
        let settled = false;
        let req: ClientRequest | undefined;
        let response: IncomingMessage | undefined;
        const finish = (error?: Error, result?: TransportResponse) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            signal.removeEventListener('abort', aborted);
            if (error) {
                response?.destroy();
                req?.destroy();
                reject(error);
            }
            else
                resolve(result!);
        };
        const aborted = () => finish(new TransportError('transport_timeout'));
        const timer = setTimeout(aborted, DEADLINE_MS); // Covers DNS, TLS, headers and body, not idle time.
        signal.addEventListener('abort', aborted, { once: true });
        if (signal.aborted) {
            aborted();
            return;
        }
        try {
            req = request(url, { method: 'POST', headers: details.headers, agent: false, maxHeaderSize: MAX_RESPONSE_BYTES }, res => {
                response = res;
                if (settled) {
                    res.destroy();
                    return;
                }
                let bytes = 0;
                const declared = Number(res.headers['content-length']);
                if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
                    finish(new TransportError('response_too_large'));
                    return;
                }
                res.on('data', (chunk: Buffer) => {
                    bytes += chunk.length;
                    if (bytes > MAX_RESPONSE_BYTES)
                        finish(new TransportError('response_too_large'));
                });
                res.once('end', () => finish(undefined, { statusCode: res.statusCode ?? 0, headers: res.headers }));
                res.once('error', () => finish(new TransportError('transport_error')));
                res.once('aborted', () => finish(new TransportError('transport_error')));
                res.once('close', () => { if (!res.complete)
                    finish(new TransportError('transport_error')); });
            });
            req.once('error', () => finish(new TransportError('transport_error')));
            req.end(details.body);
        }
        catch {
            finish(new TransportError('transport_error'));
        }
    });
}
function resultFor(response: TransportResponse): ProviderResult {
    const status = response.statusCode;
    if (status >= 200 && status < 300)
        return { kind: 'accepted' };
    if (status === 404 || status === 410)
        return { kind: 'invalid_subscription' };
    if (status === 408 || status === 429 || status >= 500 && status <= 599) {
        const raw = response.headers['retry-after'];
        const seconds = typeof raw === 'string' ? (/^\d+$/.test(raw) ? Number(raw) : (Date.parse(raw) - Date.now()) / 1000) : NaN;
        return { kind: 'retry', errorClass: status === 429 ? 'provider_throttled' : 'provider_unavailable',
            ...(Number.isFinite(seconds) ? { retryAfterSeconds: Math.min(3600, Math.max(0, Math.ceil(seconds))) } : {}) };
    }
    return { kind: 'failed', errorClass: status === 401 || status === 403 ? 'provider_configuration' : 'provider_rejected' };
}
/** Maintained encryption/VAPID request generation; credentials/options are per call.
 * Optional transport is the test boundary: tests never contact a push provider. */
export function createPushSender(config: NotificationConfig, transport: PushTransport = nodeHttpsTransport): PushSender {
    return { async send(input) {
            if(process.env.NODE_ENV!=='production'&&developmentCapture){
                const captured=await developmentCapture.capturePush(input);
                if(captured!==undefined)return captured;
            }
            if (input.signal.aborted)
                return { kind: 'retry', errorClass: 'transport_timeout' };
            if (!config.vapidPublicKey || !config.vapidPrivateKey || !config.vapidSubject)
                return { kind: 'failed', errorClass: 'provider_configuration' };
            let details: RequestDetails;
            try {
                validatePushEndpoint(input.subscription.endpoint);
                if (!Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 1 || input.ttlSeconds > 7 * 86400 || !/^[A-Za-z0-9_-]{1,32}$/.test(input.topic))
                    throw new Error('Invalid options');
                details = webPush.generateRequestDetails(input.subscription, JSON.stringify(input.payload), {
                    vapidDetails: { publicKey: config.vapidPublicKey, privateKey: config.vapidPrivateKey, subject: config.vapidSubject },
                    contentEncoding: 'aes128gcm', TTL: input.ttlSeconds, urgency: input.urgency, topic: input.topic,
                });
                validatePushEndpoint(details.endpoint);
            }
            catch {
                return { kind: 'failed', errorClass: 'provider_configuration' };
            }
            const controller = new AbortController();
            let rejectAbort: (error: Error) => void = () => { };
            const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
            const abort = () => { controller.abort(); rejectAbort(new TransportError('transport_timeout')); };
            const timer = setTimeout(abort, DEADLINE_MS);
            input.signal.addEventListener('abort', abort, { once: true });
            try {
                if (input.signal.aborted)
                    abort();
                return resultFor(await Promise.race([aborted, Promise.resolve().then(() => { controller.signal.throwIfAborted(); return transport(details, controller.signal); })]));
            }
            catch (error) {
                return { kind: 'retry', errorClass: error instanceof TransportError ? error.code : 'transport_error' };
            }
            finally {
                clearTimeout(timer);
                input.signal.removeEventListener('abort', abort);
                controller.abort();
            }
        } };
}
