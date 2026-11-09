import 'server-only';
import {invitationDelivery} from '../auth/invitations/delivery.server';
import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import {withOnboardingOwner,type OnboardingOwnerHttpDeps} from './owner-http.server';
import {issueInvitationBatch,readInvitationBatch} from './invitation-batch.server';
import {readOnboardingJson,onboardingJson} from './http.server';
import {onboardingHttpStatus} from './contracts';
export function invitationBatchHttpHandlers(deps:OnboardingOwnerHttpDeps){return {
 issue:(request:Request)=>withOnboardingOwner(request,deps,true,async(proof,binding)=>{const delivery=invitationDelivery(await workspaceRuntimeEnvironment());const result=await issueInvitationBatch(proof,binding,await readOnboardingJson(request),delivery);return onboardingJson(result,onboardingHttpStatus(result));}),
 read:(request:Request,operationId:string)=>withOnboardingOwner(request,deps,false,async(proof,binding)=>{const result=await readInvitationBatch(proof,binding,operationId);return onboardingJson(result,result.state==='ready'?200:503);}),
};}
