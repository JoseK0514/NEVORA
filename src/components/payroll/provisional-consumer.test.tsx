import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { approvedHistory } from '@/lib/payroll/native/provisional-history.test-support';
import { buildNativeRunCandidate, type NativePreparationFacts } from '@/lib/payroll/native/preparation';
import { entry } from '@/lib/payroll/native/fixtures.test-support';
import { readRuns } from './api';
import { NativeReview } from './native-review';
import { nativeCapabilities } from './native-ui-fixture.test-support';

function prepared(selected = true) {
  const facts: NativePreparationFacts = structuredClone(approvedHistory.snapshot.native.facts);
  if (selected) for (const i of facts.inputs) {
    if (!i.tax) throw Error('Incomplete fictional tax fixture');
    i.calculationPolicyReference = 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014';
    i.tax.prCentRounding = 'HALF_UP'; i.tax.ruleEvidenceReference = 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014';
    i.timecards[0].entries = [entry('FIRST-MINUTE', '2026-10-05T00:00:00-04:00', '2026-10-05T00:01:00-04:00')];
  }
  const run = buildNativeRunCandidate(approvedHistory.run, facts);
  const employee = run.nativeCalculation?.employees[0];
  if (run.status !== 'REVIEW_REQUIRED' || !employee) throw Error('Blocked real preparation fixture');
  return { run, employee };
}
const envelope = (runs: ReturnType<typeof prepared>['run'][]) => ({ version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs, jobs: [] });

describe('real provisional producer to payroll client/review consumers', () => {
  it('reads a complete mixed run response containing an actually prepared first-minute policy result', () => {
    const legacy = prepared(false), selected = prepared();
    const response = readRuns(envelope([legacy.run, selected.run]));
    expect(response.runs).toHaveLength(2); expect(response.runs[1].rows?.[0]).toMatchObject({ grossMinor: '42', netMinor: '38' });
    expect(response.runs[1].nativeCalculation?.employees[0].provenance.calculationPolicy?.kind).toBe('OWNER_AUTHORIZED_PROVISIONAL_POLICY');
  });
  it('shows the saved provisional identity and avoids denying actual first-minute recorded time', () => {
    const { employee } = prepared(); const policy = employee.provenance.calculationPolicy;
    if (!policy) throw Error('Policy provenance missing from real preparation');
    const html = renderToStaticMarkup(<NativeReview result={employee} />);
    expect(html).toContain(policy.id); expect(html.toLowerCase()).toContain('provisional');
    expect(html).not.toContain('no entries intersecting'); expect(html).not.toContain('invariant under the two retained daily models');
    const legacy = renderToStaticMarkup(<NativeReview result={prepared(false).employee} />);
    // Since 2026-10-25 every new result uses the shift-start-day rule, with or without the policy.
    expect(legacy).toContain('counts wholly on the business day'); expect(legacy).not.toContain('two retained daily models'); expect(legacy).not.toContain(policy.id);
  });
  it.each(['missing policy', 'unknown id', 'false kind', 'broken hash', 'conflicting daily assessment', 'missing boundary', 'zero denominator', 'invalid operation cash', 'missing operations'] as const)('rejects malformed/coherence-breaking evidence:%s', malformed => {
    const { run, employee } = prepared(); const p = employee.provenance, policy = p.calculationPolicy;
    if (!policy) throw Error('Missing real policy fixture');
    if (malformed === 'missing policy') delete p.calculationPolicy;
    if (malformed === 'unknown id') policy.id = 'unaccepted owner record';
    if (malformed === 'false kind') Object.assign(policy, { kind: 'STATUTORY_VERIFIED' });
    if (malformed === 'broken hash') policy.sha256 = 'broken';
    if (malformed === 'conflicting daily assessment') p.boundaryEvidence.dailyInputDisposition = 'INVARIANT_NO_FIRST_MINUTE_ENTRIES';
    if (malformed === 'missing boundary') Reflect.deleteProperty(p, 'boundaryEvidence');
    if (malformed === 'zero denominator') policy.operations[0].exactAmount.denominator = '0';
    if (malformed === 'invalid operation cash') policy.operations[0].amountMinor = '-1';
    if (malformed === 'missing operations') Object.assign(policy, { operations: null });
    expect(() => readRuns(envelope([run]))).toThrow('payroll revision could not be read');
  });
});
