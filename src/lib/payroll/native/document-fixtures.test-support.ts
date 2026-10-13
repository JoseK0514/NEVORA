import { newRun, type Snapshot } from '../service';
import { buildNativeRunCandidate, type NativePreparationFacts } from './preparation';
import { input, entry } from './fixtures.test-support';
import { NATIVE_CALCULATOR_VERSION } from './calculate';
export function nativeDocumentFixture() {
    const i = input();
    i.wages[0].hourlyRateMinor = '2500';
    i.wages[0].wageCentRounding = 'UNVERIFIED';
    i.tax!.prCentRounding = 'UNVERIFIED';
    i.tax!.ruleEvidenceReference = null;
    i.timecards[0].entries = [5, 6, 7, 8, 9].map(d => entry('DOC' + d, `2026-10-0${d}T08:00:00-04:00`, `2026-10-0${d}T16:00:00-04:00`));
    const facts: NativePreparationFacts = { inputs: [i], population: [{ employeeId: 'E1', name: 'Ángel Vélez', disposition: 'INCLUDE' }], sourceFingerprint: 'c'.repeat(64), ruleRevision: 1, rulesVerified: true, employeeLocations: { E1: ['L1'] }, unknownCoverageEmployeeIds: [] };
    const run = { ...buildNativeRunCandidate(newRun('11111111-1111-4111-8111-111111111111', i.period, i.payday), facts), status: 'APPROVED' as const, revision: 2, approvedBy: 'OWNER', approvedAt: '2026-10-17T12:00:00Z' };
    const settings: Snapshot['settings'] = { revision: 1, effectiveFrom: '2026-01-01', reason: 'Fictional company', actorId: 'OWNER', createdAt: '2026-01-01T00:00:00Z', preferences: { companyName: 'Compañía Ficticia', language: 'es', currency: 'USD', schedule: { frequency: 'WEEKLY', anchorDate: '2026-01-05', paydayOffsetDays: 5 }, rules: [], automation: { prepare: true, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null } };
    const snapshot: Snapshot = { source: { roster: [{ employeeId: 'E1', name: 'Ángel Vélez', active: true, locationId: 'L1' }], timecards: { cards: [] }, population: null, settings: [settings], exceptions: [] }, settings, exceptions: [], amounts: { schema: 'NEVORA_PAYROLL_IMPORT_V1', currency: 'USD', sourceName: run.sourceName!, sourceReference: run.sourceReference!, period: run.period, payday: run.payday, rows: run.rows!.map(({ employeeName: _name, ...row }) => row) }, native: { version: 'NATIVE_SNAPSHOT_V1', facts, employeeCoverage: { E1: { complete: true, locationIds: ['L1'] } }, originalRunId: run.id, calculationVersion: NATIVE_CALCULATOR_VERSION, ruleEvidence: { status: 'EXACT_CENT_NO_ROUNDING_REQUIRED', assessmentSha256: 'a'.repeat(64) } } };
    return { run, snapshot };
}
