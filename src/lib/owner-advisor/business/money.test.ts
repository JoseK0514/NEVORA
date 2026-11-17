import { describe, expect, it } from 'vitest';
import { minor, moneyTotal } from './money';

describe('exact business money', () => {
  it('keeps integers beyond Number precision and signed effects exact', () => {
    expect(moneyTotal(minor('999999999999999999') + minor('-7'))).toBe('999999999999999992');
    expect(minor('0', true)).toBe(BigInt(0));
  });
  it.each(['-0', '00', '01', '+1', '1.0', '1e2', ' 1', '', 10, null, '1000000000000000000'])('rejects noncanonical row money %s', value => {
    expect(() => minor(value)).toThrow();
  });
  it('rejects negative components and overlarge totals', () => {
    expect(() => minor('-1', true)).toThrow();
    expect(() => moneyTotal(BigInt('1000000000000000000000000000000'))).toThrow();
  });
});
