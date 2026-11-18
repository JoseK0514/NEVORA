import {afterEach, expect, it, rs} from '@rstest/core';
import {onRequestError} from './instrumentation';

afterEach(() => { rs.restoreAllMocks(); });
it('records the framework route template and digest without request paths or headers', async () => {
  const sink = rs.spyOn(console, 'error').mockImplementation(() => {});
  await onRequestError(Object.assign(new Error('secret'), {digest: '90210'}), {
    path: '/api/people/private-person?token=private-token', method: 'POST',
    headers: {authorization: 'Bearer private-token', cookie: 'private-cookie', 'x-request-id': 'private-id'},
  }, {routerKind: 'App Router', routePath: '/api/people/[employeeId]', routeType: 'route', revalidateReason: undefined});
  expect(sink).toHaveBeenCalledTimes(1);
  const event = JSON.parse(sink.mock.calls[0][0]);
  expect(event.route).toBe('/api/people/[employeeId]');
  expect(event.digest).toBe('90210');
  expect(event.requestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(sink.mock.calls[0][0]).not.toContain('private');
});
