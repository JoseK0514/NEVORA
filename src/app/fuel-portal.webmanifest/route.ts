import { manifest } from '../../lib/notifications/manifest';

export function GET(): Response {
  return Response.json(manifest(), { headers: {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  } });
}
