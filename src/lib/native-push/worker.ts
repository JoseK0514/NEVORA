import 'server-only';
import {performance} from 'node:perf_hooks';
import type {NativeDeliveryClaim, NativeDeliveryInstallation, NativeDeliveryRepository} from '../data/native-deliveries';
import type {DeliveryCompletion, NotificationIntent, NotificationPolicy, NotificationStateRepository, WorkerReport} from '../notifications/types';
import {nextRoutineTime, retryDecision} from '../notifications/policy';
import {openNativeToken} from './material';
import type {NativeRegistrationConfig} from './config';
import type {NativeMaterialBinding} from './types';
import type {NativePushSender, NativeProviderResult} from './providers/types';

export type NativeWorkerConfig = NativeRegistrationConfig & {enabled: boolean; testAccountIds: readonly string[]; policy: NotificationPolicy};
export type NativeWorkerDeps = {
  config: NativeWorkerConfig; clock(): Date; state: NotificationStateRepository;
  deliveries: NativeDeliveryRepository; sender: NativePushSender; cleanup(limit: number): Promise<number>;
  withSignal?(signal: AbortSignal): NativeWorkerDeps;
};
const transient = new Set(['workspace_unavailable', 'workspace_changed']);
const sameIntent = (a: NotificationIntent, b: NotificationIntent) => a.id === b.id && a.employeeId === b.employeeId && a.environment === b.environment
  && a.eventKey === b.eventKey && a.effectiveVersion === b.effectiveVersion && a.source.kind === b.source.kind && a.source.id === b.source.id
  && a.source.version === b.source.version && a.type === b.type && a.purpose === b.purpose;
const sameInstallation = (a: NativeDeliveryInstallation, b: NativeDeliveryInstallation) => a.id === b.id && a.generation === b.generation
  && a.encryptedMaterial === b.encryptedMaterial && a.keyFingerprint === b.keyFingerprint && a.employeeId === b.employeeId
  && a.platform === b.platform && a.provider === b.provider && a.appId === b.appId && a.environment === b.environment && a.origin === b.origin;
function bindingOf(i: NativeDeliveryInstallation): NativeMaterialBinding {
  return {origin: i.origin, environment: i.environment, platform: i.platform, provider: i.provider, appId: i.appId, keyFingerprint: i.keyFingerprint, generation: i.generation};
}

async function bounded<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  let abort = () => {};
  const cancelled = new Promise<never>((_, reject) => {abort = () => reject(Error('native_worker_deadline')); signal.addEventListener('abort', abort, {once: true});});
  try {return await Promise.race([cancelled, Promise.resolve().then(() => {signal.throwIfAborted(); return operation();})]);}
  finally {signal.removeEventListener('abort', abort);}
}

/** Separate native leases and provider acceptance; browser/Web Push delivery
 * state is never written here. Every attempt repeats canonical business checks,
 * including after provider credentials have been prepared. Ambiguous sends keep
 * their durable lease: delivery is at least once, never promised exactly once. */
export async function runNativeWorker({deps: input, mode}: {deps: NativeWorkerDeps; mode: 'new' | 'retry' | 'all'}): Promise<WorkerReport> {
  if (!['new', 'retry', 'all'].includes(mode)) throw Error('Invalid native dispatch mode');
  const report: WorkerReport = {claimed: 0, accepted: 0, retried: 0, failed: 0, expired: 0, cancelled: 0, noSubscription: 0, disabled: false};
  if (!input.config.enabled || (input.config.environment === 'test' && !input.config.testAccountIds.length)) return {...report, disabled: true};
  const policy = input.config.policy, start = input.clock().getTime(), wall = performance.now();
  const remaining = () => policy.budgetMs - Math.max(input.clock().getTime() - start, performance.now() - wall);
  const work = new AbortController(), cleanup = new AbortController();
  const workTimer = setTimeout(() => work.abort(), policy.budgetMs - 1000), cleanupTimer = setTimeout(() => cleanup.abort(), policy.budgetMs);
  const deps = input.withSignal?.(work.signal) ?? input, cleanupDeps = input.withSignal?.(cleanup.signal) ?? input;
  const config = deps.config;
  const run = <T>(operation: () => Promise<T>, signal = work.signal) => bounded(signal, operation);
  async function release(claim: NativeDeliveryClaim) {
    try {await bounded(cleanup.signal, () => cleanupDeps.deliveries.release(claim));} catch { /* Durable lease recovery owns unavailable cleanup. */ }
  }
  async function complete(claim: NativeDeliveryClaim, result: DeliveryCompletion) {
    if (!await run(() => deps.deliveries.finish(claim, result))) return;
    const counter = {provider_accepted: 'accepted', retry_pending: 'retried', failed: 'failed', expired: 'expired', cancelled: 'cancelled'} as const;
    report[counter[result.state]]++;
  }
  async function authorize(claim: NativeDeliveryClaim, signal: AbortSignal) {
    const current = await run(() => deps.state.findIntent(claim.intentId), signal);
    if (!current || !sameIntent(current, claim.intent) || current.environment !== config.environment || current.purpose === 'TEST' || current.source.kind === 'SELF_TEST'
      || (current.purpose === 'SUMMARY' && current.source.kind !== 'MANAGER_SUMMARY')
      || (config.environment === 'test' && !config.testAccountIds.includes(current.employeeId))) {
      await complete(claim, {state: 'cancelled'}); return null;
    }
    const access = await run(() => deps.state.recipientAccess(current.employeeId), signal);
    if (!access?.active || access.employeeId !== current.employeeId || !['EMPLOYEE', 'OWNER'].includes(access.role)) {
      await complete(claim, {state: 'cancelled'}); return null;
    }
    const checked = await run(() => deps.state.check(current, current.employeeId, deps.clock()), signal);
    const expires = Math.min(Date.parse(claim.intent.expiresAt), Date.parse(current.expiresAt), Date.parse(checked.expiresAt));
    const now = deps.clock().getTime();
    if (!Number.isFinite(expires) || expires <= now) {await complete(claim, {state: 'expired'}); return null;}
    if (!checked.deliverable && transient.has(checked.reason)) {
      if (now + 60000 >= expires) await complete(claim, {state: 'expired'});
      else await run(() => deps.deliveries.defer(claim, new Date(now + 60000)), signal);
      return null;
    }
    if (!checked.deliverable || checked.effectiveVersion !== current.effectiveVersion) {await complete(claim, {state: 'cancelled'}); return null;}
    const installation = await run(() => deps.deliveries.findForClaim(claim), signal);
    if (!installation || installation.id !== claim.installationId || installation.generation !== claim.generation || installation.employeeId !== current.employeeId
      || installation.origin !== config.origin || installation.environment !== config.environment
      || installation.appId !== config.applications[installation.platform]?.appId || installation.provider !== config.applications[installation.platform]?.provider) {
      await complete(claim, {state: 'cancelled'}); return null;
    }
    const sendAt = Math.max(Date.parse(claim.intent.dueAt), Date.parse(current.dueAt), current.urgency === 'normal' ? nextRoutineTime(deps.clock(), policy).getTime() : deps.clock().getTime());
    if (!Number.isFinite(sendAt) || sendAt >= expires || expires - deps.clock().getTime() < 1000) {await complete(claim, {state: 'expired'}); return null;}
    if (sendAt > deps.clock().getTime()) {await run(() => deps.deliveries.defer(claim, new Date(sendAt)), signal); return null;}
    return {current, installation, expires, ttl: Math.min(7 * 86400, Math.floor((expires - deps.clock().getTime()) / 1000))};
  }
  async function attempt(claim: NativeDeliveryClaim) {
    let handedOff = false;
    try {
      if (remaining() < policy.attemptDeadlineMs + 1500 || Date.parse(claim.leaseExpiresAt) <= deps.clock().getTime() + policy.attemptDeadlineMs) {await release(claim); return;}
      const admission = await authorize(claim, work.signal); if (!admission) return;
      let token: string;
      try {token = openNativeToken(admission.installation.encryptedMaterial, config.encryptionKey, bindingOf(admission.installation));}
      catch {await complete(claim, {state: 'failed', errorClass: 'registration_material'}); return;}
      const controller = new AbortController(), stop = () => controller.abort();
      work.signal.addEventListener('abort', stop, {once: true});
      let timeout = () => {};
      const timedOut = new Promise<NativeProviderResult>(resolve => {timeout = () => {controller.abort(); resolve({kind: 'retry', errorClass: 'transport_timeout'});};});
      const timer = setTimeout(timeout, Math.min(policy.attemptDeadlineMs, admission.expires - deps.clock().getTime()));
      let handoffUsed = false, result: NativeProviderResult;
      try {
        result = await run(() => Promise.race([timedOut, deps.sender.send({installation: {...bindingOf(admission.installation), token},
          payload: {notificationId: admission.current.id, generation: claim.generation}, ttlSeconds: admission.ttl, urgency: admission.current.urgency, signal: controller.signal,
          beforeHandoff: async signal => {
            if (handoffUsed) throw Error('Native handoff already consumed'); handoffUsed = true;
            signal.throwIfAborted();
            const final = await authorize(claim, signal);
            if (!final) return null;
            if (!sameInstallation(final.installation, admission.installation) || final.current.urgency !== admission.current.urgency) {await release(claim); return null;}
            if (remaining() < 1500 || Date.parse(claim.leaseExpiresAt) <= deps.clock().getTime() + 1000) {await release(claim); return null;}
            signal.throwIfAborted(); handedOff = true; return final.ttl;
          }})]));
      } catch {result = {kind: 'retry', errorClass: 'transport_error'};}
      finally {clearTimeout(timer); work.signal.removeEventListener('abort', stop); controller.abort();}
      if (result.kind === 'not_sent') return;
      if (result.kind === 'accepted') {if (handedOff) await complete(claim, {state: 'provider_accepted'}); else await release(claim); return;}
      if (result.kind === 'invalid_registration') {
        if (handedOff && await run(() => deps.deliveries.invalidate(claim, result.invalidatedAt))) await complete(claim, {state: 'cancelled', errorClass: 'registration_invalid'});
        return;
      }
      const decision = retryDecision({attempt: claim.attemptCount, now: deps.clock(), expiresAt: new Date(admission.expires), result, deliveryId: claim.deliveryId, policy});
      // Web Push's retry helper has a one-hour provider-delay cap. Native APNs/
      // FCM Retry-After is independently validated and may be longer: preserve
      // that minimum without altering the existing Web Push transport policy.
      if (decision.retryAt && result.kind === 'retry' && Number.isSafeInteger(result.retryAfterSeconds) && result.retryAfterSeconds! > 3600) {
        const minimum = deps.clock().getTime() + result.retryAfterSeconds! * 1000;
        if (minimum >= admission.expires) {delete decision.retryAt; decision.terminal = 'expired';}
        else decision.retryAt = new Date(Math.max(minimum, decision.retryAt.getTime()));
      }
      const errorClass = /^[a-z][a-z0-9_]{0,63}$/.test(result.errorClass) ? result.errorClass : 'provider_error';
      await complete(claim, decision.retryAt ? {state: 'retry_pending', nextAttemptAt: decision.retryAt.toISOString(), errorClass} : {state: decision.terminal ?? 'failed', errorClass});
    } catch {if (!handedOff) await release(claim);}
  }
  try {
    await run(() => deps.cleanup(policy.batchSize));
    if (mode !== 'retry') {
      const ids = await run(() => deps.deliveries.pendingIntentIds(policy.batchSize));
      await run(() => deps.deliveries.materialize(ids));
    }
    if (remaining() < policy.attemptDeadlineMs + 1500) return report;
    const claims = await run(() => deps.deliveries.claim({now: deps.clock(), limit: policy.batchSize, leaseSeconds: policy.leaseSeconds, mode,
      ...(config.environment === 'test' ? {recipientIds: config.testAccountIds} : {})}));
    report.claimed = claims.length; let next = 0;
    await Promise.all(Array.from({length: policy.concurrency}, async () => {while (next < claims.length) await attempt(claims[next++]);}));
    return report;
  } finally {clearTimeout(workTimer); clearTimeout(cleanupTimer); work.abort(); cleanup.abort();}
}
