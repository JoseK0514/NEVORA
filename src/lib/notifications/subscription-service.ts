import {activeProtection,subscriptionProtection} from './keyring';
import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import { createECDH, createHash, createHmac, randomUUID } from 'node:crypto';
import { buildSelfTestNotification } from '../assistance/notification-events';
import { decodePushKey, readNotificationConfig } from './config';
import { CLEANUP_COOKIE, INSTALLATION_COOKIE, createInstallationProof, encryptSubscriptionMaterial, readInstallationProof, sealCleanupReceipt, sealInstallationProof } from './installation';
import type { CookieReader } from './installation';
import type { SessionEmployee } from '../auth/session';
import type { DeviceStatus, InstallationProof, InstallationRecord, PushRuntimeConfig, NotificationIntent, SubscriptionRepository } from './types';
import {employeeViewAuthority} from '../employee-view-authority.server';
export type ValidatedSubscription = {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
};
class PushRequestError extends Error {
    constructor(readonly status: number, readonly code: string) { super(code); }
}
function reject(status = 400, code = 'invalid_request'): never { throw new PushRequestError(status, code); }
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return reject();
    return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: readonly string[]) { if (Object.keys(value).some(k => !allowed.includes(k)))
    reject(); }
/** Exact provider host/path pairs. Unknown providers never become outbound destinations.
 * Dispatch must re-use this validator and prohibit redirects; this function makes no requests. */
export function validatePushEndpoint(candidate: string): URL {
    if (typeof candidate !== 'string' || Buffer.byteLength(candidate) > 4096 || /[\s\\]/.test(candidate))
        return reject();
    let url: URL;
    try {
        url = new URL(candidate);
    }
    catch {
        return reject();
    }
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password || url.hash || url.search || /[%#@]/.test(candidate))
        return reject();
    const host = url.hostname;
    const google = host === 'fcm.googleapis.com' && /^\/(?:fcm\/send|wp)\/[A-Za-z0-9_:-]+$/.test(url.pathname);
    const mozilla = host === 'updates.push.services.mozilla.com' && /^\/wpush\/v[12]\/[A-Za-z0-9_-]+$/.test(url.pathname);
    const apple = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+push\.apple\.com$/.test(host) && /^\/[A-Za-z0-9_/-]+$/.test(url.pathname) && !url.pathname.includes('//') && url.pathname.length > 1;
    if (!google && !mozilla && !apple)
        return reject();
    return url;
}
export function validatePushSubscription(value: unknown): ValidatedSubscription {
    const input = object(value);
    keys(input, ['endpoint', 'expirationTime', 'keys']);
    if (typeof input.endpoint !== 'string')
        return reject();
    const endpoint = validatePushEndpoint(input.endpoint).href;
    const material = object(input.keys);
    keys(material, ['p256dh', 'auth']);
    const publicKey = decodePushKey(material.p256dh, 65), auth = decodePushKey(material.auth, 16);
    if (!publicKey || publicKey[0] !== 4 || !auth)
        return reject();
    try {
        const ecdh = createECDH('prime256v1');
        ecdh.setPrivateKey(Buffer.alloc(32, 1));
        ecdh.computeSecret(publicKey);
    }
    catch {
        return reject();
    }
    const expiration = input.expirationTime ?? null;
    if (expiration !== null && (typeof expiration !== 'number' || !Number.isFinite(expiration) || expiration <= 0 || expiration > 8640000000000000))
        return reject();
    return { endpoint, expirationTime: expiration as number | null, keys: { p256dh: material.p256dh as string, auth: material.auth as string } };
}
export type PushCookieStore = CookieReader & {
    set(name: string, value: string, options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'strict';
        path: string;
        maxAge: number;
    }): void;
    delete(name: string): void;
};
import { boundedCleanupAttempts, createLogoutDeps, prepareInstallationForAccount, reconcilePendingInstallation, type LogoutDeps } from "./logout";
export type PushHandlerDeps = {
    config: PushRuntimeConfig;
    cleanupDeps?: LogoutDeps;
    cookies(): Promise<PushCookieStore>;
    session(): Promise<SessionEmployee | null>;
    subscriptions(): SubscriptionRepository;
    clock(): Date;
    sessionBudget?(employeeId:string,sessionTokenHash:string):Promise<number>;
};
function response(value: unknown, status = 200) { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function readJson(request: Request): Promise<Record<string, unknown>> {
    const length = request.headers.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > 8192))
        reject(413, 'request_too_large');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? ''))
        reject(415, 'json_required');
    const reader = request.body?.getReader();
    if (!reader)
        return reject();
    const chunks: Uint8Array[] = [];
    let count = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            count += value.byteLength;
            if (count > 8192) {
                await reader.cancel();
                reject(413, 'request_too_large');
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    try {
        return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))));
    }
    catch (error) {
        if (error instanceof PushRequestError)
            throw error;
        return reject();
    }
}
/** Session/origin-protected installation operations with generation-based concurrency.
 * Status may reconcile cleanup and issue a proof cookie; subscribe persists encrypted
 * device ownership, and test queues an intent subject to the test allowlist/cooldown.
 * None of these responses proves that a push reached or displayed on the device. */
export function createPushHandlers(deps: PushHandlerDeps) {
    const { config } = deps;
    function protectionKey() { return subscriptionProtection(config); }
    function cookieOptions(maxAge = 14 * 86400) { return { httpOnly: true, secure: config.portalOrigin.startsWith('https:'), sameSite: 'strict' as const, path: '/', maxAge }; }
    function testAllowed(employeeId: string, record: InstallationRecord | null) {
        return config.featureEnabled && config.deliveryEnabled && config.environment === 'test' && config.testDeliveryEnabled && config.testAccountIds.includes(employeeId) && record?.status === 'active' && (!record.lastTestAt || Date.parse(record.lastTestAt) <= deps.clock().getTime() - 300000);
    }
    function project(employeeId: string, proof: InstallationProof | null, record: InstallationRecord | null, sessionHash?: string): DeviceStatus {
        const key = protectionKey();
        const ready = config.featureEnabled && !!key && !!config.vapidPublicKey;
        const owned = ready && record?.employeeId === employeeId && record.status === 'active' && record.generation === proof?.generation && record.installationHash === proof?.installationHash && record.environment === config.environment && (!record.expiresAt || Date.parse(record.expiresAt) > deps.clock().getTime());
        return { supported: ready, enabled: !!owned, configurationAvailable: ready, testAllowed: !!owned && record?.sessionHash === sessionHash && !!testAllowed(employeeId, record),
            ...(ready ? { vapidPublicKey: config.vapidPublicKey } : {}),
            ...(owned ? { ownershipGeneration: record.generation } : {}),
            ...(key && proof ? { dismissalScope: createHmac('sha256', activeProtection(key).key).update(`dismissal:${employeeId}:${proof.installationHash}`).digest('base64url') } : {}),
        };
    }
    const cleanupDeps = deps.cleanupDeps ?? createLogoutDeps(config);
    async function binding(request:Request|undefined,employee:SessionEmployee,cookies:PushCookieStore) {
        const expected=request?.headers.get('X-Nevora-Device-Authority');
        if(expected===undefined||expected===null)return null;
        const token=cookies.get('fuel_session')?.value;
        if(!token||!['EMPLOYEE','LEAD'].includes(employee.role))reject(401,'authentication_required');
        const sessionTokenHash=createHash('sha256').update(token).digest('hex');
        const authority=employeeViewAuthority({employee,sessionTokenHash},'notifications');
        if(expected!==authority)reject(401,'authentication_required');
        const started=performance.now();
        const budget=deps.sessionBudget?await deps.sessionBudget(employee.id,sessionTokenHash):45000;
        if(!Number.isFinite(budget)||budget<=0)reject(401,'authentication_required');
        return {authority,budget:Math.min(45000,Math.floor(budget)),started};
    }
    async function reconcile(cookies: PushCookieStore, employeeId: string): Promise<boolean> {
        const hadPending = !!cookies.get(CLEANUP_COOKIE);
        if ((await reconcilePendingInstallation(cookies, config, cleanupDeps)).state !== 'complete') reject(409, 'cleanup_pending');
        if (hadPending && (await prepareInstallationForAccount(employeeId, cookies, config, cleanupDeps)).state !== 'complete') reject(409, 'cleanup_pending');
        return hadPending;
    }
    return {
        async status(request?:Request): Promise<Response> {
            try {
                const employee = await deps.session();
                if (!employee)
                    return response({ error: 'authentication_required' }, 401);
                const cookies = await deps.cookies();
                const bound=await binding(request,employee,cookies);
                const current=(value:DeviceStatus)=>{
                    if(!bound)return response(value);
                    const validForMs=Math.floor(bound.budget-(performance.now()-bound.started));
                    if(validForMs<=0)reject(401,'authentication_required');
                    return response({...value,authority:bound.authority,validForMs});
                };
                const key = protectionKey();
                if (!config.featureEnabled && !cookies.get(CLEANUP_COOKIE))
                    return current(project(employee.id, null, null));
                if (!key) {
                    if (cookies.get(CLEANUP_COOKIE))
                        reject(409, 'cleanup_pending');
                    return current(project(employee.id, null, null));
                }
                let proof = readInstallationProof(cookies, key, config.environment);
                await reconcile(cookies, employee.id);
                proof = readInstallationProof(cookies, key, config.environment);
                const storedProof=proof;
                const record = proof ? await deps.subscriptions().findInstallation(proof.installationHash, config.environment) : null;
                if (config.featureEnabled && !proof && !cookies.get(INSTALLATION_COOKIE))
                    proof = createInstallationProof(config.environment);
                if (proof && record?.employeeId === employee.id && record.status === 'active' && record.generation === proof.generation && record.installationHash === proof.installationHash && record.environment === config.environment) proof = { ...proof, associatedSessionHash: record.sessionHash };
                // A delayed bound read must not send an unchanged old generation
                // after a newer enrollment response has updated the browser cookie.
                if (proof&&(!bound||!storedProof||proof.installationHash!==storedProof.installationHash||proof.generation!==storedProof.generation||proof.associatedSessionHash!==storedProof.associatedSessionHash))
                    cookies.set(INSTALLATION_COOKIE, sealInstallationProof(proof, key), cookieOptions(365 * 86400));
                return current(project(employee.id, proof, record, cookies.get("fuel_session") ? createHash("sha256").update(cookies.get("fuel_session")!.value).digest("hex") : undefined));
            }
            catch (error) {
                return response({ error: error instanceof PushRequestError ? error.code : 'temporarily_unavailable' }, error instanceof PushRequestError ? error.status : 503);
            }
        },
        async mutation(request: Request, operation: 'subscribe' | 'unsubscribe' | 'test'): Promise<Response> {
            try {
                if (request.method !== 'POST')
                    reject(405, 'post_required');
                if (!config.portalOrigin || request.headers.get('origin') !== config.portalOrigin || new URL(request.url).origin !== config.portalOrigin || (request.headers.get('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin'))
                    reject(403, 'origin_rejected');
                const body = await readJson(request);
                keys(body, operation === 'subscribe' ? ['subscription', 'ownershipGeneration'] : ['ownershipGeneration']);
                if (body.ownershipGeneration !== undefined && (typeof body.ownershipGeneration !== 'string' || body.ownershipGeneration.length > 128))
                    reject();
                const employee = await deps.session();
                if (!employee)
                    reject(401, 'authentication_required');
                if (operation === 'test' && (config.environment !== 'test' || !config.testDeliveryEnabled || !config.testAccountIds.includes(employee.id)))
                    reject(403, 'test_not_allowed');
                const cookies = await deps.cookies();
                await binding(request,employee,cookies);
                const token = cookies.get('fuel_session')?.value;
                if (!token)
                    reject(401, 'authentication_required');
                const key = protectionKey();
                if (operation === 'unsubscribe' && !config.featureEnabled && !cookies.get(CLEANUP_COOKIE))
                    return response({ status: 'complete' });
                if (!key)
                    reject(cookies.get(CLEANUP_COOKIE) ? 409 : 503, cookies.get(CLEANUP_COOKIE) ? 'cleanup_pending' : 'configuration_unavailable');
                let proof = readInstallationProof(cookies, key, config.environment);
                if (cookies.get(INSTALLATION_COOKIE) && !proof)
                    reject(409, 'installation_conflict');
                const reconciled = await reconcile(cookies, employee.id);
                proof = readInstallationProof(cookies, key, config.environment);
                if (operation === 'unsubscribe' && (reconciled || !config.featureEnabled)) return response({ status: 'complete' });
                if (!config.featureEnabled) reject(503, 'configuration_unavailable');
                const repo = deps.subscriptions();
                const record = proof ? await repo.findInstallation(proof.installationHash, config.environment) : null;
                if (record && (record.installationHash !== proof?.installationHash || record.environment !== config.environment))
                    reject(409, 'installation_conflict');
                if (record && record.employeeId !== employee.id)
                    reject(409, 'installation_conflict');
                if (record?.status === 'active' && (proof?.generation !== record.generation || body.ownershipGeneration !== record.generation))
                    reject(409, 'stale_generation');
                if (body.ownershipGeneration && (!record || body.ownershipGeneration !== record.generation || record.status !== 'active'))
                    reject(409, 'stale_generation');
                const sessionHash = createHash('sha256').update(token).digest('hex');
                if (operation === 'subscribe') {
                    const subscription = validatePushSubscription(body.subscription);
                    if (subscription.expirationTime !== null && subscription.expirationTime <= deps.clock().getTime())
                        reject();
                    // An inactive tombstone can never reactivate. Explicit fresh opt-in (no
                    // old generation) creates a fresh server-issued installation identity.
                    if (!proof || (record && record.status !== 'active'))
                        proof = createInstallationProof(config.environment);
                    const endpointFingerprint = createHash('sha256').update(subscription.endpoint).digest('hex');
                    const generation = record?.status === 'active' && record.endpointFingerprint === endpointFingerprint ? record.generation : randomUUID();
                    const enrollmentProof = { ...proof, generation, associatedSessionHash: sessionHash };
                    const result = await repo.enroll({ employeeId: employee.id, installationHash: proof.installationHash, environment: config.environment, endpointFingerprint, encryptedMaterial: encryptSubscriptionMaterial(subscription, key, enrollmentProof), sessionHash, generation, expectedGeneration: record?.status === 'active' ? record.generation : null, expiresAt: subscription.expirationTime === null ? null : new Date(subscription.expirationTime).toISOString() });
                    if (result.state !== 'active')
                        reject(409, 'installation_conflict');
                    cookies.set(INSTALLATION_COOKIE, sealInstallationProof(enrollmentProof, key), cookieOptions(365 * 86400));
                    return response(project(employee.id, enrollmentProof, { id: record?.id ?? '', employeeId: employee.id, installationHash: enrollmentProof.installationHash, environment: config.environment, generation, endpointFingerprint, sessionHash, expiresAt: null, lastTestAt: record?.lastTestAt ?? null, status: 'active' }, sessionHash));
                }
                if (!proof || !record || record.status !== 'active')
                    reject(409, 'installation_conflict');
                if (operation === 'unsubscribe') {
                    try {
                        const currentProof = proof;
                        const complete = await boundedCleanupAttempts([async signal => (await cleanupDeps.subscriptions(signal).detach(currentProof)).state === 'complete']);
                        if (!complete)
                            throw new Error('Pending cleanup');
                        // Preserve proof for safe account-switch checks; next explicit opt-in
                        // must inspect the tombstone and rotate, rather than inherit consent.
                        return response({ status: 'complete', generation: proof.generation });
                    }
                    catch {
                        const now = deps.clock();
                        cookies.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...proof, sessionHash, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 14 * 86400000).toISOString() }, key), cookieOptions());
                        return response({ status: 'pending', generation: proof.generation }, 503);
                    }
                }
                if (!testAllowed(employee.id, record) || record.sessionHash !== sessionHash)
                    reject(403, 'test_not_allowed');
                const now = deps.clock(), id = randomUUID();
                const intent: NotificationIntent = { ...buildSelfTestNotification(employee.id, id), id, environment: config.environment,
                    source: { kind: 'SELF_TEST', id: record.id, version: record.generation }, effectiveVersion: record.generation,
                    purpose: 'TEST', urgency: 'normal', dueAt: now.toISOString(), expiresAt: new Date(now.getTime() + 5 * 60000).toISOString() };
                if (!await repo.queueSelfTest({ proof, employeeId: employee.id, sessionHash, intent }))
                    reject(429, 'test_throttled');
                return response({ status: 'queued' }, 202);
            }
            catch (error) {
                return response({ error: error instanceof PushRequestError ? error.code : 'temporarily_unavailable' }, error instanceof PushRequestError ? error.status : 503);
            }
        },
    };
}
async function runtimeHandlers() {
    const [{ workspaceCookies: cookies }, { getSession }, { sqlSubscriptionRepository }] = await Promise.all([import('../workspace-routing/cookies.server'), import('../auth/session'), import('../data/push-subscriptions')]);
    return createPushHandlers({ config: readNotificationConfig(await workspaceRuntimeEnvironment()), cookies: async () => await cookies() as PushCookieStore, session: getSession, subscriptions: () => sqlSubscriptionRepository(), clock: () => new Date(),
        sessionBudget:async(employeeId,sessionTokenHash)=>{
            const [{queryRows},{getWorkspace},{applicationSql}]=await Promise.all([import('../db'),import('../data/workspaces'),import('../data/app-sql')]);
            if(!(await getWorkspace()).active)return 0;
            const rows=queryRows<{budget:number}>(await applicationSql().query(`SELECT least(45000,floor(extract(epoch FROM (s.expires_at-clock_timestamp()))*1000))::integer AS budget FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role IN ('EMPLOYEE','LEAD') AND s.expires_at>clock_timestamp()`,[sessionTokenHash,employeeId]));
            return rows[0]?.budget??0;
        }});
}
export async function handlePushMutation(request: Request, operation: 'subscribe' | 'unsubscribe' | 'test'): Promise<Response> { return (await runtimeHandlers()).mutation(request, operation); }
export async function handlePushStatus(request?:Request): Promise<Response> { return (await runtimeHandlers()).status(request); }
