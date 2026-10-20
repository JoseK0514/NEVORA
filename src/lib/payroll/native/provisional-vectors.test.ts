import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { input, entry } from './fixtures.test-support';
import { calculateNativePayroll } from './calculate';
import type { NativePayrollInput } from './contracts';
import vectors from './provisional-vectors.test-support.json';

function selected(): NativePayrollInput {
  const i = input(); i.calculationPolicyReference = 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014';
  i.wages[0].wageCentRounding = 'UNVERIFIED'; i.tax!.prCentRounding = 'HALF_UP'; i.tax!.ruleEvidenceReference = 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014'; return i;
}
function ready(i: NativePayrollInput) {
  const r = calculateNativePayroll(i); expect(r.state, JSON.stringify(r)).toBe('ready'); if (r.state !== 'ready') throw Error('Blocked independently declared vector'); return r;
}
function timed(id: string, durationNs: string, locationId = 'L1', hour = 8) {
  const start = `2026-10-05T${String(hour).padStart(2, '0')}:00:00-04:00`;
  const end = Temporal.Instant.fromEpochNanoseconds(Temporal.Instant.from(start).epochNanoseconds + BigInt(durationNs)).toString(); return entry(id, start, end, locationId);
}
describe('independently derived provisional cents vectors', () => {
  it.each(vectors.wages)('$id preserves a single paycheck quantum and exact group allocation', v => {
    const i = selected(); const base = i.wages[0];
    i.wages = v.groups.map((g, index) => ({ ...base, id: 'W' + (index + 1), locationIds: ['L' + (index + 1)], hourlyRateMinor: g.rateMinor }));
    i.timecards[0].entries = v.groups.map((g, index) => timed('E' + index, g.durationNs, 'L' + (index + 1), 8 + index));
    const before = structuredClone(i); const r = ready(i); expect(i).toEqual(before); expect(r.row.grossMinor).toBe(v.expectedGrossMinor); expect(r.row.netMinor).toBe(v.expectedNetMinor); expect(r.breakdown.earnings.map(e => e.amountMinor)).toEqual(v.expectedAllocation);
    expect(r.provenance.calculationPolicy!.operations.find(o => o.operation === 'WAGE_PAYCHECK')!.exactAmount).toEqual(v.exactTotal);
    i.wages.reverse(); i.timecards[0].entries.reverse(); expect(ready(i).row).toEqual(r.row);
  });
  it.each(vectors.taxes)('$id preserves program-specific caps/rates and exact employer accrual residuals', v => {
    const i = selected(); i.wages[0].hourlyRateMinor = '3600'; i.timecards[0].entries = [timed(v.id, (BigInt(v.grossMinor) * BigInt(1000000000)).toString())];
    i.ytd!.socialSecurityWagesMinor = v.before.socialSecurity; i.ytd!.medicareWagesMinor = v.before.medicare; i.ytd!.sinotWagesMinor = v.before.sinot; i.ytd!.employerWagesMinor = v.before.employer;
    i.ytd!.grossMinor = i.ytd!.netMinor = [v.before.socialSecurity, v.before.medicare, v.before.sinot, ...Object.values(v.before.employer)].reduce((a, b) => BigInt(a) > BigInt(b) ? a : b, '0'); i.ytd!.locationIds = i.ytd!.grossMinor === '0' ? [] : ['L1'];
    i.tax!.employerContributions = [{ code: 'FUTA', basisPoints: 60, capMinor: '700000' }, { code: 'PR_UI', basisPoints: 275, capMinor: '700000' }, { code: 'CFSE', basisPoints: 137, capMinor: null }].map(p => ({ ...p, label: p.code, applicability: 'APPLICABLE', wagesBeforeMinor: v.before.employer[p.code as keyof typeof v.before.employer], evidenceReference: 'Fictional independently declared rate and basis' }));
    const r = ready(i); expect(r.row.grossMinor).toBe(v.grossMinor); expect(r.row.netMinor).toBe(v.expectedNetMinor);
    expect(Object.fromEntries(r.row.employeeDeductions.map(d => [d.code, d.amountMinor]))).toEqual(v.expected.employee); expect(Object.fromEntries(r.row.employerContributions.map(d => [d.code, d.amountMinor]))).toEqual(v.expected.employer);
    const medicare = r.provenance.calculationPolicy!.operations.find(o => o.operation === 'EMPLOYER_FICA_MEDICARE')!; expect(medicare.exactAmount).toEqual(v.expected.employerMedicareExact); expect(medicare.differenceMinor).toEqual(v.expected.employerMedicareDifference);
    for (const [code, exact] of Object.entries(v.exactPrograms)) expect(r.provenance.calculationPolicy!.operations.find(o => o.operation === 'EMPLOYER_ASSESSMENT' && o.reference === code)!.exactAmount).toEqual(exact);
    expect(r.breakdown.taxes.find(t => t.code === 'SINOT')!.exactAmount).toEqual(v.expected.sinotEmployeeExact);
  });
  it.each(vectors.deductions)('$id applies authorized cash cap before collection and retains unclamped arithmetic', v => {
    const i = selected(); i.wages[0].hourlyRateMinor = '3600'; i.timecards[0].entries = [timed(v.id, '1000000000000')];
    i.ytd!.employerWagesMinor.INSURANCE = '0'; i.tax!.employerContributions.push({ code: 'INSURANCE', label: 'Fictional insurance', applicability: 'APPLICABLE', basisPoints: 10000, capMinor: null, wagesBeforeMinor: '0', evidenceReference: 'Fictional actual matching insurance rate' });
    i.deductions = [{ id: v.id, revision: 1, code: 'INS', label: 'Fictional written insurance', effectiveFrom: '2026-01-01', effectiveTo: null, method: 'PERCENTAGE', amountMinor: null, basisPoints: v.basisPoints, capMinor: v.capMinor, deductedBeforeMinor: v.deductedBeforeMinor, authorization: 'WRITTEN_POST_TAX', authorizationReference: 'Fictional independently declared written election', revoked: false, legalBasis: 'PR_LAW_17_5_G', complianceReference: 'Fictional independently declared matching facts', employerContributionCode: 'INSURANCE' }];
    const r = ready(i); expect(r.row.employeeDeductions.find(d => d.code === 'INS')!.amountMinor).toBe(v.expectedMinor); expect(r.row.netMinor).toBe(v.expectedNetMinor);
    expect(r.provenance.calculationPolicy!.operations.find(o => o.operation === 'AUTHORIZED_DEDUCTION')!).toMatchObject({ exactAmount: v.boundedExact, uncappedExactAmount: v.uncappedExact, amountMinor: v.expectedMinor });
  });
  it('retains the signed employer Medicare difference needed to compare three payments with period accrual', () => {
    const i = selected(); i.wages[0].hourlyRateMinor = '3600'; i.timecards[0].entries = [timed('REC', '100000000000')];
    const payments = [ready(i), ready(i), ready(i)]; const operations = payments.map(r => r.provenance.calculationPolicy!.operations.find(o => o.operation === 'EMPLOYER_FICA_MEDICARE')!);
    expect(operations.map(o => o.amountMinor)).toEqual(['1', '1', '1']); expect(operations.map(o => o.exactAmount)).toEqual(Array.from({ length: 3 }, () => ({ numerator: '29', denominator: '20' })));
    expect(operations.map(o => o.differenceMinor)).toEqual(Array.from({ length: 3 }, () => ({ numerator: '-9', denominator: '20' })));
  });
});
