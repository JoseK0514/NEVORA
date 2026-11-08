import { createHash } from 'node:crypto';
import {workspaceCookies as cookies} from "@/lib/workspace-routing/cookies.server";
import {applicationSql} from "@/lib/data/app-sql";
import { destroySession } from '@/lib/auth/session';
import { neonNotificationExecutor } from '@/lib/data/notification-transactions';
import { clockerSecurity, handleClockerSetup } from '@/lib/clocker/setup.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  const store = await cookies();
  return handleClockerSetup(request, location, {
    cookies: store, executor: neonNotificationExecutor(), security: await clockerSecurity(),
    async finishPortalSession() {
      const portalToken = store.get('fuel_session')?.value;
      if (!portalToken) return;
      // Unlike best-effort logout, shared-tablet handover requires confirmed revocation.
      // Revoke only this tablet's session, never the Owner's session on another device.
      await applicationSql().query('DELETE FROM employee_sessions WHERE token_hash=$1', [createHash('sha256').update(portalToken).digest('hex')]);
      await destroySession();
    },
  });
}
