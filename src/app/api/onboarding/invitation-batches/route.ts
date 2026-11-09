import {runtimeOnboardingOwnerDeps} from '@/lib/onboarding/owner-http.server';
import {invitationBatchHttpHandlers} from '@/lib/onboarding/invitation-batch-http.server';
import {onboardingHttpFailure} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return await invitationBatchHttpHandlers(runtimeOnboardingOwnerDeps()).issue(request);}catch(error){return onboardingHttpFailure(error);}}
