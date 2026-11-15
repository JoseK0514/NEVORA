import {afterEach, expect, it, vi} from 'vitest';
import {reportServerError} from './server-error';

afterEach(() => vi.restoreAllMocks());
const reference = 'c34ed09a-1129-455c-9b60-3018cfce2f40';

it('logs only bounded diagnostic metadata and preserves the framework digest', () => {
  const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
  const error = Object.assign(new TypeError('password=fictional-secret'), {
    digest: '123456789', body: {token: 'private-token'}, sql: 'SELECT private',
    cause: Object.assign(new Error('private SQL details'), {code: '23505'}),
  });
  reportServerError(error, {route: '/api/people/[employeeId]', requestId: reference});
  expect(sink).toHaveBeenCalledTimes(1);
  const [encoded] = sink.mock.calls[0];
  const event = JSON.parse(encoded);
  expect(event).toEqual({event: 'server_request_error', route: '/api/people/[employeeId]',
    requestId: reference, errorClass: 'TypeError', digest: '123456789', sqlState: '23505'});
  expect(encoded).not.toContain('fictional-secret');
  expect(encoded).not.toContain('private');
});

it('replaces invalid request metadata and never serializes an arbitrary thrown value', () => {
  const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
  reportServerError({name: 'private-name', digest: 'token-secret', code: 'secret',
    toJSON() {throw Error('must not serialize');}}, {route: '/activate?proof=secret', requestId: 'secret\r\nheader'});
  const event = JSON.parse(sink.mock.calls[0][0]);
  expect(event).toEqual({event: 'server_request_error', route: '/unknown',
    requestId: expect.stringMatching(/^[a-f0-9-]{36}$/), errorClass: 'UnknownError'});
});

it('does not execute error getters and stops at cyclic causes', () => {
  const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
  const getter = vi.fn(() => {throw Error('private getter');});
  const error = {cause: undefined as unknown}; error.cause = error;
  Object.defineProperties(error, {digest: {get: getter}, code: {get: getter}, name: {get: getter}});
  expect(() => reportServerError(error, {route: '/api/example'})).not.toThrow();
  expect(getter).not.toHaveBeenCalled();
  expect(JSON.parse(sink.mock.calls[0][0]).errorClass).toBe('UnknownError');
});

it('cannot turn logging failures or hostile thrown objects into a second request failure', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {throw Error('sink unavailable');});
  const hostile = new Proxy({}, {getOwnPropertyDescriptor() {throw Error('denied');}, getPrototypeOf() {throw Error('denied');}});
  expect(() => reportServerError(hostile, {route: '/api/example'})).not.toThrow();
});
