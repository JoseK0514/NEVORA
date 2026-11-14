import {rosterHttpHandlers} from '@/lib/onboarding/roster-http.server';
import {runtimeOnboardingOwnerDeps} from '@/lib/onboarding/owner-http.server';
import {onboardingHttpFailure} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return await rosterHttpHandlers(runtimeOnboardingOwnerDeps()).save(request);}catch(error){return onboardingHttpFailure(error);}}
