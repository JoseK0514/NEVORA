import 'server-only';
import {readOnboardingConfig,type EnabledConfig,type DisabledConfig} from './config.server';
import {runtimeControlStore,type ControlStore} from './control-store.server';
import {signupSessionFromRequest} from './provisioning/http.server';
import {validateOnboardingWrite,readOnboardingJson,onboardingJson,onboardingHttpFailure} from './http.server';
import {requestOwnerBootstrapGrant,activateInitialOwner} from './owner-activation.server';
import {resolveWorkspaceBinding,workspaceBindingFacts,assertWorkspaceBindingCurrent} from '../workspace-routing/resolver.server';
export function ownerActivationHttpHandlers(deps:{config:EnabledConfig|DisabledConfig;store?:ControlStore}){
 return {
  async grant(request:Request):Promise<Response>{
   const c=deps.config;if(!c.enabled)return onboardingJson({state:'unavailable'},503);
   const boundary=validateOnboardingWrite(request,c.signupOrigin);if(boundary)return boundary;
   if(!deps.store)return onboardingJson({state:'unavailable'},503);
   try{const session=await signupSessionFromRequest(request,deps.store,c);if(!session)return onboardingJson({state:'unavailable'},401);const result=await requestOwnerBootstrapGrant(session,await readOnboardingJson(request),deps.store,c);return onboardingJson(result,result.state==='ready'?200:result.state==='pending'||result.state==='outcome_unknown'?202:result.state==='invalid'?400:result.state==='limited'?429:503);}catch(error){return onboardingHttpFailure(error);}
  },
  async activate(request:Request):Promise<Response>{
   const c=deps.config;if(!c.enabled||!deps.store)return onboardingJson({state:'unavailable'},503);
   const url=new URL(request.url),boundary=validateOnboardingWrite(request,url.origin);if(boundary)return boundary;
   const host=request.headers.get('host'),forwarded=request.headers.get('x-forwarded-host'),protocol=request.headers.get('x-forwarded-proto');
   if((host&&host!==url.host)||(protocol&&protocol!==url.protocol.slice(0,-1)))return onboardingJson({state:'invalid'},403);
   try{
    const config={...c,tokenKey:c.workspaceTokenKey},identity={origin:url.origin,...(forwarded?{forwardedHost:forwarded}:{})};
    const binding=await resolveWorkspaceBinding(identity,deps.store,config,'BOOTSTRAP').catch(()=>resolveWorkspaceBinding(identity,deps.store!,config,'APP'));
    const command=await readOnboardingJson(request);
    const result=await activateInitialOwner(binding,command,undefined,request.signal);
    if(result.state==='activated'){
     // Credential commit precedes the worker's control-plane finalization.
     // Recover the same command until this exact workplace is sign-in ready.
     try{
      const active=await resolveWorkspaceBinding(identity,deps.store,config,'APP');
      const original=workspaceBindingFacts(binding).record,current=workspaceBindingFacts(active).record;
      if(current.id!==original.id||current.incarnation!==original.incarnation)throw Error('Activation source changed');
      await assertWorkspaceBindingCurrent(active);
     }catch{
      return onboardingJson({state:'pending',operationId:(command as {operationId:string}).operationId,pollAfterMs:1000},202);
     }
    }
    return onboardingJson(result,result.state==='activated'?200:result.state==='outcome_unknown'?202:result.state==='conflict'?409:result.state==='invalid'?400:result.state==='limited'?429:503);
   }catch(error){return onboardingHttpFailure(error);}
  },
 };
}
export function runtimeOwnerActivationHandlers(){const config=readOnboardingConfig();return ownerActivationHttpHandlers(config.enabled?{config,store:runtimeControlStore(config)}:{config});}
