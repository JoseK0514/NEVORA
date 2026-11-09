import {withOnboardingOwner,runtimeOnboardingOwnerDeps} from '@/lib/onboarding/owner-http.server';
import {saveOnboardingPerson} from '@/lib/onboarding/people.server';
import {onboardingHttpFailure,onboardingJson,readOnboardingJson} from '@/lib/onboarding/http.server';
import {onboardingHttpStatus} from '@/lib/onboarding/contracts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return await withOnboardingOwner(request,runtimeOnboardingOwnerDeps(),true,async(proof,binding)=>{const result=await saveOnboardingPerson(proof,binding,await readOnboardingJson(request));return onboardingJson(result,onboardingHttpStatus(result));});}catch(error){return onboardingHttpFailure(error);}}
