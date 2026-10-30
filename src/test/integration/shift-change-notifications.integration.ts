import {reviewedFixtureSource} from './shift-change-api';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { fixtureShift, seedShiftChanges, proof, publishFixtureWeek } from './shift-change-fixture';
import { executeShiftChange } from '../../lib/data/shift-changes';
import { runShiftChangeMaintenance } from '../../lib/data/shift-change-maintenance';
import { loadWorkspaceNotificationConfig } from '../../lib/notifications/config';
import { sqlNotificationStateRepository } from '../../lib/data/notification-state';
let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const q = (text: string, values: readonly unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
beforeAll(async () => { db = await createDisposableExchangeDatabase({ mode: 'current-runtime' }); await seedShiftChanges(db.executor,{companyAccess:true}); });
afterAll(async () => db?.dispose());
async function offer(id: string, date: string) {
    const terms = await fixtureShift(db.executor, id, 'e1', date);
    const r = await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), ...terms }, db.executor);
    expect(r.status).toBe('pending');
    if (r.status !== 'pending')
        throw Error('offer failed');
    return r;
}
const tick = async (at: string) => runShiftChangeMaintenance({ executor: db.executor, clock: () => new Date(at), config: await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor), limit: 50 });
it('A056/A060 duplicate ticks commit one system expiry, release participation, and never transfer the assignment', async () => {
    const r = await offer('expiry', '2035-10-02');
    await Promise.all([tick('2035-10-02T12:00:00Z'), tick('2035-10-02T12:00:00Z')]);
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('EXPIRED');
    expect(await q("SELECT actor_employee_id FROM shift_change_events WHERE request_id=$1 AND event_kind='EXPIRED'", [r.requestId])).toEqual([{ actor_employee_id: null }]);
    expect(await q('SELECT * FROM shift_change_participation WHERE exchange_id=$1', [r.requestId])).toEqual([]);
    expect((await q("SELECT employee_id FROM shifts WHERE id='expiry'"))[0].employee_id).toBe('e1');
});
it('A058/A061/A069 invitations reach only eligible peers, revalidate at open, and escalation has truthful provenance', async () => {
    const r = await offer('invite', '2035-10-03');
    await q("DELETE FROM employee_location_eligibility WHERE employee_id='e3'");
    await tick('2035-10-03T04:00:00Z');
    const rows = await q("SELECT id,employee_id,body FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION'", [r.requestId]);
    expect(rows.map(x => x.employee_id)).toEqual(['e2']);
    expect(await q("SELECT actor_employee_id FROM shift_change_events WHERE request_id=$1 AND event_kind='ESCALATED'", [r.requestId])).toEqual([{ actor_employee_id: null }]);
    const state = sqlNotificationStateRepository(db.executor);
    const intent = await state.findIntent(String(rows[0]?.id));
    expect(intent).not.toBeNull();
    if (!intent)
        throw Error('missing invitation');
    expect((await state.check(intent, 'e2', new Date('2035-10-03T11:00:00Z'), 'open')).deliverable).toBe(true);
    await q("DELETE FROM employee_location_eligibility WHERE employee_id='e2'");
    expect((await state.check(intent, 'e2', new Date('2035-10-03T11:00:00Z'), 'open')).deliverable).toBe(false);
    expect((await state.check(intent,'e2',new Date('2035-10-03T11:00:00Z'))).deliverable).toBe(false);
    const [liveRequest]=await q('SELECT request_revision FROM shift_exchanges WHERE id=$1',[r.requestId]);
    expect((await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:Number(liveRequest.request_revision)},db.executor)).status).toBe('blocked');
    expect((await q("SELECT employee_id FROM shifts WHERE id='invite'"))[0].employee_id).toBe('e1');
});
it('A062 completion commits one visible outcome per recipient and retains publication records', async () => {
    await q("INSERT INTO employee_location_eligibility VALUES('e2','loc-1'),('e3','loc-1') ON CONFLICT DO NOTHING");
    const r = await offer('complete', '2035-10-04');
    expect((await executeShiftChange(proof('e2'), { kind: 'ACCEPT', operationId: randomUUID(), requestId: r.requestId, expectedRevision: 1 }, db.executor)).status).toBe('completed');
    const revisions = await q('SELECT id FROM schedule_publication_revisions WHERE source_id=$1', [r.requestId]);
    expect(revisions).toHaveLength(1);
    const visible = await q("SELECT employee_id,type FROM notifications WHERE purpose='EVENT' AND cancelled_at IS NULL AND (source_id=$1 OR source_version=$2)", [r.requestId, revisions[0].id]);
    expect(visible.filter(n => n.employee_id === 'e1')).toHaveLength(1);
    expect(await q('SELECT * FROM schedule_publication_revision_shifts WHERE revision_id=$1', [revisions[0].id])).not.toHaveLength(0);
});
it('A055/A089 read projects recorded expiry without a worker or scheduling writes', async () => {
    const r = await offer('read-expiry', '2035-10-05');
    await q("UPDATE shift_exchanges SET completion_deadline=clock_timestamp()-interval '1 second' WHERE id=$1", [r.requestId]);
    const { getExchange } = await import('../../lib/data/exchanges');
    expect(await getExchange(r.requestId, db.executor)).toMatchObject({ status: 'EXPIRED', actionable: false });
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('OPEN');
});
it('A070/A071 authenticated worker business maintenance runs with delivery disabled and never calls its provider', async () => {
    const r = await offer('disabled-delivery', '2035-10-06');
    const { runWorker, createWorkerDeps } = await import('../../lib/notifications/worker');
    const config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor);
    const deps = createWorkerDeps(config, () => new Date('2035-10-06T12:00:00Z'));
    const report = await runWorker('reminders', { ...deps, executor: db.executor, withSignal: undefined, state: sqlNotificationStateRepository(db.executor), sender: { send: async () => { throw Error('provider must not run'); } } });
    expect(report.disabled).toBe(true);
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('EXPIRED');
});
it.each(['owner', 'material', 'publication'] as const)('A055 read projection refuses stale %s without scheduling writes', async (kind) => {
    const r = await offer('stale-' + kind, kind === 'owner' ? '2035-10-07' : kind === 'material' ? '2035-10-08' : '2035-10-09');
    if (kind === 'owner')
        await q('UPDATE shifts SET employee_id=\'e2\' WHERE id=$1', ['stale-' + kind]);
    if (kind === 'material')
        await q('UPDATE shifts SET start_time=\'09:00\' WHERE id=$1', ['stale-' + kind]);
    if (kind === 'publication')
        await q("UPDATE schedules SET status='DRAFT' WHERE id='schedule'");
    const { getExchange } = await import('../../lib/data/exchanges');
    expect(await getExchange(r.requestId, db.executor)).toMatchObject({ status: 'OPEN', actionable: false, attention: 'CONFIGURATION_REQUIRED' });
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('OPEN');
    if (kind === 'publication')
        await q("UPDATE schedules SET status='PUBLISHED' WHERE id='schedule'");
});
it('A059/A086 unknown required rule distinguishes configuration from no eligible candidates', async () => {
    await q("UPDATE schedules SET status='PUBLISHED' WHERE id='schedule'");
    const r = await offer('unknown-rules', '2035-10-10');
    await q("UPDATE employee_scheduling_settings SET operational_rule_profile=NULL WHERE employee_id IN ('e2','e3')");
    const { readShiftChangeMaintenanceSnapshot } = await import('../../lib/data/shift-change-maintenance');
    const { projectShiftChangeState } = await import('../../lib/shift-changes/maintenance');
    const snapshot = await readShiftChangeMaintenanceSnapshot(r.requestId, 'EXCHANGE', db.executor, new Date('2035-10-09T12:00:00Z'));
    expect(snapshot?.eligibleEmployeeIds).toEqual([]);
    expect(projectShiftChangeState(snapshot!.lifecycle, new Date('2035-10-09T12:00:00Z')).attention).toBe('CONFIGURATION_REQUIRED');
    const { fictionalProfile } = await import('../fixtures/shift-changes');
    await q("UPDATE employee_scheduling_settings SET operational_rule_profile=$1 WHERE employee_id IN ('e2','e3')", [JSON.stringify(fictionalProfile())]);
});
it('A064 queued invitation stays valid through same-state escalation without consuming a new campaign', async () => {
    const r = await offer('same-state', '2035-10-11');
    await tick('2035-10-09T12:00:00Z');
    const [row] = await q("SELECT id FROM notifications WHERE source_id=$1 AND employee_id='e2' AND type='COVERAGE_INVITATION'", [r.requestId]);
    expect(row).toBeDefined();
    await tick('2035-10-11T04:00:00Z');
    const state = sqlNotificationStateRepository(db.executor), intent = await state.findIntent(String(row.id));
    expect(intent).not.toBeNull();
    expect((await state.check(intent!, 'e2', new Date('2035-10-11T11:00:00Z'))).deliverable).toBe(true);
    expect(await q("SELECT id FROM notifications WHERE source_id=$1 AND employee_id='e2' AND type='COVERAGE_INVITATION'", [r.requestId])).toHaveLength(1);
    const [event] = await q("SELECT outcome_reason FROM shift_change_events WHERE request_id=$1 AND event_kind='ESCALATED'", [r.requestId]);
    expect(event.outcome_reason).toBe('NO_VOLUNTEER');
});
it('A060 maintenance rollback after status/event/outbox is atomic and the same cursor can resume', async () => {
    const r = await offer('rollback', '2035-10-12');
    const config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor);
    const before = await q('SELECT to_jsonb(x) AS row FROM shift_exchanges x WHERE id=$1', [r.requestId]);
    const failing = { query: db.executor.query, transaction: (statements: readonly import('../../lib/notifications/types').SqlStatement[]) => db.executor.transaction([...statements, { text: 'SELECT 1/0', values: [] }]) };
    await expect(runShiftChangeMaintenance({ executor: failing, clock: () => new Date('2035-10-12T12:00:00Z'), config, limit: 50 })).rejects.toThrow();
    expect(await q('SELECT to_jsonb(x) AS row FROM shift_exchanges x WHERE id=$1', [r.requestId])).toEqual(before);
    expect(await q("SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind='EXPIRED'", [r.requestId])).toEqual([]);
    await tick('2035-10-12T12:00:00Z');
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('EXPIRED');
});
it('A064 cancellation and explicit reoffer preserve invitation budget for the same assignment episode', async () => {
    const r = await offer('reoffer', '2035-10-13');
    await tick('2035-10-12T12:00:00Z');
    expect(await q("SELECT id FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION'", [r.requestId])).toHaveLength(2);
    expect((await executeShiftChange(proof('e1'), { kind: 'CANCEL', requestId: r.requestId, expectedRevision: 1, operationId: randomUUID() }, db.executor)).status).toBe('closed');
    const { readShiftChangeTerms } = await import('../../lib/data/shift-change-snapshot');
    const t = await readShiftChangeTerms(proof('e1'), 'reoffer', undefined, db.executor);
    expect(t).not.toBeNull();
    const next = await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), sourceShiftId: 'reoffer', sourceEpisodeId: t!.source.assignmentEpisodeId, sourceTermsFingerprint: t!.sourceTermsFingerprint }, db.executor);
    expect(next.status).toBe('pending');
    if (next.status !== 'pending')
        return;
    await tick('2035-10-12T12:00:00Z');
    expect(await q("SELECT id FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION'", [next.requestId])).toHaveLength(0);
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('CANCELLED');
    expect((await q('SELECT prior_request_id FROM shift_exchanges WHERE id=$1', [next.requestId]))[0].prior_request_id).toBe(r.requestId);
});
it('A064 legacy status versions read only original revision; same-status revision cannot revive legacy event', async () => {
    const r = await offer('legacy-version', '2035-10-14');
    const state = sqlNotificationStateRepository(db.executor);
    expect((await state.readSource({ kind: 'EXCHANGE', id: r.requestId, version: 'OPEN' }))?.source.version).toBe('OPEN');
    await q('UPDATE shift_exchanges SET escalated_at=clock_timestamp() WHERE id=$1', [r.requestId]);
    expect((await state.readSource({ kind: 'EXCHANGE', id: r.requestId, version: 'OPEN' }))?.source.version).toBe('r:2');
});
async function waitBlocked(client: import('pg').Client) {
    for (let n = 0; n < 150; n++) {
        await client.query('SELECT pg_stat_clear_snapshot()');
        if ((await client.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM workspaces%' AND pid<>pg_backend_pid() ")).rowCount)
            return;
        await client.query('SELECT pg_sleep(0.005)');
    }
    throw Error('real lock wait missing');
}
async function holdAfterGuard(requestId:string) {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: db.connectionString });
    await client.connect();
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(r => enter = r), released = new Promise<void>(r => release = r);
    let first = true;
    return { client, entered, release, executor: { query: db.executor.query, transaction: async (statements: readonly import('../../lib/notifications/types').SqlStatement[]) => {
                if (!first || !statements.some(statement=>statement.text.includes('UPDATE shift_exchanges')&&statement.values[0]===requestId))
                    return db.executor.transaction(statements);
                first = false;
                await client.query('BEGIN');
                const results: unknown[][] = [];
                try {
                    for (const statement of statements) {
                        results.push((await client.query(statement.text, [...statement.values])).rows);
                        if (statement.text.includes('generation_source_conflict')) {
                            enter();
                            await released;
                        }
                    }
                    await client.query('COMMIT');
                    return results;
                }
                catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                }
            } } };
}
it.each(['expiry', 'acceptance'] as const)('A057 %s first gives one serialized assignment/lifecycle outcome', async (first) => {
    const r = await offer('race-' + first, first === 'expiry' ? '2035-10-15' : '2035-10-16');
    const held = await holdAfterGuard(r.requestId), config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor), clock = () => new Date(first === 'expiry' ? '2035-10-15T12:00:00Z' : '2035-10-16T12:00:00Z');
    const accept = (executor: import('../../lib/notifications/types').SqlExecutor) => executeShiftChange(proof('e2'), { kind: 'ACCEPT', requestId: r.requestId, expectedRevision: 1, operationId: randomUUID() }, executor);
    const maintenance = (executor: import('../../lib/notifications/types').SqlExecutor) => runShiftChangeMaintenance({ executor, config, clock, limit: 50 });
    const initial = first === 'expiry' ? maintenance(held.executor) : accept(held.executor);
    await held.entered;
    const second = first === 'expiry' ? accept(db.executor) : maintenance(db.executor);
    try {
        await waitBlocked(held.client);
    }
    finally {
        held.release();
    }
    await Promise.all([initial, second]);
    await held.client.end();
    const [request] = await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]);
    expect(request.status).toBe(first === 'expiry' ? 'EXPIRED' : 'APPROVED');
    expect((await q('SELECT employee_id FROM shifts WHERE id=$1', ['race-' + first]))[0].employee_id).toBe(first === 'expiry' ? 'e1' : 'e2');
    expect(await q("SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind IN ('EXPIRED','COMPLETED')", [r.requestId])).toHaveLength(1);
});
it('A054/A089 policy tightens while maintenance waits; expiry wins over prepared invitation', async () => {
    const r = await offer('tighten', '2035-10-17');
    const { Client } = await import('pg');
    const lock = new Client({ connectionString: db.connectionString });
    await lock.connect();
    await lock.query('BEGIN');
    await lock.query('SELECT id FROM workspaces FOR NO KEY UPDATE');
    const pending = tick('2035-10-17T11:00:00Z');
    try {
        await waitBlocked(lock);
        await lock.query("UPDATE workspaces SET shift_change_policy=jsonb_set(jsonb_set(shift_change_policy,'{coverage,submissionAdvanceMinutes}','120'),'{coverage,completionAdvanceMinutes}','120')");
        await lock.query('COMMIT');
    }
    finally {
        await lock.query('ROLLBACK');
        await lock.end();
    }
    await pending;
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('EXPIRED');
    expect(await q("SELECT * FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION'", [r.requestId])).toHaveLength(0);
    await q("UPDATE workspaces SET shift_change_policy=jsonb_set(jsonb_set(shift_change_policy,'{coverage,submissionAdvanceMinutes}','0'),'{coverage,completionAdvanceMinutes}','0')");
});
it('A053/A054 natural cutoff during a lock wait expires rather than emitting a prepared invitation', async () => {
    const r = await offer('clock-wait', '2035-10-18');
    await q("UPDATE shift_exchanges SET completion_deadline=clock_timestamp()+interval '700 milliseconds' WHERE id=$1", [r.requestId]);
    const { Client } = await import('pg');
    const lock = new Client({ connectionString: db.connectionString });
    await lock.connect();
    await lock.query('BEGIN');
    await lock.query('SELECT id FROM workspaces FOR NO KEY UPDATE');
    const config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor);
    const pending = runShiftChangeMaintenance({ executor: db.executor, clock: () => new Date(), config, limit: 50 });
    try {
        await waitBlocked(lock);
        await lock.query('SELECT pg_sleep(0.8)');
    }
    finally {
        await lock.query('ROLLBACK');
        await lock.end();
    }
    await pending;
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('EXPIRED');
    expect(await q("SELECT * FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION'", [r.requestId])).toHaveLength(0);
});
it.each(['after-claim', 'after-source-check', 'accepted'] as const)('A063/A070 fake-provider delivery %s uses current committed SQL state', async (phase) => {
    await q("UPDATE push_subscriptions SET status='detached',encrypted_material=NULL");
    const { createECDH, createHash } = await import('node:crypto');
    const { sqlSubscriptionRepository } = await import('../../lib/data/push-subscriptions');
    const { sqlDeliveryRepository } = await import('../../lib/data/push-deliveries');
    const { encryptSubscriptionMaterial } = await import('../../lib/notifications/installation');
    const { runDispatch } = await import('../../lib/notifications/worker');
    const subscriptions = sqlSubscriptionRepository(db.executor), deliveries = sqlDeliveryRepository('test', db.executor), key = Buffer.alloc(32, 3);
    const enrollment = { employeeId: 'e2', installationHash: createHash('sha256').update('fake-' + phase).digest('hex'), environment: 'test' as const, endpointFingerprint: 'fake-' + phase, encryptedMaterial: 'temporary', sessionHash: proof('e2').sessionTokenHash, generation: randomUUID(), expectedGeneration: null, expiresAt: null };
    const pair = createECDH('prime256v1');
    pair.setPrivateKey(Buffer.alloc(32, 1));
    enrollment.encryptedMaterial = encryptSubscriptionMaterial({ endpoint: 'https://fcm.googleapis.com/fcm/send/FICTIONAL-never-contact', expirationTime: null, keys: { p256dh: pair.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') } }, key, enrollment);
    await subscriptions.enroll(enrollment);
    const r = await offer('provider-' + phase, phase === 'after-claim' ? '2035-10-19' : phase === 'after-source-check' ? '2035-10-20' : '2035-10-21');
    await tick(new Date().toISOString());
    const [notification] = await q("SELECT id FROM notifications WHERE source_id=$1 AND employee_id='e2' AND type='COVERAGE_INVITATION'", [r.requestId]);
    expect(notification).toBeDefined();
    // Explicit daytime worker clock: this acceptance case must not depend on
    // the Mac running before quiet hours. SQL leases keep real database time;
    // the injected clock is the most recent local noon, never in their future.
    // Quiet-hour behavior has its own worker/policy tests; no production policy changes.
    const { businessDate, localDateTimeToInstant } = await import('../../lib/business-time');
    const { addDays } = await import('../../lib/date-utils');
    const observed = new Date();
    const zone = (await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor)).policy.timeZone;
    const day = businessDate(observed, zone);
    let deliveryNow = new Date(localDateTimeToInstant(`${day}T12:00`, zone));
    if (deliveryNow > observed) deliveryNow = new Date(localDateTimeToInstant(`${addDays(day, -1)}T12:00`, zone));
    await q("UPDATE notifications SET due_at=$2::timestamptz-interval '1 second' WHERE id=$1", [notification.id, deliveryNow.toISOString()]);
    await deliveries.materialize([String(notification.id)]);
    await q("UPDATE push_deliveries SET status='retry_pending' WHERE notification_id=$1", [notification.id]);
    let sent = 0, changed = false;
    const cancel = async () => {
        if (changed)
            return;
        changed = true;
        const result = await executeShiftChange(proof('e1'), { kind: 'CANCEL', requestId: r.requestId, expectedRevision: 1, operationId: randomUUID() }, db.executor);
        expect(result.status).toBe('closed');
    };
    const state = sqlNotificationStateRepository(db.executor);
    const config = { ...await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor), featureEnabled: true, deliveryEnabled: true, testDeliveryEnabled: true, testAccountIds: ['e2'], subscriptionEncryptionKey: key.toString('base64url') };
    const report = await runDispatch({ mode: 'retry', deps: { executor: db.executor, config, clock: () => new Date(deliveryNow), subscriptions, deliveries: { ...deliveries, claim: async (input) => {
                    const claims = await deliveries.claim(input);
                    if (phase === 'after-claim')
                        await cancel();
                    return claims;
                } }, state: { ...state, check: async (...args) => {
                    const result = await state.check(...args);
                    if (phase === 'after-source-check')
                        await cancel();
                    return result;
                } }, sender: { send: async () => { sent++; return { kind: 'accepted' }; } } } });
    expect(report.claimed, JSON.stringify({ report, deliveries: await q('SELECT status,error_class FROM push_deliveries WHERE notification_id=$1', [notification.id]) })).toBe(1);
    if (phase === 'accepted') {
        expect(sent, JSON.stringify({ report, deliveries: await q('SELECT status,error_class FROM push_deliveries WHERE notification_id=$1', [notification.id]), check: await state.check((await state.findIntent(String(notification.id)))!, 'e2', new Date()) })).toBeGreaterThan(0);
        expect(report.accepted).toBe(sent);
        expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe('OPEN');
    }
    else {
        expect(sent).toBe(0);
        expect(report.accepted).toBe(0);
        expect(await state.findIntent(String(notification.id))).toBeNull();
    }
    await subscriptions.detach(enrollment);
});
it.each(['coverage', 'source-trade', 'target-trade'] as const)('R02 report resolves incompatible %s atomically with original history and private reason', async (kind) => {
    const sourceId = 'report-' + kind, source = await fixtureShift(db.executor, sourceId, 'e1', kind === 'coverage' ? '2035-11-01' : kind === 'source-trade' ? '2035-11-02' : '2035-11-04');
    let exchange: Awaited<ReturnType<typeof executeShiftChange>>;
    let reportingId = 'e1', reportingShift = sourceId;
    if (kind === 'coverage')
        exchange = await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), ...source }, db.executor);
    else {
        const target = await fixtureShift(db.executor, sourceId + '-target', 'e3', kind === 'source-trade' ? '2035-11-03' : '2035-11-05');
        exchange = await executeShiftChange(proof('e1'), { kind: 'PROPOSE_SWAP', operationId: randomUUID(), ...source, targetShiftId: target.sourceShiftId, targetEpisodeId: target.sourceEpisodeId, targetTermsFingerprint: target.sourceTermsFingerprint }, db.executor);
        if (kind === 'target-trade') {
            reportingId = 'e3';
            reportingShift = target.sourceShiftId;
        }
    }
    expect(exchange.status).toBe('pending');
    if (exchange.status !== 'pending')
        throw Error('offer failed');
    const command = { kind: 'SUBMIT_CALLOUT' as const, operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,reportingShift), reasonCode: 'ILLNESS' as const, reasonNote: 'PRIVATE-CALLOUT-DETAIL' };
    const before = await q('SELECT to_jsonb(x) AS row FROM shift_exchanges x WHERE id=$1', [exchange.requestId]);
    const { readGenerationSource } = await import('../../lib/data/generation-guards');
    const sourceBefore = (await readGenerationSource(db.executor)).source;
    const outboxBefore = await q('SELECT to_jsonb(n) AS row FROM notifications n ORDER BY id');
    const failing = { query: db.executor.query, transaction: (statements: readonly import('../../lib/notifications/types').SqlStatement[]) => db.executor.transaction([...statements, { text: 'SELECT 1/0', values: [] }]) };
    await expect.soft(executeShiftChange(proof(reportingId), command, failing)).rejects.toThrow();
    expect(await q('SELECT to_jsonb(x) AS row FROM shift_exchanges x WHERE id=$1', [exchange.requestId])).toEqual(before);
    expect((await readGenerationSource(db.executor)).source).toEqual(sourceBefore);
    expect(await q('SELECT to_jsonb(n) AS row FROM notifications n ORDER BY id')).toEqual(outboxBefore);
    const reported = await executeShiftChange(proof(reportingId), command, db.executor);
    expect(reported.status).toBe('pending');
    if (reported.status !== 'pending')
        return;
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [exchange.requestId]))[0].status).toBe('CANCELLED');
    expect(await q('SELECT callout_id FROM shift_change_participation WHERE shift_id=$1', [reportingShift])).toEqual([{ callout_id: reported.requestId }]);
    expect((await q('SELECT employee_id FROM shifts WHERE id=$1', [reportingShift]))[0].employee_id).toBe(reportingId);
    const history = await q("SELECT participants,source_terms FROM shift_change_events WHERE request_id=$1 AND event_kind='CANCELLED'", [exchange.requestId]);
    expect(history).toHaveLength(1);
    expect(history[0].participants).toMatchObject({ requesterEmployeeId: 'e1' });
    expect((history[0].source_terms as Record<string, unknown>).assignmentEpisodeId).toBe(source.sourceEpisodeId);
    expect(JSON.stringify(await q('SELECT body FROM notifications WHERE source_id=$1 OR source_id=$2', [reported.requestId, exchange.requestId]))).not.toContain('PRIVATE-CALLOUT-DETAIL');
});
it.each(['report', 'acceptance'] as const)('R02 %s first serializes inability reporting against acceptance without undoing a completed winner', async (first) => {
    const r = await offer('report-race-' + first, first === 'report' ? '2035-11-06' : '2035-11-07');
    const held = await holdAfterGuard(r.requestId);
    const reporting = async (executor: import('../../lib/notifications/types').SqlExecutor) => executeShiftChange(proof('e1'), { kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,'report-race-' + first), reasonCode: 'ILLNESS', reasonNote: 'PRIVATE-RACE' }, executor);
    const acceptance = (executor: import('../../lib/notifications/types').SqlExecutor) => executeShiftChange(proof('e2'), { kind: 'ACCEPT', operationId: randomUUID(), requestId: r.requestId, expectedRevision: 1 }, executor);
    const initial = first === 'report' ? reporting(held.executor) : acceptance(held.executor);
    await held.entered;
    const competing = first === 'report' ? acceptance(db.executor) : reporting(db.executor);
    try {
        await waitBlocked(held.client);
    }
    finally {
        held.release();
    }
    const [a, b] = await Promise.all([initial, competing]);
    await held.client.end();
    expect(a.status).toBe(first === 'report' ? 'pending' : 'completed');
    expect(['blocked', 'conflict', 'unavailable']).toContain(b.status);
    expect((await q('SELECT employee_id FROM shifts WHERE id=$1', ['report-race-' + first]))[0].employee_id).toBe(first === 'report' ? 'e1' : 'e2');
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1', [r.requestId]))[0].status).toBe(first === 'report' ? 'CANCELLED' : 'APPROVED');
    expect(await q('SELECT id FROM shift_callouts WHERE shift_id=$1', ['report-race-' + first])).toHaveLength(first === 'report' ? 1 : 0);
    expect(JSON.stringify(await q('SELECT body FROM notifications WHERE source_id=$1', [r.requestId]))).not.toContain('PRIVATE-RACE');
});
it('A056 bounded continuation resumes after last committed request and duplicate ticks report no new invitations', async () => {
    const r = await offer('cursor', '2035-11-08'), config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor);
    let cursor: string | undefined, scanned = 0;
    for (let n = 0; n < 40; n++) {
        const report = await runShiftChangeMaintenance({ executor: db.executor, config, clock: () => new Date('2035-11-07T12:00:00Z'), limit: 1, cursor });
        scanned += report.scanned;
        if (report.nextCursor === null)
            break;
        expect(report.nextCursor).not.toBe(cursor);
        cursor = report.nextCursor;
    }
    expect(scanned).toBeGreaterThan(1);
    expect(await q("SELECT * FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION'", [r.requestId])).toHaveLength(2);
    const repeated = await tick('2035-11-07T12:00:00Z');
    expect(repeated.invited).toBe(0);
});
it('R02 target-side cross-location report retains old trade location access filtering', async () => {
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('cross-report','loc-2','2035-10-01','PUBLISHED','owner')");
    const a = await fixtureShift(db.executor, 'cross-source', 'e1', '2035-11-09');
    await fixtureShift(db.executor, 'cross-target', 'e3', '2035-11-10');
    await q("UPDATE shifts SET schedule_id='cross-report' WHERE id='cross-target'");
    // Publish changes: a raw move is a held edit until published; publish it so the trade binds to shown terms.
    await publishFixtureWeek(db.executor);
    await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) SELECT 'cross-window-'||d,'loc-2',d,'00:00','24:00' FROM generate_series(0,6)d");
    await q("UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false WHERE location_id='loc-2'");
    const { readShiftChangeTerms } = await import('../../lib/data/shift-change-snapshot');
    const terms = await readShiftChangeTerms(proof('e1'), 'cross-source', 'cross-target', db.executor);
    const trade = await executeShiftChange(proof('e1'), { kind: 'PROPOSE_SWAP', operationId: randomUUID(), ...a, targetShiftId: 'cross-target', targetEpisodeId: terms!.target!.assignmentEpisodeId, targetTermsFingerprint: terms!.targetTermsFingerprint! }, db.executor);
    expect(trade.status).toBe('pending');
    if (trade.status !== 'pending')
        return;
    await q("DELETE FROM employee_location_eligibility WHERE employee_id='e1' AND location_id='loc-2'");
    const callout = await executeShiftChange(proof('e3'), { kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,'cross-target'), reasonCode: 'ILLNESS', reasonNote: 'CROSS-PRIVATE' }, db.executor);
    expect(callout.status).toBe('pending');
    expect(await q("SELECT id FROM notifications WHERE source_id=$1 AND employee_id='e1' AND type='SWAP_CANCELLED'", [trade.requestId])).toHaveLength(0);
    expect((await q("SELECT source_terms->>'shiftId' AS source,target_terms->>'shiftId' AS target FROM shift_change_events WHERE request_id=$1 AND event_kind='CANCELLED'", [trade.requestId]))[0]).toEqual({ source: 'cross-source', target: 'cross-target' });
    await q("INSERT INTO employee_location_eligibility VALUES('e1','loc-2')");
});
it('A058/A072 pending callout escalation retains a current private manager seed', async () => {
    const config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor);
    const result = await runShiftChangeMaintenance({ executor: db.executor, config, clock: () => new Date('2035-11-09T12:00:00Z'), limit: 50 });
    expect(result.escalated).toBeGreaterThan(0);
    const rows = await q("SELECT c.id,c.request_revision,n.source_version,n.body FROM shift_callouts c JOIN notifications n ON n.source_id=c.id WHERE c.shift_id='cross-target' AND n.environment='test' AND n.source_version='r:'||c.request_revision AND n.purpose='SUMMARY'");
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('CROSS-PRIVATE');
});
it('A019/A058/A061/A072 approved release invites eligible peers and urgent uncovered event never exposes private reason',async()=>{
 await fixtureShift(db.executor,'released-invitation','e1','2035-12-01');
 const reported=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'released-invitation'),reasonCode:'ILLNESS',reasonNote:'RELEASE-PRIVATE'},db.executor);expect(reported.status).toBe('pending');if(reported.status!=='pending')throw Error('report failed');
 expect((await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:reported.requestId,expectedRevision:1},db.executor)).status).toBe('completed');
 const [linked]=await q('SELECT id FROM shift_exchanges WHERE linked_callout_id=$1',[reported.requestId]);
 await tick('2035-12-01T04:00:00Z');
 const peer=await q("SELECT employee_id,body,action_href FROM notifications WHERE source_id=$1 AND type='COVERAGE_INVITATION' ORDER BY employee_id",[linked.id]);expect(peer.map(p=>p.employee_id)).toEqual(['e2','e3']);expect(JSON.stringify(peer)).not.toContain('RELEASE-PRIVATE');
 expect((await q("SELECT outcome_reason FROM shift_change_events WHERE request_id=$1 AND event_kind='ESCALATED'",[linked.id]))[0].outcome_reason).toBe('URGENT_UNCOVERED');
 const {readShiftChangeHistory}=await import('../../lib/data/shift-change-history');expect(JSON.stringify(await readShiftChangeHistory(proof('e1'),reported.requestId,db.executor))).toContain('RELEASE-PRIVATE');expect(await readShiftChangeHistory(proof('e2'),reported.requestId,db.executor)).toEqual([]);
});

it.each(['collect-after-escalation', 'queued-before-escalation', 'queued-legacy-before-escalation'] as const)('I1 semantic manager campaign survives %s without repetition', async phase => {
    const { businessDate, businessTime } = await import('../../lib/business-time');
    const { sourceShiftTerms, shiftTermsFingerprint } = await import('../../lib/shift-changes/terms');
    const { runReminders } = await import('../../lib/notifications/reminders');
    const now = new Date(), start = new Date(now.getTime() + 2 * 3600000), end = new Date(now.getTime() + 3 * 3600000), zone = 'America/Puerto_Rico';
    const shiftId = 'attention-' + phase;
    await fixtureShift(db.executor, shiftId, 'e1', businessDate(start, zone));
    await q('UPDATE shifts SET start_time=$2,end_time=$3 WHERE id=$1', [shiftId, businessTime(start, zone), businessTime(end, zone)]);
    await publishFixtureWeek(db.executor); // Publish changes: publish the retimed fixture so the offer binds to shown terms.
    const [row] = await q('SELECT to_jsonb(sh) AS sh FROM shifts sh WHERE id=$1', [shiftId]);
    const terms = sourceShiftTerms(row.sh as Record<string, unknown>, { id: 'schedule', locationId: 'loc-1', weekStart: '2035-10-01', status: 'PUBLISHED' }, 'workspace-fuel', zone);
    const result = await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), sourceShiftId: shiftId, sourceEpisodeId: terms.assignmentEpisodeId, sourceTermsFingerprint: shiftTermsFingerprint(terms) }, db.executor);
    expect(result.status).toBe('pending');
    if (result.status !== 'pending') throw Error('offer failed');
    const requestId = result.requestId;
    const config = { ...await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor), featureEnabled: true };
    const state = sqlNotificationStateRepository(db.executor, config.workspace);
    const collect = () => runReminders({ executor: db.executor, config, clock: () => new Date(), state: { ...state, listReminderCandidates: async () => [] } });
    const summaries = () => q("SELECT * FROM notifications WHERE employee_id='owner' AND source_kind='MANAGER_SUMMARY' AND EXISTS(SELECT 1 FROM unnest(item_keys) k WHERE k::jsonb->>1=$1)", [requestId]);
    expect(await q("SELECT source_version,urgency FROM notifications WHERE source_id=$1 AND purpose='SUMMARY'", [requestId])).toEqual([{ source_version: 'r:1', urgency: 'high' }]);
    if (phase !== 'collect-after-escalation') {
        await collect();
        expect(await summaries()).toHaveLength(1);
        if(phase==='queued-legacy-before-escalation') {
            // Existing pre-fix groups persisted r:1 members; retain that wire format.
            const [queued]=await summaries();
            const keys=(queued.item_keys as string[]).map(key=>{const parts=JSON.parse(key);parts[2]='r:1';return JSON.stringify(parts);});
            await q('UPDATE notifications SET item_keys=$2 WHERE id=$1',[queued.id,keys]);
        }
    }
    await tick(new Date().toISOString());
    expect((await q('SELECT request_revision FROM shift_exchanges WHERE id=$1', [requestId]))[0].request_revision).toBe(2);
    await collect();
    const [summary] = await summaries();
    expect(summary, 'one current manager outcome must survive the committed escalation').toBeDefined();
    const intent = await state.findIntent(String(summary?.id));
    expect(intent).not.toBeNull();
    expect(await state.check(intent!, 'owner', new Date())).toMatchObject({ deliverable: true });
    await Promise.all([collect(), collect()]);
    await tick(new Date().toISOString());
    await collect();
    expect(await summaries()).toHaveLength(1);
    expect(await q("SELECT id FROM notifications WHERE source_id=$1 AND purpose='SUMMARY'", [requestId])).toHaveLength(1);
    // Exercise real SQL claim/source/member validation with only an in-memory sender.
    const { createECDH, createHash } = await import('node:crypto');
    const { sqlSubscriptionRepository } = await import('../../lib/data/push-subscriptions');
    const { sqlDeliveryRepository } = await import('../../lib/data/push-deliveries');
    const { encryptSubscriptionMaterial } = await import('../../lib/notifications/installation');
    const { runDispatch } = await import('../../lib/notifications/worker');
    await q("UPDATE push_subscriptions SET status='detached',encrypted_material=NULL");
    const subscriptions=sqlSubscriptionRepository(db.executor), deliveries=sqlDeliveryRepository('test',db.executor), key=Buffer.alloc(32,5);
    const enrollment={employeeId:'owner',installationHash:createHash('sha256').update(phase).digest('hex'),environment:'test' as const,endpointFingerprint:'attention-'+phase,encryptedMaterial:'temporary',sessionHash:proof('owner').sessionTokenHash,generation:randomUUID(),expectedGeneration:null,expiresAt:null};
    const pair=createECDH('prime256v1'); pair.setPrivateKey(Buffer.alloc(32,1));
    enrollment.encryptedMaterial=encryptSubscriptionMaterial({endpoint:'https://fcm.googleapis.com/fcm/send/FICTIONAL-never-contact',expirationTime:null,keys:{p256dh:pair.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,2).toString('base64url')}},key,enrollment);
    await subscriptions.enroll(enrollment);
    await deliveries.materialize([String(summary.id)]);
    await q("UPDATE push_deliveries SET status='retry_pending' WHERE notification_id=$1",[summary.id]);
    let sent=0;
    const deps={executor:db.executor,config:{...config,deliveryEnabled:true,testDeliveryEnabled:true,testAccountIds:['owner'],subscriptionEncryptionKey:key.toString('base64url')},clock:()=>new Date(),subscriptions,deliveries,state,sender:{send:async()=>{sent++;return {kind:'accepted' as const};}}};
    expect(await runDispatch({mode:'retry',deps})).toMatchObject({claimed:1,accepted:1});
    await runDispatch({mode:'retry',deps});
    expect(sent).toBe(1);
    await subscriptions.detach(enrollment);
    // A campaign cannot survive changed terms merely because its semantic key was consumed.
    await q("UPDATE shifts SET is_designated_lead=true WHERE id=$1", [shiftId]);
    expect((await state.check(intent!, 'owner', new Date())).deliverable).toBe(false);
});
