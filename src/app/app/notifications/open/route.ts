import { createNotificationOpenHandler } from '../../../../lib/notifications/open';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
    const [{ getSession }, { sqlNotificationStateRepository }, { readNotificationConfig }] = await Promise.all([import('../../../../lib/auth/session'), import('../../../../lib/data/notification-state'), import('../../../../lib/notifications/config')]);
    return createNotificationOpenHandler({ session: getSession, state: sqlNotificationStateRepository(), environment: readNotificationConfig(process.env).environment, clock: () => new Date() })(request);
}
