import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NativeReview } from './native-review';
import { nativeCapabilities, nativeRun } from './native-ui-fixture.test-support';
import { readRuns } from './api';
import { payrollExceptionMessage } from './workflow-status';

const result = () => structuredClone(nativeRun().nativeCalculation!.employees[0]);
describe('saved native evidence presentation', () => {
  it('separates Puerto Rico withholding from literal fractional federal collection without calculating it', () => {
    const r = result();
    r.provenance.federalEmployeeTax.operations = [{ code: 'ADDITIONAL_MEDICARE', taxableMinor: '500', basisPoints: 90, exactAmount: { numerator: '9', denominator: '2' }, collectedMinor: '5', roundingDifference: { numerator: '1', denominator: '2' }, ruleId: '26_CFR_31_3102_1_D' }];
    const html = renderToStaticMarkup(<NativeReview result={r} />);
    expect(html).toContain('Puerto Rico withholding');
    expect(html).toContain('Federal employee tax collection');
    expect(html).toContain('9 / 2'); expect(html).toContain('1 / 2'); expect(html).toContain('$0.05');
    expect(html).toContain('SHIFT_START_DAY'); expect(html).toContain('counts wholly on the business day');
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
    ['DAILY_BOUNDARY_SENSITIVE:E1', /00:00.*00:01.*unresolved/],
    ['WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED:E1', /context/],
    ['EMPLOYER_YTD_BASE_CONFLICT:FUTA', /opening.*basis/],
  ])('provides a truthful next step for %s', (code, message) => expect(payrollExceptionMessage(code)).toMatch(message));
});

it('preserves a supported fractional hourly rate in review without cent-rounding the wage',()=>{
 const run=nativeRun(); const r=run.nativeCalculation!.employees[0];r.breakdown.earnings[0].rateMinorPerHour='2500.1234';
 expect(readRuns({version:'PAYROLL_API_V1',capabilities:nativeCapabilities,runs:[run],jobs:[]}).runs[0].nativeCalculation!.employees[0].breakdown.earnings[0].rateMinorPerHour).toBe('2500.1234');
 expect(renderToStaticMarkup(<NativeReview result={r}/>)).toContain('$25.001234');
});
