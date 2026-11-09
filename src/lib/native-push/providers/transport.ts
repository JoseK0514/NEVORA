import 'server-only';
import {request as httpsRequest, type RequestOptions} from 'node:https';
import {connect as http2Connect, type ClientHttp2Session, type ClientHttp2Stream, type ClientSessionOptions, type SecureClientSessionOptions} from 'node:http2';
import type {ClientRequest, IncomingMessage} from 'node:http';

export type NativeTransportRequest = {endpoint: string; headers: Record<string, string>; body: Buffer};
export type NativeTransportResponse = {statusCode: number; retryAfter?: string; body: Buffer};
export type NativeTransport = (request: NativeTransportRequest, signal: AbortSignal) => Promise<NativeTransportResponse>;
type Code = 'request_invalid' | 'transport_error' | 'transport_timeout' | 'response_too_large' | 'response_headers';
export class NativeTransportError extends Error {constructor(readonly code: Code) {super(code);}}
type IO = {
  httpsRequest(url: URL, options: RequestOptions, response: (value: IncomingMessage) => void): ClientRequest;
  http2Connect(authority: string, options: ClientSessionOptions & SecureClientSessionOptions): ClientHttp2Session;
};
const MAX_BODY = 8192, MAX_HEADERS = 16384, DEADLINE = 8000;
const allowedHeaders = new Set(['authorization', 'content-type', 'apns-topic', 'apns-push-type', 'apns-priority', 'apns-expiration', 'apns-collapse-id']);
function invalid(): never {throw new NativeTransportError('request_invalid');}
function validate(input: NativeTransportRequest): {url: URL; http2: boolean; headers: Record<string, string>; body: Buffer} {
  try {
    if (!input || typeof input.endpoint !== 'string' || input.endpoint.length > 2304 || !Buffer.isBuffer(input.body) || input.body.length > 16384) return invalid();
    const url = new URL(input.endpoint);
    if (url.href !== input.endpoint || url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return invalid();
    const apns = ['api.push.apple.com', 'api.sandbox.push.apple.com'].includes(url.hostname) && /^\/3\/device\/(?:[a-f0-9]{2}){1,1024}$/.test(url.pathname);
    const fcm = url.hostname === 'fcm.googleapis.com' && /^\/v1\/projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/messages:send$/.test(url.pathname);
    const oauth = url.hostname === 'oauth2.googleapis.com' && url.pathname === '/token';
    if (!apns && !fcm && !oauth) return invalid();
    const headers: Record<string, string> = {}; let bytes = 0;
    for (const [name, value] of Object.entries(input.headers)) {
      if (!allowedHeaders.has(name) || typeof value !== 'string' || /[^\x20-\x7e]/.test(value)) return invalid();
      bytes += Buffer.byteLength(name) + Buffer.byteLength(value);
      if (bytes > MAX_HEADERS) return invalid();
      headers[name] = value;
    }
    return {url, http2: apns, headers, body: Buffer.from(input.body)};
  } catch { return invalid(); }
}
function responseHeaders(input: Record<string, unknown>): {retryAfter?: string; length?: number} {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  if (entries.length > 64) throw new NativeTransportError('response_headers');
  let bytes = 0;
  for (const [name, value] of entries) {
    if (typeof value !== 'string' && !(name === ':status' && typeof value === 'number')) throw new NativeTransportError('response_headers');
    bytes += Buffer.byteLength(name) + Buffer.byteLength(String(value));
    if (bytes > MAX_HEADERS) throw new NativeTransportError('response_headers');
  }
  const declared = input['content-length'];
  let length: number | undefined;
  if (declared !== undefined) {
    if (typeof declared !== 'string' || !/^\d+$/.test(declared)) throw new NativeTransportError('response_headers');
    length = Number(declared);
    if (length > MAX_BODY) throw new NativeTransportError('response_too_large');
  }
  const retryAfter = typeof input['retry-after'] === 'string' && input['retry-after'].length <= 256 ? input['retry-after'] : undefined;
  return {...(retryAfter !== undefined ? {retryAfter} : {}), ...(length !== undefined ? {length} : {})};
}

/** Fixed provider POSTs only; never redirects or relaxes TLS validation. Every
 * invocation owns its stream and connection and destroys them on all outcomes.
 * Node IO is injected in tests; its defaults are never called by fake fixtures. */
export function createNodeNativeTransport(io: IO = {httpsRequest, http2Connect}): NativeTransport {
  return async (input, signal) => {
    const request = validate(input);
    if (signal.aborted) throw new NativeTransportError('transport_timeout');
    return new Promise<NativeTransportResponse>((resolve, reject) => {
      let stream: ClientRequest | ClientHttp2Stream | undefined, client: ClientHttp2Session | undefined, response: IncomingMessage | undefined;
      let settled = false, status: number | undefined, metadata: ReturnType<typeof responseHeaders> = {};
      const chunks: Buffer[] = []; let bytes = 0;
      const destroy = () => {
        try {stream?.destroy();} catch { /* Own IO only; outcome already settled. */ }
        try {response?.destroy();} catch { /* No provider errors escape. */ }
        try {client?.destroy();} catch { /* Do not wait on remote closure. */ }
      };
      const finish = (error?: NativeTransportError) => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
        destroy();
        if (error) reject(error);
        else resolve({statusCode: status!, ...(metadata.retryAfter !== undefined ? {retryAfter: metadata.retryAfter} : {}), body: Buffer.concat(chunks)});
      };
      const abort = () => finish(new NativeTransportError('transport_timeout'));
      const failed = () => finish(new NativeTransportError('transport_error'));
      const timer = setTimeout(abort, DEADLINE);
      signal.addEventListener('abort', abort, {once: true});
      const headers = (value: Record<string, unknown>, code: unknown) => {
        if (settled) return;
        try {
          if (status !== undefined || !Number.isInteger(code) || Number(code) < 200 || Number(code) > 599) return failed();
          status = code as number; metadata = responseHeaders(value);
        } catch (error) {finish(error instanceof NativeTransportError ? error : new NativeTransportError('transport_error'));}
      };
      const data = (value: unknown) => {
        if (settled) return;
        if (status === undefined || !(value instanceof Uint8Array)) return failed();
        bytes += value.byteLength;
        if (bytes > MAX_BODY) return finish(new NativeTransportError('response_too_large'));
        chunks.push(Buffer.from(value));
      };
      const end = () => {
        if (status === undefined || (metadata.length !== undefined && metadata.length !== bytes)) return failed();
        finish();
      };
      try {
        if (signal.aborted) return abort();
        if (request.http2) {
          client = io.http2Connect(request.url.origin, {rejectUnauthorized: true, minVersion: 'TLSv1.2', maxHeaderListPairs: 64,
            maxReservedRemoteStreams: 0, settings: {enablePush: false, maxHeaderListSize: MAX_HEADERS}});
          client.on('error', failed); client.on('close', failed); client.on('goaway', failed);
          stream = client.request({':method': 'POST', ':path': request.url.pathname, ...request.headers});
          stream.on('error', failed); stream.on('close', failed);
          stream.on('response', value => headers(value, value[':status']));
          stream.on('data', data); stream.on('end', end);
        } else {
          stream = io.httpsRequest(request.url, {method: 'POST', headers: request.headers, rejectUnauthorized: true, minVersion: 'TLSv1.2', maxHeaderSize: MAX_HEADERS, agent: false}, value => {
            response = value;
            response.on('error', failed); response.on('close', failed); response.on('aborted', failed);
            response.on('data', data); response.on('end', end);
            headers(response.headers, response.statusCode);
          });
          stream.on('error', failed); stream.on('close', () => {if (!response) failed();});
        }
        if (signal.aborted) return abort();
        stream.end(request.body);
      } catch { failed(); }
    });
  };
}
