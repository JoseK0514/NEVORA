import 'server-only';
import {withOnboardingOwner,type OnboardingOwnerHttpDeps} from './owner-http.server';
import {previewOnboardingRoster,saveOnboardingRoster} from './roster.server';
import {readOnboardingJson,onboardingJson,onboardingHttpFailure} from './http.server';
import {onboardingHttpStatus} from './contracts';
/** Both operations use POST for private roster data. The preview never writes. */
export function rosterHttpHandlers(deps:OnboardingOwnerHttpDeps){
 const handle=(request:Request,preview:boolean)=>withOnboardingOwner(request,deps,true,async(proof,binding)=>{
  const body=await readOnboardingJson(request,131072);
  const result=preview?await previewOnboardingRoster(proof,binding,body):await saveOnboardingRoster(proof,binding,body);
  return onboardingJson(result,result.state==='ready'?200:onboardingHttpStatus(result));
 }).catch(onboardingHttpFailure);
 return {preview:(request:Request)=>handle(request,true),save:(request:Request)=>handle(request,false)};
}
