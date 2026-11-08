import 'server-only';
import {createHash} from 'node:crypto';
import {workspaceInstanceSecret} from '../../../services/commerce/workspace-enrollment';
import {currentWorkspaceBinding,withWorkspaceBinding} from '../workspace-routing/context.server';
import {assertWorkspaceBindingCurrent,resolveWorkspaceBinding} from '../workspace-routing/resolver.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import {readWorkspaceRoutingConfig} from '../workspace-routing/config.server';
import {runtimeControlStore} from '../onboarding/control-store.server';
export async function isolatedCommerceConnection(){
 const binding=await currentWorkspaceBinding(),facts=await assertWorkspaceBindingCurrent(binding),r=facts.record;
 const key=process.env.NEVORA_COMMERCE_BINDING_KEY??'',origin=process.env.NEVORA_COMMERCE_API_ORIGIN??'';
 const u=new URL(origin);if(u.origin!==origin||u.protocol!=='https:')throw Error('commerce_not_configured');
 const secret=workspaceInstanceSecret(key,{workspaceId:r.id,environment:r.environment,incarnation:r.incarnation});
 const rows=await getWorkspaceDb(binding).query<{business_id:string;installation_id:string}>({text:'SELECT business_id,installation_id FROM nevora_commerce_installation WHERE singleton AND workspace_id=$1 AND business_id=$1 AND installation_id=$1 AND environment=$2 AND incarnation=$3::bigint AND canonical_origin=$4 AND instance_secret_hash=$5',values:[r.id,r.environment,r.incarnation,r.canonicalOrigin,createHash('sha256').update(secret).digest('hex')]});
 if(rows.length!==1||rows[0].business_id!==r.id||rows[0].installation_id!==r.id)throw Error('commerce_not_enrolled');
 return {origin,installationId:r.id,businessId:r.id,companyOrigin:r.canonicalOrigin,secret,assertCurrent:async()=>{await assertWorkspaceBindingCurrent(binding);}};
}
export async function withCommerceRequest<T>(request:Request,work:()=>Promise<T>){
 const config=readWorkspaceRoutingConfig(),h=request.headers,forwardedHost=h.get('x-forwarded-host');
 const binding=await resolveWorkspaceBinding({origin:new URL(request.url).origin,...(forwardedHost?{forwardedHost}:{})},runtimeControlStore(config),config);
 return withWorkspaceBinding(binding,work);
}
