import { safeNotificationOpenPath, safeReturnTo, withRequestFragment } from './destinations';
import type { NotificationStateRepository, PushEnvironment } from './types';
import type { SessionEmployee } from '../auth/session';
export type NotificationOpenDeps = {
    session(): Promise<SessionEmployee | null>;
    state: NotificationStateRepository;
    environment: PushEnvironment;
    clock(): Date;
};
/** F18: an expired, withdrawn, foreign or unknown notification lands back on the Notifications list, which says so
 * once. The same fixed address for every reason, so nothing about the source is disclosed. */
export const UNAVAILABLE_NOTIFICATION_PATH = '/app/notifications?unavailable=1';
function unavailable() { return redirectTo(UNAVAILABLE_NOTIFICATION_PATH); }
// Callers supply only validated rooted local paths. A relative Location keeps
// the browser origin even when a reverse proxy supplies a different request URL.
function redirectTo(path: string) { return new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } }); }
/** Resolve clicks against the current signed-in recipient and current source access.
 * Login preserves only a validated local return path; unavailable, expired or revoked
 * sources return the same no-store redirect to the list instead of disclosing their existence. */
export function createNotificationOpenHandler(deps: NotificationOpenDeps) {
    return async (request: Request): Promise<Response> => {
        try {
            const url = new URL(request.url);
            if ([...url.searchParams.keys()].some(key => key !== 'notificationId') || url.searchParams.getAll('notificationId').length !== 1)
                return unavailable();
            const notificationId = url.searchParams.get('notificationId') ?? '';
            const returnTo = safeNotificationOpenPath(notificationId);
            if (!returnTo)
                return unavailable();
            const session = await deps.session();
            if (!session)
                return redirectTo(`/login?returnTo=${encodeURIComponent(returnTo)}`);
            const intent = await deps.state.findIntent(notificationId);
            const now = deps.clock();
            if (!intent || intent.id !== notificationId || intent.employeeId !== session.id || intent.environment !== deps.environment || !(Date.parse(intent.expiresAt) > now.getTime()))
                return unavailable();
            const recipient = await deps.state.recipientAccess(session.id);
            if (!recipient?.active || recipient.employeeId !== session.id || recipient.role !== session.role)
                return unavailable();
            const check = await deps.state.check(intent, session.id, now, 'open');
            const destination = safeReturnTo(check.destination);
            if (!check.deliverable || check.effectiveVersion !== intent.effectiveVersion || !(Date.parse(check.expiresAt) > now.getTime()) || !destination || destination.startsWith('/app/notifications/open'))
                return unavailable();
            return redirectTo(withRequestFragment(destination) ?? destination);
        }
        catch {
            return unavailable();
        }
    };
}
