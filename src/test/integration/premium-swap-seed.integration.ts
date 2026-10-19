import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { OwnedPgTransport } from './owned-pg-transport';
vi.mock('server-only', () => ({}));
let transport: OwnedPgTransport;
vi.mock('@/lib/db', () => ({ getDb: () => transport, queryRows: (rows: unknown) => rows }));
import { createDisposableExchangeDatabase } from './local-postgres';
import { createOwnedPgTransport } from './owned-pg-transport';
import { seedOwnedApp } from './owned-app-fixture';
import { fixtureProof } from './shift-change-api';
import { fictionalProfile } from '../fixtures/shift-changes';
import { publishScheduleWithRevision } from './management-api';
import { getPublishedShift, listSwapTargets } from '../../lib/data/exchanges';
import { readShiftChangeTerms, readShiftChangeSnapshot } from '../../lib/data/shift-change-snapshot';
import { readShiftChangeAvailability, executeShiftChange } from '../../lib/data/shift-changes';
import { evaluateShiftChange } from '../../lib/scheduling/shift-change-evaluation';
import { matchesDisplayedShift } from '../../lib/shift-changes/displayed-terms';
import { addDays, weekStartFor } from '../../lib/date-utils';
import { businessDate } from '../../lib/business-time';
import type { ShiftChangeCommand } from '../../lib/shift-changes/types';

let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const q = (text: string, values: readonly unknown[] = []) => db.executor.query({ text, values });
const week = addDays(weekStartFor(businessDate(new Date(), 'America/Puerto_Rico')), 7);
beforeAll(async () => {
  db = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  const [identity] = await db.executor.query<import('./owned-pg-transport').OwnedDatabaseIdentity>({
    text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: [],
  });
  transport = createOwnedPgTransport(db.connectionString, identity);
  await seedOwnedApp(db.executor);
  for (const id of ['AUDIT-E', 'AUDIT-SWAP']) {
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,$3,'555-0199','EMPLOYEE','loc-1')", [id, id === 'AUDIT-SWAP' ? 'Riley' : 'Fictional', id === 'AUDIT-SWAP' ? 'Rivera' : 'Employee']);
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')", [id]);
    await q("INSERT INTO employee_positions VALUES($1,'qa-pos')", [id]);
  }
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('audit-next','loc-1',$1,'DRAFT','QAOWNER')", [week]);
  for (let day = 0; day < 7; day++) {
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,assignment_origin) VALUES($1,'audit-next',$2,$3,'08:00','16:00','qa-pos','MANAGER')", [day < 5 ? `audit-next-${day}-1` : `x-swap-${day}`, day < 5 ? 'AUDIT-E' : 'AUDIT-SWAP', addDays(week, day)]);
  }
  await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'QAOWNER' }, db.executor);
});
afterAll(async () => { await db?.dispose(); });

it('A1 diagnoses missing inputs, then offers both weekend targets and completes a real consented swap', async () => {
  const proof = await fixtureProof(db.executor, 'AUDIT-E');
  const source = await getPublishedShift('audit-next-0-1');
  expect(source).not.toBeNull();
  const targets = await listSwapTargets(source!, 'AUDIT-E');
  expect(targets.map(s => s.id)).toEqual(['x-swap-5', 'x-swap-6']);
  const reviewed = await readShiftChangeTerms(proof, source!.id, targets[0].id, db.executor);
  expect(reviewed?.target).not.toBeNull();
  expect(matchesDisplayedShift(source!, reviewed!.source)).toBe(true);
  expect(matchesDisplayedShift(targets[0], reviewed!.target!)).toBe(true);
  const command: ShiftChangeCommand = { kind: 'PROPOSE_SWAP', operationId: randomUUID(), sourceShiftId: source!.id, sourceEpisodeId: reviewed!.source.assignmentEpisodeId, sourceTermsFingerprint: reviewed!.sourceTermsFingerprint, targetShiftId: targets[0].id, targetEpisodeId: reviewed!.target!.assignmentEpisodeId, targetTermsFingerprint: reviewed!.targetTermsFingerprint! };
  const evaluation = async () => evaluateShiftChange(await readShiftChangeSnapshot(proof, command, db.executor), command);
  const baseline = await evaluation();
  expect(baseline.issues.map(i => i.code)).toEqual(expect.arrayContaining(['OUTSIDE_AVAILABILITY', 'RULE_UNVERIFIABLE']));
  expect(await readShiftChangeAvailability(proof, command, db.executor)).toMatchObject({ allowed: false, refusal: 'review' });
  // Only fixture rows change. Workdays are assignments, not availability limits.
  await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'audit-swap-availability-'||e.id||'-'||d,e.id,d,'08:00','16:00' FROM employees e CROSS JOIN generate_series(0,6) d WHERE e.id IN ('AUDIT-E','AUDIT-SWAP')");
  const availabilityOnly = await evaluation();
  expect(availabilityOnly.issues.some(i => i.code === 'OUTSIDE_AVAILABILITY')).toBe(false);
  expect(availabilityOnly.issues.filter(i => i.code === 'RULE_UNVERIFIABLE')).toHaveLength(10);
  await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) SELECT id,40,40,$1::jsonb FROM employees WHERE id IN ('AUDIT-E','AUDIT-SWAP') ON CONFLICT(employee_id) DO UPDATE SET operational_rule_profile=excluded.operational_rule_profile", [JSON.stringify(fictionalProfile())]);
  for (const target of targets) {
    const terms = await readShiftChangeTerms(proof, source!.id, target.id, db.executor);
    expect(matchesDisplayedShift(target, terms!.target!)).toBe(true);
    expect(await readShiftChangeAvailability(proof, { ...command, targetShiftId: target.id, targetEpisodeId: terms!.target!.assignmentEpisodeId, targetTermsFingerprint: terms!.targetTermsFingerprint! }, db.executor)).toMatchObject({ allowed: true });
  }
  console.info('A1_EVIDENCE', JSON.stringify({ week, termsMatch: true, baseline: baseline.issues, afterAvailability: availabilityOnly.issues, afterFix: (await evaluation()).issues, allowedTargetIds: targets.map(t => t.id) }));
  const proposed = await executeShiftChange(proof, command, db.executor);
  expect(proposed.status).toBe('pending');
  if (proposed.status !== 'pending') throw Error('Expected stored proposal');
  expect(await executeShiftChange(await fixtureProof(db.executor, 'AUDIT-SWAP'), { kind: 'ACCEPT', operationId: randomUUID(), requestId: proposed.requestId, expectedRevision: 1 }, db.executor)).toMatchObject({ status: 'completed' });
  expect(await db.executor.query({ text: "SELECT id,employee_id FROM shifts WHERE id IN ('audit-next-0-1','x-swap-5') ORDER BY id", values: [] })).toEqual([{ id: 'audit-next-0-1', employee_id: 'AUDIT-SWAP' }, { id: 'x-swap-5', employee_id: 'AUDIT-E' }]);
});
