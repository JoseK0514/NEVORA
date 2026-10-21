import { it, expect } from 'vitest';
import { calculateNativePayroll } from './calculate';
import { parseWage, parseYtd } from './model';
import { input } from './fixtures.test-support';
it.each(['0', '1', '725', '1049', '1049.9999'])('rejects below-minimum ordinary covered rate %s at profile and calculator boundaries', rate => { const i = input(); i.wages[0].hourlyRateMinor = rate; expect(() => parseWage(i.wages[0])).toThrow(); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: rate === '0' ? 'INVALID_WAGE_RATE' : 'BELOW_APPLICABLE_MINIMUM_WAGE' }] }); });
it('does not infer coverage for an unknown or higher-sector minimum', () => { const i = input(); (i.wages[0] as unknown as Record<string, unknown>).minimumWageCoverage = 'UNVERIFIED'; expect(() => parseWage(i.wages[0])).toThrow(); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'MINIMUM_WAGE_COVERAGE_REQUIRED' }] }); });
it('accepts the explicit ordinary Act47/FLSA scope at its 1050-cent boundary', () => { const i = input(); i.wages[0].hourlyRateMinor = '1050'; expect(parseWage(i.wages[0]).hourlyRateMinor).toBe('1050'); expect(calculateNativePayroll(i).state).toBe('ready'); });
it('requires opening YTD gross less all documented deductions to reconcile to net', () => { const i = input(); i.ytd!.grossMinor = '10000'; i.ytd!.netMinor = '9000'; i.ytd!.locationIds = ['L1']; expect(() => parseYtd(i.ytd)).toThrow(); i.ytd!.deductions = { MEDICARE: '1000' }; expect(parseYtd(i.ytd).netMinor).toBe('9000'); });
