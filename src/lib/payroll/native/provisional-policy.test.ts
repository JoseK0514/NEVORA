import { describe, expect, it } from 'vitest';
import { calculateNativePayroll } from './calculate';
import { classifyRecordedTime } from './time';
import { input, entry } from './fixtures.test-support';
import { fictionalWorkweekPolicy } from './workweek-fixtures.test-support';
import type { NativePayrollInput, NativePayrollReady } from './contracts';

const reference = 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014';
const prReference = 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014';
function selected() {
  const i = Object.assign(input(), { calculationPolicyReference: reference });
  i.wages[0].wageCentRounding = 'UNVERIFIED'; i.wages[0].hourlyRateMinor = '1200';
  i.tax!.prCentRounding = 'HALF_UP'; i.tax!.ruleEvidenceReference = prReference;
  return i;
}
function ready(i: NativePayrollInput): NativePayrollReady {
  const r = calculateNativePayroll(i); expect(r.state, JSON.stringify(r)).toBe('ready');
  if (r.state !== 'ready') throw Error('Blocked fictional policy fixture'); return r;
}
function insurance(i: NativePayrollInput, cap = '1', before = '0') {
  i.ytd!.employerWagesMinor.INSURANCE = '0';
  i.tax!.employerContributions.push({ code: 'INSURANCE', label: 'Fictional matching insurance', applicability: 'APPLICABLE', basisPoints: 100, capMinor: null, wagesBeforeMinor: '0', evidenceReference: 'Fictional actual declared insurance rate' });
  i.deductions = [{ id: 'D1', revision: 1, code: 'INS', label: 'Fictional written insurance', effectiveFrom: '2026-01-01', effectiveTo: null, method: 'PERCENTAGE', amountMinor: null, basisPoints: 5, capMinor: cap, deductedBeforeMinor: before, authorization: 'WRITTEN_POST_TAX', authorizationReference: 'Fictional written election', revoked: false, legalBasis: 'PR_LAW_17_5_G', complianceReference: 'Fictional confirmed matching facts', employerContributionCode: 'INSURANCE' }];
}

describe('explicit owner-authorized provisional payroll policies', () => {
  it('collects a one-cent paycheck from two exact half-cent earning groups without doubling cash', () => {
    const i = selected(); i.wages.push({ ...i.wages[0], id: 'W2', locationIds: ['L2'] });
    i.timecards[0].entries = [entry('A', '2026-10-05T08:00:00-04:00', '2026-10-05T08:00:01.5-04:00'), entry('B', '2026-10-05T09:00:00-04:00', '2026-10-05T09:00:01.5-04:00', 'L2')];
    const r = ready(i); expect(r.row.grossMinor).toBe('1'); expect(r.row.netMinor).toBe('1');
    expect(r.breakdown.earnings.map(e => e.amountMinor)).toEqual(['1', '0']);
    expect(r.breakdown.earnings.map(e => e.exactAmount)).toEqual([{ numerator: '1', denominator: '2' }, { numerator: '1', denominator: '2' }]);
    i.wages.reverse(); i.timecards[0].entries.reverse(); expect(ready(i).row).toEqual(r.row);
  });
  it('allocates one rounded paycheck cent across three0.4-cent groups rather than losing all three', () => {
    const i = selected(); i.wages.push(...['2', '3'].map(n => ({ ...i.wages[0], id: 'W' + n, locationIds: ['L' + n] })));
    i.timecards[0].entries = ['1', '2', '3'].map((n, k) => entry('A' + n, `2026-10-05T${String(8 + k).padStart(2, '0')}:00:00-04:00`, `2026-10-05T${String(8 + k).padStart(2, '0')}:00:01.2-04:00`, 'L' + n));
    const r = ready(i); expect(r.row.grossMinor).toBe('1'); expect(r.breakdown.earnings.map(e => e.amountMinor)).toEqual(['1', '0', '0']);
  });
  it('retains weighted48h overtime and rounds197158/3 paycheck cents once', () => {
    const i = selected(); i.wages[0].hourlyRateMinor = '1250'; i.wages.push({ ...i.wages[0], id: 'W2', locationIds: ['L2'], hourlyRateMinor: '1333' });
    i.timecards[0].entries = [5, 6, 7, 8, 9, 10].map(d => entry('W' + d, `2026-10-${String(d).padStart(2, '0')}T08:00:00-04:00`, `2026-10-${String(d).padStart(2, '0')}T16:00:00-04:00`, d === 10 ? 'L2' : 'L1'));
    const r = ready(i); expect(r.row.grossMinor).toBe('65719'); expect(r.row.netMinor).toBe('56811');
    expect(r.breakdown.overtimeNanoseconds).toBe('28800000000000');
    expect(r.breakdown.earnings.find(e => e.kind === 'OVERTIME')!.premiumBasisMinorPerHour).toEqual({ numerator: '7583', denominator: '6' });
  });
  it('collects employer Medicare7 from exact7.25 cents and SINOT combined3 without separate-share inflation', () => {
    const i = selected(); i.wages[0].hourlyRateMinor = '1250'; i.timecards[0].entries = [entry('E', '2026-10-05T08:00:00-04:00', '2026-10-05T08:24:00-04:00')];
    const r = ready(i); expect(r.row.grossMinor).toBe('500'); expect(r.row.netMinor).toBe('460');
    expect(r.row.employerContributions).toEqual(expect.arrayContaining([{ code: 'MEDICARE', label: 'Employer Medicare', amountMinor: '7' }, { code: 'SINOT', label: 'Employer SINOT', amountMinor: '1' }]));
    expect(r.provenance).toMatchObject({ calculationPolicy: { kind: 'OWNER_AUTHORIZED_PROVISIONAL_POLICY', operations: expect.arrayContaining([expect.objectContaining({ operation: 'EMPLOYER_FICA_MEDICARE', exactAmount: { numerator: '29', denominator: '4' }, amountMinor: '7', differenceMinor: { numerator: '-1', denominator: '4' } })]) } });
  });
  it('allocates SINOT167-cent pay to employee1/employer0 with combined cash1', () => {
    const i = selected(); i.timecards[0].entries = [entry('S', '2026-10-05T08:00:00-04:00', '2026-10-05T08:08:21-04:00')];
    const r = ready(i); expect(r.row.grossMinor).toBe('167'); expect(r.row.netMinor).toBe('154');
    expect(r.row.employeeDeductions.find(d => d.code === 'SINOT')!.amountMinor).toBe('1'); expect(r.row.employerContributions.find(d => d.code === 'SINOT')!.amountMinor).toBe('0');
    expect(r.breakdown.taxes.find(d => d.code === 'SINOT')!.exactAmount).toEqual({ numerator: '501', denominator: '1000' });
  });
  it('applies the remaining SINOT5-cent annual wage base before contribution quantization', () => {
    const i = selected(); i.wages[0].hourlyRateMinor = '2500'; i.ytd!.grossMinor = i.ytd!.netMinor = '900000'; i.ytd!.sinotWagesMinor = '899995'; i.ytd!.locationIds = ['L1'];
    const r = ready(i); expect(r.row.grossMinor).toBe('20000'); expect(r.row.employeeDeductions.find(d => d.code === 'SINOT')!.amountMinor).toBe('0'); expect(r.row.employerContributions.find(d => d.code === 'SINOT')!.amountMinor).toBe('0');
    expect(r.breakdown.taxes.find(d => d.code === 'SINOT')!.taxableMinor).toBe('5');
  });
  it('keeps FUTA, PR_UI and CFSE exact bases and separately declared rates before cash collection', () => {
    const i = selected(); i.wages[0].hourlyRateMinor = '1250'; i.timecards[0].entries = [entry('P', '2026-10-05T08:00:00-04:00', '2026-10-05T08:48:00-04:00')];
    i.tax!.employerContributions = [{ code: 'FUTA', basisPoints: 60, capMinor: '700000' }, { code: 'PR_UI', basisPoints: 275, capMinor: '700000' }, { code: 'CFSE', basisPoints: 137, capMinor: null }].map(p => ({ ...p, label: p.code, applicability: 'APPLICABLE', wagesBeforeMinor: '0', evidenceReference: 'Fictional declared program-specific actual rate/base' }));
    const r = ready(i); expect(r.row.employerContributions).toEqual(expect.arrayContaining([{ code: 'FUTA', label: 'FUTA', amountMinor: '6' }, { code: 'PR_UI', label: 'PR_UI', amountMinor: '28' }, { code: 'CFSE', label: 'CFSE', amountMinor: '14' }]));
  });
  it('clamps an authorized percentage deduction to remaining cash capacity and rounds once', () => {
    const i = selected(); i.wages[0].hourlyRateMinor = '1250'; i.timecards[0].entries = [entry('D', '2026-10-05T08:00:00-04:00', '2026-10-05T08:48:00-04:00')]; insurance(i, '5', '4');
    const r = ready(i); expect(r.row.employeeDeductions.find(d => d.code === 'INS')!.amountMinor).toBe('1'); expect(r.row.netMinor).toBe('919');
    i.deductions[0].deductedBeforeMinor = '5'; expect(ready(i).row.employeeDeductions.find(d => d.code === 'INS')!.amountMinor).toBe('0');
  });
  it('retains consent and insurance-match requirements even at an exhausted deduction cap', () => {
    const i = selected(); insurance(i, '0'); i.deductions[0].authorizationReference = '';
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DEDUCTION_AUTHORITY_REQUIRED' }] });
    i.deductions[0].authorizationReference = 'Fictional written election'; i.tax!.employerContributions = i.tax!.employerContributions.filter(p => p.code !== 'INSURANCE');
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'INSURANCE_EMPLOYER_MATCH_REQUIRED' }] });
  });
  it('assigns each midnight nanosecond once, to the start day, and preserves known sub-cent earnings even when cash is zero', () => {
    const i = selected(); i.timecards[0].entries = [entry('NS', '2026-10-05T23:59:59.999999999-04:00', '2026-10-06T00:00:00.000000001-04:00')];
    const c = classifyRecordedTime(i); expect(c.pieces.map(p => [p.date, (p.end - p.start).toString()])).toEqual([['2026-10-05', '2']]);
    const r = ready(i); expect(r.breakdown.regularNanoseconds).toBe('2'); expect(r.row.grossMinor).toBe('0'); expect(r.breakdown.earnings[0].exactAmount).toEqual({ numerator: '1', denominator: '1500000000' });
    expect(r.provenance.boundaryEvidence).toMatchObject({ dailyInterpretation: 'SHIFT_START_DAY', dailyInputDisposition: 'SHIFT_START_DAY_ALL_ENTRIES' });
  });
  it('starts a new civil daily accumulator at midnight and includes the whole first minute', () => {
    const i = selected(); i.timecards[0].entries = [entry('DAY1', '2026-10-05T16:00:00-04:00', '2026-10-06T00:00:00-04:00'), entry('DAY2', '2026-10-06T00:00:00-04:00', '2026-10-06T00:01:00-04:00')];
    const r = ready(i); expect(r.row.grossMinor).toBe('9620'); expect(r.breakdown.regularNanoseconds).toBe('28860000000000'); expect(r.breakdown.overtimeNanoseconds).toBe('0');
  });
  it('keeps one second across the 00:01 weekly boundary wholly in its start week (weekly overtime)', () => {
    const i = selected(); i.wages[0].workweekStartTime = '00:01'; i.wages[0].workweekPolicy = fictionalWorkweekPolicy('E1', { weekday: 1, startTime: '00:01', timeZone: 'America/Puerto_Rico' }, true);
    i.timecards[0].period = { startDate: '2026-09-22', endDate: '2026-10-12' };
    i.timecards[0].entries = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'].map(d => entry(d, d + 'T08:00:00-04:00', d + 'T16:00:00-04:00'));
    i.timecards[0].entries.push(entry('EDGE', '2026-10-05T00:00:59.500-04:00', '2026-10-05T00:01:00.500-04:00'));
    const r = ready(i); expect(r.breakdown.overtimeNanoseconds).toBe('1000000000'); expect(r.breakdown.regularNanoseconds).toBe('0');
    // 1 s at $12/h × 1.5 = 1/2 cent exact; the owner policy rounds the paycheck half up.
    expect(r.breakdown.earnings.map(e => e.exactAmount)).toEqual([{ numerator: '1', denominator: '2' }]); expect(r.row.grossMinor).toBe('1');
  });
  it('retains rest premiums on seventh and eighth worked civil days until a full day off', () => {
    const i = selected(); i.period = { startDate: '2026-10-05', endDate: '2026-10-18' }; i.timecards[0].period.endDate = '2026-10-18';
    i.timecards[0].entries = [5, 6, 7, 8, 9, 10, 11, 12, 14].map(d => entry('R' + d, `2026-10-${String(d).padStart(2, '0')}T12:00:00-04:00`, `2026-10-${String(d).padStart(2, '0')}T13:00:00-04:00`));
    const r = ready(i); expect(r.row.grossMinor).toBe('12000'); expect(r.breakdown.regularNanoseconds).toBe('25200000000000'); expect(r.breakdown.overtimeNanoseconds).toBe('7200000000000');
  });
  it.each(['not-owner-authorized', ''])('rejects an explicit malformed policy reference:%s', calculationPolicyReference => {
    const i = selected(); i.calculationPolicyReference = calculationPolicyReference;
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'OWNER_CALCULATION_POLICY_REQUIRED' }] });
  });
  it('does not select the provisional policy for an unbound fractional profile', () => {
    const i = selected(); delete (i as NativePayrollInput & { calculationPolicyReference?: string }).calculationPolicyReference;
    i.timecards[0].entries = [entry('LEGACY', '2026-10-05T08:00:00-04:00', '2026-10-05T08:00:01.5-04:00')];
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'WAGE_STRAIGHT_CENT_RULE_UNVERIFIED' }] });
  });
  it.each(['year', 'PR method', 'wage mode'] as const)('does not broaden the bounded policy applicability:%s', conflict => {
    const i = selected(); if (conflict === 'year') i.payday = '2027-01-01'; if (conflict === 'PR method') i.tax!.ruleEvidenceReference = 'unaccepted PR reference'; if (conflict === 'wage mode') i.wages[0].wageCentRounding = 'HALF_UP';
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'OWNER_CALCULATION_POLICY_REQUIRED' }] });
  });
  it.each([{ conflict: 'missing YTD', code: 'ATTESTED_YTD_REQUIRED' }, { conflict: 'unfinished time', code: 'FINALIZED_TIME_REQUIRED' }, { conflict: 'missing week', code: 'WORKWEEK_EVIDENCE_REQUIRED' }, { conflict: 'missing employer facts', code: 'EMPLOYER_COVERAGE_REQUIRED' }])('preserves $code for $conflict', ({ conflict, code }) => {
    const i = selected(); if (conflict === 'missing YTD') i.ytd = null; if (conflict === 'unfinished time') i.timecards[0].state = 'DRAFT'; if (conflict === 'missing week') delete i.wages[0].workweekPolicy; if (conflict === 'missing employer facts') i.tax!.employerCoverageAttested = false;
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code }] });
  });
  it.each([{ capMinor: '700001', basisPoints: 275, code: 'UNSUPPORTED_EMPLOYER_RULE' }, { capMinor: '700000', basisPoints: null, code: 'EMPLOYER_COVERAGE_REQUIRED' }])('does not replace an unsupported PR_UI cap/rate with an invented default:$code', v => {
    const i = selected(); const ui = i.tax!.employerContributions.find(p => p.code === 'PR_UI')!;
    Object.assign(ui, { applicability: 'APPLICABLE', capMinor: v.capMinor, basisPoints: v.basisPoints });
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: v.code }] });
  });
  it('keeps an unknown employer wage counter and negative paycheck blocked under the selected policy', () => {
    const i = selected(); Object.assign(i.tax!.employerContributions.find(p => p.code === 'CFSE')!, { applicability: 'APPLICABLE', basisPoints: 137 }); delete i.ytd!.employerWagesMinor.CFSE;
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'EMPLOYER_YTD_BASE_REQUIRED' }] });
    const zero = selected(); zero.timecards[0].entries = []; zero.tax!.certificate.additionalMinor = '100';
    expect(calculateNativePayroll(zero)).toMatchObject({ state: 'blocked', issues: [{ code: 'DEDUCTIONS_EXCEED_GROSS' }] });
  });
});
