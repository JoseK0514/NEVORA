import { getClockerPhotoSettingsRuntime } from '@/lib/clocker/photo-server/runtime.server';
import { handleClockerPhotoOwnerReview } from '@/lib/clocker/photo-server/transport';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const runtime = await getClockerPhotoSettingsRuntime();
  return runtime ? handleClockerPhotoOwnerReview(request, runtime.settingsTransport)
    : Response.json({ state: 'disabled', error: 'Punch photo review is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' } });
}
