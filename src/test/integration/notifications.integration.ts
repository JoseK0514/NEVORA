import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createECDH, createHash, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createDisposableNotificationDatabase } from './local-postgres';
import { publishScheduleWithRevision } from '../../lib/data/publication-revisions';
import { commitPublishedWeekChange, personalProjections, readNotificationWeekState } from '../../lib/data/notification-transactions';
import { notificationIntentStatements, cancelNotificationStatements } from '../../lib/data/notifications';
import { sqlSubscriptionRepository } from '../../lib/data/push-subscriptions';
import { sqlDeliveryRepository } from '../../lib/data/push-deliveries';
import { sqlNotificationStateRepository } from '../../lib/data/notification-state';
import { acknowledgeScheduleWeek } from '../../lib/data/acknowledgements';
import { createTimeOffRequest, reviewTimeOffRequest } from '../../lib/data/requests';
import { createSwapProposal, respondToSwap, approveSwapExchange, createCoverageOffer, claimCoverage, approveCoverageExchange, denyExchange, cancelExchange } from '../../lib/data/exchanges';
import { createCallout, approveCalloutAndOpenCoverage, denyCallout, cancelPendingCallout } from '../../lib/data/callouts';
import { terminatePortalSession, reconcilePendingInstallation, type LogoutDeps } from '../../lib/notifications/logout';
import { CLEANUP_COOKIE, INSTALLATION_COOKIE, openCleanupReceipt, sealCleanupReceipt, sealInstallationProof, encryptSubscriptionMaterial } from '../../lib/notifications/installation';
import { readNotificationConfig } from '../../lib/notifications/config';
import { setAvailabilityDeadline, replaceWeeklyAvailability } from '../../lib/data/week-settings';
import { runDispatch, type WorkerDeps } from '../../lib/notifications/worker';
import { runReminders } from '../../lib/notifications/reminders';
import type { NotificationIntent, SqlExecutor, InstallationProof } from '../../lib/notifications/types';

// Substitute the SQL transport only. Tagged statements remain lazy until the
// original production transaction submits its exact ordered batch to PostgreSQL.
const transport = vi.hoisted(() => ({ executor: null as SqlExecutor | null }));
vi.mock('../../lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({ statement: { text, values }, then: (yes: (rows: unknown[]) => unknown, no: (error: unknown) => unknown) => transport.executor!.query({ text, values }).then(yes, no) });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((text, part, index) => text + (index ? '$' + index : '') + part, ''), values), {
    query: statement,
    transaction: (queries: { statement: { text: string; values: readonly unknown[] } }[]) => transport.executor!.transaction(queries.map(q => q.statement)),
  });
  return { getDb: () => tagged, queryRows: (result: unknown) => Array.isArray(result) ? result : [] };
});
let database: Awaited<ReturnType<typeof createDisposableNotificationDatabase>>;
let db: SqlExecutor;
const week = '2030-10-07';
const sessionToken = 'QA-fictional-session-a';
const sessionA = createHash('sha256').update(sessionToken).digest('hex');
const sessionB = createHash('sha256').update('QA-fictional-session-b').digest('hex');
const sql = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.query<T>({ text, values });
const count = async (table: string) => Number((await sql<{ count: string }>(`SELECT count(*) AS count FROM ${table}`))[0].count);
const publish = (locationId = 'loc-1', executor = db) => publishScheduleWithRevision({ locationId, weekStart: week, managerId: 'QA-M' }, executor);
const claim = (executor = db) => sqlDeliveryRepository('test', executor).claim({ now: new Date(), limit: 10, leaseSeconds: 120, mode: 'all' });
function intent(overrides: Partial<NotificationIntent> = {}): NotificationIntent {
  const id = `QA-${randomUUID()}`;
  return { id, employeeId: 'QA-E', type: 'SCHEDULE_PUBLISHED', title: 'NEVORA', body: 'Open NEVORA.', eventKey: id, environment: 'test', source: { kind: 'SCHEDULE', id: week, version: 'QA-v1' }, effectiveVersion: 'QA-v1', purpose: 'REMINDER', urgency: 'normal', dueAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), ...overrides };
}
async function insertIntent(overrides: Partial<NotificationIntent> = {}) {
  const value = intent(overrides); await db.transaction(notificationIntentStatements([value])); return value;
}
async function enroll(suffix = 'a', employeeId = 'QA-E', sessionHash = sessionA) {
  const value = { employeeId, installationHash: createHash('sha256').update(`QA-install-${suffix}`).digest('hex'), endpointFingerprint: `QA-endpoint-${suffix}`, encryptedMaterial: 'QA-fictional-ciphertext', sessionHash, generation: randomUUID(), expectedGeneration: null, environment: 'test' as const, expiresAt: null };
  expect(await sqlSubscriptionRepository(db).enroll(value)).toEqual({ state: 'active', generation: value.generation });
  return value;
}
async function delivery(overrides: Partial<NotificationIntent> = {}) {
  await enroll(); const value = await insertIntent(overrides);
  await sqlDeliveryRepository('test', db).materialize([value.id]);
  return value;
}
function onceBeforeTransaction(action: () => Promise<unknown>): SqlExecutor {
  let first = true;
  return { query: (s, signal) => db.query(s, signal), transaction: async (statements, signal) => { if (first) { first = false; await action(); } return db.transaction(statements, signal); } };
}
beforeAll(async () => { database = await createDisposableNotificationDatabase(); db = database.executor; transport.executor = db; }, 30000);
afterAll(async () => { await database?.dispose(); });
beforeEach(async () => {
  await sql('TRUNCATE employees, schedules, notifications, schedule_week_settings RESTART IDENTITY CASCADE');
  await sql(`INSERT INTO employees (id,first_name,last_name,phone,role,primary_location_id) VALUES
    ('QA-E','QA-Avery','Rivera','QA-NO-PHONE','EMPLOYEE','loc-1'),('QA-F','QA-Blair','Rivera','QA-NO-PHONE','LEAD','loc-2'),
    ('QA-M','QA-Morgan','Manager','QA-NO-PHONE','MANAGER','loc-1'),('QA-O','QA-Owen','Owner','QA-NO-PHONE','OWNER','loc-1')`);
  await sql(`INSERT INTO employee_location_eligibility SELECT id, l FROM employees CROSS JOIN (VALUES ('loc-1'),('loc-2')) locations(l)`);
  await sql(`INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES ($1,'QA-E',now()+interval '14 days'),($2,'QA-F',now()+interval '14 days')`, [sessionA, sessionB]);
  await sql(`INSERT INTO schedules(id,location_id,week_start,created_by,updated_at) VALUES ('QA-s1','loc-1',$1,'QA-M','2026-10-01 12:00:00.123456+00'),('QA-s2','loc-2',$1,'QA-M','2026-10-01 12:00:00.123457+00')`, [week]);
  await sql(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES ('QA-sh1','QA-s1','QA-E','2030-10-11','09:00','17:00'),('QA-sh2','QA-s2','QA-F','2030-10-12','09:00','17:00')`);
});

describe('actual ordered publication and request SQL', () => {
  it('outbox_failure_rolls_back_publication', async () => {
    await sql(`ALTER TABLE notifications ADD CONSTRAINT qa_reject_intent CHECK (employee_id <> 'QA-E')`);
    try {
      await expect(publish()).rejects.toThrow(/qa_reject_intent/);
      expect((await sql('SELECT status FROM schedules WHERE id=\'QA-s1\''))[0].status).toBe('DRAFT');
      expect(await count('schedule_publication_revisions')).toBe(0); expect(await count('notifications')).toBe(0);
    } finally { await sql('ALTER TABLE notifications DROP CONSTRAINT qa_reject_intent'); }
  });
  it('failed_mutation_has_no_notification', async () => {
    expect(await reviewTimeOffRequest({ requestId: 'QA-missing', managerId: 'QA-M', status: 'APPROVED' }, db)).toBe(false);
    await expect(createTimeOffRequest({ employeeId: 'QA-E', startDate: '2030-10-12', endDate: '2030-10-11' }, db)).rejects.toThrow();
    expect(await count('notifications')).toBe(0);
  });
  it('draft_publication_race_recomputes_snapshot', async () => {
    const racing = onceBeforeTransaction(async () => {
      await commitPublishedWeekChange({ weekStarts: [week], actorEmployeeId: 'QA-M', sourceType: 'MANAGER_MUTATION', build: s => ({ statements: [{ text: `UPDATE shifts SET start_time='10:00' WHERE id='QA-sh1'`, values: [] }], afterSchedules: s.schedules, afterShifts: s.shifts.map(sh => sh.sourceShiftId === 'QA-sh1' ? { ...sh, startTime: '10:00' } : sh) }) }, db);
      await publish('loc-2');
    });
    expect((await publish('loc-1', racing)).published).toBe(true);
    const state = await readNotificationWeekState([week], db);
    expect(state.revisions).toHaveLength(2);
    expect(state.revisions[1].shifts).toHaveLength(2);
    expect(state.revisions[1].shifts.find(sh => sh.employeeId === 'QA-E')?.startTime).toBe('10:00');
    expect(state.revisions[0].shifts).toHaveLength(1);
  });
  it('guards_exact_microseconds_and_rejects_post_write_noop', async () => {
    const before = await readNotificationWeekState([week], db);
    expect(before.schedules[0].updatedAt).toContain('123456');
    let builds = 0;
    const racing = onceBeforeTransaction(() => sql(`UPDATE schedules SET updated_at=updated_at+interval '1 microsecond' WHERE id='QA-s1'`));
    await commitPublishedWeekChange({ weekStarts: [week], actorEmployeeId: 'QA-M', sourceType: 'MANAGER_MUTATION', build: s => { builds++; return { statements: [{ text: 'SELECT 1', values: [] }], afterSchedules: s.schedules, afterShifts: s.shifts }; } }, racing);
    expect(builds).toBe(2);
    await expect(commitPublishedWeekChange({ weekStarts: [week], actorEmployeeId: 'QA-M', sourceType: 'MANAGER_MUTATION', build: s => ({ statements: [{ text: 'SELECT 1', values: [] }], afterSchedules: s.schedules, afterShifts: s.shifts.map(sh => ({ ...sh, startTime: '11:00' })) }) }, db)).rejects.toThrow(/schedule_week_version_conflict/);
  });
  it('equivalent_revision_preserves_acknowledgement_and_personal_budget', async () => {
    await publish(); expect(await acknowledgeScheduleWeek({ weekStart: week, employeeId: 'QA-E' }, db)).toBe(true);
    const first = personalProjections(await readNotificationWeekState([week], db), week)['QA-E'];
    await publish('loc-2'); await publish();
    const next = personalProjections(await readNotificationWeekState([week], db), week)['QA-E'];
    expect(next.effectiveVersion).toBe(first.effectiveVersion); expect(next.publishedAt).toBe(first.publishedAt); expect(next.acknowledgement).toEqual(expect.objectContaining({ acknowledged: true, needsAcknowledgement: false }));
  });
  it('explicit_acknowledgement_cancels_claimed_reminder', async () => {
    await publish(); await delivery(); const [leased] = await claim(); expect(leased).toBeDefined();
    expect(await acknowledgeScheduleWeek({ weekStart: week, employeeId: 'QA-E' }, db)).toBe(true);
    expect(await sqlDeliveryRepository('test', db).finish(leased, { state: 'provider_accepted' })).toBe(false);
    expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('cancelled');
  });
  it('repeated_and_concurrent_time_off_decisions_are_exactly_once', async () => {
    await createTimeOffRequest({ employeeId: 'QA-E', startDate: '2030-10-11', endDate: '2030-10-11' }, db);
    const id = String((await sql('SELECT id FROM time_off_requests'))[0].id);
    const results = await Promise.all(['APPROVED', 'DENIED'].map(status => reviewTimeOffRequest({ requestId: id, managerId: 'QA-M', status: status as 'APPROVED' | 'DENIED' }, db)));
    expect(results.sort()).toEqual([false, true]);
    expect(await reviewTimeOffRequest({ requestId: id, managerId: 'QA-M', status: 'APPROVED' }, db)).toBe(false);
    expect((await sql(`SELECT * FROM notifications WHERE employee_id='QA-E' AND purpose='EVENT'`))).toHaveLength(1);
  });
  it.each(['active', 'role', 'location'])('recipient_%s_race_aborts_transition_and_intents', async field => {
    const racing = onceBeforeTransaction(() => sql(field === 'active' ? `UPDATE employees SET active=false WHERE id='QA-M'` : field === 'role' ? `UPDATE employees SET role='EMPLOYEE' WHERE id='QA-M'` : `DELETE FROM employee_location_eligibility WHERE employee_id='QA-M'`));
    await expect(createTimeOffRequest({ employeeId: 'QA-E', startDate: '2030-10-11', endDate: '2030-10-11' }, racing)).rejects.toThrow(/changed/);
    expect(await count('time_off_requests')).toBe(0); expect(await count('notifications')).toBe(0);
  });
  it.each(['approve', 'deny', 'decline', 'cancel'])('swap_%s_executes_real_transition_SQL', async outcome => {
    await publish(); await publish('loc-2');
    const id = await createSwapProposal({ sourceShiftId: 'QA-sh1', targetShiftId: 'QA-sh2', requestedByEmployeeId: 'QA-E', targetEmployeeId: 'QA-F' }, db);
    if (outcome === 'cancel') expect(await cancelExchange({ exchangeId: id, employeeId: 'QA-E' }, db)).toBe(true);
    else {
      expect(await respondToSwap({ exchangeId: id, employeeId: 'QA-F', accept: outcome !== 'decline' }, db)).toBe(true);
      if (outcome === 'approve') expect(await approveSwapExchange({ exchangeId: id, managerId: 'QA-M' }, db)).toBe(true);
      if (outcome === 'deny') expect(await denyExchange({ exchangeId: id, managerId: 'QA-M' }, db)).toBe(true);
    }
    expect(await respondToSwap({ exchangeId: id, employeeId: 'QA-F', accept: true }, db)).toBe(false);
    if (outcome === 'approve') expect((await sql(`SELECT employee_id FROM shifts WHERE id='QA-sh1'`))[0].employee_id).toBe('QA-F');
  });
  it('coverage_claim_and_approval_commit_assignment_and_outbox', async () => {
    await publish(); const id = await createCoverageOffer({ sourceShiftId: 'QA-sh1', requestedByEmployeeId: 'QA-E' }, db);
    expect(await claimCoverage({ exchangeId: id, employeeId: 'QA-F' }, db)).toBe(true);
    expect(await approveCoverageExchange({ exchangeId: id, managerId: 'QA-M' }, db)).toBe(true);
    expect((await sql(`SELECT employee_id FROM shifts WHERE id='QA-sh1'`))[0].employee_id).toBe('QA-F');
  });
  it.each(['approve', 'deny', 'cancel'])('callout_%s_executes_real_transition_SQL', async outcome => {
    await publish(); const id = await createCallout({ shiftId: 'QA-sh1', employeeId: 'QA-E', reasonCode: 'ILLNESS' }, db); expect(id).toBeTruthy();
    if (outcome === 'approve') {
      expect(await approveCalloutAndOpenCoverage({ calloutId: id!, managerId: 'QA-M' }, db)).toBeTruthy();
      expect((await sql(`SELECT status FROM shift_exchanges`))[0].status).toBe('OPEN');
      expect((await sql(`SELECT * FROM notifications WHERE source_kind='EXCHANGE'`)).length).toBeGreaterThan(0);
    } else if (outcome === 'deny') expect(await denyCallout({ calloutId: id!, managerId: 'QA-M' }, db)).toBeTruthy();
    else expect(await cancelPendingCallout({ calloutId: id!, employeeId: 'QA-E' }, db)).toBeTruthy();
  });
});

describe('actual enrollment, materialization and leases', () => {
  it('foreign_installation_is_not_inherited', async () => {
    const enrolled = await enroll();
    expect(await sqlSubscriptionRepository(db).enroll({ ...enrolled, employeeId: 'QA-F', sessionHash: sessionB, expectedGeneration: enrolled.generation })).toEqual({ state: 'conflict' });
    expect(await sqlSubscriptionRepository(db).enroll({ ...enrolled, installationHash: 'QA-foreign' })).toEqual({ state: 'conflict' });
    expect(await count('push_subscriptions')).toBe(1);
  });
  it.each(['same-owner', 'foreign-installation', 'foreign-endpoint'] as const)('synchronized_%s_enrollment_preserves_exact_winner', async kind => {
    // Both calls reach the transaction boundary before either submits its exact
    // production lock/insert batch on a dedicated PostgreSQL connection.
    let arrived = 0;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    const concurrent: SqlExecutor = { query: (s, signal) => db.query(s, signal), transaction: async (s, signal) => {
      if (++arrived === 2) release();
      await ready;
      return db.transaction(s, signal);
    } };
    const first = { employeeId: 'QA-E', installationHash: createHash('sha256').update('QA-race-install').digest('hex'), endpointFingerprint: 'QA-race-endpoint', encryptedMaterial: 'QA-cipher-first', sessionHash: sessionA, generation: randomUUID(), expectedGeneration: null, environment: 'test' as const, expiresAt: null };
    const second = { ...first, generation: randomUUID(), encryptedMaterial: 'QA-cipher-second', ...(kind === 'same-owner' ? {} : { employeeId: 'QA-F', sessionHash: sessionB }), ...(kind === 'foreign-endpoint' ? { installationHash: createHash('sha256').update('QA-race-other-install').digest('hex') } : {}) };
    const inputs = [first, second];
    const results = await Promise.all(inputs.map(input => sqlSubscriptionRepository(concurrent).enroll(input)));
    expect(arrived).toBe(2);
    expect(results.filter(result => result.state === 'active')).toHaveLength(1);
    expect(results.filter(result => result.state === 'conflict')).toHaveLength(1);
    const winner = inputs[results.findIndex(result => result.state === 'active')];
    const rows = await sql('SELECT employee_id,installation_hash,endpoint_fingerprint,generation,encrypted_material,session_hash FROM push_subscriptions');
    expect(rows).toEqual([{ employee_id: winner.employeeId, installation_hash: winner.installationHash, endpoint_fingerprint: winner.endpointFingerprint, generation: winner.generation, encrypted_material: winner.encryptedMaterial, session_hash: winner.sessionHash }]);
    expect(await count('push_deliveries')).toBe(0);
  });
  it('synchronized_same_owner_rotation_fences_stale_generation', async () => {
    const previous = await enroll();
    let arrived = 0;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    const concurrent: SqlExecutor = { query: (s, signal) => db.query(s, signal), transaction: async (s, signal) => {
      if (++arrived === 2) release();
      await ready;
      return db.transaction(s, signal);
    } };
    const inputs = [1, 2].map(n => ({ ...previous, expectedGeneration: previous.generation, generation: randomUUID(), encryptedMaterial: `QA-rotation-${n}` }));
    const results = await Promise.all(inputs.map(input => sqlSubscriptionRepository(concurrent).enroll(input)));
    expect(arrived).toBe(2);
    expect(results.filter(result => result.state === 'active')).toHaveLength(1);
    expect(results.filter(result => result.state === 'conflict')).toHaveLength(1);
    const winner = inputs[results.findIndex(result => result.state === 'active')];
    expect(await sql('SELECT employee_id,generation,encrypted_material FROM push_subscriptions')).toEqual([{ employee_id: 'QA-E', generation: winner.generation, encrypted_material: winner.encryptedMaterial }]);
  });
  it('concurrent_workers_claim_disjoint_deliveries', async () => {
    await enroll(); for (let n = 0; n < 15; n++) await insertIntent();
    await sqlDeliveryRepository('test', db).materialize((await sql<{ id: string }>('SELECT id FROM notifications')).map(r => r.id));
    const [a, b] = await Promise.all([claim(), claim()]);
    expect(a.length + b.length).toBe(15); expect(new Set([...a, ...b].map(c => c.deliveryId)).size).toBe(15); expect(Math.max(a.length, b.length)).toBeLessThanOrEqual(10);
    for (const leased of [...a, ...b]) { expect(leased.attemptCount).toBe(1); expect(Date.parse(leased.leaseExpiresAt) - Date.now()).toBeGreaterThan(115000); }
  });
  it('empty_allowlist_is_not_null_and_environments_are_separate', async () => {
    await delivery(); const repo = sqlDeliveryRepository('test', db);
    expect(await repo.claim({ now: new Date(), limit: 10, leaseSeconds: 120, mode: 'all', recipientIds: [] })).toHaveLength(0);
    expect(await sqlDeliveryRepository('production', db).claim({ now: new Date(), limit: 10, leaseSeconds: 120, mode: 'all' })).toHaveLength(0);
    expect(await repo.claim({ now: new Date(), limit: 10, leaseSeconds: 120, mode: 'new', recipientIds: ['QA-E'] })).toHaveLength(1);
  });
  it('expired_lease_takeover_fences_old_finish_release_and_defer', async () => {
    await delivery(); const [old] = await claim(); await sql(`UPDATE push_deliveries SET lease_expires_at=now()-interval '1 second'`);
    const [fresh] = await claim(); expect(fresh.leaseToken).not.toBe(old.leaseToken); expect(fresh.attemptCount).toBe(2);
    const repo = sqlDeliveryRepository('test', db);
    expect(await repo.finish(old, { state: 'provider_accepted' })).toBe(false); expect(await repo.release(old)).toBe(false); expect(await repo.defer(old, new Date(Date.now() + 60000))).toBe(false);
    expect(await repo.finish(fresh, { state: 'provider_accepted' })).toBe(true);
    expect((await sql('SELECT read_at FROM notifications'))[0].read_at).toBeNull(); expect(await count('schedule_acknowledgements')).toBe(0);
  });
  it.each(['queued', 'retry_pending'])('quiet_deferral_restores_%s_attempt_and_original_expiry', async status => {
    const value = await delivery(); if (status === 'retry_pending') await sql(`UPDATE push_deliveries SET status='retry_pending',attempt_count=2`);
    const [leased] = await claim(); const repo = sqlDeliveryRepository('test', db);
    expect(await repo.defer(leased, new Date(Date.now() + 60000))).toBe(true); expect(await repo.release(leased)).toBe(false);
    const [row] = await sql('SELECT status,attempt_count,expires_at FROM push_deliveries');
    expect(row.status).toBe(status); expect(row.attempt_count).toBe(status === 'queued' ? 0 : 2); expect((row.expires_at as Date).toISOString()).toBe(value.expiresAt);
  });
  it('deferral_at_expiry_is_terminal_without_violating_due_constraint', async () => {
    const value = await delivery(); const [leased] = await claim();
    expect(await sqlDeliveryRepository('test', db).defer(leased, new Date(value.expiresAt))).toBe(true);
    expect((await sql('SELECT status,attempt_count FROM push_deliveries'))[0]).toEqual({ status: 'expired', attempt_count: 0 });
  });
  it.each(['session', 'inactive', 'generation', 'cancelled', 'subscription_expired'])('%s_change_fences_claim_completion', async kind => {
    await delivery(); const [leased] = await claim();
    await sql(kind === 'session' ? `DELETE FROM employee_sessions` : kind === 'inactive' ? `UPDATE employees SET active=false WHERE id='QA-E'` : kind === 'generation' ? `UPDATE push_subscriptions SET generation='QA-new'` : kind === 'cancelled' ? `UPDATE notifications SET push_state='cancelled',cancelled_at=now()` : `UPDATE push_subscriptions SET consent_at=now()-interval '2 hours',expires_at=now()-interval '1 hour'`);
    expect(await sqlDeliveryRepository('test', db).finish(leased, { state: 'provider_accepted' })).toBe(false);
  });
  it('natural_session_expiry_keeps_consent_but_explicit_delete_fences_all_paths', async () => {
    await enroll(); await sql(`UPDATE employee_sessions SET expires_at=now()-interval '1 second'`);
    expect(await sqlSubscriptionRepository(db).listActive('QA-E', 'test')).toHaveLength(1);
    const value = await insertIntent(); await sqlDeliveryRepository('test', db).materialize([value.id]); expect(await claim()).toHaveLength(1);
    await sql('DELETE FROM employee_sessions'); expect(await sqlSubscriptionRepository(db).listActive('QA-E', 'test')).toHaveLength(0);
    const next = await insertIntent(); await sqlDeliveryRepository('test', db).materialize([next.id]);
    expect((await sql('SELECT push_state FROM notifications WHERE id=$1', [next.id]))[0].push_state).toBe('no_active_subscription');
  });
  it('self_test_is_one_subscription_generation_and_is_throttled', async () => {
    const enrolled = await enroll(); await enroll('other'); const record = await sqlSubscriptionRepository(db).findInstallation(enrolled.installationHash, 'test');
    const value = intent({ source: { kind: 'SELF_TEST', id: record!.id, version: enrolled.generation }, purpose: 'TEST' });
    const input = { intent: value, proof: enrolled, employeeId: 'QA-E', sessionHash: sessionA };
    expect(await sqlSubscriptionRepository(db).queueSelfTest(input)).toBe(true); expect(await sqlSubscriptionRepository(db).queueSelfTest({ ...input, intent: intent({ ...value, id: 'QA-second', eventKey: 'QA-second' }) })).toBe(false);
    await sqlDeliveryRepository('test', db).materialize([value.id]); const leases = await claim(); expect(leases).toHaveLength(1); expect(leases[0].subscriptionId).toBe(record!.id);
  });
  it('historical_events_do_not_inherit_new_consent_but_unresolved_reminders_do', async () => {
    await enroll(); const event = await insertIntent({ purpose: 'EVENT' }); const reminder = await insertIntent();
    await sql(`UPDATE notifications SET created_at=now()-interval '1 day'`); await sqlDeliveryRepository('test', db).materialize([event.id, reminder.id]);
    const rows = await sql<{ id: string; push_state: string }>('SELECT id,push_state FROM notifications');
    expect(rows.find(r => r.id === event.id)?.push_state).toBe('no_active_subscription'); expect(rows.find(r => r.id === reminder.id)?.push_state).toBe('materialized');
  });
  it('stale_invalidation_cannot_disable_new_enrollment_generation', async () => {
    const enrolled = await enroll(); const record = await sqlSubscriptionRepository(db).findInstallation(enrolled.installationHash, 'test');
    expect(await sqlSubscriptionRepository(db).enroll({ ...enrolled, generation: 'QA-new', expectedGeneration: enrolled.generation })).toEqual({ state: 'active', generation: 'QA-new' });
    await sqlSubscriptionRepository(db).invalidate(record!.id, enrolled.generation);
    expect((await sqlSubscriptionRepository(db).listActive('QA-E', 'test'))[0].generation).toBe('QA-new');
    const value = await insertIntent(); await sqlDeliveryRepository('test', db).materialize([value.id]); await claim();
    await sqlSubscriptionRepository(db).invalidate(record!.id, 'QA-new');
    expect((await sql('SELECT status,encrypted_material FROM push_subscriptions'))[0]).toEqual({ status: 'invalid', encrypted_material: null });
    expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('cancelled');
  });
  it('retry_exhaustion_and_expiry_sweeps_are_terminal', async () => {
    await delivery(); const repo = sqlDeliveryRepository('test', db); const [leased] = await claim();
    await sql(`UPDATE push_deliveries SET attempt_count=5`);
    expect(await repo.finish(leased, { state: 'retry_pending', nextAttemptAt: new Date(Date.now() + 60000).toISOString() })).toBe(true);
    expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('failed');
    const expired = await insertIntent({ dueAt: new Date(Date.now() - 2000).toISOString(), expiresAt: new Date(Date.now() - 1000).toISOString() });
    await repo.materialize([expired.id]); expect((await sql('SELECT push_state FROM notifications WHERE id=$1', [expired.id]))[0].push_state).toBe('expired');
  });
  it.each(['queued', 'retry_pending'] as const)('release_restores_%s_attempt_and_expiry', async previous => {
    const value = await delivery(); if (previous === 'retry_pending') await sql(`UPDATE push_deliveries SET status='retry_pending',attempt_count=2`);
    const repo = sqlDeliveryRepository('test', db); const [leased] = await claim(); expect(await repo.release(leased)).toBe(true);
    const [row] = await sql('SELECT status,attempt_count,expires_at,lease_token FROM push_deliveries');
    expect(row.status).toBe(previous); expect(row.attempt_count).toBe(previous === 'queued' ? 0 : 2); expect(row.lease_token).toBeNull(); expect((row.expires_at as Date).toISOString()).toBe(value.expiresAt);
  });
  it.each(['provider_accepted', 'retry_pending', 'failed', 'expired', 'cancelled'] as const)('finish_%s_persists_exact_terminal_or_retry_state', async state => {
    await delivery(); const [leased] = await claim(); const repo = sqlDeliveryRepository('test', db);
    expect(await repo.finish(leased, { state, ...(state === 'retry_pending' ? { nextAttemptAt: new Date(Date.now() + 60000).toISOString() } : {}), errorClass: state === 'failed' ? 'qa_failure' : undefined })).toBe(true);
    const [row] = await sql('SELECT status,accepted_at,lease_token,error_class FROM push_deliveries'); expect(row.status).toBe(state); expect(row.lease_token).toBeNull(); expect(Boolean(row.accepted_at)).toBe(state === 'provider_accepted');
    if (state === 'failed') expect(row.error_class).toBe('qa_failure'); expect(await repo.finish(leased, { state: 'provider_accepted' })).toBe(false);
  });
  it('retry_at_expiry_and_expired_or_exhausted_claim_sweeps_are_terminal', async () => {
    const value = await delivery(); const repo = sqlDeliveryRepository('test', db); const [leased] = await claim();
    expect(await repo.finish(leased, { state: 'retry_pending', nextAttemptAt: value.expiresAt })).toBe(true); expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('expired');
    const expired = await insertIntent(), exhausted = await insertIntent(); await repo.materialize([expired.id, exhausted.id]);
    await sql(`UPDATE push_deliveries SET next_attempt_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE notification_id=$1`, [expired.id]);
    await sql('UPDATE push_deliveries SET attempt_count=5 WHERE notification_id=$1', [exhausted.id]); expect(await claim()).toHaveLength(0);
    const rows = await sql('SELECT notification_id,status FROM push_deliveries'); expect(rows.find(r => r.notification_id === expired.id)?.status).toBe('expired'); expect(rows.find(r => r.notification_id === exhausted.id)?.status).toBe('failed');
  });
  it('materialize_ignores_future_cancelled_foreign_and_wrong_self_test_generation', async () => {
    await enroll(); const future = await insertIntent({ dueAt: new Date(Date.now()+60000).toISOString() }), cancelled = await insertIntent(), foreign = await insertIntent({ environment: 'production' }), wrongTest = await insertIntent({ purpose: 'TEST', source: { kind: 'SELF_TEST', id: 'QA-wrong-subscription', version: 'QA-wrong-generation' } });
    await db.transaction(cancelNotificationStatements(cancelled.source));
    await sql(`UPDATE notifications SET push_state='pending',cancelled_at=NULL WHERE id=$1`, [future.id]);
    await sqlDeliveryRepository('test', db).materialize([future.id,cancelled.id,foreign.id,wrongTest.id]); expect(await count('push_deliveries')).toBe(0);
    expect((await sql('SELECT push_state FROM notifications WHERE id=$1',[future.id]))[0].push_state).toBe('pending'); expect((await sql('SELECT push_state FROM notifications WHERE id=$1',[wrongTest.id]))[0].push_state).toBe('no_active_subscription');
  });
  it('transaction_abort_rolls_back_and_ambiguous_commit_preserves_durable_identity', async () => {
    const controller = new AbortController(); setTimeout(() => controller.abort(), 100);
    await expect(db.transaction([{ text: `UPDATE employees SET first_name='QA-changed' WHERE id='QA-E'`, values: [] }, { text: 'SELECT pg_sleep(2)', values: [] }], controller.signal)).rejects.toThrow();
    expect((await sql(`SELECT first_name FROM employees WHERE id='QA-E'`))[0].first_name).toBe('QA-Avery');
    const value = intent(); const ambiguous: SqlExecutor = { query: db.query, transaction: async statements => { await db.transaction(statements); throw new Error('QA-response-lost-after-commit'); } };
    await expect(ambiguous.transaction(notificationIntentStatements([value]))).rejects.toThrow(/response-lost/);
    await db.transaction(notificationIntentStatements([value])); expect(await count('notifications')).toBe(1);
  });
});

describe('logout and reminder SQL', () => {
  it('push_cleanup_error_cannot_rollback_session_delete', async () => {
    const enrolled = await enroll(); const key = Buffer.alloc(32, 7);
    const config = readNotificationConfig({ PUSH_ENVIRONMENT: 'test', PUSH_SUBSCRIPTION_ENCRYPTION_KEY: key.toString('base64url') });
    const proof: InstallationProof = { ...enrolled, associatedSessionHash: sessionA };
    const jar = new Map<string, string>([['fuel_session', sessionToken], [INSTALLATION_COOKIE, sealInstallationProof(proof, key)]]);
    const cookies = { get: (name: string) => jar.has(name) ? { value: jar.get(name)! } : undefined, set: (name: string, value: string) => { jar.set(name, value); }, delete: (name: string) => { jar.delete(name); } };
    const deps: LogoutDeps = { clock: () => new Date(), secureCookies: false, revokeSession: async hash => { await sql('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]); }, subscriptions: () => sqlSubscriptionRepository(db), sealReceipt: value => sealCleanupReceipt(value, key), openReceipt: value => openCleanupReceipt(value, key, new Date()) };
    await sql('ALTER TABLE push_subscriptions RENAME TO qa_unavailable_subscriptions');
    try { expect(await terminatePortalSession({ sessionToken, installation: proof, cookies, deps })).toEqual({ state: 'pending' }); }
    finally { await sql('ALTER TABLE qa_unavailable_subscriptions RENAME TO push_subscriptions'); }
    expect(jar.has('fuel_session')).toBe(false); expect((await sql('SELECT 1 FROM employee_sessions WHERE token_hash=$1', [sessionA]))).toHaveLength(0); expect(jar.has(CLEANUP_COOKIE)).toBe(true);
    expect(await reconcilePendingInstallation(cookies, config, deps)).toEqual({ state: 'complete' }); expect(jar.has(CLEANUP_COOKIE)).toBe(false);
    expect(await sqlSubscriptionRepository(db).listActive('QA-E', 'test')).toHaveLength(0);
  });
  it('thirty_plus_real_accounts_continue_after_persisted_pages_and_ineligible_first_accounts', async () => {
    const now = new Date(new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10) + 'T16:00:00Z'); const day = new Date(now); day.setUTCDate(day.getUTCDate() - ((day.getUTCDay()+6)%7)); const currentWeek = day.toISOString().slice(0,10);
    await sql(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) SELECT 'QA-R'||lpad(i::text,2,'0'),'QA-Reader','Fictional','QA-NO-PHONE','EMPLOYEE','loc-1',i<>0 FROM generate_series(0,34) i`);
    await sql(`INSERT INTO employee_location_eligibility SELECT id,'loc-1' FROM employees WHERE id LIKE 'QA-R%'`);
    await sql(`INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES ($1,$2,'QA-M')`, [currentWeek,new Date(now.getTime()+20*3600000).toISOString()]);
    await sql(`INSERT INTO weekly_availability_submissions(week_start,employee_id) VALUES ($1,'QA-R01')`,[currentWeek]);
    const config = { ...readNotificationConfig({ PUSH_ENVIRONMENT: 'test' }), featureEnabled: true }; let elapsed = 0; const starts: number[] = [];
    const charged: SqlExecutor = { query: async <T>(statement: Parameters<SqlExecutor['query']>[0]) => { starts.push(elapsed); const result=await db.query<T>(statement); elapsed+=200; return result; }, transaction: async statements => { starts.push(elapsed); const result=await db.transaction(statements); elapsed+=1000; return result; } };
    const totals:number[]=[];
    for(let run=0;run<8;run++) { elapsed=0; starts.length=0; await runReminders({ executor:charged,state:sqlNotificationStateRepository(charged),config,clock:()=>new Date(now.getTime()+elapsed) }); expect(Math.max(...starts)).toBeLessThan(20000); const rows=await sql(`SELECT employee_id FROM notifications WHERE source_kind='AVAILABILITY' AND purpose='REMINDER'`); totals.push(rows.length); if(rows.length===35)break; }
    expect(totals[0]).toBeGreaterThan(0); expect(totals[0]).toBeLessThan(35); expect(totals.at(-1)).toBe(35);
    expect((await sql(`SELECT employee_id FROM notifications WHERE employee_id IN ('QA-R00','QA-R01')`))).toHaveLength(0); expect((await sql(`SELECT id FROM notifications WHERE employee_id='QA-R34'`))).toHaveLength(1);
    const state=sqlNotificationStateRepository(db); let hydrated=0; await state.listReminderCandidates(now,100,()=>hydrated===0,async()=>{hydrated++;}); expect(hydrated).toBe(1);
  });
  it.each(['retry', 'budget_resume'] as const)('schedule_recipient_JSON_guards_ack_access_and_actual_source_conflict_%s', async mode => {
    const now=new Date(new Date(Date.now()-4*3600000).toISOString().slice(0,10)+'T16:00:00Z'),start=new Date(now);start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7)+7);const upcoming=start.toISOString().slice(0,10),shiftDate=new Date(start.getTime()+4*86400000).toISOString().slice(0,10);
    await sql(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) SELECT 'QA-S'||i,'QA-Schedule','Fictional','QA-NO-PHONE','EMPLOYEE','loc-1' FROM generate_series(0,3) i`);await sql(`INSERT INTO employee_location_eligibility SELECT id,'loc-1' FROM employees WHERE id LIKE 'QA-S%'`);
    await sql(`INSERT INTO schedules(id,location_id,week_start,created_by) VALUES ('QA-upcoming','loc-1',$1,'QA-M')`,[upcoming]);await sql(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT 'QA-upcoming-'||i,'QA-upcoming','QA-S'||i,$1,'09:00','17:00' FROM generate_series(0,3) i`,[shiftDate]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:upcoming,managerId:'QA-M'},db);await sql(`UPDATE schedule_publication_revisions SET created_at=now()-interval '2 days' WHERE week_start=$1`,[upcoming]);
    await acknowledgeScheduleWeek({weekStart:upcoming,employeeId:'QA-S0'},db);await sql(`DELETE FROM employee_location_eligibility WHERE employee_id='QA-S1'`);await sql(`UPDATE employees SET active=false WHERE id='QA-S2'`);
    // Exercise source reconstruction when no durable reminder exists; normal publication already creates one.
    await sql(`DELETE FROM notifications WHERE purpose='REMINDER' AND source_kind='SCHEDULE'`);
    let conflicts=0,attempts=0,elapsed=0;let armed=true;const traced:SqlExecutor={query:db.query,transaction:async statements=>{if(statements.some(s=>s.text.includes('notification_source_conflict'))){attempts++;if(armed&&conflicts<(mode==='retry'?2:1))await sql(`UPDATE schedules SET updated_at=updated_at+interval '1 microsecond' WHERE id='QA-upcoming'`);}try{return await db.transaction(statements);}catch(error){expect((error as {code:string}).code).toBe('22P02');expect((error as Error).message).toContain('notification_source_conflict');conflicts++;if(mode==='budget_resume')elapsed=20000;throw error;}}};
    const config={...readNotificationConfig({PUSH_ENVIRONMENT:'test'}),featureEnabled:true},deps={executor:traced,state:sqlNotificationStateRepository(traced),config,clock:()=>new Date(now.getTime()+elapsed)};await runReminders(deps);
    if(mode==='budget_resume'){expect(attempts).toBe(1);expect((await sql(`SELECT id FROM notifications WHERE purpose='REMINDER'`))).toHaveLength(0);armed=false;elapsed=0;await runReminders(deps);}else expect(attempts).toBe(3);
    const reminders=await sql<{employee_id:string}>(`SELECT employee_id FROM notifications WHERE purpose='REMINDER' AND source_kind='SCHEDULE'`);expect(reminders).toEqual([{employee_id:'QA-S3'}]);await runReminders(deps);expect((await sql(`SELECT id FROM notifications WHERE purpose='REMINDER'`))).toHaveLength(1);
  });
  it('availability_zero_hour_submission_and_deadline_summary_use_real_sources', async () => {
    const actualNow = new Date(); const now = new Date(new Date(actualNow.getTime() - 4 * 3600000).toISOString().slice(0, 10) + 'T16:00:00Z'); const localDay = new Date(now.getTime() - 4 * 3600000).toISOString().slice(0, 10); const day = new Date(`${localDay}T12:00:00Z`); day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7)); const currentWeek = day.toISOString().slice(0, 10);
    await sql(`INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES ($1,$2,'QA-M')`, [currentWeek, new Date(now.getTime() + 20 * 3600000).toISOString()]);
    await sql(`INSERT INTO weekly_availability_submissions(week_start,employee_id) VALUES ($1,'QA-E')`, [currentWeek]);
    const config = { ...readNotificationConfig({ PUSH_FEATURE_ENABLED: 'true', PUSH_ENVIRONMENT: 'test' }), featureEnabled: true };
    const state = sqlNotificationStateRepository(db); const deps = { executor: db, state, config, clock: () => now };
    await runReminders(deps); await runReminders(deps);
    expect((await sql(`SELECT * FROM notifications WHERE source_kind='AVAILABILITY' AND employee_id='QA-E' AND purpose='REMINDER'`))).toHaveLength(0);
    expect((await sql(`SELECT * FROM notifications WHERE source_kind='AVAILABILITY' AND employee_id='QA-F' AND purpose='REMINDER'`))).toHaveLength(1);
    await sql(`UPDATE schedule_week_settings SET availability_deadline=now()-interval '1 hour'`);
    await runReminders(deps); await runReminders(deps);
    expect((await sql(`SELECT * FROM notifications WHERE source_kind='MANAGER_SUMMARY'`))).toHaveLength(2);
  });
  it('claimed_delivery_cancellation_is_atomic_with_source_resolution', async () => {
    await delivery(); const [leased] = await claim();
    await db.transaction(cancelNotificationStatements(leased.intent.source));
    expect(await sqlDeliveryRepository('test', db).finish(leased, { state: 'provider_accepted' })).toBe(false);
    expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('cancelled');
  });
});


describe('deadline writers and persistent grouping', () => {
  it('deadline_change_cancels_claimed_old_version_without_replaying_same_day_budget', async () => {
    const deadline = new Date(Date.now() + 30 * 3600000).toISOString();
    await setAvailabilityDeadline({ weekStart: week, deadlineIso: deadline, updatedBy: 'QA-M' });
    await delivery({ source: { kind: 'AVAILABILITY', id: week, version: deadline } });
    const [leased] = await claim();
    await setAvailabilityDeadline({ weekStart: week, deadlineIso: new Date(Date.now() + 40 * 3600000).toISOString(), updatedBy: 'QA-M' });
    expect(await sqlDeliveryRepository('test', db).finish(leased, { state: 'provider_accepted' })).toBe(false);
    expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('cancelled');
  });
  it('zero_hour_submission_cancels_claimed_reminder_and_deadline_guard_rolls_back', async () => {
    const deadline = new Date(Date.now() + 20 * 3600000).toISOString();
    await setAvailabilityDeadline({ weekStart: week, deadlineIso: deadline, updatedBy: 'QA-M' });
    await delivery({ source: { kind: 'AVAILABILITY', id: week, version: deadline } }); const [leased] = await claim();
    await replaceWeeklyAvailability('QA-E', week, [], [0, 1, 2, 3, 4, 5, 6]);
    expect(await count('weekly_availability_submissions')).toBe(1); expect(await count('weekly_availability_windows')).toBe(0);
    expect(await sqlDeliveryRepository('test', db).finish(leased, { state: 'provider_accepted' })).toBe(false);
    await sql(`UPDATE schedule_week_settings SET availability_deadline=now()-interval '1 second'`);
    await expect(replaceWeeklyAvailability('QA-F', week, [], [0, 1, 2, 3, 4, 5, 6])).rejects.toThrow(/locked/);
    expect(await count('weekly_availability_submissions')).toBe(1);
  });
  it('concurrent_manager_groups_consume_distinct_items_once_and_revalidate_resolved_members', async () => {
    await createTimeOffRequest({ employeeId: 'QA-E', startDate: '2030-10-11', endDate: '2030-10-11' }, db);
    await createTimeOffRequest({ employeeId: 'QA-F', startDate: '2030-10-12', endDate: '2030-10-12' }, db);
    await sql(`UPDATE notifications SET due_at=now()-interval '1 second'`);
    const config = { ...readNotificationConfig({ PUSH_ENVIRONMENT: 'test' }), featureEnabled: true };
    const now = new Date(new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10) + 'T16:00:00Z');
    let waiting=0,groupConflicts=0;let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});
    const synchronized:SqlExecutor={query:db.query,transaction:async statements=>{if(statements.some(s=>s.text.includes('notification_group_conflict'))&&statements[0].values[1]==='QA-M'&&waiting<2){waiting++;if(waiting===2)release();await barrier;}try{return await db.transaction(statements);}catch(error){if((error as {code:string}).code==='22P02'&&(error as Error).message.includes('notification_group_conflict'))groupConflicts++;throw error;}}};
    const state = sqlNotificationStateRepository(db); const deps = { executor: synchronized, state, config, clock: () => now };
    await Promise.all([runReminders(deps), runReminders(deps)]); expect(groupConflicts).toBeGreaterThan(0);
    const groups = await sql<{ id: string; employee_id: string; item_keys: string[] }>(`SELECT id,employee_id,item_keys FROM notifications WHERE source_kind='MANAGER_SUMMARY'`);
    expect(groups).toHaveLength(2); expect(groups.every(g => g.item_keys.length === 2)).toBe(true);
    const requests = await sql<{ id: string }>('SELECT id FROM time_off_requests ORDER BY id');
    await reviewTimeOffRequest({ requestId: requests[0].id, managerId: 'QA-M', status: 'APPROVED' }, db);
    const group = await state.findIntent(groups[0].id); expect(group).not.toBeNull();
    expect((await state.check(group!, group!.employeeId, now)).deliverable).toBe(true);
    await reviewTimeOffRequest({ requestId: requests[1].id, managerId: 'QA-M', status: 'DENIED' }, db);
    expect((await state.check(group!, group!.employeeId, now)).deliverable).toBe(false);
    await runReminders(deps); expect(await count('notifications')).toBeGreaterThan(0);
    expect((await sql(`SELECT push_state FROM notifications WHERE id=$1`, [group!.id]))[0].push_state).toBe('cancelled');
  });
  it('all_signed_recovery_obligations_delete_renewed_and_associated_sessions', async () => {
    const enrolled = await enroll(); const key = Buffer.alloc(32, 7); const issuedAt = new Date().toISOString(), expiresAt = new Date(Date.now() + 86400000).toISOString();
    const proof: InstallationProof = { installationHash: enrolled.installationHash, generation: enrolled.generation, environment: 'test', associatedSessionHash: sessionA };
    const receipt = { ...proof, sessionHash: sessionA, revokeSession: true, issuedAt, expiresAt, sessionRevocations: [{ sessionHash: sessionB, issuedAt, expiresAt }] };
    const jar = new Map([[INSTALLATION_COOKIE, sealInstallationProof(proof, key)], [CLEANUP_COOKIE, sealCleanupReceipt(receipt, key)]]);
    const cookies = { get: (name: string) => jar.has(name) ? { value: jar.get(name)! } : undefined, set: (name: string, value: string) => { jar.set(name, value); }, delete: (name: string) => { jar.delete(name); } };
    const config = readNotificationConfig({ PUSH_ENVIRONMENT: 'test', PUSH_SUBSCRIPTION_ENCRYPTION_KEY: key.toString('base64url') });
    const deps: LogoutDeps = { clock: () => new Date(), secureCookies: false, revokeSession: async hash => { await sql('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]); }, subscriptions: () => sqlSubscriptionRepository(db), sealReceipt: value => sealCleanupReceipt(value, key), openReceipt: value => openCleanupReceipt(value, key, new Date()) };
    expect(await reconcilePendingInstallation(cookies, config, deps)).toEqual({ state: 'complete' }); expect(await count('employee_sessions')).toBe(0);
    expect(await sqlSubscriptionRepository(db).listActive('QA-E', 'test')).toHaveLength(0);
    jar.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...receipt, recoveryBlocked: true }, key));
    expect(await reconcilePendingInstallation(cookies, config, deps)).toEqual({ state: 'pending' }); expect(jar.has(CLEANUP_COOKIE)).toBe(true);
  });
  it('configured_coverage_groups_keep_routine_lifetime_and_new_items_survive_consumed_day_variants', async () => {
    const now = new Date(new Date(Date.now()-4*3600000).toISOString().slice(0,10)+'T16:00:00Z'); const day = new Date(now); day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7)); const currentWeek=day.toISOString().slice(0,10);
    await sql(`DELETE FROM location_coverage_windows`); await sql(`INSERT INTO schedules(id,location_id,week_start,created_by) VALUES ('QA-current','loc-1',$1,'QA-M')`,[currentWeek]);
    await sql(`INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time,minimum_staff) VALUES ('QA-gap','loc-1',$1,'18:00','19:00',2)`,[now.getUTCDay()]);
    await createTimeOffRequest({ employeeId:'QA-E',startDate:'2030-10-11',endDate:'2030-10-11' },db); await sql(`UPDATE notifications SET due_at=now()-interval '1 second'`);
    const state=sqlNotificationStateRepository(db),config={...readNotificationConfig({PUSH_ENVIRONMENT:'test'}),featureEnabled:true}; const deps={executor:db,state,config,clock:()=>now}; await runReminders(deps);
    const groups=await sql<{id:string;due_at:Date;expires_at:Date}>(`SELECT id,due_at,expires_at FROM notifications WHERE source_kind='MANAGER_SUMMARY'`); expect(groups).toHaveLength(4);
    const gapIds:string[]=[]; const routineIds:string[]=[]; for(const row of groups){const intent=await state.findIntent(row.id);const source=await state.readSource(intent!.source);expect(source?.kind).toBe('MANAGER_SUMMARY');if(source?.kind==='MANAGER_SUMMARY'&&source.items.some(item=>item.type==='COVERAGE_GAP'))gapIds.push(row.id);else routineIds.push(row.id);} expect(gapIds).toHaveLength(2);expect(routineIds).toHaveLength(2);
    const gapIntents=await Promise.all(gapIds.map(id=>state.findIntent(id))); await sql('DELETE FROM location_coverage_windows'); await runReminders(deps);
    for(const id of gapIds){const intent=gapIntents.find(value=>value?.id===id);expect((await state.check(intent!,intent!.employeeId,now)).deliverable).toBe(false);expect((await sql('SELECT push_state FROM notifications WHERE id=$1',[id]))[0].push_state).toBe('cancelled');}
    for(const id of routineIds){const row=(await sql<{due_at:Date;expires_at:Date}>('SELECT due_at,expires_at FROM notifications WHERE id=$1',[id]))[0],original=groups.find(g=>g.id===id)!;expect(row).toEqual({due_at:original.due_at,expires_at:original.expires_at});}
    await sql(`INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time,minimum_staff) VALUES ('QA-gap','loc-1',$1,'08:00','09:00',2)`,[(now.getUTCDay()+1)%7]);
    const quiet=new Date(now.getTime()+10*3600000);const seen:unknown[][]=[];const traced:SqlExecutor={transaction:db.transaction,query:async<T>(statement:Parameters<SqlExecutor['query']>[0])=>{if(statement.text.includes('jsonb_array_elements($2::jsonb) item'))seen.push([...statement.values]);return db.query<T>(statement);}};
    await runReminders({...deps,executor:traced,clock:()=>quiet});const total=await count('notifications');await runReminders({...deps,executor:traced,clock:()=>quiet});expect(await count('notifications')).toBe(total);expect(seen.length).toBeGreaterThan(0);expect(seen.some(values=>JSON.parse(String(values[1])).some((variants:string[])=>variants.length===2))).toBe(true);
    expect((await sql(`SELECT id FROM notifications WHERE source_kind='MANAGER_SUMMARY'`))).toHaveLength(6);
  });
  it('self_test_throttle_rolls_back_when_outbox_insert_fails', async () => {
    const enrolled = await enroll(); const record = await sqlSubscriptionRepository(db).findInstallation(enrolled.installationHash, 'test');
    const value = intent({ source: { kind: 'SELF_TEST', id: record!.id, version: enrolled.generation }, purpose: 'TEST' });
    await sql(`ALTER TABLE notifications ADD CONSTRAINT qa_test_reject CHECK (purpose <> 'TEST')`);
    try { await expect(sqlSubscriptionRepository(db).queueSelfTest({ intent: value, proof: enrolled, employeeId: 'QA-E', sessionHash: sessionA })).rejects.toThrow(/qa_test_reject/); }
    finally { await sql('ALTER TABLE notifications DROP CONSTRAINT qa_test_reject'); }
    expect((await sql('SELECT last_test_at FROM push_subscriptions'))[0].last_test_at).toBeNull(); expect(await count('notifications')).toBe(0);
  });
});


async function sqlWorker() {
  const enrolled = await enroll(); const key = Buffer.alloc(32, 3); const pair = createECDH('prime256v1'); pair.setPrivateKey(Buffer.alloc(32, 1));
  const material = encryptSubscriptionMaterial({ endpoint: 'https://fcm.googleapis.com/fcm/send/QA-never-contact', expirationTime: null, keys: { p256dh: pair.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') } }, key, enrolled);
  await sql('UPDATE push_subscriptions SET encrypted_material=$1', [material]);
  const record = await sqlSubscriptionRepository(db).findInstallation(enrolled.installationHash, 'test');
  const value = await insertIntent({ id: randomUUID(), type: 'SELF_TEST', source: { kind: 'SELF_TEST', id: record!.id, version: enrolled.generation }, effectiveVersion: enrolled.generation, purpose: 'TEST', urgency: 'high' });
  const config = { ...readNotificationConfig({ PUSH_ENVIRONMENT: 'test', PUSH_SUBSCRIPTION_ENCRYPTION_KEY: key.toString('base64url') }), featureEnabled: true, deliveryEnabled: true, testDeliveryEnabled: true, testAccountIds: ['QA-E'] };
  const deps: WorkerDeps = { config, clock: () => new Date(), executor: db, deliveries: sqlDeliveryRepository('test', db), subscriptions: sqlSubscriptionRepository(db), state: sqlNotificationStateRepository(db), sender: { send: async () => ({ kind: 'accepted' }) } };
  return { deps, value };
}
describe('real SQL worker recovery with a no-network sender', () => {
  it('healthy_worker_cleans_removed_session_after_failed_logout_without_a_returning_browser', async () => {
    const { deps, value } = await sqlWorker();
    const [before] = await sql('SELECT * FROM push_subscriptions');
    await deps.deliveries.materialize([value.id]);
    const [leased] = await claim();
    await sql("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES ('QA-other-device-session','QA-E',now()+interval '1 day')");
    const other = await enroll('protected-device', 'QA-E', 'QA-other-device-session');
    const foreign = await enroll('other-environment');
    await sql("UPDATE push_subscriptions SET environment='production' WHERE installation_hash=$1", [foreign.installationHash]);
    await sql("UPDATE employee_sessions SET expires_at=now()-interval '1 day' WHERE token_hash='QA-other-device-session'");
    const key = Buffer.alloc(32, 7);
    const proof: InstallationProof = { installationHash: String(before.installation_hash), generation: String(before.generation), environment: 'test', associatedSessionHash: sessionA };
    const jar = new Map<string, string>([['fuel_session', sessionToken]]);
    const cookies = { get: (name: string) => jar.has(name) ? { value: jar.get(name)! } : undefined, set: (name: string, value: string) => { jar.set(name, value); }, delete: (name: string) => { jar.delete(name); } };
    const logout: LogoutDeps = { clock: () => new Date(), secureCookies: false,
      revokeSession: async hash => { await sql('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]); },
      subscriptions: () => sqlSubscriptionRepository(db), sealReceipt: receipt => sealCleanupReceipt(receipt, key), openReceipt: receipt => openCleanupReceipt(receipt, key, new Date()) };
    await sql('ALTER TABLE push_subscriptions RENAME TO qa_unavailable_subscriptions');
    try { expect(await terminatePortalSession({ sessionToken, installation: proof, cookies, deps: logout })).toEqual({ state: 'pending' }); }
    finally { await sql('ALTER TABLE qa_unavailable_subscriptions RENAME TO push_subscriptions'); }
    expect(jar.has('fuel_session')).toBe(false);
    expect(await sql('SELECT 1 FROM employee_sessions WHERE token_hash=$1', [sessionA])).toHaveLength(0);
    expect((await sql('SELECT status FROM push_subscriptions WHERE id=$1', [before.id]))[0].status).toBe('active');
    const send = vi.fn(async () => ({ kind: 'accepted' as const })); deps.sender = { send };
    await runDispatch({ mode: 'all', deps });
    const [after] = await sql('SELECT status,generation,encrypted_material,session_hash FROM push_subscriptions WHERE id=$1', [before.id]);
    expect(after).toEqual({ status: 'detached', generation: expect.any(String), encrypted_material: null, session_hash: sessionA });
    expect(after.generation).not.toBe(before.generation);
    expect(await sql('SELECT status,generation,lease_token,lease_expires_at FROM push_deliveries WHERE subscription_id=$1', [before.id])).toEqual([{ status: 'cancelled', generation: before.generation, lease_token: null, lease_expires_at: null }]);
    expect(await deps.deliveries.finish(leased, { state: 'provider_accepted' })).toBe(false);
    for (const protectedDevice of [other, foreign]) {
      expect((await sql('SELECT status,generation,encrypted_material FROM push_subscriptions WHERE installation_hash=$1', [protectedDevice.installationHash]))[0]).toEqual({ status: 'active', generation: protectedDevice.generation, encrypted_material: 'QA-fictional-ciphertext' });
    }
    expect(await sqlSubscriptionRepository(db).listActive('QA-E', 'test')).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
    expect(jar.has(CLEANUP_COOKIE)).toBe(true);
  });
  it('worker_cleanup_skips_a_locked_concurrent_enrollment_refresh_and_preserves_its_current_association', async () => {
    const { deps } = await sqlWorker();
    const [before] = await sql('SELECT * FROM push_subscriptions');
    await sql("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES ('QA-fresh-session','QA-E',now()+interval '1 day')");
    await sql('DELETE FROM employee_sessions WHERE token_hash=$1', [sessionA]);
    const connection = new Client({ connectionString: database.connectionString });
    await connection.connect();
    let unlock!: () => void;
    const held = new Promise<void>(resolve => { unlock = resolve; });
    let updated!: () => void;
    const locked = new Promise<void>(resolve => { updated = resolve; });
    const executor: SqlExecutor = { query: db.query, transaction: async statements => {
      await connection.query('BEGIN');
      try {
        const rows: unknown[][] = [];
        for (const statement of statements) rows.push((await connection.query(statement.text, [...statement.values])).rows);
        updated(); await held;
        await connection.query('COMMIT'); return rows;
      } catch (error) { await connection.query('ROLLBACK'); throw error; }
    } };
    const refreshed = sqlSubscriptionRepository(executor).enroll({ employeeId: 'QA-E', environment: 'test',
      installationHash: String(before.installation_hash), endpointFingerprint: String(before.endpoint_fingerprint),
      encryptedMaterial: 'QA-refreshed-material', sessionHash: 'QA-fresh-session', generation: String(before.generation),
      expectedGeneration: String(before.generation), expiresAt: null });
    try {
      await locked;
      const send = vi.fn(async () => ({ kind: 'accepted' as const })); deps.sender = { send };
      // Retry mode runs cleanup even without a new-intent scan. The locked row is
      // skipped instead of waiting on or detaching its now-current association.
      await runDispatch({ mode: 'retry', deps });
      unlock(); expect(await refreshed).toEqual({ state: 'active', generation: before.generation });
      await runDispatch({ mode: 'retry', deps });
      expect((await sql('SELECT status,generation,session_hash,encrypted_material FROM push_subscriptions'))[0]).toEqual({ status: 'active', generation: before.generation, session_hash: 'QA-fresh-session', encrypted_material: 'QA-refreshed-material' });
      expect(send).not.toHaveBeenCalled();
    } finally { unlock(); await refreshed; await connection.end(); }
  });
  it('worker_cleanup_uses_one_bounded_batch_per_invocation', async () => {
    const { deps, value } = await sqlWorker();
    for (let i = 0; i < 10; i++) await enroll('batch-' + i);
    await deps.deliveries.materialize([value.id]);
    await sql('DELETE FROM employee_sessions WHERE token_hash=$1', [sessionA]);
    deps.sender = { send: async () => { throw Error('No provider call is permitted'); } };
    await runDispatch({ mode: 'retry', deps });
    expect(await sql("SELECT id FROM push_subscriptions WHERE status='detached' AND encrypted_material IS NULL")).toHaveLength(10);
    expect(await sql("SELECT id FROM push_subscriptions WHERE status='active'")).toHaveLength(1);
    await runDispatch({ mode: 'retry', deps });
    expect(await sql("SELECT id FROM push_subscriptions WHERE status='detached' AND encrypted_material IS NULL")).toHaveLength(11);
  });
  it('dispatch_materializes_claims_and_sends_only_after_transaction_commit', async () => {
    const { deps } = await sqlWorker(); let inTransaction = false; let sent = 0;
    const tracked: SqlExecutor = { query: db.query, transaction: async statements => { inTransaction = true; try { return await db.transaction(statements); } finally { inTransaction = false; } } };
    deps.deliveries = sqlDeliveryRepository('test', tracked); deps.sender = { send: async () => { expect(inTransaction).toBe(false); sent++; return { kind: 'accepted' }; } };
    const result = await runDispatch({ mode: 'all', deps }); expect(result.accepted).toBe(1); expect(sent).toBe(1);
    expect((await sql('SELECT status,attempt_count FROM push_deliveries'))[0]).toEqual({ status: 'provider_accepted', attempt_count: 1 });
  });
  it('stalled_sender_is_aborted_at_real_deadline_and_retry_retains_original_expiry', async () => {
    const { deps, value } = await sqlWorker(); let aborted = false;
    deps.sender = { send: async ({ signal }) => { signal.addEventListener('abort', () => { aborted = true; }); return new Promise(() => {}); } };
    const start = performance.now(); const result = await runDispatch({ mode: 'all', deps });
    expect(performance.now() - start).toBeGreaterThanOrEqual(7900); expect(performance.now() - start).toBeLessThan(10000); expect(aborted).toBe(true); expect(result.retried).toBe(1);
    const [row] = await sql('SELECT status,expires_at FROM push_deliveries'); expect(row.status).toBe('retry_pending'); expect((row.expires_at as Date).toISOString()).toBe(value.expiresAt);
  }, 15000);
  it('unknown_finish_commit_is_not_reported_accepted_and_cannot_duplicate_persistence', async () => {
    const { deps } = await sqlWorker(); const original = deps.deliveries.finish;
    deps.deliveries.finish = async (leased, completion) => { await original(leased, completion); throw Error('QA response lost after COMMIT'); };
    const result = await runDispatch({ mode: 'all', deps }); expect(result.accepted).toBe(0);
    expect((await sql('SELECT status FROM push_deliveries'))[0].status).toBe('provider_accepted'); expect(await claim()).toHaveLength(0);
  });
  it('SQL_budget_abort_cancels_real_blocked_statement_without_assuming_commit_rollback', async () => {
    const { deps } = await sqlWorker();
    deps.withSignal = signal => ({ ...deps, executor: { query: async <T>() => { await db.transaction([{ text: 'SET LOCAL statement_timeout=0', values: [] }, { text: 'SELECT pg_sleep(30)', values: [] }], signal); return [] as T[]; }, transaction: (statements, caller) => db.transaction(statements, caller ?? signal) } });
    const start = performance.now(); await expect(runDispatch({ mode: 'all', deps })).rejects.toThrow('worker_budget_exhausted'); expect(performance.now() - start).toBeGreaterThanOrEqual(18500); expect(performance.now() - start).toBeLessThan(22000);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect((await sql(`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND query='SELECT pg_sleep(30)' AND state='active'`))).toHaveLength(0);
  }, 25000);
});
