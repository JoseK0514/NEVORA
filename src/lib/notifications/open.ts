import { safeNotificationOpenPath, safeReturnTo, withRequestFragment } from './destinations';
import type { NotificationStateRepository, PushEnvironment } from './types';
import type { SessionEmployee } from '../auth/session';
export type NotificationOpenDeps = {
    session(): Promise<SessionEmployee | null>;
    state: NotificationStateRepository;
    environment: PushEnvironment;
    clock(): Date;
};
function unavailable() { return new Response('This notification is unavailable.', { status: 404, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } }); }
// Callers supply only validated rooted local paths. A relative Location keeps
// the browser origin even when a reverse proxy supplies a different request URL.
function redirectTo(path: string) { return new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } }); }
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
