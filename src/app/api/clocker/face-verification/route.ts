import {getClockerFaceRuntime} from '@/lib/clocker/face-verification/runtime.server';
import {faceUnavailableResponse, handleFaceOwner} from '@/lib/clocker/face-verification/transport.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const binding = await getClockerFaceRuntime();
    return binding ? handleFaceOwner(request, binding.photo.settingsTransport.security, binding.service,
      () => binding.photo.settingsTransport.authenticate(request)) : faceUnavailableResponse();
  } catch {
    return faceUnavailableResponse();
  }
}
