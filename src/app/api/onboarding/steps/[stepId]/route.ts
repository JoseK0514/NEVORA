import {runtimeSetupHandlers} from '@/lib/onboarding/owner-http.server';
import {onboardingHttpFailure} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{stepId:string}>}){try{return await runtimeSetupHandlers().save(request,(await context.params).stepId);}catch(error){return onboardingHttpFailure(error);}}
