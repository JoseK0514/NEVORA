import { expect, it } from 'vitest';
import { readPinKey, pinFingerprint, hashClockerPin, verifyClockerPin } from '../../lib/clocker/pin-crypto.server';
const key = Buffer.alloc(32, 29);
it('requires an explicit 32-byte server key, without a default or echo', () => {
  expect(readPinKey({ NEVORA_CLOCKER_PIN_KEY: key.toString('hex') })).toEqual(key);
  for (const input of [undefined, '', 'secret', 'a'.repeat(63), 'g'.repeat(64)]) {
    expect(() => readPinKey({ NEVORA_CLOCKER_PIN_KEY: input })).toThrow('PIN security is not configured');
  }
});
it('keeps leading zeroes and scopes keyed lookup to the workspace and key', () => {
  const a = pinFingerprint('0123', 'north', key);
  expect(a).toMatch(/^[a-f0-9]{64}$/);
  expect(a).toBe(pinFingerprint('0123', 'north', key));
  expect(a).not.toBe(pinFingerprint('1230', 'north', key));
  expect(a).not.toBe(pinFingerprint('0123', 'south', key));
  expect(a).not.toBe(pinFingerprint('0123', 'north', Buffer.alloc(32, 30)));
});
it.each(['123', '12345', '1234\n', ' 1234', '１２３４', '12a4', '12\u00004'])('rejects malformed PIN %j without trimming/coercion', value => {
  expect(() => pinFingerprint(value, 'north', key)).toThrow('four digits');
});
it('salts slow verification and binds it to employee, workspace and secret', async () => {
  const first = await hashClockerPin('0123', 'north', 'employee-1', key);
  const second = await hashClockerPin('0123', 'north', 'employee-1', key);
  expect(first).toMatch(/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  expect(first).not.toBe(second);
  expect(await verifyClockerPin('0123', 'north', 'employee-1', key, first)).toBe(true);
  expect(await verifyClockerPin('9999', 'north', 'employee-1', key, first)).toBe(false);
  expect(await verifyClockerPin('0123', 'north', 'employee-2', key, first)).toBe(false);
  expect(await verifyClockerPin('0123', 'south', 'employee-1', key, first)).toBe(false);
  expect(await verifyClockerPin('0123', 'north', 'employee-1', Buffer.alloc(32, 30), first)).toBe(false);
});
it('does not accept malformed or attacker-selected hashing parameters', async () => {
  for (const stored of ['', 'scrypt-v1$bad$bad', 'scrypt-v999$' + 'a'.repeat(32) + '$' + 'a'.repeat(64), 'x'.repeat(10000)]) {
    expect(await verifyClockerPin('0123', 'north', 'employee-1', key, stored)).toBe(false);
  }
});
