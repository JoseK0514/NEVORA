import { resolveSelectedPortalRequest } from '@/lib/auth/portal-request.server';
import { normalizeWorkspaceLocator } from '@/lib/tenancy/identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' };
const error = (name: string, status: number) => Response.json({ error: name }, { status, headers });

// F10 foundation read only. The actual cookie/private issuer/current database
// guards must succeed; a local login receipt or source observation cannot open
// this route. Legacy workflows and dependent F6–F9 integration remain separate.
export async function GET(request: Request, context: { params: Promise<{ locator: string }> }) {
  try {
    if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return error('access_denied', 403);
    const locator = normalizeWorkspaceLocator((await context.params).locator);
    if (!locator) return error('authentication_required', 401);
    const result = await resolveSelectedPortalRequest(locator);
    if (result.status === 'DENY') return error('authentication_required', 401);
    if (result.status !== 'ALLOW') return error('portal_unavailable', 503);
    // Explicit public projection: no proof, internal IDs, bearer/digest,
    // authorization versions, capability grants or database metadata.
    return Response.json({
      workspace: { locator, name: result.workspace.name, timeZone: result.workspace.timeZone },
      employee: { firstName: result.employment.firstName, lastName: result.employment.lastName, role: result.employment.role },
    }, { headers });
  } catch {
    return error('portal_unavailable', 503);
  }
}
