// SCRUM-214: the wage editor's pure helpers. Fictional rates and locations.
import { describe, expect, it } from '@rstest/core';
import { checkWageIntervals } from '@/lib/payroll/native/model';
import { centsFromDollars, dollarsFromCents, moneyText, planRate, rateAt, rateBefore, type WageInterval } from './wage-plan';

const w = (id: string, from: string, to: string | null, locs: string[], rate: string): WageInterval => ({ id, effectiveFrom: from, effectiveTo: to, locationIds: locs, hourlyRateMinor: rate });
let n = 0; const ids = () => `gen-${++n}`;

describe('money', () => {
  it('reads dollars as exact cents and keeps an explicit zero', () => {
    expect(centsFromDollars('18.25')).toBe('1825');
    expect(centsFromDollars('$18')).toBe('1800');
    expect(centsFromDollars('18.255')).toBe('1825.5');
    expect(centsFromDollars('0')).toBe('0');
    expect(centsFromDollars('0.00')).toBe('0');
    expect(centsFromDollars('1,240.50')).toBe('124050');
    for (const bad of ['', 'abc', '-1', '18.2555555', '1e3']) expect(centsFromDollars(bad), bad).toBeNull();
  });
  it('shows money exactly, never rounded, in both languages', () => {
    expect(moneyText('1825')).toBe('$18.25');
    expect(moneyText('0')).toBe('$0.00');
    expect(moneyText('1825.5')).toBe('$18.255');
    expect(moneyText('124050')).toBe('$1,240.50');
    expect(moneyText('-2500')).toBe('-$25.00');
    expect(moneyText('1825', 'es-PR')).toBe('$18.25');
    expect(dollarsFromCents('1825.5')).toBe('18.255');
    expect(dollarsFromCents('1800')).toBe('18');
  });
});

describe('rates in effect', () => {
  const wages = [w('a', '2026-10-05T04:00:00Z', '2026-12-01T04:00:00Z', ['loiza'], '1825'), w('b', '2026-12-01T04:00:00Z', null, ['loiza'], '1900'), w('c', '2026-10-05T04:00:00Z', null, ['condado'], '0')];
  const now = new Date('2026-11-19T15:00:00Z');
  it('names the current rate and the next change', () => {
    const loiza = rateAt(wages, 'loiza', now);
    expect(loiza.current?.hourlyRateMinor).toBe('1825');
    expect(loiza.next?.hourlyRateMinor).toBe('1900');
    expect(rateAt(wages, 'condado', now).current?.hourlyRateMinor).toBe('0');
    expect(rateAt(wages, 'plaza', now).current).toBeNull();
  });
  it('says when a rate ends with nothing after it', () => {
    expect(rateAt([w('a', '2026-10-05T04:00:00Z', '2026-12-01T04:00:00Z', ['loiza'], '1825')], 'loiza', now).endsAt).toBe('2026-12-01T04:00:00Z');
  });
});

describe('planRate', () => {
  const base = [w('a', '2026-10-05T04:00:00Z', null, ['condado', 'loiza'], '1825')];
  it('schedules a raise at one location and keeps the other location on its rate', () => {
    const out = planRate(base, { locationIds: ['loiza'], from: '2026-12-01T04:00:00Z', hourlyRateMinor: '1900', id: 'new' }, ids);
    expect(() => checkWageIntervals(out)).not.toThrow();
    expect(rateBefore(out, 'loiza', '2026-11-30T04:00:00Z')).toBe('1825');
    expect(rateBefore(out, 'loiza', '2026-12-01T04:00:00Z')).toBe('1900');
    expect(rateBefore(out, 'condado', '2027-01-01T04:00:00Z')).toBe('1825');
    expect(out.find(x => x.id === 'a')?.effectiveTo).toBe('2026-12-01T04:00:00Z');
  });
  it('removes a rate from a date on, leaving no rate (not zero)', () => {
    const out = planRate(base, { locationIds: ['condado', 'loiza'], from: '2026-12-01T04:00:00Z', hourlyRateMinor: null, id: 'new' }, ids);
    expect(out).toHaveLength(1);
    expect(rateBefore(out, 'loiza', '2026-12-02T04:00:00Z')).toBeNull();
  });
  it('replaces a rate that was set to start later', () => {
    const later = [...planRate(base, { locationIds: ['loiza'], from: '2026-12-01T04:00:00Z', hourlyRateMinor: '1900', id: 'raise' }, ids)];
    const out = planRate(later, { locationIds: ['loiza'], from: '2026-11-20T04:00:00Z', hourlyRateMinor: '2000', id: 'sooner' }, ids);
    expect(() => checkWageIntervals(out)).not.toThrow();
    expect(out.some(x => x.id === 'raise')).toBe(false);
    expect(rateBefore(out, 'loiza', '2027-01-01T04:00:00Z')).toBe('2000');
  });
  it('sets a first rate where there was none, and an explicit zero', () => {
    const out = planRate([], { locationIds: ['plaza'], from: '2026-11-19T04:00:00Z', hourlyRateMinor: '0', id: 'z' }, ids);
    expect(out).toEqual([w('z', '2026-11-19T04:00:00Z', null, ['plaza'], '0')]);
  });
});
