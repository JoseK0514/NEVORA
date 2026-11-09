import { getClockerPhotoSettingsRuntime } from '@/lib/clocker/photo-server/runtime.server';
import { handleClockerPhotoReview } from '@/lib/clocker/photo-server/transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Authenticated POST only. No anonymous GET/public photo link. photoId is the
 * exact original command; enrolled device is supplied in bounded owner JSON. */
export async function POST(request: Request, { params }: { params: Promise<{ location: string; photoId: string }> }) {
  const binding = await getClockerPhotoSettingsRuntime();
  if (!binding) return Response.json({ state: 'unavailable', error: 'Photo review is not available in this environment yet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
  const { location, photoId } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location) || location.length > 64 || location.endsWith('\n')) return Response.json({ state: 'rejected' }, { status: 400 });
  // Query/body/path disagreement is rejected, not silently redirected to another photo.
  if (request.headers.get('x-nevora-photo-command') !== photoId) return Response.json({ state: 'rejected' }, { status: 400 });
  return handleClockerPhotoReview(request, location, photoId, binding.settingsTransport);
}
