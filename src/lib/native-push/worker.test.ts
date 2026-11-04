import {afterEach, expect, it, vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {DEFAULT_NOTIFICATION_POLICY} from '../notifications/policy';
import {sealNativeToken} from './material';
import type {NotificationIntent, DeliveryCompletion} from '../notifications/types';
import type {NativeDeliveryClaim, NativeDeliveryInstallation} from '../data/native-deliveries';
import type {NativePushInput, NativeProviderResult} from './providers/types';
import type {NativeWorkerDeps} from './worker';

const time = Date.parse('2030-01-01T16:00:00Z');
async function api() {
  const m = await import('./worker').catch(() => ({}));
  expect(m).toHaveProperty('runNativeWorker');
  return m as typeof import('./worker');
}
afterEach(() => vi.useRealTimers());
function fixture(count = 1) {
  let now = time, active = true, deliverable = true, role = 'EMPLOYEE', sourceReason = 'current';
  let provider: NativeProviderResult = {kind: 'accepted'};
  let credentialWait: (() => Promise<void>) | undefined;
  const key = Buffer.alloc(32, 7);
  const intent: NotificationIntent = {id: randomUUID(), employeeId: 'fictional', environment: 'test', type: 'TIME_OFF_APPROVED',
    title: 'Private name', body: 'Private request', eventKey: 'event', source: {kind: 'TIME_OFF', id: 'request', version: 'APPROVED'},
    effectiveVersion: 'APPROVED', purpose: 'EVENT', urgency: 'normal', dueAt: new Date(time - 1000).toISOString(), expiresAt: new Date(time + 86400000).toISOString()};
  const installations: NativeDeliveryInstallation[] = Array.from({length: count}, () => {
    const binding = {origin: 'https://nevora.example', environment: 'test' as const, platform: 'ios' as const, provider: 'apns-sandbox' as const,
      appId: 'com.nevora.test', keyFingerprint: 'a'.repeat(64), generation: randomUUID()};
    return {...binding, id: randomUUID(), employeeId: intent.employeeId, tokenRegisteredAt: new Date(time - 1000).toISOString(),
      consentAt: new Date(time - 1000).toISOString(), encryptedMaterial: sealNativeToken('a1b2', key, binding)};
  });
  const claims: NativeDeliveryClaim[] = installations.map(i => ({deliveryId: randomUUID(), installationId: i.id, generation: i.generation,
    leaseToken: randomUUID(), leaseExpiresAt: new Date(time + 120000).toISOString(), attemptCount: 1, intentId: intent.id, intent: {...intent, source: {...intent.source}}}));
  const completed: {claim: NativeDeliveryClaim; result: DeliveryCompletion}[] = [], deferred: Date[] = [], released: NativeDeliveryClaim[] = [], sent: NativePushInput[] = [];
  let claimsStarted = 0, materialized = 0, invalidated = 0;
  const deps: NativeWorkerDeps = {
    config: {enabled: true, environment: 'test', origin: 'https://nevora.example', testAccountIds: ['fictional'], encryptionKey: key,
      applications: {ios: {appId: 'com.nevora.test', provider: 'apns-sandbox'}, android: {appId: 'com.nevora.test', provider: 'fcm'}}, policy: DEFAULT_NOTIFICATION_POLICY},
    clock: () => new Date(now), cleanup: async () => 0,
    state: {findIntent: async () => ({...intent, source: {...intent.source}}), recipientAccess: async () => ({employeeId: intent.employeeId, active, role, allowedLocationIds: []} as never),
      check: async () => ({deliverable, reason: sourceReason, effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt}), readSource: async () => null, listReminderCandidates: async () => []},
    deliveries: {pendingIntentIds: async () => [intent.id], materialize: async () => {materialized++;},
      claim: async () => {claimsStarted++; return claims;},
      findForClaim: async c => active ? installations.find(i => i.id === c.installationId && i.generation === c.generation) ?? null : null,
      finish: async (claim, result) => {if (!installations.some(i => i.id === claim.installationId && i.generation === claim.generation)) return false; completed.push({claim, result}); return true;},
      defer: async (_c, at) => {deferred.push(at); return true;}, release: async c => {released.push(c); return true;},
      invalidate: async () => {invalidated++; return true;}},
    sender: {send: async input => {await credentialWait?.(); const ttl = await input.beforeHandoff(input.signal);
      if (ttl === null) return {kind: 'not_sent'}; sent.push({...input, ttlSeconds: ttl}); return provider;}},
  };
  return {deps, intent, installations, claims, completed, deferred, released, sent,
    counters: () => ({claimsStarted, materialized, invalidated}), setNow: (t: number) => {now = t;},
    revoke: () => {active = false;}, setRole: (r: string) => {role = r;},
    resolve: () => {deliverable = false; sourceReason = 'resolved';}, transient: () => {deliverable = false; sourceReason = 'workspace_changed';},
    provider: (r: NativeProviderResult) => {provider = r;}, waitCredentials: (f: () => Promise<void>) => {credentialWait = f;}};
}

it('dispatches generic opaque metadata and records provider acceptance separately from delivery', async () => {
  const {runNativeWorker} = await api(), f = fixture();
  expect(await runNativeWorker({deps: f.deps, mode: 'all'})).toMatchObject({accepted: 1, claimed: 1});
  expect(f.sent).toHaveLength(1); expect(f.sent[0].payload).toEqual({notificationId: f.intent.id, generation: f.claims[0].generation});
  expect(JSON.stringify(f.sent[0].payload)).not.toContain('Private');
  expect(f.completed[0].result).toEqual({state: 'provider_accepted'});
});
it.each(['disabled', 'allowlist', 'wrong-environment'])('refuses %s before claiming work', async reason => {
  const {runNativeWorker} = await api(), f = fixture();
  if (reason === 'disabled') f.deps.config.enabled = false;
  if (reason === 'allowlist') f.deps.config.testAccountIds = [];
  if (reason === 'wrong-environment') f.intent.environment = 'production';
  const report = await runNativeWorker({deps: f.deps, mode: 'all'});
  expect(report.accepted).toBe(0); expect(f.sent).toEqual([]);
  if (reason !== 'wrong-environment') expect(f.counters().claimsStarted).toBe(0);
});
it.each(['revoked', 'role', 'resolved', 'generation', 'material'])('prevents %s registrations or sources from reaching transport', async reason => {
  const {runNativeWorker} = await api(), f = fixture();
  if (reason === 'revoked') f.revoke();
  if (reason === 'role') f.setRole('MANAGER');
  if (reason === 'resolved') f.resolve();
  if (reason === 'generation') f.installations[0] = {...f.installations[0], generation: randomUUID()};
  if (reason === 'material') f.installations[0].encryptedMaterial += 'corrupt';
  await runNativeWorker({deps: f.deps, mode: 'retry'}); expect(f.sent).toEqual([]);
});
it.each(['revoked', 'resolved', 'generation', 'quiet', 'expiry'])('rechecks %s after waiting for provider credentials', async reason => {
  const {runNativeWorker} = await api(), f = fixture();
  f.waitCredentials(async () => {
    if (reason === 'revoked') f.revoke();
    if (reason === 'resolved') f.resolve();
    if (reason === 'generation') f.installations[0] = {...f.installations[0], generation: randomUUID()};
    if (reason === 'quiet') f.setNow(Date.parse('2030-01-02T01:00:00Z'));
    if (reason === 'expiry') f.setNow(Date.parse(f.intent.expiresAt));
  });
  await runNativeWorker({deps: f.deps, mode: 'all'}); expect(f.sent).toEqual([]);
});
it('defers normal work during quiet hours without spending another attempt', async () => {
  const {runNativeWorker} = await api(), f = fixture(); f.setNow(Date.parse('2030-01-02T02:00:00Z'));
  f.claims[0].leaseExpiresAt = '2030-01-02T02:02:00Z';
  await runNativeWorker({deps: f.deps, mode: 'all'});
  expect(f.deferred).toEqual([new Date('2030-01-02T11:00:00Z')]); expect(f.sent).toEqual([]);
});
it('allows current urgent work during quiet hours but never after source expiry', async () => {
  const {runNativeWorker} = await api(), f = fixture(); f.setNow(Date.parse('2030-01-02T02:00:00Z')); f.intent.urgency = 'high';
  f.claims[0].leaseExpiresAt = '2030-01-02T02:02:00Z';
  expect((await runNativeWorker({deps: f.deps, mode: 'retry'})).accepted).toBe(1);
});
it('retains replacement generation after a delayed provider rejection', async () => {
  const {runNativeWorker} = await api(), f = fixture();
  f.deps.sender.send = async input => {await input.beforeHandoff(input.signal); f.installations[0] = {...f.installations[0], generation: randomUUID()}; return {kind: 'invalid_registration'};};
  f.deps.deliveries.invalidate = async c => {expect(c.generation).not.toBe(f.installations[0].generation); return false;};
  expect((await runNativeWorker({deps: f.deps, mode: 'all'})).cancelled).toBe(0);
  expect(f.completed).toEqual([]);
});
it('persists bounded retries and the fifth attempt fails terminally', async () => {
  const {runNativeWorker} = await api(), f = fixture(); f.provider({kind: 'retry', errorClass: 'provider_unavailable'});
  expect((await runNativeWorker({deps: f.deps, mode: 'retry'})).retried).toBe(1);
  const at = Date.parse(f.completed[0].result.nextAttemptAt!); expect(at).toBeGreaterThanOrEqual(time + 60000); expect(at).toBeLessThanOrEqual(time + 66000);
  f.claims[0].attemptCount = 5; expect((await runNativeWorker({deps: f.deps, mode: 'retry'})).failed).toBe(1);
});
it.each([7200, 2147483647])('never retries before a validated native provider delay of %s seconds', async seconds => {
  const {runNativeWorker} = await api(), f = fixture(); f.provider({kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: seconds});
  const report = await runNativeWorker({deps: f.deps, mode: 'retry'});
  if (seconds === 7200) {
    expect(report.retried).toBe(1);
    expect(Date.parse(f.completed[0].result.nextAttemptAt!)).toBeGreaterThanOrEqual(time + 7200000);
  } else {expect(report.expired).toBe(1); expect(report.retried).toBe(0);}
});
it('defers a quiet boundary crossed milliseconds into credential preparation while the lease and budget stay valid', async () => {
  const {runNativeWorker} = await api(), f = fixture(), before = Date.parse('2030-01-02T00:59:59.900Z');
  f.setNow(before); f.claims[0].leaseExpiresAt = '2030-01-02T01:02:00Z';
  f.waitCredentials(async () => {f.setNow(before + 200);});
  const report = await runNativeWorker({deps: f.deps, mode: 'all'});
  expect(report.accepted).toBe(0); expect(f.sent).toEqual([]);
  expect(f.deferred).toEqual([new Date('2030-01-02T11:00:00Z')]); expect(f.completed).toEqual([]);
});
it('defers transient authority failures and releases unattempted storage failures', async () => {
  const {runNativeWorker} = await api(), f = fixture(); f.transient();
  await runNativeWorker({deps: f.deps, mode: 'retry'}); expect(f.deferred).toEqual([new Date(time + 60000)]);
  f.deps.state.findIntent = async () => {throw Error('private diagnostic');};
  await runNativeWorker({deps: f.deps, mode: 'retry'}); expect(f.released).toHaveLength(1); expect(f.sent).toEqual([]);
});
it('does not release an ambiguously committed provider acceptance', async () => {
  const {runNativeWorker} = await api(), f = fixture(); f.deps.deliveries.finish = async () => {throw Error('commit unknown');};
  expect((await runNativeWorker({deps: f.deps, mode: 'all'})).accepted).toBe(0); expect(f.released).toEqual([]);
});
it('bounds a hung transport and aborts every attempted request', async () => {
  vi.useFakeTimers(); const {runNativeWorker} = await api(), f = fixture(3); const signals: AbortSignal[] = [];
  f.deps.sender.send = async input => {signals.push(input.signal); await input.beforeHandoff(input.signal); return new Promise(() => {});};
  const work = runNativeWorker({deps: f.deps, mode: 'retry'}); await vi.advanceTimersByTimeAsync(20000);
  expect((await work).retried).toBe(3); expect(signals).toHaveLength(3); expect(signals.every(s => s.aborted)).toBe(true);
});
