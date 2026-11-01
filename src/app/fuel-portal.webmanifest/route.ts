import { manifest } from '../../lib/notifications/manifest';
import { currentBrand } from '../../lib/workspace-presentation/current.server';

export async function GET(): Promise<Response> {
  const presentation = await currentBrand();
  // Owner premium P2: white chrome under the white corporate header, whatever the company's masthead colour.
  return Response.json(manifest('#FFFFFF', presentation.modules), { headers: {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  } });
}
