import { getClockerPhotoRuntime } from '@/lib/clocker/photo-server/runtime.server';
import { handleClockerPhoto } from '@/lib/clocker/photo-server/transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ location: string }> }) {
  const binding = getClockerPhotoRuntime();
  if (!binding) return Response.json({ state: 'unavailable', error: 'Punch photos are not available in this environment yet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
  return handleClockerPhoto(request, (await params).location, binding.transport);
}
