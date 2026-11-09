import { expect, it, vi } from 'vitest';
import { managementProof, schedulingSourceFixture } from '../../test/fixtures/management';
import { assignmentFacts } from './assignment-facts.test-support';
import type { GuardedWeekState } from './notification-transactions';
import { deriveCoverageRepair, assertCoverageRepairReview, createCoverageRepairReview } from './coverage-repair.server';
import { reportedCoverageState, type CoverageRepairLocator } from '../scheduling/coverage-repair';
import { createCoverageRepairShift } from './schedules';
import { readCoverageRepair, readCoverageRepairSelection } from './coverage-repair.server';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { generationSourceSql } from './generation-guards';
vi.mock('@/lib/db', () => import('../db'));

function fixture() {
  const state: GuardedWeekState = { assignmentFacts: assignmentFacts(), schedules: [], shifts: [], revisions: [], acknowledgements: [], recipients: [
    { employeeId: 'E', role: 'LEAD', active: true, allowedLocationIds: ['loc-1'] },
    { employeeId: 'U', role: 'EMPLOYEE', active: true, allowedLocationIds: ['loc-1'] },
  ] };
  const source = schedulingSourceFixture(state);
  source.employees.forEach(e => Object.assign(e, { first_name: 'Fictional', last_name: e.id, primary_location_id: 'loc-1' }));
  source.location_staffing_settings = [{ location_id: 'loc-1', minimum_staff_per_shift: 2, requires_designated_lead: true }];
  source.location_coverage_windows = [{ id: 'coverage', location_id: 'loc-1', day_of_week: 1, start_time: '08:00', end_time: '12:00' }];
  source.coverage_window_position_requirements = [{ coverage_window_id: 'coverage', position_id: 'barista', quantity: 1 }];
  source.employee_positions = [{ employee_id: 'E', position_id: 'barista' }];
  const locator: CoverageRepairLocator = { version: 1, weekStart: '2030-10-07', gapKey: 'loc-1|2030-10-07|08:00|12:00', locationId: 'loc-1', date: '2030-10-07', startTime: '08:00', endTime: '12:00', target: 'POSITION', positionId: 'barista', reported: reportedCoverageState({ gap: 2, requiresLead: true, positionCoverage: [{ positionId: 'barista', missing: 1 }] }) };
  return { state, source, locator, proof: managementProof('M') };
}

it('uses current exact health and AUTOMATIC hard qualification for a position plus Lead repair', () => {
  const r = fixture(); const result = deriveCoverageRepair(r.source, r.locator);
  expect(result.status).toBe('READY');
  expect(result.candidates.map(c => c.employeeId)).toEqual(['E']);
  expect(result.candidates[0].rules.candidate).toMatchObject({ positionId: 'barista', isDesignatedLead: true, startTime: '08:00', endTime: '12:00', locationId: 'loc-1' });
});

it('rejects source changes rather than rebinding a selected candidate to a fresh review', () => {
  const r = fixture(); const review = createCoverageRepairReview(r.source, r.locator, 'E', r.proof);
  expect(assertCoverageRepairReview(r.source, review, r.proof).employeeId).toBe('E');
  r.source.employee_positions = [];
  expect(() => assertCoverageRepairReview(r.source, review, r.proof)).toThrow('Coverage changed');
});

it('checks an untrusted review against the current server actor and canonical source and rejects edited interval/position/candidate', () => {
  const r = fixture(); const review = createCoverageRepairReview(r.source, r.locator, 'E', r.proof);
  expect(() => assertCoverageRepairReview(r.source, review, managementProof('OTHER'))).toThrow('Coverage changed');
  const parsed = JSON.parse(Buffer.from(review, 'base64url').toString());
  for (const change of [{ employeeId: 'U' }, { locator: { ...r.locator, endTime: '13:00' } }, { locator: { ...r.locator, positionId: 'cashier' } }]) {
    const forged = Buffer.from(JSON.stringify({ ...parsed, ...change })).toString('base64url');
    expect(() => assertCoverageRepairReview(r.source, forged, r.proof)).toThrow('Coverage changed');
  }
});

it('requires explicit refreshed review for changed reported staffing or position deficits', () => {
  const r = fixture(); r.source.location_staffing_settings[0].minimum_staff_per_shift = 3;
  expect(deriveCoverageRepair(r.source, r.locator).status).toBe('STALE');
  expect(deriveCoverageRepair(r.source, r.locator, true).locator.reported.missingStaff).toBe(3);
});

it('does not silently substitute another position when several are missing', () => {
  const r = fixture(); r.source.coverage_window_position_requirements.push({ coverage_window_id: 'coverage', position_id: 'cashier', quantity: 1 });
  const result = deriveCoverageRepair(r.source, { ...r.locator, target: 'CHOOSE', positionId: undefined }, true);
  expect(result.status).toBe('CHOOSE'); expect(result.candidates).toEqual([]);
  expect(result.targets.filter(t => t.target === 'POSITION').map(t => t.positionId)).toEqual(['barista', 'cashier']);
  expect(result.targets.filter(t=>t.target==='POSITION').every(t=>typeof t.count==='number'&&typeof t.positionName==='string')).toBe(true);
});

it('returns a resolved gap without an Add or Save candidate when the interval is already covered', () => {
  const r = fixture(); r.source.schedules = [{ id: 'schedule', location_id: 'loc-1', week_start: '2030-10-07', status: 'DRAFT' }];
  r.source.shifts = [{ id: 's', schedule_id: 'schedule', employee_id: 'E', date: '2030-10-07', start_time: '08:00', end_time: '12:00', position_id: 'barista', is_designated_lead: true }];
  r.source.location_staffing_settings[0].minimum_staff_per_shift = 1;
  expect(deriveCoverageRepair(r.source, r.locator, true).status).toBe('RESOLVED');
});

function executorFixture() {
  const r = fixture(); const batches: SqlStatement[][] = [];
  const executor: SqlExecutor = {
    query: vi.fn(async s => s.text.includes('AS state') ? [{ state: structuredClone(r.state), source: structuredClone(r.source), read_at: '2030-10-07T12:00:00Z' }]
      : [{ id: 'test-workspace', name: 'Fictional', active: true, timeZone: 'America/Puerto_Rico', createdAt: '', updatedAt: '2030-01-01 00:00:00.123456+00' }]) as SqlExecutor['query'],
    transaction: vi.fn(async (statements: readonly SqlStatement[]) => { batches.push([...statements]); return statements.map(s => s.text.includes(' AS source') ? [{ source: structuredClone(r.source) }] : []); }),
  };
  const review = createCoverageRepairReview(r.source, r.locator, 'E', r.proof);
  const command = { review, proof: r.proof, actorEmployeeId: 'M', employeeId: 'E', locationId: 'loc-1', weekStart: '2030-10-07', date: '2030-10-07', startTime: '08:00', endTime: '12:00', positionId: 'barista', isDesignatedLead: true };
  return { ...r, batches, executor, review, command };
}

it('requires separate publication consent before confirming a replacement into a published schedule', async () => {
  const r = executorFixture();
  r.state.schedules.push({ id: 'published', locationId: 'loc-1', weekStart: '2030-10-07', status: 'PUBLISHED', updatedAt: '' });
  r.source.schedules.push({ id: 'published', location_id: 'loc-1', week_start: '2030-10-07', status: 'PUBLISHED' });
  const review = createCoverageRepairReview(r.source, r.locator, 'E', r.proof);
  await expect(createCoverageRepairShift({ ...r.command, review }, r.executor)).rejects.toThrow('Coverage changed');
  expect(r.batches.flat().some(s => s.text.startsWith('INSERT INTO shifts'))).toBe(false);
});

it('protected review reads bracket the same coherent source with current management SQL proof and expose no private source', async () => {
  const r = executorFixture(); const result = await readCoverageRepair(r.locator, r.proof, false, r.executor);
  expect(r.batches).toHaveLength(1);
  expect(r.batches[0].filter(s => s.text.includes('management_authorization'))).toHaveLength(2);
  const sourceIndex=r.batches[0].findIndex(s=>s.text===`SELECT ${generationSourceSql} AS source`);
  expect(sourceIndex).toBeGreaterThan(0);
  expect(r.batches[0].slice(0,sourceIndex).some(s=>s.text.includes('operational_authorization'))).toBe(true);
  expect(r.batches[0].slice(sourceIndex+1).some(s=>s.text.includes('operational_authorization'))).toBe(true);
  expect(result.candidates[0].review).toBeTruthy();
  expect(result).not.toHaveProperty('source'); expect(result.candidates[0]).not.toHaveProperty('rules');
  expect(JSON.stringify(result)).not.toContain(r.proof.sessionTokenHash);
  expect(await readCoverageRepairSelection(r.review, r.proof, r.executor)).toMatchObject({ employeeId: 'E', isDesignatedLead: true, locator: r.locator });
});

it('a valid repair creates its schedule and exact positioned Lead shift in ONE existing guarded transaction', async () => {
  const r = executorFixture(); await createCoverageRepairShift(r.command, r.executor);
  expect(r.batches).toHaveLength(1);
  const batch = r.batches[0];
  expect(batch.filter(s => s.text.startsWith('INSERT INTO schedules'))).toHaveLength(1);
  expect(batch.filter(s => s.text.startsWith('INSERT INTO shifts'))).toHaveLength(1);
  expect(batch.find(s => s.text.startsWith('INSERT INTO shifts'))!.values.slice(2)).toEqual(['E', '2030-10-07', '08:00', '12:00', true, 'barista']);
  expect(batch.some(s => s.text.includes('generation_source_conflict'))).toBe(true);
  expect(batch.at(-2)!.text).toContain('management_authorization');
  expect(batch.at(-1)!.text).toContain('operational_authorization');
  expect(batch.at(-1)!.values[3]).toEqual([]);
  expect(batch.some(s => s.text.includes('INSERT INTO notifications'))).toBe(false);
});

it.each(['generation_source_conflict', 'schedule_week_version_conflict'])('repair %s requires a fresh review, never a rebuilt second attempt', async conflict => {
  const r = executorFixture(); vi.mocked(r.executor.transaction).mockRejectedValue(Object.assign(new Error(conflict), { code: '22P02' }));
  await expect(createCoverageRepairShift(r.command, r.executor)).rejects.toThrow('Coverage changed');
  expect(r.executor.transaction).toHaveBeenCalledTimes(1); expect(r.executor.query).toHaveBeenCalledTimes(2);
});

it('a stale review is rejected before any schedule, shift, publication or outbox transaction', async () => {
  const r = executorFixture(); r.source.location_staffing_settings[0].minimum_staff_per_shift = 3;
  await expect(createCoverageRepairShift(r.command, r.executor)).rejects.toThrow('Coverage changed');
  expect(r.batches).toEqual([]);
});

it.each([{ employeeId: 'U' }, { locationId: 'loc-2' }, { positionId: 'cashier' }, { isDesignatedLead: false }, { endTime: '13:00' }])('rejects form rebinding before any source transaction: %j', async change => {
  const r = executorFixture(); await expect(createCoverageRepairShift({ ...r.command, ...change }, r.executor)).rejects.toThrow('Coverage changed');
  expect(r.executor.query).not.toHaveBeenCalled(); expect(r.batches).toEqual([]);
});

it('a known position/Lead save returns an explicit chooser for the remaining staffing gap, with no automatic candidate substitution', () => {
  const r = fixture(); r.source.schedules = [{ id: 'schedule', location_id: 'loc-1', week_start: '2030-10-07', status: 'DRAFT' }];
  r.source.shifts = [{ id: 's', schedule_id: 'schedule', employee_id: 'E', date: '2030-10-07', start_time: '08:00', end_time: '12:00', position_id: 'barista', is_designated_lead: true }];
  expect(deriveCoverageRepair(r.source, r.locator).status).toBe('STALE');
  const current = deriveCoverageRepair(r.source, r.locator, true);
  expect(current.status).toBe('CHOOSE'); expect(current.locator.target).toBe('CHOOSE'); expect(current.locator.positionId).toBeUndefined();
  expect(current.targets).toEqual([{ target: 'STAFFING', count:1,label: '1 employees needed' }]); expect(current.candidates).toEqual([]);
  expect(current.locator.reported).toEqual({ missingStaff: 1, requiresLead: false, positions: [] });
});

it('an already-covered Lead does not disqualify an otherwise eligible non-Lead position replacement', () => {
  const r = fixture(); r.source.schedules = [{ id: 'schedule', location_id: 'loc-1', week_start: '2030-10-07', status: 'DRAFT' }];
  r.source.shifts = [{ id: 's', schedule_id: 'schedule', employee_id: 'E', date: '2030-10-07', start_time: '08:00', end_time: '12:00', is_designated_lead: true }];
  r.source.employee_positions.push({ employee_id: 'U', position_id: 'barista' });
  const result = deriveCoverageRepair(r.source, r.locator, true);
  expect(result.status).toBe('READY'); expect(result.designatedLead).toBe(false); expect(result.candidates.map(c => c.employeeId)).toEqual(['U']);
});

it('an unsigned hint edited to another legal current candidate remains a permitted current manager choice', () => {
  const r = fixture(); r.source.employees.push({ ...r.source.employees[0], id: 'F' });
  r.source.employee_positions.push({ employee_id: 'F', position_id: 'barista' });
  r.source.employee_location_eligibility.push({ employee_id: 'F', location_id: 'loc-1' });
  r.source.availability_windows.push(...r.source.availability_windows.filter(w => w.employee_id === 'E').map(w => ({ ...w, id: 'F-' + w.id, employee_id: 'F' })));
  const review = createCoverageRepairReview(r.source, r.locator, 'E', r.proof);
  const hint = JSON.parse(Buffer.from(review, 'base64url').toString()); hint.employeeId = 'F';
  expect(assertCoverageRepairReview(r.source, Buffer.from(JSON.stringify(hint)).toString('base64url'), r.proof).employeeId).toBe('F');
});

it('Lead-only partial success displays only current remaining requirements rather than a completed Lead requirement', () => {
  const r = fixture(); const origin = { ...r.locator, target: 'LEAD' as const, positionId: undefined };
  r.source.schedules = [{ id: 'schedule', location_id: 'loc-1', week_start: '2030-10-07', status: 'DRAFT' }];
  r.source.shifts = [{ id: 's', schedule_id: 'schedule', employee_id: 'E', date: '2030-10-07', start_time: '08:00', end_time: '12:00', is_designated_lead: true }];
  const result = deriveCoverageRepair(r.source, origin, true);
  expect(result.status).toBe('CHOOSE'); expect(result.designatedLead).toBe(false);
  expect(result.targets.some(t => t.target === 'LEAD')).toBe(false);
});

it('the HTML midnight endpoint 00:00 preserves a reviewed 24:00 interval in the canonical write', async () => {
  const r = executorFixture(); r.source.location_coverage_windows[0].start_time = '20:00'; r.source.location_coverage_windows[0].end_time = '24:00';
  const locator = { ...r.locator, gapKey: 'loc-1|2030-10-07|20:00|24:00', startTime: '20:00', endTime: '24:00' };
  const review = createCoverageRepairReview(r.source, locator, 'E', r.proof);
  await createCoverageRepairShift({ ...r.command, review, startTime: '20:00', endTime: '00:00' }, r.executor);
  expect(r.batches[0].find(s => s.text.startsWith('INSERT INTO shifts'))!.values.slice(4, 6)).toEqual(['20:00','24:00']);
});

it.each(['2026-11-01', '2026-03-08'])('a DST ambiguous or missing local endpoint is rejected before a candidate can be reviewed: %s', date => {
  const r = fixture(); r.source.workspaces[0].time_zone = 'America/New_York';
  const weekStart = date === '2026-11-01' ? '2026-10-26' : '2026-03-02';
  expect(() => deriveCoverageRepair(r.source, { ...r.locator, weekStart, date, gapKey: `loc-1|${date}|${date.endsWith('11-01') ? '01:30' : '02:30'}|04:00`, startTime: date.endsWith('11-01') ? '01:30' : '02:30', endTime: '04:00' })).toThrow('Coverage changed');
});

// These business/unit fixtures do not execute SQL. Current scope admission and
// rollback are exercised by company-access-schedule-*.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
