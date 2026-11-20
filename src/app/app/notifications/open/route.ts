import { createNotificationOpenHandler } from '../../../../lib/notifications/open';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
    const search = new URL(request.url).searchParams;
    const ids = search.getAll('notificationId');
    if (ids.some(id => id.startsWith('clocker-face-'))) {
        const headers = {'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'};
        try {
            if (ids.length !== 1) return new Response(null, {status:404,headers});
            const [{requireSessionMutationProof},{readClockerFaceAlert}] = await Promise.all([
                import('@/lib/auth/session'),import('@/lib/clocker/face-verification/open-alert.server'),
            ]);
            const reference = await readClockerFaceAlert(await requireSessionMutationProof(), ids[0]);
            if (!reference) return new Response(null, {status:404,headers});
            const params = new URLSearchParams(reference);
            return new Response(null, {status:303,headers:{...headers,Location:'/app/settings/clocker/photos/review?'+params}});
        } catch {
            return new Response(null, {status:404,headers});
        }
    }
    const [{ getSession }, { sqlNotificationStateRepository }, { readNotificationConfig }] = await Promise.all([import('../../../../lib/auth/session'), import('../../../../lib/data/notification-state'), import('../../../../lib/notifications/config')]);
    return createNotificationOpenHandler({ session: getSession, state: sqlNotificationStateRepository(), environment: readNotificationConfig(process.env).environment, clock: () => new Date() })(request);
}
