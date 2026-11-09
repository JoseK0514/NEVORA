import {runtimeSetupHandlers} from '@/lib/onboarding/owner-http.server';
import {onboardingHttpFailure} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return await runtimeSetupHandlers().read(request);}catch(error){return onboardingHttpFailure(error);}}
