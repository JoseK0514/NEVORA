import {runShiftChangeMaintenance} from '../data/shift-change-maintenance';
import { performance } from 'node:perf_hooks';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { sqlNotificationStateRepository } from '../data/notification-state';
import { sqlDeliveryRepository } from '../data/push-deliveries';
import { sqlSubscriptionRepository } from '../data/push-subscriptions';
import { decodePushKey } from './config';
import { decryptSubscriptionMaterial } from './installation';
import { validatePushSubscription } from './subscription-service';
import { buildPushEnvelope } from './payloads';
import { nextRoutineTime, retryDecision } from './policy';
import { createPushSender, type PushSender } from './provider';
import { runReminders, type ReminderDeps } from './reminders';
import type { DeliveryClaim, DeliveryCompletion, DeliveryRepository, NotificationConfig, NotificationIntent, ProviderResult, SqlExecutor, SubscriptionRepository, WorkerReport } from './types';
export type WorkerDeps = ReminderDeps & {
    sender: PushSender;
    deliveries: DeliveryRepository;
    subscriptions: SubscriptionRepository;
    /** Rebinds real repository IO to this invocation's cancellation signal. */
    withSignal?(signal: AbortSignal): WorkerDeps;
};
export type WorkerCommand = 'dispatch' | 'reminders';
const emptyReport = (): WorkerReport => ({ claimed: 0, accepted: 0, retried: 0, failed: 0, expired: 0, cancelled: 0, noSubscription: 0, disabled: false });
export function createWorkerDeps(config: NotificationConfig, clock: () => Date = () => new Date(),localContext?:import('../dev/local-only').LocalCaptureContext): WorkerDeps {
    const raw = neonNotificationExecutor();
    const bind = (signal?: AbortSignal): WorkerDeps => {
        const executor: SqlExecutor = {
            query: (statement, callerSignal) => raw.query(statement, signal && callerSignal ? AbortSignal.any([signal, callerSignal]) : signal ?? callerSignal),
            transaction: (statements, callerSignal) => raw.transaction(statements, signal && callerSignal ? AbortSignal.any([signal, callerSignal]) : signal ?? callerSignal),
        };
        return { config, clock, executor, state: sqlNotificationStateRepository(executor,config.workspace), deliveries: sqlDeliveryRepository(config.environment, executor), subscriptions: sqlSubscriptionRepository(executor), sender: createPushSender(config,undefined,localContext), withSignal: bind };
    };
    return bind();
}
function enabled(config: NotificationConfig) {
    return config.featureEnabled && config.deliveryEnabled && (config.environment === 'production' || config.testDeliveryEnabled && config.testAccountIds.length > 0);
}
/** Promise races bound injected and real IO; real adapters also propagate abort to
 * SQL. Aborting an ambiguous commit is NOT proof of rollback: durable leases and
 * conditional identities are retained for recovery by a subsequent invocation. */
function budget(deps: ReminderDeps) {
    const start = deps.clock().getTime(), wall = performance.now();
    const full = new AbortController(), work = new AbortController();
    const elapsed = () => Math.max(deps.clock().getTime() - start, performance.now() - wall);
    const remaining = () => Math.max(0, deps.config.policy.budgetMs - elapsed());
    const workTimer = setTimeout(() => work.abort(), deps.config.policy.budgetMs - 1000);
    const fullTimer = setTimeout(() => full.abort(), deps.config.policy.budgetMs);
    async function call<T>(fn: () => Promise<T>, cleanup = false): Promise<T> {
        const signal = cleanup ? full.signal : work.signal;
        if (remaining() <= (cleanup ? 0 : 1000))
            throw new Error('worker_budget_exhausted');
        signal.throwIfAborted();
        let onAbort: () => void = () => { };
        const aborted = new Promise<never>((_, reject) => { onAbort = () => reject(new Error('worker_budget_exhausted')); signal.addEventListener('abort', onAbort, { once: true }); });
        try {
            return await Promise.race([aborted, Promise.resolve().then(() => { signal.throwIfAborted(); return fn(); })]);
        }
        finally {
            signal.removeEventListener('abort', onAbort);
        }
    }
    return { remaining, call, signal: work.signal, cleanupSignal: full.signal, close() { clearTimeout(workTimer); clearTimeout(fullTimer); work.abort(); full.abort(); } };
}
function sameIntent(a: NotificationIntent, b: NotificationIntent) {
    return a.id === b.id && a.employeeId === b.employeeId && a.environment === b.environment && a.eventKey === b.eventKey && a.effectiveVersion === b.effectiveVersion
        && a.source.kind === b.source.kind && a.source.id === b.source.id && a.source.version === b.source.version && a.purpose === b.purpose && a.type === b.type;
}
function allowed(intent: NotificationIntent, config: NotificationConfig) {
    return intent.environment === config.environment && (config.environment !== 'test' || config.testAccountIds.includes(intent.employeeId))
        && (intent.purpose !== 'SUMMARY' || intent.source.kind === 'MANAGER_SUMMARY')
        && (intent.purpose !== 'TEST' || config.environment === 'test' && config.testDeliveryEnabled && intent.source.kind === 'SELF_TEST')
        && (intent.source.kind !== 'SELF_TEST' || intent.purpose === 'TEST');
}
export async function runDispatch(input: {
    mode: 'new' | 'retry' | 'all';
    deps: WorkerDeps;
}): Promise<WorkerReport> {
    const report = emptyReport();
    if (!enabled(input.deps.config))
        return { ...report, disabled: true };
    if (!['new', 'retry', 'all'].includes(input.mode))
        throw new Error('Invalid dispatch mode');
    const limits = budget(input.deps);
    const deps = input.deps.withSignal?.(limits.signal) ?? input.deps;
    const cleanup = input.deps.withSignal?.(limits.cleanupSignal) ?? input.deps;
    const { config } = deps;
    const run = <T>(fn: () => Promise<T>) => limits.call(fn);
    const release = async (claim: DeliveryClaim) => { try {
        await limits.call(() => cleanup.deliveries.release(claim), true);
    }
    catch { /* Lease recovery owns ambiguous/unavailable cleanup. */ } };
    async function complete(claim: DeliveryClaim, result: DeliveryCompletion) {
        if (!await run(() => deps.deliveries.finish(claim, result)))
            return;
        const counter = { provider_accepted: 'accepted', retry_pending: 'retried', failed: 'failed', expired: 'expired', cancelled: 'cancelled' } as const;
        report[counter[result.state]]++;
    }
    async function attempt(claim: DeliveryClaim) {
        let started = false;
        try {
            if (limits.remaining() < config.policy.attemptDeadlineMs + 1500) {
                await release(claim);
                return;
            }
            const current = await run(() => deps.state.findIntent(claim.intentId));
            if (!current || !sameIntent(current, claim.intent) || !allowed(current, config)) {
                await complete(claim, { state: 'cancelled' });
                return;
            }
            const access = await run(() => deps.state.recipientAccess(current.employeeId));
            if (!access?.active || access.employeeId !== current.employeeId) {
                await complete(claim, { state: 'cancelled' });
                return;
            }
            const checked = await run(() => deps.state.check(current, current.employeeId, deps.clock()));
            const expires = Math.min(Date.parse(claim.intent.expiresAt), Date.parse(current.expiresAt), Date.parse(checked.expiresAt));
            if (!Number.isFinite(expires) || expires <= deps.clock().getTime()) {
                await complete(claim, { state: 'expired' });
                return;
            }
            if (!checked.deliverable || checked.effectiveVersion !== current.effectiveVersion) {
                await complete(claim, { state: checked.reason === 'expired' ? 'expired' : 'cancelled' });
                return;
            }
            const due = Math.max(Date.parse(claim.intent.dueAt), Date.parse(current.dueAt), current.urgency === 'normal' ? nextRoutineTime(deps.clock(), config.policy).getTime() : 0);
            if (!Number.isFinite(due) || due >= expires) {
                await complete(claim, { state: 'expired' });
                return;
            }
            if (due > deps.clock().getTime()) {
                await run(() => deps.deliveries.defer(claim, new Date(due)));
                return;
            }
            // This repository also verifies active account and presence of the associated
            // session row. Natural cookie expiry is deliberately NOT session revocation.
            const devices = await run(() => deps.subscriptions.listActive(current.employeeId, config.environment));
            const device = devices.find(s => s.id === claim.subscriptionId && s.generation === claim.generation && s.employeeId === current.employeeId && s.environment === config.environment && s.status === 'active' && !!s.sessionHash && (!s.expiresAt || Date.parse(s.expiresAt) > deps.clock().getTime()));
            if (!device || (current.purpose === 'TEST' && (current.source.id !== device.id || current.source.version !== device.generation))) {
                await complete(claim, { state: 'cancelled' });
                return;
            }
            if (limits.remaining() < config.policy.attemptDeadlineMs + 1500 || Date.parse(claim.leaseExpiresAt) <= deps.clock().getTime() + config.policy.attemptDeadlineMs) {
                await release(claim);
                return;
            }
            const key = decodePushKey(config.subscriptionEncryptionKey, 32);
            if (!key) {
                await complete(claim, { state: 'failed', errorClass: 'subscription_configuration' });
                return;
            }
            let subscription;
            try {
                subscription = validatePushSubscription(decryptSubscriptionMaterial(device.encryptedMaterial, key, device));
            }
            catch {
                await complete(claim, { state: 'failed', errorClass: 'subscription_material' });
                return;
            }
            // IO can cross the 21:00 boundary after the earlier state check.
            const finalDue = Math.max(due, current.urgency === 'normal' ? nextRoutineTime(deps.clock(), config.policy).getTime() : 0);
            if (finalDue >= expires) {
                await complete(claim, { state: 'expired' });
                return;
            }
            if (finalDue > deps.clock().getTime()) {
                await run(() => deps.deliveries.defer(claim, new Date(finalDue)));
                return;
            }
            let effectiveExpiry = Math.min(expires, subscription.expirationTime ?? Infinity);
            let ttl = Math.min(7 * 86400, Math.floor((effectiveExpiry - deps.clock().getTime()) / 1000));
            if (ttl < 1) {
                await complete(claim, { state: 'expired' });
                return;
            }
            // Subscription/decryption IO may follow a business cancellation. Check
            // the current source again immediately before handing off to transport.
            const finalIntent=await run(()=>deps.state.findIntent(current.id));
            const finalSource=finalIntent && sameIntent(finalIntent,current) ? await run(()=>deps.state.check(finalIntent,finalIntent.employeeId,deps.clock())) : null;
            if(!finalSource?.deliverable || finalSource.effectiveVersion!==current.effectiveVersion || Date.parse(finalSource.expiresAt)<=deps.clock().getTime()){
                await complete(claim,{state:'cancelled'});return;
            }
            effectiveExpiry=Math.min(effectiveExpiry,Date.parse(finalSource.expiresAt));
            ttl=Math.min(7*86400,Math.floor((effectiveExpiry-deps.clock().getTime())/1000));
            const sendAt=current.urgency==='normal'?nextRoutineTime(deps.clock(),config.policy):deps.clock();
            if(ttl<1||sendAt.getTime()>=effectiveExpiry){await complete(claim,{state:'expired'});return;}
            if(sendAt.getTime()>deps.clock().getTime()){await run(()=>deps.deliveries.defer(claim,sendAt));return;}
            const payload = buildPushEnvelope({ ...current, expiresAt: new Date(effectiveExpiry).toISOString() }, claim.generation);
            const controller = new AbortController();
            const stop = () => controller.abort();
            limits.signal.addEventListener('abort', stop, { once: true });
            let abortAttempt: () => void = () => { };
            const timedOut = new Promise<ProviderResult>(resolve => { abortAttempt = () => { controller.abort(); resolve({ kind: 'retry', errorClass: 'transport_timeout' }); }; });
            const timer = setTimeout(abortAttempt, Math.min(config.policy.attemptDeadlineMs, effectiveExpiry - deps.clock().getTime()));
            let result: ProviderResult;
            started = true;
            try {
                result = await run(() => Promise.race([timedOut, deps.sender.send({ subscription, payload, ttlSeconds: ttl, urgency: current.urgency, topic: payload.tag.slice(-32), signal: controller.signal })]));
            }
            catch {
                result = { kind: 'retry', errorClass: 'transport_error' };
            }
            finally {
                clearTimeout(timer);
                limits.signal.removeEventListener('abort', stop);
                controller.abort();
            }
            if (result.kind === 'accepted') {
                await complete(claim, { state: 'provider_accepted' });
                return;
            }
            if (result.kind === 'invalid_subscription') {
                await run(() => deps.subscriptions.invalidate(device.id, claim.generation));
                report.cancelled++;
                return;
            }
            const decision = retryDecision({ attempt: claim.attemptCount, now: deps.clock(), expiresAt: new Date(effectiveExpiry), result, deliveryId: claim.deliveryId, policy: config.policy });
            const errorClass = /^[a-z][a-z0-9_]{0,63}$/.test(result.errorClass) ? result.errorClass : 'provider_error';
            await complete(claim, decision.retryAt ? { state: 'retry_pending', nextAttemptAt: decision.retryAt.toISOString(), errorClass } : { state: decision.terminal ?? 'failed', errorClass });
        }
        catch {
            // Before sending, no external ambiguity exists; release the reservation.
            // After sending, retain its persistent lease for bounded retry/reclaim.
            if (!started)
                await release(claim);
        }
    }
    try {
        await run(() => deps.subscriptions.cleanupRemovedSessions(config.environment, config.policy.batchSize));
        if (input.mode !== 'retry') {
            const selected = await run(() => deps.executor.query<{
                id: string;
            }>({ text: `SELECT id FROM notifications WHERE environment=$1 AND push_state='pending'
        AND cancelled_at IS NULL AND due_at <= now() AND (purpose <> 'SUMMARY' OR source_kind='MANAGER_SUMMARY')
        AND ($2::text[] IS NULL OR employee_id=ANY($2::text[]))
        AND (purpose <> 'TEST' OR ($3::boolean AND source_kind='SELF_TEST'))
        ORDER BY due_at,id LIMIT 10`, values: [config.environment, config.environment === 'test' ? [...config.testAccountIds] : null, config.environment === 'test' && config.testDeliveryEnabled] }));
            if (selected.length) {
                const ids = selected.map(row => row.id);
                await run(() => deps.deliveries.materialize(ids));
                const states = await run(() => deps.executor.query<{
                    push_state: string;
                }>({ text: 'SELECT push_state FROM notifications WHERE id=ANY($1::text[]) AND environment=$2', values: [ids, config.environment] }));
                report.noSubscription = states.filter(row => row.push_state === 'no_active_subscription').length;
                report.expired = states.filter(row => row.push_state === 'expired').length;
            }
        }
        if (limits.remaining() < config.policy.attemptDeadlineMs + 1500)
            return report;
        const claims = await run(() => deps.deliveries.claim({ now: deps.clock(), limit: config.policy.batchSize, leaseSeconds: config.policy.leaseSeconds, mode: input.mode, ...(config.environment === 'test' ? { recipientIds: config.testAccountIds } : {}) }));
        report.claimed = claims.length;
        let next = 0;
        await Promise.all(Array.from({ length: config.policy.concurrency }, async () => { while (next < claims.length) {
            const claim = claims[next++];
            await attempt(claim);
        } }));
        return report;
    }
    finally {
        limits.close();
    }
}
/** Shared invocation switch: adapters cannot substitute their own delivery policy. */
export async function runWorker(command: WorkerCommand, deps: WorkerDeps, options:{maintenance?:boolean;cursor?:string}={}): Promise<WorkerReport> {
    if (command === 'dispatch')
        return runDispatch({ mode: 'all', deps });
    if (command !== 'reminders')
        throw new Error('Invalid worker command');
    const limits = budget(deps);
    const scoped = deps.withSignal?.(limits.signal) ?? deps;
    try {
        const maintenance=options.maintenance!==false && scoped.config.workspace ? await limits.call(()=>runShiftChangeMaintenance({...scoped,cursor:options.cursor})) : undefined;
        if(!enabled(scoped.config))return {...emptyReport(),disabled:true,...(maintenance?{maintenance}:{})};
        return {...await limits.call(() => runReminders(scoped)),...(maintenance?{maintenance}:{})};
    }
    finally {
        limits.close();
    }
}
