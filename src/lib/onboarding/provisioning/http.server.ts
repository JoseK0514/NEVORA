import 'server-only';
import {readOnboardingConfig,type EnabledConfig,type DisabledConfig} from '../config.server';
import {runtimeControlStore,type ControlStore} from '../control-store.server';
import {readVerifiedSignupSession,type VerifiedSignupSession} from '../registration.server';
import {SIGNUP_COOKIE} from '../registration-http.server';
import {onboardingHttpStatus} from '../contracts';
import {validOnboardingToken} from '../crypto.server';
import {onboardingJson,validateOnboardingWrite,readOnboardingJson,onboardingHttpFailure} from '../http.server';
import {requestWorkspace,readProvisioningOperation} from './store.server';
export async function signupSessionFromRequest(request:Request,store:ControlStore,config:EnabledConfig):Promise<VerifiedSignupSession|null>{
 const matches=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.split('=')[0].trim()===SIGNUP_COOKIE);
 if(matches.length!==1)return null;const field=matches[0],equals=field.indexOf('='),value=equals<0?'':field.slice(equals+1);if(!validOnboardingToken(value))return null;
 return readVerifiedSignupSession(value,store,config);
}
export function provisioningHttpHandlers(deps:{config:EnabledConfig|DisabledConfig;store?:ControlStore}){
 return {
  async request(request:Request):Promise<Response>{
   const c=deps.config;if(!c.enabled)return onboardingJson({state:'unavailable',reasonCode:'ONBOARDING_DISABLED'},503);
   const boundary=validateOnboardingWrite(request,c.signupOrigin);if(boundary)return boundary;
   if(!deps.store)return onboardingJson({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'},503);
   try{const actor=await signupSessionFromRequest(request,deps.store,c);if(!actor)return onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},401);
    const result=await requestWorkspace(actor,await readOnboardingJson(request),deps.store,c);return onboardingJson(result,onboardingHttpStatus(result));
   }catch(error){return onboardingHttpFailure(error);}
  },
  async read(request:Request,operationId:string):Promise<Response>{
   const c=deps.config;if(!c.enabled)return onboardingJson({state:'unavailable',reasonCode:'ONBOARDING_DISABLED'},503);
   const u=new URL(request.url),origin=request.headers.get('origin');if(request.method!=='GET'||u.origin!==c.signupOrigin||u.search||(origin!==null&&origin!==c.signupOrigin)||request.headers.get('sec-fetch-site')==='cross-site')return onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},403);
   if(!deps.store)return onboardingJson({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'},503);
   try{const actor=await signupSessionFromRequest(request,deps.store,c);if(!actor)return onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},401);const result=await readProvisioningOperation(actor,operationId,deps.store,c);return onboardingJson(result,onboardingHttpStatus(result));}catch(error){return onboardingHttpFailure(error);}
  },
 };
}
export function runtimeProvisioningHandlers(){const config=readOnboardingConfig();return provisioningHttpHandlers(config.enabled?{config,store:runtimeControlStore(config)}:{config});}
