import { createECDH, timingSafeEqual } from 'node:crypto';
import { notificationPolicyFor } from './policy';
import { getWorkspace } from '../data/workspaces';
import type { Workspace } from '../domain';
import type { NotificationConfig, PushRuntimeConfig, SqlExecutor } from './types';
// Erased by Next production compilation; synchronous for the existing worker CLI.
const developmentCapture:typeof import('../dev/capture-gate.cjs')|null=process.env.NODE_ENV!=='production'?require('../dev/capture-gate.cjs'):null;
/** Canonical unpadded URL-safe encoding only. Never include rejected values in errors. */
export function decodePushKey(value: unknown, length: number): Buffer | null {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value))
        return null;
    const bytes = Buffer.from(value, 'base64url');
    return bytes.length === length && bytes.toString('base64url') === value ? bytes : null;
}
/** Parse runtime flags and validate origin/key material without reading workspace data.
 * Feature availability, delivery readiness and test allowlisting are separate gates;
 * this result describes configuration, not provider connectivity or successful delivery. */
export function readNotificationConfig(env: Record<string, string | undefined>): PushRuntimeConfig {
    const environment = env.PUSH_ENVIRONMENT === 'production' ? 'production' : 'test';
    const validEnvironment = env.PUSH_ENVIRONMENT === 'test' || env.PUSH_ENVIRONMENT === 'production';
    let portalOrigin = '';
    try {
        const url = new URL(env.FUEL_PORTAL_ORIGIN ?? '');
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (!url.username && !url.password && !url.search && !url.hash && url.pathname === '/' &&
            (url.protocol === 'https:' || (local && url.protocol === 'http:' && env.PUSH_DELIVERY_ENABLED !== 'true' && env.PUSH_TEST_DELIVERY_ENABLED !== 'true')))
            portalOrigin = url.origin;
    }
    catch { /* Invalid configuration stays unavailable. */ }
    const publicKey = decodePushKey(env.PUSH_VAPID_PUBLIC_KEY, 65);
    const privateKey = decodePushKey(env.PUSH_VAPID_PRIVATE_KEY, 32);
    const encryptionKey = decodePushKey(env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY, 32);
    let validPair = false;
    let validPublic = false;
    try {
        if (publicKey?.[0] === 4) {
            // computeSecret checks on-curve coordinates against a throwaway scalar.
            const ecdh = createECDH('prime256v1');
            ecdh.setPrivateKey(Buffer.alloc(32, 1));
            ecdh.computeSecret(publicKey);
            validPublic = true;
        }
        if (privateKey && publicKey) {
            const pair = createECDH('prime256v1');
            pair.setPrivateKey(privateKey);
            validPair = timingSafeEqual(pair.getPublicKey(), publicKey);
        }
    }
    catch { /* Invalid material disables sending. */ }
    let validSubject = false;
    try {
        const subject = new URL(env.PUSH_VAPID_SUBJECT ?? '');
        validSubject = subject.protocol === 'mailto:' ? /^[^@\s]+@[^@\s]+$/.test(subject.pathname) : subject.protocol === 'https:' && !subject.username && !subject.password;
    }
    catch { /* Unavailable. */ }
    const featureEnabled = env.PUSH_FEATURE_ENABLED === 'true' && validEnvironment && !!portalOrigin && !!encryptionKey && validPublic;
    const safeProduction = environment !== 'production' || (env.VERCEL_ENV !== 'preview' && env.VERCEL_ENV !== 'development' && env.NODE_ENV !== 'test');
    const ready = featureEnabled && portalOrigin.startsWith('https:') && safeProduction && validPair && validSubject && (env.NOTIFICATION_WORKER_SECRET?.length ?? 0) >= 32;
    const testAccountIds = [...new Set((env.PUSH_TEST_ACCOUNT_IDS ?? '').split(',').map(s => s.trim()).filter(s => /^[A-Za-z0-9_-]{1,128}$/.test(s)))];
    const config:PushRuntimeConfig={
        environment, portalOrigin, featureEnabled,
        deliveryEnabled: ready && env.PUSH_DELIVERY_ENABLED === 'true',
        testDeliveryEnabled: ready && environment === 'test' && env.PUSH_TEST_DELIVERY_ENABLED === 'true' && testAccountIds.length > 0,
        testAccountIds,
        ...(validPublic ? { vapidPublicKey: env.PUSH_VAPID_PUBLIC_KEY } : {}),
        ...(validPair ? { vapidPrivateKey: env.PUSH_VAPID_PRIVATE_KEY } : {}),
        ...(validSubject ? { vapidSubject: env.PUSH_VAPID_SUBJECT } : {}),
        ...(encryptionKey ? { subscriptionEncryptionKey: env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY } : {}),
        ...((env.NOTIFICATION_WORKER_SECRET?.length ?? 0) >= 32 ? { workerSecret: env.NOTIFICATION_WORKER_SECRET } : {}),
    };
    return process.env.NODE_ENV!=='production'&&developmentCapture?developmentCapture.captureNotificationRuntime(config,env):config;
}
/** Attach the current workspace time zone and active-state gates; workers should
 * receive this bound config rather than silently using the default policy time zone. */
export function bindWorkspaceNotificationConfig(runtime: PushRuntimeConfig, workspace: Workspace): NotificationConfig {
    return {...runtime, workspace, policy:notificationPolicyFor(workspace.timeZone),
        featureEnabled:runtime.featureEnabled && workspace.active,
        deliveryEnabled:runtime.deliveryEnabled && workspace.active,
        testDeliveryEnabled:runtime.testDeliveryEnabled && workspace.active};
}
export async function loadWorkspaceNotificationConfig(env: Record<string,string|undefined>, executor?: SqlExecutor): Promise<NotificationConfig> {
    return bindWorkspaceNotificationConfig(readNotificationConfig(env),await getWorkspace(executor));
}
