import { describe, expect, it } from 'vitest';
import { dollarsToMinor, formatPayrollMoney, minorToDollars } from './money';

describe('exact payroll display', () => {
  it('preserves cents beyond the safe integer limit in both languages', () => {
    expect(formatPayrollMoney('900719925474099312')).toBe('$9,007,199,254,740,993.12');
    expect(formatPayrollMoney('900719925474099312', 'es')).toBe('$9,007,199,254,740,993.12');
    expect(formatPayrollMoney('1')).toBe('$0.01');
    expect(formatPayrollMoney('0')).toBe('$0.00');
  });
  it('round trips monetary form values without floating point', () => {
    expect(dollarsToMinor('9007199254740993.12')).toBe('900719925474099312');
    expect(minorToDollars('900719925474099312')).toBe('9007199254740993.12');
    expect(dollarsToMinor('0.5')).toBe('50');
    expect(dollarsToMinor('12')).toBe('1200');
  });
  it.each(['-1', '1.234', '1e4', '01', '', 'NaN'])('rejects noncanonical values %s', value => {
    expect(() => dollarsToMinor(value)).toThrow();
    expect(() => formatPayrollMoney(value)).toThrow();
  });
});
