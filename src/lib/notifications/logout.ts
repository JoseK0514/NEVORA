import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import { createHash } from 'node:crypto';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { sqlSubscriptionRepository } from '../data/push-subscriptions';
import { readNotificationConfig } from './config';
import {subscriptionProtection} from './keyring';
import { CLEANUP_COOKIE, INSTALLATION_COOKIE, MAX_CLEANUP_REVOCATIONS, MAX_CLEANUP_RECEIPT_BYTES, createInstallationProof, openCleanupReceipt, readInstallationProof, sealCleanupReceipt, sealInstallationProof, type CookieReader } from './installation';
import type { CleanupResult, InstallationProof, PushRuntimeConfig, InstallationRecord, SubscriptionRepository, VerifiedCleanupReceipt } from './types';
export type CookieWriter = {
    set(name: string, value: string, options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'strict';
        path: string;
        maxAge: number;
    }): void;
    delete(name: string): void;
};
export type CookieReaderWriter = CookieReader & CookieWriter;
export type LogoutDeps = {
    revokeSession(sessionHash: string, signal: AbortSignal): Promise<void>;
    subscriptions(signal: AbortSignal): SubscriptionRepository;
    sealReceipt(receipt: VerifiedCleanupReceipt): string | null;
    openReceipt(value: string): VerifiedCleanupReceipt | null;
    clock(): Date;
    secureCookies: boolean;
};
const PENDING: CleanupResult = { state: 'pending' };
const COMPLETE: CleanupResult = { state: 'complete' };
const CLEANUP_BUDGET_MS = 1000;
function options(secure: boolean, maxAge = 14 * 86400) { return { httpOnly: true, secure, sameSite: 'strict' as const, path: '/', maxAge }; }
/** Operations start independently and share one absolute, abortable budget.
 * The deadline is an exit bound, never a claim that late work committed. */
export async function boundedCleanupAttempts(operations: readonly ((signal: AbortSignal) => Promise<boolean>)[]): Promise<boolean> {
    if (!operations.length)
        return true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const work = Promise.all(operations.map(operation => Promise.resolve().then(() => operation(controller.signal)).catch(() => false))).then(results => results.every(Boolean));
        return await Promise.race([work, new Promise<false>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(false); }, CLEANUP_BUDGET_MS); })]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
        controller.abort();
    }
}
function retireConfirmedRevocations(receipt: VerifiedCleanupReceipt, confirmed: ReadonlySet<string>): VerifiedCleanupReceipt {
    return {
        ...receipt,
        revokeSession: receipt.revokeSession === true && !confirmed.has(receipt.sessionHash),
        sessionRevocations: receipt.sessionRevocations?.filter(item => !confirmed.has(item.sessionHash)),
    };
}
function retainPending(cookies: CookieReaderWriter, deps: LogoutDeps, installation?: InstallationProof, sessionHashes: readonly string[] = [], cleanupSessionHash?: string, confirmed: ReadonlySet<string> = new Set()) {
    const prior = cookies.get(CLEANUP_COOKIE)?.value;
    const now = deps.clock();
    const issuedAt = now.toISOString(), expiresAt = new Date(now.getTime() + 14 * 86400000).toISOString();
    let receipt: VerifiedCleanupReceipt | null = null;
    let value: string | null = null;
    if (prior) {
        const verified = deps.openReceipt(prior);
        if (verified && installation && verified.environment === installation.environment && verified.installationHash === installation.installationHash && verified.generation === installation.generation) receipt = retireConfirmedRevocations(verified, confirmed);
    } else if (installation && (sessionHashes.length || cleanupSessionHash)) {
        const sessionHash = sessionHashes[0] ?? cleanupSessionHash!;
        receipt = { ...installation, sessionHash, revokeSession: sessionHashes.includes(sessionHash), issuedAt, expiresAt };
    }
    if (receipt) {
        const previous = receipt.sessionRevocations ?? [];
        const recorded = new Set([...(receipt.revokeSession === true ? [receipt.sessionHash] : []), ...previous.map(item => item.sessionHash)]);
        const additional = sessionHashes.filter(hash => !recorded.has(hash));
        if (recorded.size + additional.length > MAX_CLEANUP_REVOCATIONS) {
            // Retain every prior obligation and persist an authenticated fail-closed
            // saturation state. Never truncate or later claim all revocations done.
            receipt = { ...receipt, recoveryBlocked: true };
        } else if (additional.length) {
            receipt = { ...receipt, sessionRevocations: [...previous, ...additional.map(sessionHash => ({ sessionHash, issuedAt, expiresAt }))] };
        }
        try { value = deps.sealReceipt(receipt); } catch { /* Preserve opaque evidence and block ambiguous recovery. */ }
    }
    if (value) {
        cookies.set(CLEANUP_COOKIE, value, options(deps.secureCookies));
        return;
    }
    if (prior) {
        // Without a verifiable/signable bundle a newer failed obligation cannot
        // be represented safely. Keep all original opaque bytes and fence recovery.
        if (sessionHashes.length && !prior.endsWith('.recovery-blocked') && Buffer.byteLength(prior, 'utf8') <= MAX_CLEANUP_RECEIPT_BYTES) cookies.set(CLEANUP_COOKIE, `${prior}.recovery-blocked`, options(deps.secureCookies));
        return;
    }
    value = cookies.get(INSTALLATION_COOKIE)?.value ?? null;
    if (value) cookies.set(CLEANUP_COOKIE, value, options(deps.secureCookies));
}
/** Attempt independent session revocation and installation detach within one budget.
 * Always remove the browser session cookie; unresolved server effects retain protected
 * recovery evidence and return pending rather than claiming the writes rolled back. */
export async function terminatePortalSession(input: {
    sessionToken?: string;
    installation?: InstallationProof;
    cookies: CookieReaderWriter;
    deps: LogoutDeps;
}): Promise<CleanupResult> {
    const { cookies, deps, installation } = input;
    const sessionHash = input.sessionToken ? createHash('sha256').update(input.sessionToken).digest('hex') : undefined;
    const sessionHashes = [...new Set([sessionHash, installation?.associatedSessionHash].filter((hash): hash is string => !!hash))];
    const unrevoked = new Set(sessionHashes);
    const confirmed = new Set<string>();
    try {
        const operations: ((signal: AbortSignal) => Promise<boolean>)[] = [];
        for (const hash of sessionHashes) operations.push(async (signal) => { await deps.revokeSession(hash, signal); if (!signal.aborted) { unrevoked.delete(hash); confirmed.add(hash); } return true; });
        if (installation)
            operations.push(async (signal) => (await deps.subscriptions(signal).detach(installation)).state === 'complete');
        const complete = await boundedCleanupAttempts(operations);
        // Missing verification/configuration must never discard an existing proof.
        if (!complete || (!installation && cookies.get(INSTALLATION_COOKIE)) || cookies.get(CLEANUP_COOKIE)) {
            retainPending(cookies, deps, installation, [...unrevoked], sessionHash ?? installation?.associatedSessionHash, confirmed);
            return PENDING;
        }
        return COMPLETE;
    }
    finally {
        cookies.delete('fuel_session');
    }
}
export function createLogoutDeps(config: PushRuntimeConfig): LogoutDeps {
    const key = subscriptionProtection(config);
    const executor = neonNotificationExecutor();
    return {
        clock: () => new Date(), secureCookies: config.portalOrigin.startsWith('https:') || process.env.NODE_ENV === 'production',
        revokeSession: async (sessionHash, signal) => { await executor.query({ text: 'DELETE FROM employee_sessions WHERE token_hash = $1', values: [sessionHash] }, signal); },
        subscriptions: signal => sqlSubscriptionRepository({ query: (statement) => executor.query(statement, signal), transaction: statements => executor.transaction(statements, signal) }),
        sealReceipt: receipt => key ? sealCleanupReceipt(receipt, key) : null,
        openReceipt: value => key ? openCleanupReceipt(value, key, new Date()) : null,
    };
}
/** Replay protected cleanup obligations before device inheritance. Missing keys/proofs,
 * ambiguous writes and saturated recovery bundles stay pending; delete the cleanup
 * cookie only when all retained revocations and installation reconciliation complete. */
export async function reconcilePendingInstallation(cookies: CookieReaderWriter, config: PushRuntimeConfig, deps: LogoutDeps = createLogoutDeps(config)): Promise<CleanupResult> {
    const pending = cookies.get(CLEANUP_COOKIE)?.value;
    if (!pending)
        return COMPLETE;
    const key = subscriptionProtection(config);
    if (!key)
        return PENDING;
    const proof = readInstallationProof(cookies, key, config.environment);
    if (!proof)
        return PENDING;
    const receipt = openCleanupReceipt(pending, key, deps.clock());
    let verified = receipt;
    if (!verified) {
        // Fallback is the original installation-purpose ciphertext, not an unsigned
        // receipt. Resolve its session association only from healthy server state.
        const fallback = readInstallationProof({ get: name => name === INSTALLATION_COOKIE ? { value: pending } : undefined }, key, config.environment);
        if (!fallback || fallback.installationHash !== proof.installationHash || fallback.generation !== proof.generation)
            return PENDING;
        const lookup: {
            record: InstallationRecord | null;
        } = { record: null };
        const healthy = await boundedCleanupAttempts([async (signal) => { lookup.record = await deps.subscriptions(signal).findInstallation(proof.installationHash, config.environment); return true; }]);
        const record = lookup.record;
        if (!healthy || !record || record.installationHash !== proof.installationHash || record.environment !== proof.environment || record.generation !== proof.generation || record.status !== 'active')
            return PENDING;
        const now = deps.clock();
        verified = { ...proof, sessionHash: record.sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 14 * 86400000).toISOString() };
        // Bind the former session durably in the browser before either independent
        // write: detach may advance generation while auth deletion still fails.
        try {
            cookies.set(CLEANUP_COOKIE, sealCleanupReceipt(verified, key), options(deps.secureCookies));
        }
        catch {
            return PENDING;
        }
    }
    if (verified.environment !== proof.environment || verified.installationHash !== proof.installationHash || verified.generation !== proof.generation)
        return PENDING;
    const cleanup = verified;
    if (cleanup.recoveryBlocked) return PENDING;
    const sessionHashes = [...new Set([...(cleanup.revokeSession === true ? [cleanup.sessionHash] : []), ...(cleanup.sessionRevocations ?? []).map(item => item.sessionHash)])];
    const confirmed = new Set<string>();
    const complete = await boundedCleanupAttempts([
        ...sessionHashes.map(hash => async (signal: AbortSignal) => { await deps.revokeSession(hash, signal); if (!signal.aborted) confirmed.add(hash); return true; }),
        async (signal) => (await deps.subscriptions(signal).reconcile(cleanup)).state === 'complete',
    ]);
    if (!complete) {
        // A push-table outage must not retain already-confirmed auth deletes or
        // consume the bounded bundle on repeated healthy-auth logouts. Ambiguous
        // operations remain; re-signing preserves every original lifetime.
        if (confirmed.size) {
            try { cookies.set(CLEANUP_COOKIE, sealCleanupReceipt(retireConfirmedRevocations(cleanup, confirmed), key), options(deps.secureCookies)); } catch { /* Existing opaque evidence remains pending. */ }
        }
        return PENDING;
    }
    cookies.delete(CLEANUP_COOKIE);
    return COMPLETE;
}
/** Authentication may proceed during cleanup outage; the retained proof/receipt
 * blocks device inheritance. A new identity is issued only after verified cleanup. */
export async function prepareInstallationForAccount(employeeId: string, cookies: CookieReaderWriter, config: PushRuntimeConfig, deps: LogoutDeps = createLogoutDeps(config)): Promise<CleanupResult> {
    if ((await reconcilePendingInstallation(cookies, config, deps)).state !== 'complete')
        return PENDING;
    if (!cookies.get(INSTALLATION_COOKIE))
        return COMPLETE;
    const key = subscriptionProtection(config);
    if (!key) {
        retainPending(cookies, deps);
        return PENDING;
    }
    const proof = readInstallationProof(cookies, key, config.environment);
    if (!proof)
        return PENDING;
    const lookup: {
        record: InstallationRecord | null;
    } = { record: null };
    const read = await boundedCleanupAttempts([async (signal) => { lookup.record = await deps.subscriptions(signal).findInstallation(proof.installationHash, config.environment); return true; }]);
    const record = lookup.record;
    if (!read) {
        retainPending(cookies, deps, proof);
        return PENDING;
    }
    if (!record)
        return COMPLETE;
    if (record.installationHash !== proof.installationHash || record.environment !== proof.environment)
        return PENDING;
    if (record.employeeId === employeeId && record.status === 'active' && record.generation === proof.generation) {
        // Consent/generation stay intact; bind logout to the authoritative former
        // session even when the employee now receives a new auth cookie.
        const associated = { ...proof, associatedSessionHash: record.sessionHash };
        try { cookies.set(INSTALLATION_COOKIE, sealInstallationProof(associated, key), options(deps.secureCookies, 365 * 86400)); } catch { return PENDING; }
        return COMPLETE;
    }
    if (record.status === 'active' && record.generation !== proof.generation)
        return PENDING;
    if (record.status === 'active') {
        const complete = await boundedCleanupAttempts([
            async (signal) => (await deps.subscriptions(signal).detach(proof)).state === 'complete',
            ...(record.employeeId !== employeeId ? [async (signal: AbortSignal) => { await deps.revokeSession(record.sessionHash, signal); return true; }] : []),
        ]);
        if (!complete) {
            retainPending(cookies, deps, proof, [record.sessionHash]);
            return PENDING;
        }
    }
    const fresh = createInstallationProof(config.environment);
    cookies.set(INSTALLATION_COOKIE, sealInstallationProof(fresh, key), options(deps.secureCookies, 365 * 86400));
    return COMPLETE;
}
export async function prepareInstallationForLogin(employeeId: string): Promise<CleanupResult> {
    const { workspaceCookies: cookies } = await import('../workspace-routing/cookies.server');
    return prepareInstallationForAccount(employeeId, await cookies(), readNotificationConfig(await workspaceRuntimeEnvironment()));
}
