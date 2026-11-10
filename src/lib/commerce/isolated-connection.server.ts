import 'server-only';
import {createHash} from 'node:crypto';
import {workspaceInstanceSecret} from '../../../services/commerce/workspace-enrollment';
import {currentWorkspaceBinding,withWorkspaceBinding} from '../workspace-routing/context.server';
import {assertWorkspaceBindingCurrent,resolveWorkspaceBinding} from '../workspace-routing/resolver.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import {readWorkspaceRoutingConfig,type WorkspaceRoutingConfig} from '../workspace-routing/config.server';
import {readWorkerEnrollmentMaterial} from '../operations/worker-enrollment-runtime.server';
import {runtimeControlStore} from '../onboarding/control-store.server';
export async function isolatedCommerceConnection(){
 const binding=await currentWorkspaceBinding(),facts=await assertWorkspaceBindingCurrent(binding),r=facts.record;
 if(facts.role==='WORKER'&&process.env.NEVORA_COMMERCE_BINDING_KEY)throw Error('worker_owner_key_forbidden');
 const key=(facts.role==='WORKER'?process.env.NEVORA_COMMERCE_WORKER_BINDING_KEY:process.env.NEVORA_COMMERCE_BINDING_KEY)??'',origin=process.env.NEVORA_COMMERCE_API_ORIGIN??'';
 const u=new URL(origin);if(u.origin!==origin||u.protocol!=='https:')throw Error('commerce_not_configured');
 const secret=facts.config.secretScope==='WORKER_ENROLLED'?(await readWorkerEnrollmentMaterial(binding)).commerceWorkerSecret:workspaceInstanceSecret(key,{workspaceId:r.id,environment:r.environment,incarnation:r.incarnation});
 const checkInstallation=()=>getWorkspaceDb(binding).query<{business_id:string;installation_id:string}>({text:`SELECT business_id,installation_id FROM nevora_commerce_installation WHERE singleton AND workspace_id=$1 AND business_id=$1 AND installation_id=$1 AND environment=$2 AND incarnation=$3::bigint AND canonical_origin=$4 AND ${facts.role==='WORKER'?'worker_secret_hash':'instance_secret_hash'}=$5${facts.config.secretScope==='WORKER_ENROLLED'?' AND worker_secret_hash<>instance_secret_hash':''}`,values:[r.id,r.environment,r.incarnation,r.canonicalOrigin,createHash('sha256').update(secret).digest('hex')]});
 const rows=await checkInstallation();
 if(rows.length!==1||rows[0].business_id!==r.id||rows[0].installation_id!==r.id)throw Error('commerce_not_enrolled');
 return {origin,installationId:r.id,businessId:r.id,role:facts.role,companyOrigin:r.canonicalOrigin,incarnation:r.incarnation,secret,assertCurrent:async()=>{await assertWorkspaceBindingCurrent(binding);if(facts.config.secretScope==='WORKER_ENROLLED'){const current=await readWorkerEnrollmentMaterial(binding);if(current.commerceWorkerSecret!==secret||(await checkInstallation()).length!==1)throw Error('commerce_not_enrolled');await readWorkerEnrollmentMaterial(binding);}}};
}
export async function withCommerceRequest<T>(request:Request,work:()=>Promise<T>,routing?:WorkspaceRoutingConfig){
 const config=routing??readWorkspaceRoutingConfig(),h=request.headers,forwardedHost=h.get('x-forwarded-host');
 const binding=await resolveWorkspaceBinding({origin:new URL(request.url).origin,...(forwardedHost?{forwardedHost}:{})},runtimeControlStore(config),config);
 return withWorkspaceBinding(binding,work);
}
