import {runtimeOnboardingOwnerDeps} from '@/lib/onboarding/owner-http.server';
import {invitationBatchHttpHandlers} from '@/lib/onboarding/invitation-batch-http.server';
import {onboardingHttpFailure} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{operationId:string}>}){try{return await invitationBatchHttpHandlers(runtimeOnboardingOwnerDeps()).read(request,(await context.params).operationId);}catch(error){return onboardingHttpFailure(error);}}
