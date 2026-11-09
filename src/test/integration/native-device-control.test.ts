import {expect, it} from 'vitest';
import {decodeNativeControl} from './native-device-control';
const ownerId = 'a'.repeat(32);
const valid = () => ({headers: new Headers({'x-nevora-native-test-owner': ownerId, 'content-type': 'application/json'}), method: 'POST', path: '/native-test', body: '{"action":"revoke"}', ownerId});
it('accepts only bounded, exact local test commands with invocation ownership', () => {
  expect(decodeNativeControl(valid())).toBe('revoke');
  for (const action of ['reset','outage-on','outage-off','verify-employee','verify-owner-ios','verify-owner-android']) expect(decodeNativeControl({...valid(), body: JSON.stringify({action})})).toBe(action);
});
it('denies browser requests, missing ownership, selectors, extra fields and unknown operations', () => {
  for (const patch of [{method: 'GET'}, {path: '/native-test?database=production'}, {body: '{"action":"drop-all"}'}, {body: '{"action":"revoke","employeeId":"someone"}'}, {body: 'x'.repeat(257)}, {body: '[]'}, {ownerId: 'unknown'}]) expect(() => decodeNativeControl({...valid(), ...patch})).toThrow();
  for (const [key, value] of [['origin','http://127.0.0.1'], ['sec-fetch-site','same-origin'], ['x-nevora-native-test-owner','b'.repeat(32)], ['content-type','text/plain']]) {
    const input = valid(); input.headers.set(key,value); expect(() => decodeNativeControl(input)).toThrow();
  }
  const missing = valid(); missing.headers.delete('x-nevora-native-test-owner'); expect(() => decodeNativeControl(missing)).toThrow();
});
