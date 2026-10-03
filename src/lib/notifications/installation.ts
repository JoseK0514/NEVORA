import { createCipheriv, createDecipheriv, createHash, createHmac, timingSafeEqual, hkdfSync, randomBytes, randomUUID } from 'node:crypto';
import { decodePushKey } from './config';
import type { InstallationProof, PushEnvironment, VerifiedCleanupReceipt } from './types';
export const INSTALLATION_COOKIE = 'fuel_push_installation';
export const CLEANUP_COOKIE = 'fuel_push_cleanup';
export const MAX_CLEANUP_REVOCATIONS = 8;
export const MAX_CLEANUP_RECEIPT_BYTES = 3072;
export type CookieReader = {
    get(name: string): {
        value: string;
    } | undefined;
};
const MAX_LIFETIME_MS = 14 * 86400000;
const hashPattern = /^[a-f0-9]{64}$/;
const generationPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function validProof(value: unknown): value is InstallationProof {
    if (!value || typeof value !== 'object')
        return false;
    const p = value as InstallationProof;
    return (p.associatedSessionHash === undefined || hashPattern.test(p.associatedSessionHash)) && hashPattern.test(p.installationHash) && generationPattern.test(p.generation) && (p.environment === 'test' || p.environment === 'production');
}
function purposeKey(key: Uint8Array, purpose: string): Buffer {
    if (key.byteLength !== 32)
        throw new Error('Invalid protection configuration');
    return Buffer.from(hkdfSync('sha256', key, Buffer.alloc(0), `fuel-push:${purpose}:v1`, 32));
}
function seal(value: unknown, key: Uint8Array, purpose: string, context = ''): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', purposeKey(key, purpose), nonce);
    cipher.setAAD(Buffer.from(`fuel-push:${purpose}:v1:${context}`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return `v1.${Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url')}`;
}
function open(value: string, key: Uint8Array, purpose: string, context = ''): unknown {
    if (value.length > 16384 || !/^v1\.[A-Za-z0-9_-]+$/.test(value))
        throw new Error('Invalid protected material');
    const encoded = value.slice(3);
    const bytes = Buffer.from(encoded, 'base64url');
    if (bytes.length < 29 || bytes.toString('base64url') !== encoded)
        throw new Error('Invalid protected material');
    const decipher = createDecipheriv('aes-256-gcm', purposeKey(key, purpose), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    decipher.setAAD(Buffer.from(`fuel-push:${purpose}:v1:${context}`));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}
export function createInstallationProof(environment: PushEnvironment = 'test'): InstallationProof {
    return { installationHash: createHash('sha256').update(randomBytes(32)).digest('hex'), environment, generation: randomUUID() };
}
export function sealInstallationProof(proof: InstallationProof, key: Uint8Array): string {
    if (!validProof(proof))
        throw new Error('Invalid installation proof');
    return seal(proof, key, 'installation');
}
export function readInstallationProof(cookies: CookieReader, key?: Uint8Array, environment?: PushEnvironment): InstallationProof | null {
    const resolvedKey = key ?? decodePushKey(process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY, 32);
    if (!resolvedKey)
        return null;
    const value = cookies.get(INSTALLATION_COOKIE)?.value;
    if (!value)
        return null;
    try {
        const proof = open(value, resolvedKey, 'installation');
        return validProof(proof) && (!environment || proof.environment === environment) ? proof : null;
    }
    catch {
        return null;
    }
}
function validReceipt(value: unknown): value is VerifiedCleanupReceipt {
    if (!validProof(value))
        return false;
    const r = value as VerifiedCleanupReceipt;
    const issued = Date.parse(r.issuedAt ?? ''), expiry = Date.parse(r.expiresAt ?? '');
    const revocations = r.sessionRevocations;
    if (revocations !== undefined && (!Array.isArray(revocations) || revocations.length + (r.revokeSession === true ? 1 : 0) > MAX_CLEANUP_REVOCATIONS || revocations.some(item => {
        if (!item || typeof item !== 'object' || !hashPattern.test(item.sessionHash)) return true;
        const from = Date.parse(item.issuedAt), to = Date.parse(item.expiresAt);
        return !Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > MAX_LIFETIME_MS;
    }) || new Set(revocations.map(item => item.sessionHash)).size !== revocations.length || (r.revokeSession === true && revocations.some(item => item.sessionHash === r.sessionHash)))) return false;
    return (r.recoveryBlocked === undefined || typeof r.recoveryBlocked === 'boolean') && (r.revokeSession === undefined || typeof r.revokeSession === 'boolean') && hashPattern.test(r.sessionHash ?? '') && Number.isFinite(issued) && Number.isFinite(expiry) && expiry > issued && expiry - issued <= MAX_LIFETIME_MS;
}
export function sealCleanupReceipt(receipt: VerifiedCleanupReceipt, key: Uint8Array): string {
    if (!validReceipt(receipt))
        throw new Error('Invalid cleanup receipt');
    const encrypted = seal(receipt, key, 'cleanup-receipt');
    const signature = createHmac('sha256', purposeKey(key, 'cleanup-signing')).update(encrypted).digest('base64url');
    const value = `${encrypted}.${signature}`;
    if (Buffer.byteLength(value, 'utf8') > MAX_CLEANUP_RECEIPT_BYTES) throw new Error('Cleanup recovery capacity exceeded');
    return value;
}
export function openCleanupReceipt(value: string, key: Uint8Array, now: Date): VerifiedCleanupReceipt | null {
    try {
        if (Buffer.byteLength(value, 'utf8') > MAX_CLEANUP_RECEIPT_BYTES)
            return null;
        const parts = value.split('.');
        if (parts.length !== 3)
            return null;
        const encrypted = `${parts[0]}.${parts[1]}`;
        const signature = decodePushKey(parts[2], 32);
        const expected = createHmac('sha256', purposeKey(key, 'cleanup-signing')).update(encrypted).digest();
        if (!signature || !timingSafeEqual(signature, expected))
            return null;
        const receipt = open(encrypted, key, 'cleanup-receipt');
        return validReceipt(receipt) && Date.parse(receipt.issuedAt!) <= now.getTime() && Date.parse(receipt.expiresAt!) > now.getTime() && (!receipt.sessionRevocations || receipt.sessionRevocations.every(item => Date.parse(item.issuedAt) <= now.getTime() && Date.parse(item.expiresAt) > now.getTime())) ? receipt : null;
    }
    catch {
        return null;
    }
}
function materialContext(proof: InstallationProof): string { return `${proof.environment}:${proof.installationHash}:${proof.generation}`; }
export function encryptSubscriptionMaterial(value: unknown, key: Uint8Array, proof: InstallationProof): string { return seal(value, key, 'subscription', materialContext(proof)); }
export function decryptSubscriptionMaterial(value: string, key: Uint8Array, proof: InstallationProof): unknown { return open(value, key, 'subscription', materialContext(proof)); }
