import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { readTimecards, mutateTimecard } from '../../lib/timecards/service';
import { submitTimeCorrection, reviewTimeCorrection } from '../../lib/time-corrections/service';
import { readPeriodClose, savePeriodPopulation } from '../../lib/period-close/service';
import { saveNativeProfile } from '../../lib/payroll/native/profiles.server';
import { input } from '../../lib/payroll/native/fixtures.test-support';
import { fictionalWorkweekPolicy } from '../../lib/payroll/native/workweek-fixtures.test-support';
import { newRun, saveSettings, source, command, readRun, runs } from '../../lib/payroll/service';
import { captureNativePayroll, nativeDatabaseFactsQuery, nativeSourceRequest } from '../../lib/payroll/native/source.server';
import { buildRecordedSourceCapture, projectRecordedSourceCapture } from '../../lib/payroll/native/recorded-source.server';
import { authority } from '../../lib/payroll/store';
import { workerOnce } from '../../lib/payroll/worker';
import { document } from '../../lib/payroll/access';
import type { Period } from '../../lib/timecards/project';
import type { SessionMutationProof } from '../../lib/shift-changes/types';

const employeeId = 'AS_POLICY', period = { startDate: '2026-09-28', endDate: '2026-10-04' }, payday = '2026-10-13';
const oldPeriod = { startDate: '2026-09-08', endDate: '2026-09-28' }, covering = { startDate: '2026-09-15', endDate: '2026-10-05' };
const owner: SessionMutationProof = { sessionTokenHash: 'a'.repeat(64), employee: { id: 'c34-owner', role: 'OWNER', firstName: 'Owner', lastName: 'QA', primaryLocationId: 'loc-1' } };
let f: Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async () => { process.env.NEVORA_PAYROLL_ENABLED = 'true'; f = await createPunchFixture(); await f.q(await readFile('db/migrations/0031_native_payroll.sql', 'utf8')); await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('AS_POLICY','Fictional','Policy','558','EMPLOYEE','loc-1')"); });
afterEach(async () => { await f?.db.dispose(); delete process.env.NEVORA_PAYROLL_ENABLED; });
async function timeAction(action: 'APPROVE' | 'FINALIZE' | 'REOPEN', p: Period) {
    const read = await readTimecards(owner, p, f.db.executor); if (read.state !== 'ready') throw Error('Time unavailable');
    const card = read.cards.find(c => c.source.employeeId === employeeId)!;
    const result = await mutateTimecard(owner, { operationId: randomUUID(), employeeId, ...p, action, expectedRevision: card.revision, expectedSourceHash: card.sourceHash, ...(action === 'REOPEN' ? { note: 'Fictional replacement-context review' } : {}) }, f.db.executor);
    expect(result.status).toBe(action === 'APPROVE' ? 'approved' : action === 'FINALIZE' ? 'finalized' : 'reopened');
}
async function finalize(p: Period) { await timeAction('APPROVE', p); await timeAction('FINALIZE', p); }
async function setup(mode: 'FINALIZE' | 'APPROVE' | 'MISSING' | 'PARTIAL' = 'FINALIZE', historicalLocation = false, correctedContext = false, reverseRejected = false) {
    await saveSettings(owner, { action: 'SAVE_SETTINGS', operationId: randomUUID(), expectedRevision: 0, effectiveFrom: '2026-01-01', reason: 'Fictional replacement-context facts', preferences: { companyName: 'Fictional replacement company', language: 'en', currency: 'USD', schedule: { frequency: 'WEEKLY', anchorDate: period.startDate, paydayOffsetDays: 9 }, rules: [], automation: { prepare: true, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null } }, f.db.executor);
    for (const [id, day] of [['r2-current', '2026-09-23'], ['cap-policy-oct1', '2026-10-01']]) await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',1)", [id, employeeId, f.devices[0].device.id, day + 'T12:00:00Z', day + 'T20:00:00Z']);
    if (historicalLocation) await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('historical-loc2',$1,'loc-2',$2,'2026-09-10T12:00:00Z','2026-09-10T20:00:00Z','CLOCKED_OUT',1)", [employeeId, f.devices[2].device.id]);
    const historicalPeriod = reverseRejected ? { ...oldPeriod, endDate: period.endDate } : oldPeriod;
    await finalize(historicalPeriod); await timeAction('REOPEN', historicalPeriod);
    if (correctedContext) {
        await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),$1,clock_timestamp()+interval '1 day')", [employeeId]);
        const employee: SessionMutationProof = { ...owner, employee: { ...owner.employee, id: employeeId, role: 'EMPLOYEE' }, sessionTokenHash: 'd'.repeat(64) };
        const pending = await submitTimeCorrection(employee, { operationId: randomUUID(), kind: 'ENTRY_BOUNDARY', timeEntryId: 'r2-current', proposedStartAt: '2026-09-23T11:00:00Z', proposedEndAt: '2026-09-23T20:00:00Z', reason: 'Fictional recorded context correction' }, f.db.executor);
        expect(pending.status).toBe('pending');if (pending.status !== 'pending') throw Error('Pending correction required');
        expect((await reviewTimeCorrection(owner, { operationId: randomUUID(), requestId: pending.requestId, expectedRevision: 1, decision: 'APPROVE' }, f.db.executor)).status).toBe('approved');
    }

    if (reverseRejected) {
        await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),$1,clock_timestamp()+interval '1 day')", [employeeId]);
        const employee: SessionMutationProof = { ...owner, employee: { ...owner.employee, id: employeeId, role: 'EMPLOYEE' }, sessionTokenHash: 'd'.repeat(64) };
        for (const [id, day] of [['cap-policy-oct1', '2026-10-01'], ['r2-current', '2026-09-23']]) {
            const pending = await submitTimeCorrection(employee, { operationId: randomUUID(), kind: 'ENTRY_BOUNDARY', timeEntryId: id, proposedStartAt: day + 'T11:00:00Z', proposedEndAt: day + 'T20:00:00Z', reason: 'Fictional reverse-created request ' + day }, f.db.executor);
            expect(pending.status).toBe('pending');if (pending.status !== 'pending') throw Error('Pending request required');
            expect((await reviewTimeCorrection(owner, { operationId: randomUUID(), requestId: pending.requestId, expectedRevision: 1, decision: 'REJECT' }, f.db.executor)).status).toBe('rejected');
        }
        await finalize({ startDate: covering.startDate, endDate: oldPeriod.endDate });
        await finalize({ startDate: '2026-09-29', endDate: covering.endDate });
    } else {
    if (mode !== 'MISSING') { const p = mode === 'PARTIAL' ? { ...covering, endDate: '2026-10-04' } : covering; await timeAction('APPROVE', p); if (mode !== 'APPROVE') await timeAction('FINALIZE', p); }
    }
    const i = input(); i.wages[0].hourlyRateMinor = '2500'; i.wages[0].locationIds = historicalLocation ? ['loc-1', 'loc-2'] : ['loc-1']; i.wages[0].workweekAnchorDate = null; i.wages[0].workweekStartTime = null; i.wages[0].workweekPolicy = fictionalWorkweekPolicy(employeeId, { weekday: 1, startTime: '00:01', timeZone: 'America/Puerto_Rico' }, true); i.wages[0].wageCentRounding = 'UNVERIFIED'; i.tax!.prCentRounding = 'UNVERIFIED'; i.tax!.ruleEvidenceReference = null;
    await saveNativeProfile(owner, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional actual wage and withholding facts', expectedRevision: 0, configuration: { schema: 'NEVORA_NATIVE_CONFIGURATION_V1', employeeId, wages: i.wages, tax: i.tax, deductions: i.deductions } }, f.db.executor);
    await saveNativeProfile(owner, { action: 'ATTEST_OPENING_YTD', operationId: randomUUID(), reason: 'Fictional attested opening zero', expectedRevision: 0, employeeId, ytd: i.ytd }, f.db.executor);
    const close = await readPeriodClose(owner, period, f.db.executor);
    await savePeriodPopulation(owner, { operationId: randomUUID(), expectedRevision: 0, sourceHash: close.sourceHash, ...period, members: close.members.map(e => ({ employeeId: e.employeeId, disposition: e.employeeId === employeeId ? 'INCLUDE' : 'EXCLUDE', reason: 'Fictional reviewed population', employmentFacts: 'Fictional employment', employmentBasis: 'MANAGER_ATTESTED' })) }, f.db.executor);
    return i;
}
async function capture() { return captureNativePayroll(await source(owner, period, f.db.executor), newRun(randomUUID(), period, payday), f.db.executor, authority(owner, 'REVIEW')); }
async function prepared() { const r = await command(owner, { action: 'PREPARE', operationId: randomUUID(), period, payday }, f.db.executor); return readRun(owner, r.runId!, f.db.executor); }

it('NQAF001 actual closed original period uses the later complete finalized context without discarding reopened custody', async () => {
    const i = await setup(); const run = newRun(randomUUID(), period, payday); const [facts] = await f.db.executor.query<{ coverage: { employeeId: string; startDate: string; endDate: string }[] }>(nativeDatabaseFactsQuery('workspace-fuel', run, [employeeId]));
    const request = nativeSourceRequest('workspace-fuel', run, employeeId, i.wages, facts.coverage);
    expect(request.contexts).toEqual([{ startAt: '2026-09-15T04:00:00Z', endAt: '2026-10-05T04:01:00Z' }]);
    expect(request.coverage).toEqual([oldPeriod, covering]);
    const raw = await f.db.executor.query(buildRecordedSourceCapture(request)); const projected = projectRecordedSourceCapture(request, raw[0]);
    expect(projected.state).toBe('ready');
    const c = await capture(); expect(c.run.status).toBe('REVIEW_REQUIRED'); expect(c.run.totals?.grossMinor).toBe('20000');
    expect(c.snapshot!.native!.recordedSources![0].supersededCoverage).toHaveLength(1);
    if (projected.state !== 'ready') throw Error('Current finalized authority required');
    const authoritative = projected.coverage[0], older = projected.supersededCoverage[0];
    expect(c.snapshot!.native!.facts.inputs[0].timecards.map(t => ({ period: t.period, revision: t.revision, state: t.state, operationId: t.recordedSourceEvidence?.operationId, sourceHash: t.sourceHash }))).toEqual([{ period: covering, revision: 2, state: 'FINALIZED', operationId: authoritative.operationId, sourceHash: authoritative.sourceHash }]);
    expect(older.action).toBe('REOPEN');expect(older.revision).toBe(3);expect(authoritative.operationId).not.toBe(older.operationId);
    expect(c.snapshot!.native!.facts.inputs[0].timecards.every(t => t.recordedSourceEvidence?.operationId !== older.operationId)).toBe(true);

    await mkdir('outputs/nqaf001', { recursive: true }); await writeFile('outputs/nqaf001/ACTUAL_NQAF001_AUTHOR_REPLAY.json', JSON.stringify({ request, raw, projected, run: c.run, sameLiteralDatesAndEntries: true, actualApprovalFinalizationServices: true, noClockOrGuardBypass: true }, null, 2));
    expect(await f.q("SELECT start_date::text,end_date::text,action,revision FROM nevora_timecard_latest WHERE employee_id=$1 ORDER BY start_date", [employeeId])).toEqual([{ start_date: oldPeriod.startDate, end_date: oldPeriod.endDate, action: 'REOPEN', revision: 3 }, { start_date: covering.startDate, end_date: covering.endDate, action: 'FINALIZE', revision: 2 }]);
});
it.each(['MISSING', 'APPROVE', 'PARTIAL'] as const)('keeps null live money when covering authority is %s', async mode => {
    await setup(mode); const c = await capture(); expect(c.run.status).toBe('BLOCKED'); expect(c.run.rows).toBeNull(); expect(c.run.totals).toBeNull(); expect(c.run.reviewToken).toBeNull(); expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
});
it('requires fresh human review after the covering context is reopened and current time changes', async () => {
    await setup(); const first = await prepared(); expect(first.payload.status).toBe('REVIEW_REQUIRED'); await timeAction('REOPEN', covering);
    await f.q("UPDATE time_entries SET clock_out_at='2026-10-01T21:00:00Z',version=2 WHERE id='cap-policy-oct1'");
    const c = await capture(); expect(c.run.status).toBe('BLOCKED'); expect(c.run.totals).toBeNull();
    await expect(command(owner, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken }, f.db.executor)).rejects.toThrow('NATIVE_REVIEW_STALE');
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
});
it('retains historical context location privacy after replacement and hides the run and statement from a limited Manager', async () => {
    await setup('FINALIZE', true); const first = await prepared(); expect(first.payload.coverage).toEqual({ complete: true, locationIds: ['loc-1', 'loc-2'] });
    await command(owner, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken }, f.db.executor); await workerOnce(f.db.executor); await workerOnce(f.db.executor);
    await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-b'"); await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-b',clock_timestamp()+interval '1 day')");
    await saveNativeProfile(owner, { action: 'SET_MANAGER_SCOPE', operationId: randomUUID(), reason: 'Only current payable location', expectedRevision: 0, employeeId: 'c34-b', review: true, approve: true, locationIds: ['loc-1'] }, f.db.executor);
    const manager: SessionMutationProof = { ...owner, employee: { ...owner.employee, id: 'c34-b', role: 'MANAGER' }, sessionTokenHash: 'b'.repeat(64) };
    expect((await runs(manager, f.db.executor)).runs).toEqual([]); const [d] = await f.q<{ id: string }>("SELECT id::text FROM payroll_documents WHERE employee_id=$1", [employeeId]); await expect(document(manager, d.id, f.db.executor)).rejects.toThrow('DOCUMENT_UNAVAILABLE');
});
it('preserves approval retries, one replacement YTD head and prior document bytes in the corrected replacement-context flow', async () => {
    await setup(); const first = await prepared(); const approve = { action: 'APPROVE' as const, operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken! }; const receipt = await command(owner, approve, f.db.executor); expect(await command(owner, approve, f.db.executor)).toEqual(receipt); await workerOnce(f.db.executor); await workerOnce(f.db.executor);
    const oldBytes = await f.q("SELECT id::text,sha256,encode(content,'hex') AS hex FROM payroll_documents ORDER BY id"); const oldRun = (await readRun(owner, first.payload.id, f.db.executor)).payload;
    const correction = await command(owner, { action: 'CORRECT_NATIVE', operationId: randomUUID(), runId: oldRun.id, expectedRevision: oldRun.revision, reason: 'Fictional separately reviewed replacement' }, f.db.executor); const next = await readRun(owner, correction.runId!, f.db.executor); expect(next.payload.status).toBe('REVIEW_REQUIRED'); expect(next.payload.totals?.grossMinor).toBe('20000');
    await command(owner, { action: 'APPROVE', operationId: randomUUID(), runId: next.payload.id, expectedRevision: next.payload.revision, reviewToken: next.payload.reviewToken }, f.db.executor);
    expect(await f.q('SELECT run_id::text AS id FROM native_payroll_ledger_heads')).toEqual([{ id: next.payload.id }]); expect(await f.q("SELECT id::text,sha256,encode(content,'hex') AS hex FROM payroll_documents ORDER BY id")).toEqual(oldBytes); expect((await readRun(owner, oldRun.id, f.db.executor)).payload).toEqual(oldRun);
});

it('preserves approved correction lineage and historical raw timing under the later finalized replacement', async () => {
    await setup('FINALIZE', false, true);const c = await capture();expect(c.run.status).toBe('REVIEW_REQUIRED');expect(c.run.totals?.grossMinor).toBe('20000');
    const recorded = c.snapshot!.native!.recordedSources![0];expect(recorded.lineage.requests).toHaveLength(1);expect(recorded.lineage.adjustments).toHaveLength(1);expect(recorded.lineage.events).toHaveLength(2);
    const entry = recorded.entries.find(e => e.id === 'r2-current')!;expect(entry.startAt).toBe('2026-09-23T11:00:00Z');expect(entry.rawStartAt).toBe('2026-09-23T12:00:00Z');
    expect(recorded.supersededCoverage[0].snapshot.entries.find(e => e.id === 'r2-current')!.startAt).toBe('2026-09-23T12:00:00Z');
    expect(recorded.coverage[0].snapshot.entries.find(e => e.id === 'r2-current')!.startAt).toBe('2026-09-23T11:00:00Z');
});

it('accepts adjacent current finalized authority with complete corrections created in reverse work-date order', async () => {
    const i = await setup('FINALIZE', false, false, true);
    const c = await capture();expect(c.run.status).toBe('REVIEW_REQUIRED');expect(c.run.totals?.grossMinor).toBe('20000');
    const retained = c.snapshot!.native!.recordedSources![0];expect(retained.coverage).toHaveLength(2);expect(retained.supersededCoverage).toHaveLength(1);expect(retained.lineage.requests).toHaveLength(2);expect(retained.lineage.events).toHaveLength(4);expect(retained.lineage.adjustments).toHaveLength(0);
    expect(retained.supersededCoverage[0].currentSource.corrections.map(r => r.startAt)).toEqual(['2026-10-01T11:00:00Z', '2026-09-23T11:00:00Z']);
    expect(retained.coverage.map(c => c.snapshot.corrections[0].startAt)).toEqual(['2026-09-23T11:00:00Z', '2026-10-01T11:00:00Z']);
    const run = newRun(randomUUID(), period, payday);const [facts] = await f.db.executor.query<{ coverage: { employeeId: string; startDate: string; endDate: string }[] }>(nativeDatabaseFactsQuery('workspace-fuel', run, [employeeId]));
    const request = nativeSourceRequest('workspace-fuel', run, employeeId, i.wages, facts.coverage);
    const [row] = await f.db.executor.query<{ capture: { cards: { action: string; currentSource: { corrections: { reason: string }[] } }[] } }>(buildRecordedSourceCapture(request));
    const inconsistent = structuredClone(row);inconsistent.capture.cards.find(c => c.action === 'REOPEN')!.currentSource.corrections[0].reason = 'Tampered semantic reason';
    expect(projectRecordedSourceCapture(request, inconsistent)).toEqual({ state: 'blocked', reason: 'stale_source' });
    const duplicate = structuredClone(row);const historical = duplicate.capture.cards.find(c => c.action === 'REOPEN')!;historical.currentSource.corrections.push(structuredClone(historical.currentSource.corrections[0]));
    expect(projectRecordedSourceCapture(request, duplicate).state).toBe('blocked');

});
