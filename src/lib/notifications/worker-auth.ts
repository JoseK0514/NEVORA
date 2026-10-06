import { createHash, timingSafeEqual } from 'node:crypto';
/** Fixed-size digests keep the credential comparison constant-time, even for
 * different input lengths. A missing/short configuration never grants access. */
export function authorizeWorker(request: Request, configuredSecret?: string): boolean {
    if (!configuredSecret || configuredSecret.length < 32)
        return false;
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 4096)
        return false;
    const digest = (value: string) => createHash('sha256').update(value).digest();
    return timingSafeEqual(digest(authorization.slice(7)), digest(configuredSecret));
}
