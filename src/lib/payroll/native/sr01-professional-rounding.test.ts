import { describe, expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../notifications/types';
import type { Source } from '../service';
import { newRun } from '../service';
import { hash, statement } from '../store';
import { input, entry } from './fixtures.test-support';
import { nativeDocumentFixture } from './document-fixtures.test-support';
import type { RecordedSourceCapture, RecordedSourceRequest } from './recorded-source.server';

vi.mock('server-only', () => ({}));
// Database execution is forbidden in this bounded task. Substitute only the
// recorded-source transport; exercise the actual native capture/acceptance code.
vi.mock('./recorded-source.server', () => ({
  buildRecordedSourceCapture: (request: RecordedSourceRequest) => ({ text: 'SR01_UNIT_CAPTURE', values: [request] }),
  projectRecordedSourceCapture: (_request: RecordedSourceRequest, value: RecordedSourceCapture) => value,
}));
import { captureNativePayroll } from './source.server';
import { nativeLedgerStatements } from './ledger.server';
import { nativeEmployeePresentation } from './document-mapping';
import { calculateNativePayroll } from './calculate';

const reference = 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014';
function scenario(mode: 'HALF_UP' | 'UNVERIFIED' | 'TRUNCATE' = 'HALF_UP', evidence: string | null = reference) {
  const i = input();
  i.period = { startDate: '2026-09-01', endDate: '2026-09-30' };
  i.payday = '2026-10-05'; i.frequency = 'MONTHLY';
  i.wages[0].hourlyRateMinor = '27500'; i.wages[0].wageCentRounding = 'UNVERIFIED';
  i.tax!.prCentRounding = mode; i.tax!.ruleEvidenceReference = evidence;
  i.tax!.certificate.deductionAllowances = 9;
  i.timecards[0].period = { startDate: '2026-08-24', endDate: '2026-10-05' };
  i.timecards[0].entries = [entry('SR01-RECORDED', '2026-09-14T08:00:00-04:00', '2026-09-14T16:00:00-04:00')];
  const settings = structuredClone(nativeDocumentFixture().snapshot.settings);
  settings.preferences.schedule = { frequency: 'MONTHLY', anchorDate: '2026-01-01', paydayOffsetDays: 5 };
  const source: Source = {
    roster: [{ employeeId: 'E1', name: 'Fictional SR01 employee', active: true, locationId: 'L1' }],
    timecards: { cards: [] }, settings: [settings], exceptions: [], population: null,
  };
  source.population = { operationId: '44444444-4444-4444-8444-444444444444', revision: 1, period: i.period, members: [{ employeeId: 'E1', disposition: 'INCLUDE', reason: 'Fictional reviewed inclusion', employmentFacts: 'Fictional active standard employee; no real company attestation', employmentBasis: 'MANAGER_ATTESTED' }], sourceHash: hash({ roster: source.roster, timecards: source.timecards }) };
  const configuration = { schema: 'NEVORA_NATIVE_CONFIGURATION_V1', employeeId: 'E1', revision: 1, wages: i.wages, tax: i.tax, deductions: i.deductions };
  const database = { timeZone: 'America/Puerto_Rico', profiles: [configuration], openings: [{ employeeId: 'E1', revision: 1, ytd: i.ytd }], ledger: [], coverage: [{ employeeId: 'E1', ...i.timecards[0].period }] };
  const capturedEntries: Extract<RecordedSourceCapture, { state: 'ready' }>['entries'] = i.timecards[0].entries.map(e => ({
    ...e, logicalId: e.id, locationName: 'Fictional location', positionId: null, positionName: null,
    rawStartAt: e.startAt, rawEndAt: e.endAt, breaks: [],
  }));
  const coveredPeriods = [
    { startDate: '2026-08-24', endDate: '2026-08-31' },
    i.period,
    { startDate: '2026-10-01', endDate: '2026-10-05' },
  ];
  const capture: Extract<RecordedSourceCapture, { state: 'ready' }> = {
    state: 'ready', workspaceId: '11111111-1111-4111-8111-111111111111', employeeId: 'E1', timeZone: 'America/Puerto_Rico', period: i.period,
    contexts: [{ startAt: '2026-08-24T04:00:00Z', endAt: '2026-10-06T04:00:00Z' }], supersededCoverage: [],
    lineage: { requests: [], adjustments: [], events: [], locations: [{ id: 'L1', workspaceId: '11111111-1111-4111-8111-111111111111' }] },
    locationIds: ['L1'], emptyFinalizedCoverage: [coveredPeriods[0], coveredPeriods[2]], sourceFence: 'd'.repeat(64),
    coverage: coveredPeriods.map((period, index) => {
      const snapshot = { ...period, employeeId: 'E1', employeeName: 'Fictional SR01 employee', timeZone: 'America/Puerto_Rico', pendingCorrections: 0,
        entries: capturedEntries.filter(e => e.startAt.slice(0, 10) >= period.startDate && e.startAt.slice(0, 10) <= period.endDate), corrections: [] };
      return { ...period, revision: 2, operationId: `22222222-2222-4222-8222-22222222222${index}`, sourceHash: hash(snapshot), currentSourceHash: hash(snapshot), snapshot };
    }),
    entries: capturedEntries,
  };
  const built: SqlStatement[][] = [];
  const ex: SqlExecutor = {
    query: async () => { throw Error('Unexpected direct database query'); },
    transaction: async statements => {
      built.push([...statements]);
      return statements.map(s => s.text.includes(' AS profiles') ? [database] : s.text === 'SR01_UNIT_CAPTURE' ? [capture] : []);
    },
  };
  const run = newRun('33333333-3333-4333-8333-333333333333', i.period, i.payday);
  const seed = { id: '11111111-1111-4111-8111-111111111111', source, observed: hash(source) };
  return { i, configuration, database, capture, source, ex, built, run, seed };
}

describe('SR01 scoped accountant-confirmed final periodic collection', () => {
  it('captures an explicitly selected provisional wage/tax policy and reconciles its21-cent paycheck through snapshot/ledger/document projections', async () => {
    const s = scenario();
    Object.assign(s.configuration, { calculationPolicyReference: 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014' });
    s.i.wages[0].hourlyRateMinor = '1250'; s.capture.entries[0].endAt = s.capture.entries[0].rawEndAt = '2026-09-14T08:01:00-04:00';
    for (const c of s.capture.coverage) c.sourceHash = c.currentSourceHash = hash(c.snapshot);
    const before = structuredClone(s.configuration);
    const c = await captureNativePayroll(s.seed, s.run, s.ex, [statement('SR01_UNIT_PERMISSION_FENCE')]);
    expect(c.run.status).toBe('REVIEW_REQUIRED'); expect(c.run.exceptions).toEqual([]);
    expect(c.run.rows![0]).toMatchObject({ grossMinor: '21', netMinor: '20' });
    expect(c.snapshot!.native!.ruleEvidence).toMatchObject({ status: 'FEDERAL_EMPLOYEE_STATUTORY_OWNER_ATTESTED_PR_AND_PROVISIONAL_OTHER_OPERATIONS', policyEmployeeIds: ['E1'], policyKind: 'OWNER_AUTHORIZED_PROVISIONAL_POLICY' });
    expect(c.run.nativeCalculation!.employees[0].provenance).toMatchObject({ rounding: 'OWNER_PROVISIONAL_PAYCHECK_ALLOCATION', taxRounding: 'HALF_UP', calculationPolicy: { kind: 'OWNER_AUTHORIZED_PROVISIONAL_POLICY' } });
    expect(c.snapshot!.native!.facts.inputs[0]).toMatchObject({ calculationPolicyReference: 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014' });
    expect(s.configuration).toEqual(before);
    const approved = { ...c.run, status: 'APPROVED' as const, revision: 2, approvedBy: 'FICTIONAL_OWNER', approvedAt: '2026-10-05T12:00:00Z' };
    expect(JSON.parse(String(nativeLedgerStatements(approved, c.snapshot!)[0].values.at(-1))).result).toEqual(c.run.nativeCalculation!.employees[0]);
    const presentation = nativeEmployeePresentation(approved, c.snapshot!, 'E1');
    expect(presentation.totals.gross).toEqual({ currentMinor: '21', ytdMinor: '21' }); expect(presentation.totals.net).toEqual({ currentMinor: '20', ytdMinor: '20' });
  });
  it('keeps an unrecognized provisional profile reference blocked without falling back to legacy exact cash', async () => {
    const s = scenario(); Object.assign(s.configuration, { calculationPolicyReference: 'unaccepted owner reference' });
    const c = await captureNativePayroll(s.seed, s.run, s.ex, []);
    expect(c.run.status).toBe('BLOCKED'); expect(c.snapshot).toBeNull(); expect(c.run.rows).toBeNull();
  });
  it('prepares the professionally bound monthly half-cent and preserves its cash/provenance through pure document/ledger projections', async () => {
    const s = scenario(); const before = structuredClone(s.configuration);
    const c = await captureNativePayroll(s.seed, s.run, s.ex, [statement('SR01_UNIT_PERMISSION_FENCE')]);
    expect(c.run.exceptions).toEqual([]); expect(c.run.status).toBe('REVIEW_REQUIRED');
    expect(c.run.rows?.[0]).toMatchObject({ grossMinor: '220000', netMinor: '197018', employeeDeductions: expect.arrayContaining([{ code: 'PR_INCOME_TAX', label: 'PR INCOME TAX', amountMinor: '5492' }]) });
    const employee = c.run.nativeCalculation!.employees[0];
    expect(employee.provenance).toMatchObject({ rounding: 'EXACT_CENT_NO_ROUNDING_REQUIRED', taxRounding: 'HALF_UP' });
    const raw = employee.breakdown.taxes.find(t => t.code === 'PR_INCOME_TAX')!.exactAmount!;
    expect(BigInt(raw.numerator) * BigInt(2)).toBe(BigInt(10983) * BigInt(raw.denominator));
    expect(c.snapshot!.native!.ruleEvidence).toMatchObject({
      status: 'FEDERAL_EMPLOYEE_STATUTORY_AND_OWNER_ATTESTED_PR_CENTS_OTHER_OPERATIONS_EXACT',
      prIncomeRuleId: reference, prIncomeEvidenceKind: 'OWNER_ATTESTED_ACCOUNTANT_GUIDANCE', prIncomeEmployeeIds: ['E1'],
    });
    expect(c.snapshot!.native!.facts.inputs[0].tax).toMatchObject({ prCentRounding: 'HALF_UP', ruleEvidenceReference: reference });
    expect(c.snapshot!.native!.facts.inputs[0].wages[0].wageCentRounding).toBe('UNVERIFIED');
    expect(s.configuration).toEqual(before);
    expect(s.built).toHaveLength(2); expect(s.built.every(statements => statements.filter(q => q.text === 'SR01_UNIT_PERMISSION_FENCE').length === 2)).toBe(true);
    // This is a synthetic pure projection, not a database/human approval event.
    const approved = { ...c.run, status: 'APPROVED' as const, revision: 2, approvedBy: 'FICTIONAL_OWNER', approvedAt: '2026-10-05T12:00:00Z' };
    const inserts = nativeLedgerStatements(approved, c.snapshot!);
    expect(inserts).toHaveLength(1);
    expect(JSON.parse(String(inserts[0].values.at(-1))).result).toEqual(employee);
    const presentation = nativeEmployeePresentation(approved, c.snapshot!, 'E1');
    expect(presentation.taxes.find(t => t.label.includes('Puerto Rico'))!.amount).toEqual({ currentMinor: '5492', ytdMinor: '5492' });
    expect(presentation.totals.net).toEqual({ currentMinor: '197018', ytdMinor: '197018' });
    expect(presentation.totals.gross).toEqual({ currentMinor: '220000', ytdMinor: '220000' });
  });

  it.each([['HALF_UP', 'unaccepted other reference'], ['TRUNCATE', reference]] as const)('keeps %s with %s blocked at actual capture', async (mode, evidence) => {
    const s = scenario(mode, evidence); const c = await captureNativePayroll(s.seed, s.run, s.ex, []);
    expect(c.run.status).toBe('BLOCKED'); expect(c.run.rows).toBeNull(); expect(c.snapshot).toBeNull();
    expect(c.run.exceptions).toContain('ROUNDING_POLICY_ACCEPTANCE_REQUIRED:E1');
  });

  it('keeps an unverified fractional monthly input blocked without applying the new policy implicitly', async () => {
    const s = scenario('UNVERIFIED', null); const c = await captureNativePayroll(s.seed, s.run, s.ex, []);
    expect(c.run.status).toBe('BLOCKED'); expect(c.snapshot).toBeNull();
    expect(c.run.exceptions).toContain('PR_BASE_PERCENTAGE_CENT_RULE_UNVERIFIED:E1');
  });

  it('retains existing exact PR evidence when no professional mode is selected', async () => {
    const s = scenario('UNVERIFIED', null); s.i.tax!.certificate.deductionAllowances = 0;
    s.i.wages[0].hourlyRateMinor = '2500'; s.capture.entries[0].endAt = '2026-09-14T16:00:00-04:00';
    const c = await captureNativePayroll(s.seed, s.run, s.ex, []);
    expect(c.run.status).toBe('REVIEW_REQUIRED');
    expect(c.snapshot!.native!.ruleEvidence.status).toBe('FEDERAL_EMPLOYEE_STATUTORY_CENTS_OTHER_OPERATIONS_EXACT');
    expect(c.run.nativeCalculation!.employees[0].provenance.taxRounding).toBe('EXACT_CENT_NO_ROUNDING_REQUIRED');
  });

  it('does not accept a wage-rounding policy together with the scoped PR method', async () => {
    const s = scenario(); s.i.wages[0].wageCentRounding = 'HALF_UP';
    const c = await captureNativePayroll(s.seed, s.run, s.ex, []);
    expect(c.run.status).toBe('BLOCKED'); expect(c.snapshot).toBeNull();
    expect(c.run.exceptions).toContain('ROUNDING_POLICY_ACCEPTANCE_REQUIRED:E1');
  });

  const unresolvedControls: { code: string; change: (i: ReturnType<typeof scenario>['i']) => void }[] = [
    { code: 'WAGE_STRAIGHT_CENT_RULE_UNVERIFIED', change: i => { i.wages[0].hourlyRateMinor = '1250'; i.timecards[0].entries = [entry('WAGE-F', '2026-09-14T12:00:00-04:00', '2026-09-14T12:01:00-04:00')]; } },
    { code: 'EMPLOYER_FICA_MEDICARE_CENT_RULE_UNVERIFIED', change: i => { i.wages[0].hourlyRateMinor = '1250'; i.timecards[0].entries = [entry('MED-F', '2026-09-14T12:00:00-04:00', '2026-09-14T12:24:00-04:00')]; } },
    { code: 'SINOT_EMPLOYEE_CENT_RULE_UNVERIFIED', change: i => { i.wages[0].hourlyRateMinor = '2500'; i.ytd!.grossMinor = '900000'; i.ytd!.netMinor = '900000'; i.ytd!.sinotWagesMinor = '899995'; i.ytd!.locationIds = ['L1']; } },
    { code: 'EMPLOYER_ASSESSMENT_CENT_RULE_UNVERIFIED', change: i => { i.wages[0].hourlyRateMinor = '2500'; i.timecards[0].entries = [entry('EMP-F', '2026-09-14T08:00:00-04:00', '2026-09-14T08:48:00-04:00')]; i.ytd!.employerWagesMinor.INSURANCE = '0'; i.tax!.employerContributions.push({ code: 'INSURANCE', label: 'Fictional assessment', applicability: 'APPLICABLE', basisPoints: 1, capMinor: null, wagesBeforeMinor: '0', evidenceReference: 'Fictional assigned assessment' }); } },
    { code: 'AUTHORIZED_DEDUCTION_CENT_RULE_UNVERIFIED', change: i => { i.wages[0].hourlyRateMinor = '2500'; i.timecards[0].entries = [entry('DED-F', '2026-09-14T08:00:00-04:00', '2026-09-14T08:48:00-04:00')]; i.ytd!.employerWagesMinor.INSURANCE = '0'; i.tax!.employerContributions.push({ code: 'INSURANCE', label: 'Fictional assessment', applicability: 'APPLICABLE', basisPoints: 100, capMinor: null, wagesBeforeMinor: '0', evidenceReference: 'Fictional assigned assessment' }); i.deductions = [{ id: 'D1', revision: 1, code: 'INS', label: 'Fictional written insurance', effectiveFrom: '2026-01-01', effectiveTo: null, method: 'PERCENTAGE', amountMinor: null, basisPoints: 1, capMinor: '0', deductedBeforeMinor: '0', authorization: 'WRITTEN_POST_TAX', authorizationReference: 'Fictional written election', revoked: false, legalBasis: 'PR_LAW_17_5_G', complianceReference: 'Fictional declared matching coverage', employerContributionCode: 'INSURANCE' }]; } },
    { code: 'DEDUCTIONS_EXCEED_GROSS', change: i => { i.timecards[0].entries = []; i.tax!.certificate.additionalMinor = '100'; } },
  ];
  it.each(unresolvedControls)('preserves $code after selecting the SR01 method', ({ code, change }) => {
    const s = scenario(); change(s.i);
    expect(calculateNativePayroll(s.i)).toMatchObject({ state: 'blocked', issues: [{ code }] });
    expect(s.i.wages[0].wageCentRounding).toBe('UNVERIFIED');
  });
  it('no longer blocks a midnight-crossing entry on the daily boundary (shift-start-day rule)', () => {
    const s = scenario(); s.i.timecards[0].entries = [entry('MID-F', '2026-09-14T23:59:59.500-04:00', '2026-09-15T00:00:00.500-04:00')];
    const r = calculateNativePayroll(s.i);
    expect(r.state === 'blocked' ? r.issues.map(i => i.code) : []).not.toContain('DAILY_BOUNDARY_SENSITIVE');
  });
});
