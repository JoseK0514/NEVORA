import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NativeReview } from './native-review';
import { nativeCapabilities, nativeRun } from './native-ui-fixture.test-support';
import { readRuns } from './api';
import { payrollExceptionMessage } from './workflow-status';
import type { PayrollRun } from '@/lib/payroll/contracts';
import { OWNER_PROVISIONAL_POLICY_REFERENCE } from '@/lib/payroll/native/contracts';
import { OWNER_PAYROLL_POLICY_RECORD_SHA256, SHIFT_START_DAY_EVIDENCE, SUPERSEDED_OWNER_CIVIL_MIDNIGHT_EVIDENCE, SUPERSEDED_UNRESOLVED_INVARIANT_EVIDENCE } from '@/lib/payroll/native/daily-attribution';
import { approvedHistory } from '@/lib/payroll/native/provisional-history.test-support';

const result = () => structuredClone(nativeRun().nativeCalculation!.employees[0]);
describe('saved native evidence presentation', () => {
  it('separates Puerto Rico withholding from literal fractional federal collection without calculating it', () => {
    const r = result();
    r.provenance.federalEmployeeTax.operations = [{ code: 'ADDITIONAL_MEDICARE', taxableMinor: '500', basisPoints: 90, exactAmount: { numerator: '9', denominator: '2' }, collectedMinor: '5', roundingDifference: { numerator: '1', denominator: '2' }, ruleId: '26_CFR_31_3102_1_D' }];
    const html = renderToStaticMarkup(<NativeReview result={r} />);
    expect(html).toContain('Puerto Rico withholding');
    expect(html).toContain('Federal employee tax collection');
    expect(html).toContain('9 / 2'); expect(html).toContain('1 / 2'); expect(html).toContain('$0.05');
    expect(html).toContain('OWNER_AUTHORIZED_SHIFT_START_DAY'); expect(html).toContain('counts on the day it starts');
    expect(html).not.toContain('Daily precision remains unresolved');
  });
  it('reads back a stored pre-change approved run with its saved unresolved/invariant daily evidence', () => {
    const run = structuredClone(approvedHistory.run) as unknown as PayrollRun;
    const read = readRuns({ version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [run], jobs: [] }).runs[0];
    const saved = read.nativeCalculation!.employees[0];
    expect(saved.provenance.boundaryEvidence).toMatchObject({ dailyInterpretation: 'UNRESOLVED', dailyInputDisposition: 'INVARIANT_NO_FIRST_MINUTE_ENTRIES' });
    const html = renderToStaticMarkup(<NativeReview result={saved} />);
    expect(html).toContain('Daily precision remains unresolved'); expect(html).not.toContain('counts on the day it starts');
  });
  it.each([
    ['current daily evidence with the owner policy record', 'shift', 'current', true],
    ['current daily evidence with the superseded owner policy record', 'shift', 'superseded', false],
    ['superseded owner daily evidence with its own superseded policy record', 'civil', 'superseded', true],
    ['superseded owner daily evidence with the current policy record', 'civil', 'current', false],
    ['superseded non-policy daily evidence on an owner policy result', 'unresolved', 'current', false],
  ] as const)('pairs saved owner daily evidence with its policy record: %s', (_label, daily, record, accepted) => {
    const run = nativeRun(); const p = run.nativeCalculation!.employees[0].provenance;
    p.calculationPolicy = { id: OWNER_PROVISIONAL_POLICY_REFERENCE, kind: 'OWNER_AUTHORIZED_PROVISIONAL_POLICY', sha256: record === 'current' ? OWNER_PAYROLL_POLICY_RECORD_SHA256.shiftStartDay : OWNER_PAYROLL_POLICY_RECORD_SHA256.civilMidnight, operations: [{ operation: 'WAGE_PAYCHECK', reference: null, stage: 'HALF_UP', exactAmount: { numerator: '16000', denominator: '1' }, amountMinor: '16000', differenceMinor: { numerator: '0', denominator: '1' } }] };
    Object.assign(p, { rounding: 'OWNER_PROVISIONAL_PAYCHECK_ALLOCATION', taxRounding: 'HALF_UP' });
    Object.assign(p.boundaryEvidence, structuredClone({ shift: SHIFT_START_DAY_EVIDENCE, civil: SUPERSEDED_OWNER_CIVIL_MIDNIGHT_EVIDENCE, unresolved: SUPERSEDED_UNRESOLVED_INVARIANT_EVIDENCE }[daily]));
    const read = () => readRuns({ version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [run], jobs: [] });
    if (accepted) expect(read().runs).toHaveLength(1); else expect(read).toThrow();
  });
  it('rejects superseded owner daily evidence on a result without the owner policy', () => {
    const run = nativeRun(); Object.assign(run.nativeCalculation!.employees[0].provenance.boundaryEvidence, structuredClone(SUPERSEDED_OWNER_CIVIL_MIDNIGHT_EVIDENCE));
    expect(() => readRuns({ version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [run], jobs: [] })).toThrow();
  });
  it('does not invent a federal trace for historical results', () => {
    const r = result(); Reflect.deleteProperty(r.provenance, 'federalEmployeeTax'); Reflect.deleteProperty(r.provenance, 'boundaryEvidence');
    const html = renderToStaticMarkup(<NativeReview result={r} />);
    expect(html).not.toContain('Federal employee tax collection');
    expect(html).not.toContain('Workweek evidence');
  });
  it('rejects a malformed present federal or boundary trace before private rendering', () => {
    const run = nativeRun(); const envelope = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [run], jobs: [] };
    const r = run.nativeCalculation!.employees[0];
    Reflect.set(r.provenance.federalEmployeeTax.operations[0].exactAmount, 'denominator', '0');
    expect(() => readRuns(envelope)).toThrow();
    r.provenance.federalEmployeeTax.operations[0].exactAmount.denominator = '1';
    Reflect.set(r.provenance.boundaryEvidence, 'dailyInterpretation', 'ACCEPTED');
    expect(() => readRuns(envelope)).toThrow();
  });
  it.each([
    ['WORKWEEK_EVIDENCE_REQUIRED:E1', /Owner.*workweek/],
    ['DAILY_BOUNDARY_SENSITIVE:E1', /older rule.*midnight.*day they start.*Recalculate/],
    ['WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED:E1', /context/],
    ['EMPLOYER_YTD_BASE_CONFLICT:FUTA', /opening.*basis/],
  ])('provides a truthful next step for %s', (code, message) => expect(payrollExceptionMessage(code)).toMatch(message));
});

it('preserves a supported fractional hourly rate in review without cent-rounding the wage',()=>{
 const run=nativeRun(); const r=run.nativeCalculation!.employees[0];r.breakdown.earnings[0].rateMinorPerHour='2500.1234';
 expect(readRuns({version:'PAYROLL_API_V1',capabilities:nativeCapabilities,runs:[run],jobs:[]}).runs[0].nativeCalculation!.employees[0].breakdown.earnings[0].rateMinorPerHour).toBe('2500.1234');
 expect(renderToStaticMarkup(<NativeReview result={r}/>)).toContain('$25.001234');
});
