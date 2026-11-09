import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { getAttendanceReview } from '@/lib/data/attendance-review';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

const json = (value: object, status = 200) =>
  Response.json(value, { status, headers });

export async function GET(request: Request): Promise<Response> {
  if (
    request.headers.get('sec-fetch-site') === 'cross-site' ||
    request.headers.get('x-nevora-attendance') !== '1'
  ) {
    return json({ state: 'unavailable', reason: 'access_denied' }, 403);
  }

  const policyRequest=new URL(request.url).search==='?policies=1';
  if (new URL(request.url).search && !policyRequest) {
    return json({ state: 'unavailable', reason: 'access_denied' }, 400);
  }

  try {
    const session = await getSession();
    if (!session) {
      return json({ state: 'unavailable', reason: 'access_denied' }, 401);
    }
    if (session.role !== 'OWNER' && session.role !== 'MANAGER') {
      return json({ state: 'unavailable', reason: 'access_denied' }, 403);
    }

    if(policyRequest){const {readAttendancePolicies}=await import('@/lib/business-improvements/attendance-policy/service');const result=await readAttendancePolicies(await requireSessionMutationProof());return json(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);}
    const result = await getAttendanceReview();
    if (result.state === 'ready') return json(result);
    return json(
      result,
      result.reason === 'access_denied' ? 403 : 503,
    );
  } catch {
    return json({ state: 'unavailable', reason: 'read_failed' }, 503);
  }
}
