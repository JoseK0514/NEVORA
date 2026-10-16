import { manifest } from '../../lib/notifications/manifest';
import { currentBrand } from '../../lib/workspace-presentation/current.server';

export async function GET(): Promise<Response> {
  return Response.json(manifest((await currentBrand()).tokens?.masthead), { headers: {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  } });
}
