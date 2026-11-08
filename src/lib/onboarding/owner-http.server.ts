import 'server-only';
import {readWorkspaceRoutingConfig,type WorkspaceRoutingConfig} from '../workspace-routing/config.server';
import {resolveWorkspaceBinding,type WorkspaceBinding} from '../workspace-routing/resolver.server';
import {withWorkspaceBinding} from '../workspace-routing/context.server';
import {runtimeControlStore,type ControlStore} from './control-store.server';
import {readSessionMutationProof} from '../auth/session';
import type {SessionMutationProof} from '../shift-changes/types';
import {validateOnboardingWrite,onboardingJson,onboardingHttpFailure,readOnboardingJson} from './http.server';
import {readOnboardingSetup,saveOnboardingStep} from './setup.server';
import {onboardingHttpStatus} from './contracts';
export type OnboardingOwnerHttpDeps={config:WorkspaceRoutingConfig;store:ControlStore;readProof?:()=>Promise<SessionMutationProof|null>};
/** Shared request admission. Disabling new registration does not disable the
 * registered ACTIVE company's Owner setup or existing product access. */
export async function withOnboardingOwner(request:Request,deps:OnboardingOwnerHttpDeps,write:boolean,action:(proof:SessionMutationProof,binding:WorkspaceBinding)=>Promise<Response>):Promise<Response>{
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(url.search||request.headers.get('sec-fetch-site')==='cross-site'||(origin!==null&&origin!==url.origin))return onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},403);
 if(write){const rejected=validateOnboardingWrite(request,url.origin);if(rejected)return rejected;}
 else if(request.method!=='GET')return onboardingJson({state:'unavailable'},405);
 const host=request.headers.get('host'),forwarded=request.headers.get('x-forwarded-host'),protocol=request.headers.get('x-forwarded-proto');if((host&&host!==url.host)||(protocol&&protocol!==url.protocol.slice(0,-1)))return onboardingJson({state:'unavailable'},403);
 try{
  const binding=await resolveWorkspaceBinding({origin:url.origin,...(forwarded?{forwardedHost:forwarded}:{})},deps.store,deps.config);
  return await withWorkspaceBinding(binding,async()=>{const proof=await (deps.readProof??readSessionMutationProof)();if(!proof)return onboardingJson({state:'unavailable',reasonCode:'AUTH_REQUIRED'},401);return action(proof,binding);});
 }catch(error){const message=error instanceof Error?error.message:'';return /authorization|permission/.test(message)?onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},403):onboardingHttpFailure(error);}
}
export function setupHttpHandlers(deps:OnboardingOwnerHttpDeps){return {
 read:(request:Request)=>withOnboardingOwner(request,deps,false,async(proof,binding)=>onboardingJson({state:'ready',...await readOnboardingSetup(proof,binding)})),
 save:(request:Request,stepId:string)=>withOnboardingOwner(request,deps,true,async(proof,binding)=>{const result=await saveOnboardingStep(proof,binding,stepId,await readOnboardingJson(request));return onboardingJson(result,onboardingHttpStatus(result));}),
};}
export function runtimeOnboardingOwnerDeps():OnboardingOwnerHttpDeps{const config=readWorkspaceRoutingConfig();return {config,store:runtimeControlStore(config)};}
export function runtimeSetupHandlers(){return setupHttpHandlers(runtimeOnboardingOwnerDeps());}
