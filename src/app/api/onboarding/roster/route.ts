import {workspaceMode} from '@/lib/workspace-routing/config.server';
import {onboardingJson} from '@/lib/onboarding/http.server';
import {rosterHttpHandlers} from '@/lib/onboarding/roster-http.server';
import {runtimeOnboardingOwnerDeps} from '@/lib/onboarding/owner-http.server';
import {onboardingHttpFailure} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){if(workspaceMode()==='single_company')return onboardingJson({state:'unavailable',reasonCode:'ROSTER_IMPORT_NOT_ENABLED'},404);try{return await rosterHttpHandlers(runtimeOnboardingOwnerDeps()).save(request);}catch(error){return onboardingHttpFailure(error);}}
