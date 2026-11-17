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

it('keeps simultaneous handled requests correlated separately without altering domain bodies',async()=>{
 const sink=vi.spyOn(console,'error').mockImplementation(()=>{});
 const {reportHandledServerError,withServerErrorDiagnostics}=await import('./server-error');
 const responses=await Promise.all(['/api/first','/api/second'].map(route=>withServerErrorDiagnostics(route,async()=>{
  await Promise.resolve();reportHandledServerError(new Error('private'),'/app/fallback');
  reportHandledServerError(new Error('second private'),'/app/fallback');
  return Response.json({state:'unavailable'},{status:503});
 })));
 const events=sink.mock.calls.map(([encoded])=>JSON.parse(encoded));expect(events).toHaveLength(2);
 expect(new Set(events.map(e=>e.requestId)).size).toBe(2);
 for(let i=0;i<responses.length;i++){
  const response=responses[i],id=response.headers.get('X-Nevora-Request-Id');
  expect(events.find(e=>e.requestId===id)?.route).toBe(i?'/api/second':'/api/first');
  expect(await response.json()).toEqual({state:'unavailable'});
 }
});
it('leaves successful and expected-refusal responses without diagnostic IDs',async()=>{
 const {withServerErrorDiagnostics}=await import('./server-error');
 for(const status of [200,400,403,409])expect((await withServerErrorDiagnostics('/api/example',async()=>Response.json({state:'expected'},{status}))).headers.get('X-Nevora-Request-Id')).toBeNull();
});
it('binds each interleaved response to its own event and leaves later requests clean',async()=>{
 const sink=vi.spyOn(console,'error').mockImplementation(()=>{});
 const {reportHandledServerError,withServerErrorDiagnostics}=await import('./server-error');
 const responses=await Promise.all(Array.from({length:24},async(_,index)=>{
  let reported:string|undefined;
  const response=await withServerErrorDiagnostics('/api/example',async()=>{
   for(let turn=0;turn<index%5;turn++)await Promise.resolve();
   if(index%3===0)return Response.json({state:'expected'},{status:[400,403,409][Math.floor(index/3)%3]});
   const reference=reportHandledServerError(Object.assign(new Error('private workforce record'),{body:{password:'fictional-only'},sql:'SELECT private'}),'/ignored');
   reported=reference;
   await Promise.resolve();
   expect(reportHandledServerError(new Error('duplicate report'),'/ignored')).toBe(reference);
   return Response.json({state:'unavailable'},{status:503});
  });
  return {response,reported};
 }));
 const events=sink.mock.calls.map(([encoded])=>JSON.parse(encoded));
 expect(events).toHaveLength(16);expect(new Set(events.map(event=>event.requestId)).size).toBe(16);
 for(const {response,reported} of responses){
  const reference=response.headers.get('X-Nevora-Request-Id');
  if(response.status===503){expect(reference).toBe(reported);expect(events.filter(event=>event.requestId===reference)).toHaveLength(1);expect(await response.json()).toEqual({state:'unavailable'});}
  else expect(reference).toBeNull();
 }
 expect(JSON.stringify(events)).not.toMatch(/private|fictional|password|SELECT|workforce/);
 expect((await withServerErrorDiagnostics('/api/later',async()=>new Response(null,{status:204}))).headers.get('X-Nevora-Request-Id')).toBeNull();
});
