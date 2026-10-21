import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { readToday } from '@/lib/data/today.server';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (value: object, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store, private', 'Vary': 'Cookie', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });

/** Read-only: today's published shifts against recorded punches (B4). */
export async function GET(request: Request): Promise<Response> {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('x-nevora-today') !== '1') return json({ state: 'unavailable', reason: 'access_denied' }, 403);
  if (new URL(request.url).search) return json({ state: 'unavailable', reason: 'access_denied' }, 400);
  try {
    const session = await getSession();
    if (!session) return json({ state: 'unavailable', reason: 'access_denied' }, 401);
    if (session.role !== 'OWNER' && session.role !== 'MANAGER') return json({ state: 'unavailable', reason: 'access_denied' }, 403);
    const proof=await requireSessionMutationProof();
    const source=await withOperationalCompany(proof,()=>readToday(proof));
    if(source.state==='unavailable')return json(source,source.reason==='access_denied'?403:503);
    const today = source.data;
    return json(today, today.state === 'ready' ? 200 : today.reason === 'access_denied' ? 403 : 503);
  } catch { return json({ state: 'unavailable', reason: 'read_failed' }, 503); }
}
