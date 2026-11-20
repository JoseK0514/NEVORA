import {getClockerFaceRuntime} from '@/lib/clocker/face-verification/runtime.server';
import {faceResponseHeaders, faceUnavailableResponse, handleFaceEmployee} from '@/lib/clocker/face-verification/transport.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, {params}: {params: Promise<{location: string}>}) {
  const {location} = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location) || location.length > 64) {
    return Response.json({code: 'INVALID_INPUT'}, {status: 400, headers: faceResponseHeaders});
  }
  try {
    const binding = await getClockerFaceRuntime();
    return binding ? handleFaceEmployee(request, binding.photo.transport.security, binding.service,
      () => binding.photo.transport.authenticate(request, location)) : faceUnavailableResponse();
  } catch {
    return faceUnavailableResponse();
  }
}
