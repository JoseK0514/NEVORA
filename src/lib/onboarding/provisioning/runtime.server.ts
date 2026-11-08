import {readEnrollmentRuntime,enrollmentRuntime} from "../../../../services/commerce/enrollment-runtime";
import 'server-only';
import {cleanupOnboardingControl} from '../cleanup.server';
import {runOwnerActivationWorker} from '../owner-activation.server';
import {readOnboardingConfig,type EnabledConfig} from '../config.server';
import {runtimeControlStore} from '../control-store.server';
import {readProvisionerPolicy,NeonProvisioningProvider,type ProvisionerPolicy} from './neon-provider.server';
import {claimProvisioningJob} from './store.server';
import {runProvisioningJob,type ProvisioningReport} from './orchestrator.server';
export type ProvisionerRuntime={config:EnabledConfig;policy:ProvisionerPolicy;apiKey:string;commerce:ReturnType<typeof readEnrollmentRuntime>};
/** This private configuration belongs only to the provisioner service. It never
 * falls back to the application principal, a company URL or legacy DATABASE_URL. */
export function readProvisionerRuntime(env:Readonly<Record<string,string|undefined>>=process.env):ProvisionerRuntime|null{
 try{
  if(env.NEVORA_PROVISIONER_WORKER_ENABLED!=='true'||env.NEVORA_WORKSPACE_MODE!=='isolated')return null;
  const app=new URL(env.NEVORA_CONTROL_DATABASE_URL??''),worker=new URL(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL??'');
  if(!['postgres:','postgresql:'].includes(app.protocol)||!['postgres:','postgresql:'].includes(worker.protocol)||app.hostname!==worker.hostname||(app.port||'5432')!==(worker.port||'5432')||app.pathname!==worker.pathname||!app.username||!worker.username||decodeURIComponent(app.username)===decodeURIComponent(worker.username))return null;
  const config=readOnboardingConfig({...env,NEVORA_CONTROL_DATABASE_URL:worker.href}),policy=readProvisionerPolicy(env),apiKey=env.NEVORA_PROVISIONER_API_KEY;
  if(!config.enabled||!config.providerEnabled||!policy||policy.accountRef!==config.providerAccountRef||policy.region!==config.region||policy.version!==config.resourcePolicyVersion||typeof apiKey!=='string'||apiKey.length<16||apiKey.length>4096||!/^[\x21-\x7e]+$/.test(apiKey))return null;
  const commerce=readEnrollmentRuntime(env);return {config,policy,apiKey,commerce};
 }catch{return null;}
}
export async function runProvisionerOnce(env:Readonly<Record<string,string|undefined>>=process.env):Promise<ProvisioningReport|{state:'disabled'|'idle'}>{
 const runtime=readProvisionerRuntime(env);if(!runtime)return {state:'disabled'};
 const enrollment=runtime.commerce?enrollmentRuntime(runtime.commerce):null;
 try{
  const store=runtimeControlStore(runtime.config);await cleanupOnboardingControl(store,runtime.config);const lease=await claimProvisioningJob(store,runtime.config);if(!lease)return runOwnerActivationWorker({store,config:runtime.config});
  return await runProvisioningJob(lease,{store,config:runtime.config,provider:new NeonProvisioningProvider({apiKey:runtime.apiKey,policy:runtime.policy}),...(enrollment?{commerce:enrollment.port}:{})});
 }finally{await enrollment?.close();}
}
