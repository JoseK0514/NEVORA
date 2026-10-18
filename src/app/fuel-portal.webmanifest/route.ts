import { manifest } from '../../lib/notifications/manifest';
import { currentBrand } from '../../lib/workspace-presentation/current.server';

export async function GET(): Promise<Response> {
  const presentation = await currentBrand();
  return Response.json(manifest(presentation.tokens?.masthead, presentation.modules), { headers: {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  } });
}
