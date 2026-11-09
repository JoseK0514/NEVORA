import 'server-only';
import {readOnboardingConfig,type EnabledConfig,type DisabledConfig} from './config.server';
import {runtimeControlStore,type ControlStore} from './control-store.server';
import {verificationDelivery,type VerificationDelivery} from './verification-delivery.server';
import {requestRegistration,verifyRegistration} from './registration.server';
import {isClosedRecord,onboardingHttpStatus,type PublicOnboardingConfig} from './contracts';
import {onboardingJson,validateOnboardingWrite,readOnboardingJson,onboardingHttpFailure} from './http.server';

export const SIGNUP_COOKIE='nevora_signup';
type Dependencies={config:EnabledConfig|DisabledConfig;store?:ControlStore;delivery?:VerificationDelivery|null};
export function publicOnboardingConfig(config:EnabledConfig|DisabledConfig,senderConfigured:boolean):PublicOnboardingConfig{
 if(!config.enabled||!senderConfigured)return {schemaVersion:1,signupEnabled:false,locales:['en','es']};
 return {schemaVersion:1,signupEnabled:true,locales:['en','es'],terms:{version:config.termsVersion,url:config.signupOrigin+'/terms'},privacy:{version:config.privacyVersion,url:config.signupOrigin+'/privacy'}};
}
export function registrationHttpHandlers(deps:Dependencies){
 return {
  async request(request:Request):Promise<Response>{
   const c=deps.config;if(!c.enabled)return onboardingJson({state:'unavailable',reasonCode:'ONBOARDING_DISABLED'},503);
   const admission=validateOnboardingWrite(request,c.signupOrigin);if(admission)return admission;
   if(!deps.store)return onboardingJson({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'},503);
   try{const body=await readOnboardingJson(request,4096);const r=await requestRegistration(body,deps.store,deps.delivery??null,c);return onboardingJson(r,r.state==='verification_requested'?202:onboardingHttpStatus(r));}catch(error){return onboardingHttpFailure(error);}
  },
  async verify(request:Request):Promise<Response>{
   const c=deps.config;if(!c.enabled)return onboardingJson({state:'unavailable',reasonCode:'ONBOARDING_DISABLED'},503);
   const admission=validateOnboardingWrite(request,c.signupOrigin);if(admission)return admission;
   if(!deps.store)return onboardingJson({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'},503);
   try{const body=await readOnboardingJson(request,1024);if(!isClosedRecord(body,['schemaVersion','operationId','proof'])||body.schemaVersion!==1)return onboardingJson({state:'invalid'},400);
    const r=await verifyRegistration({operationId:body.operationId,proof:body.proof},deps.store,c);
    if(r.state!=='verified')return onboardingJson(r,r.state==='invalid'?400:r.state==='outcome_unknown'?202:503);
    // Explicitly project the response; the private proof/token must never be JSON serialized.
    return onboardingJson({schemaVersion:1,state:'verified',snapshot:r.snapshot},200,{'set-cookie':SIGNUP_COOKIE+'='+r.sessionToken+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+Math.floor(c.signupSessionTtlMs/1000)+(c.signupOrigin.startsWith('https:')?'; Secure':'')});
   }catch(error){return onboardingHttpFailure(error);}
  },
 };
}
export function runtimeRegistrationHandlers(){const config=readOnboardingConfig();return registrationHttpHandlers(config.enabled?{config,store:runtimeControlStore(config),delivery:verificationDelivery(process.env,config)}:{config});}
