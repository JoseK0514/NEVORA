import type {HostedEnvironment} from './capabilities';
type Ports={normal:()=>Promise<{state:string}>;enroll:()=>Promise<{state:string}>};
/** Selection comes only from deployment custody. Request bodies never choose
 * enrollment IDs, recipients, credentials or the normal provisioning mode. */
export function createProvisionerRun(env:HostedEnvironment,source:string|undefined,ports:Ports){
 return async()=>{
  const mode=env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED;
  if(mode==='true'){if(!source||env.NEVORA_NEON_SOURCE_SHA!==source)throw Error('worker_enrollment_invalid');return ports.enroll();}
  if(mode!==undefined&&mode!=='false'||'NEVORA_WORKFORCE_ENROLLMENT_REQUESTS'in env)throw Error('worker_enrollment_invalid');
  return ports.normal();
 };
}
