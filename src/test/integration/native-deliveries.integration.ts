import {afterAll, beforeEach, expect, it} from 'vitest';
import {createHash, generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {createDisposableFoundationDatabase} from './local-postgres';
import {installFixtureCompanyAccess} from './fixture-company-access';
import {sqlNativeInstallationRepository} from '../../lib/data/native-installations';
import {notificationIntentStatements} from '../../lib/data/notifications';
import {sqlDeliveryRepository} from '../../lib/data/push-deliveries';
import {nativeProofBytes} from '../../lib/native-push/protocol';
import type {NativeChallenge} from '../../lib/native-push/types';
import type {NotificationIntent, SqlExecutor} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {createNativeWorkerDeps} from '../../lib/native-push/runtime';
import {runNativeWorker} from '../../lib/native-push/worker';
import {DEFAULT_NOTIFICATION_POLICY} from '../../lib/notifications/policy';
import {getWorkspace} from '../../lib/data/workspaces';
import type {NativeTransportRequest} from '../../lib/native-push/providers/transport';

// Repository/lease behavior only. The worker must additionally consult the
// canonical current-source checks before any provider handoff.
async function api() {const m = await import('../../lib/data/native-deliveries').catch(() => ({})); expect(m).toHaveProperty('sqlNativeDeliveryRepository'); return m as typeof import('../../lib/data/native-deliveries');}
let database: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>, db: SqlExecutor;
const query = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.query<T>({text, values});
const pair = generateKeyPairSync('ec', {namedCurve: 'prime256v1'}), bytes = pair.publicKey.export({format: 'der', type: 'spki'});
const binding = {origin: 'https://nevora.example', environment: 'test', platform: 'ios', provider: 'apns-sandbox', appId: 'com.velani.nevora.development', keyFingerprint: createHash('sha256').update(bytes).digest('hex')} as const;
const proof: SessionMutationProof = {employee: {id: 'QA-NDEL-E', firstName: 'Fictional', lastName: 'Employee', role: 'EMPLOYEE', primaryLocationId: 'loc-1'}, sessionTokenHash: createHash('sha256').update('fictional-native-delivery-session').digest('hex')};
const registrations = () => sqlNativeInstallationRepository({executor: db, encryptionKey: Buffer.alloc(32, 7), origin: binding.origin, environment: 'test', applications: {
  ios: {appId: binding.appId, provider: 'apns-sandbox'}, android: {appId: binding.appId, provider: 'fcm'},
}});
async function repository() {return (await api()).sqlNativeDeliveryRepository({executor: db, origin: binding.origin, environment: 'test'});}
function signed(c: NativeChallenge, token = 'a1b2') {return {challengeId: c.challengeId, nonce: c.nonce, token, signature: sign('sha256', nativeProofBytes(c, token), pair.privateKey).toString('base64url')};}
async function enroll() {
  const repo = registrations(), reply = await repo.issueEnrollment({proof, binding, spki: bytes.toString('base64url'), operationId: randomUUID(), expectedGeneration: null});
  if (reply.state !== 'challenge') throw Error('Fictional native challenge unavailable');
  const result = await repo.complete(signed(reply.challenge)); if (result.state !== 'active') throw Error('Fictional native enrollment failed'); return result;
}
async function rotate(generation: string) {
  const repo = registrations(), reply = await repo.issueMaintenance({operation: 'rotate', keyFingerprint: binding.keyFingerprint, operationId: randomUUID(), expectedGeneration: generation});
  if (reply.state !== 'challenge') throw Error('Fictional native rotation challenge unavailable');
  const result = await repo.complete(signed(reply.challenge, 'b1c2')); if (result.state !== 'active') throw Error('Fictional native rotation failed'); return result;
}
async function notice(state: 'pending' | 'no_active_subscription' | 'materialized' = 'pending', overrides: Partial<NotificationIntent> = {}) {
  const id = randomUUID(), now = Date.now();
  const intent: NotificationIntent = {id, employeeId: proof.employee.id, type: 'SCHEDULE_PUBLISHED', title: 'NEVORA', body: 'Open NEVORA.', eventKey: id,
    environment: 'test', source: {kind: 'SCHEDULE', id: '2030-01-07', version: 'fictional-version'}, effectiveVersion: 'fictional-version', purpose: 'EVENT', urgency: 'normal',
    dueAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), ...overrides};
  await db.transaction(notificationIntentStatements([intent]));
  if (state !== 'pending') await query('UPDATE notifications SET push_state=$1 WHERE id=$2', [state, id]);
  return intent;
}
const claimOptions = () => ({now: new Date(), limit: 10, leaseSeconds: 120, mode: 'all' as const});
afterAll(async () => {await database?.dispose();});
beforeEach(async () => {
  // Company Access subject history intentionally prevents employee deletion.
  // Use a fresh owned schema, never disable those constraints to reset tests.
  await database?.dispose(); database = await createDisposableFoundationDatabase({mode: 'current-runtime'}); db = database.executor;
  await installFixtureCompanyAccess(db);
  await query(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Employee','NO-REAL-PHONE','EMPLOYEE','loc-1')`, [proof.employee.id]);
  await query('INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,\'loc-1\') ON CONFLICT DO NOTHING', [proof.employee.id]);
  await query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')", [proof.sessionTokenHash, proof.employee.id]);
});

it('materializes native work once even after Web Push found no subscription, preserving web state', async () => {
  const repo = await repository(); await enroll(); const n = await notice('no_active_subscription');
  expect(await repo.pendingIntentIds(10)).toEqual([n.id]);
  await Promise.all([repo.materialize([n.id]), repo.materialize([n.id])]);
  expect(await query('SELECT id FROM native_push_deliveries')).toHaveLength(1);
  expect(await query('SELECT push_state FROM notifications WHERE id=$1', [n.id])).toEqual([{push_state: 'no_active_subscription'}]);
  expect(await repo.pendingIntentIds(10)).toEqual([]);
});
it('supports independent native and Web Push deliveries for the same event', async () => {
  const repo = await repository(), active = await enroll();
  await query(`INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status)
    VALUES('fictional-web',$1,'fictional-web','test','fictional-endpoint','fictional-ciphertext',$2,$3,'active')`, [proof.employee.id, active.generation, proof.sessionTokenHash]);
  const n = await notice(); await sqlDeliveryRepository('test', db).materialize([n.id]); await repo.materialize([n.id]);
  expect(await query('SELECT id FROM push_deliveries')).toHaveLength(1); expect(await query('SELECT id FROM native_push_deliveries')).toHaveLength(1);
});
it('does not backfill pre-consent events or fan out a Web Push self-test to native devices', async () => {
  const repo = await repository(), old = await notice(); await enroll();
  const test = await notice('pending', {purpose: 'TEST', source: {kind: 'SELF_TEST', id: 'fictional-web', version: randomUUID()}});
  await repo.materialize([old.id, test.id]); expect(await query('SELECT id FROM native_push_deliveries')).toEqual([]);
});
it('claims each delivery only once across two concurrent workers', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  const results = await Promise.all([repo.claim(claimOptions()), repo.claim(claimOptions())]);
  expect(results.flat()).toHaveLength(1); expect(results.flat()[0]).toMatchObject({intentId: n.id, attemptCount: 1});
});
it('recovers an expired lease and refuses the stale worker completion', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  const [old] = await repo.claim(claimOptions());
  await query("UPDATE native_push_deliveries SET lease_expires_at=clock_timestamp()-interval '1 second'");
  const [next] = await repo.claim(claimOptions()); expect(next.leaseToken).not.toBe(old.leaseToken); expect(next.attemptCount).toBe(2);
  expect(await repo.finish(old, {state: 'provider_accepted'})).toBe(false);
  expect(await repo.finish(next, {state: 'provider_accepted'})).toBe(true);
});
it('restores unspent attempt budget on release and quiet-hour deferral', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  const [first] = await repo.claim(claimOptions()); expect(await repo.release(first)).toBe(true);
  const [second] = await repo.claim(claimOptions()); expect(second.attemptCount).toBe(1);
  expect(await repo.defer(second, new Date(Date.now() + 600000))).toBe(true);
  expect(await query('SELECT status,attempt_count,lease_token FROM native_push_deliveries')).toEqual([{status: 'queued', attempt_count: 0, lease_token: null}]);
  expect(await repo.claim(claimOptions())).toEqual([]);
});
it('never lets an old generation finish or invalidate a replacement registration', async () => {
  const repo = await repository(), active = await enroll(), n = await notice(); await repo.materialize([n.id]);
  const [old] = await repo.claim(claimOptions()); const next = await rotate(active.generation);
  expect(await repo.finish(old, {state: 'provider_accepted'})).toBe(false); expect(await repo.invalidate(old)).toBe(false);
  expect(await registrations().status({proof, keyFingerprint: binding.keyFingerprint})).toEqual({state: 'active', generation: next.generation});
});
it('preserves a token registered after an older APNs invalidation timestamp', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  const [claim] = await repo.claim(claimOptions());
  expect(await repo.invalidate(claim, Date.now() - 10000)).toBe(false);
  expect((await registrations().status({proof, keyFingerprint: binding.keyFingerprint})).state).toBe('active');
});
it('invalidates only a current leased registration, removes material and cancels its other work', async () => {
  const repo = await repository(); await enroll(); const a = await notice(), b = await notice(); await repo.materialize([a.id, b.id]);
  const [claim] = await repo.claim({...claimOptions(), limit: 1});
  expect(await repo.findForClaim(claim)).toMatchObject({generation: claim.generation, origin: binding.origin, employeeId: proof.employee.id});
  expect(await repo.invalidate(claim)).toBe(true);
  expect(await query('SELECT status,encrypted_material,token_fingerprint FROM native_push_installations')).toEqual([{status: 'invalid', encrypted_material: null, token_fingerprint: null}]);
  expect(await repo.findForClaim(claim)).toBeNull();
  expect(await repo.finish(claim, {state: 'failed', errorClass: 'registration_invalid'})).toBe(true);
  expect((await query<{status: string}>('SELECT status FROM native_push_deliveries')).map(row => row.status).sort()).toEqual(['cancelled', 'failed']);
});
it('preserves the canonical notification policy for natural cookie expiry but refuses a revoked role', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  await query("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [proof.sessionTokenHash]);
  const [claim] = await repo.claim(claimOptions()); expect(claim).toBeDefined();
  expect(await repo.findForClaim(claim)).not.toBeNull();
  await repo.release(claim); await query("UPDATE employees SET role='MANAGER' WHERE id=$1", [proof.employee.id]);
  expect(await repo.claim(claimOptions())).toEqual([]);
});
it('refuses revoked-session claims and cleanup cancels their queued delivery', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  await query('DELETE FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash]);
  expect(await repo.claim(claimOptions())).toEqual([]); expect(await registrations().cleanupRevoked(10)).toBe(1);
  expect(await query('SELECT status FROM native_push_deliveries')).toEqual([{status: 'cancelled'}]);
});
it('does not replay a provider-accepted event after token generation rotates', async () => {
  const repo = await repository(), active = await enroll(), n = await notice(); await repo.materialize([n.id]);
  const [claim] = await repo.claim(claimOptions()); expect(await repo.finish(claim, {state: 'provider_accepted'})).toBe(true);
  await rotate(active.generation); await repo.materialize([n.id]);
  expect(await query('SELECT status FROM native_push_deliveries')).toEqual([{status: 'provider_accepted'}]);
  expect(await repo.pendingIntentIds(10)).not.toContain(n.id);
});
it('retargets an unsent event after rotation while keeping its original consent boundary', async () => {
  const repo = await repository(), active = await enroll(), n = await notice(); await repo.materialize([n.id]);
  const next = await rotate(active.generation); await repo.materialize([n.id]);
  expect(await query('SELECT status FROM native_push_deliveries ORDER BY created_at')).toEqual([{status: 'cancelled'}, {status: 'queued'}]);
  const [claim] = await repo.claim(claimOptions()); expect(claim.generation).toBe(next.generation);
});
it('enforces the existing five-attempt ceiling without leaving a processing lease', async () => {
  const repo = await repository(); await enroll(); const n = await notice(); await repo.materialize([n.id]);
  await query("UPDATE native_push_deliveries SET attempt_count=4,status='retry_pending'");
  const [claim] = await repo.claim(claimOptions()); expect(claim.attemptCount).toBe(5);
  expect(await repo.finish(claim, {state: 'retry_pending', nextAttemptAt: new Date(Date.now() + 60000).toISOString(), errorClass: 'provider_unavailable'})).toBe(true);
  expect(await query('SELECT status,lease_token FROM native_push_deliveries')).toEqual([{status: 'failed', lease_token: null}]);
});

async function dispatchFixture(options: {android?: boolean; beforeOAuth?(): Promise<void>} = {}) {
  const id = randomUUID();
  await query("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES($1,$2,'2030-01-07','2030-01-07','APPROVED')", [id, proof.employee.id]);
  const n = await notice('no_active_subscription', {type: 'TIME_OFF_APPROVED', source: {kind: 'TIME_OFF', id, version: 'APPROVED'}, effectiveVersion: 'APPROVED', urgency: 'high'});
  const requests: NativeTransportRequest[] = [];
  let status = 200;
  const rsa = options.android ? generateKeyPairSync('rsa', {modulusLength: 2048}).privateKey : null;
  const deps = createNativeWorkerDeps({executor: db,
    notification: {featureEnabled: true, deliveryEnabled: false, testDeliveryEnabled: false, testAccountIds: [], environment: 'test', portalOrigin: binding.origin,
      workspace: await getWorkspace(db), policy: DEFAULT_NOTIFICATION_POLICY},
    registration: {origin: binding.origin, environment: 'test', encryptionKey: Buffer.alloc(32, 7), applications: {ios: {appId: binding.appId, provider: 'apns-sandbox'}, android: {appId: binding.appId, provider: 'fcm'}}},
    providers: {deliveryEnabled: true, testAccountIds: [proof.employee.id], fcm: rsa && {origin: binding.origin, environment: 'test', appId: binding.appId,
      projectId: 'fictional-test', clientEmail: 'fictional-test@fictional-test.iam.gserviceaccount.com', keyId: 'a'.repeat(40), privateKey: rsa},
      apns: {origin: binding.origin, environment: 'test', appId: binding.appId, provider: 'apns-sandbox', teamId: 'AAAAAAAAAA', keyId: 'BBBBBBBBBB', privateKey: pair.privateKey}},
    transport: async request => {
      if (request.endpoint === 'https://oauth2.googleapis.com/token') {await options.beforeOAuth?.(); return {statusCode: 200, body: Buffer.from(JSON.stringify({access_token: 'fictional-only', token_type: 'Bearer', expires_in: 3600}))};}
      requests.push(request); return {statusCode: status, body: options.android ? Buffer.from(JSON.stringify({name: 'projects/fictional-test/messages/fictional'})) : Buffer.alloc(0)};
    },
  });
  return {n, deps, requests, response: (value: number) => {status = value;}};
}
it.each(['EMPLOYEE', 'OWNER'])('dispatches an actual %s source through encrypted registration, SQL leases and a fake APNs transport', async role => {
  if (role === 'OWNER') await query("UPDATE employees SET role='OWNER' WHERE id=$1", [proof.employee.id]);
  const currentProof = {...proof, employee: {...proof.employee, role}} as SessionMutationProof;
  const registration = registrations(), challenge = await registration.issueEnrollment({proof: currentProof, binding, spki: bytes.toString('base64url'), operationId: randomUUID(), expectedGeneration: null});
  expect(challenge.state).toBe('challenge'); if (challenge.state !== 'challenge') throw Error('Missing fixture challenge');
  expect((await registration.complete(signed(challenge.challenge))).state).toBe('active');
  const f = await dispatchFixture();
  expect(await runNativeWorker({deps: f.deps, mode: 'all'})).toMatchObject({claimed: 1, accepted: 1});
  expect(f.requests).toHaveLength(1);
  expect(JSON.parse(f.requests[0].body.toString())).toEqual({aps: {alert: {title: 'NEVORA', body: 'Open NEVORA.'}}, nevora: {version: 1, notificationId: f.n.id, generation: expect.any(String)}});
  expect(await query('SELECT status FROM native_push_deliveries')).toEqual([{status: 'provider_accepted'}]);
  expect(await query('SELECT push_state FROM notifications WHERE id=$1', [f.n.id])).toEqual([{push_state: 'no_active_subscription'}]);
});
it.each(['session', 'source', 'preference'])('stops real leased work when %s changes during provider OAuth preparation', async change => {
  if (change === 'preference') await query("UPDATE employees SET role='OWNER' WHERE id=$1", [proof.employee.id]);
  const currentProof = change === 'preference' ? {...proof, employee: {...proof.employee, role: 'OWNER'}} as SessionMutationProof : proof;
  const repo = registrations(), android = {...binding, platform: 'android', provider: 'fcm'} as const;
  const c = await repo.issueEnrollment({proof: currentProof, binding: android, spki: bytes.toString('base64url'), operationId: randomUUID(), expectedGeneration: null});
  if (c.state !== 'challenge') throw Error('Missing Android challenge'); expect((await repo.complete(signed(c.challenge, 'fictional-fcm-token'))).state).toBe('active');
  const f = await dispatchFixture({android: true, beforeOAuth: async () => {
    if (change === 'session') await query('DELETE FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash]);
    if (change === 'source') await query("UPDATE time_off_requests SET status='DENIED'");
    if (change === 'preference') await query("UPDATE employees SET management_alert_choices='{"+'"time-off":false'+"}'::jsonb WHERE id=$1", [proof.employee.id]);
  }});
  const report = await runNativeWorker({deps: f.deps, mode: 'all'});
  expect(report.accepted).toBe(0); expect(f.requests).toEqual([]);
  expect(await query('SELECT status FROM native_push_deliveries')).toEqual([{status: 'cancelled'}]);
});
it('recovers an outage via a fresh durable lease without duplicating native or Web Push acceptance', async () => {
  await enroll(); const f = await dispatchFixture(); f.response(503);
  expect((await runNativeWorker({deps: f.deps, mode: 'all'})).retried).toBe(1);
  await query("UPDATE native_push_deliveries SET next_attempt_at=clock_timestamp()-interval '1 second'"); f.response(200);
  expect((await runNativeWorker({deps: f.deps, mode: 'retry'})).accepted).toBe(1);
  expect((await runNativeWorker({deps: f.deps, mode: 'all'})).claimed).toBe(0); expect(f.requests).toHaveLength(2);
});
