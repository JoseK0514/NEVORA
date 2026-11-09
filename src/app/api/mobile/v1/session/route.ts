import {getSession} from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(state: 'authenticated' | 'unauthenticated' | 'unavailable' | 'denied', status: number) {
  return Response.json({protocolVersion: 1, state}, {status, headers: {
    'Cache-Control': 'no-store, private', 'Vary': 'Cookie',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  }});
}

/** Compatibility/reachability only; native requests carry no app-cookie credentials.
 * The protected web document checks the actual session and native role presentation.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.search) return reply('denied', 400);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin !== null && origin !== url.origin)) {
    return reply('denied', 403);
  }
  try {
    return await getSession() ? reply('authenticated', 200) : reply('unauthenticated', 401);
  } catch {
    return reply('unavailable', 503);
  }
}
