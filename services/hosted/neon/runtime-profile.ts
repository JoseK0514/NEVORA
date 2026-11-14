import type {FunctionRole,HostedEnvironment} from './capabilities';

/** Production signup is qualified separately from live billing and workforce
 * dispatch. A label alone must never enable those existing staging adapters. */
export function hostedRuntimeProfile(env:HostedEnvironment,role:FunctionRole):'staging'|'production'|null{
 if(env.NEVORA_COMMERCE_ENVIRONMENT==='staging'&&env.NEVORA_ONBOARDING_ENVIRONMENT==='test'){
  return env.NEVORA_NEON_RUNTIME_PROFILE===undefined||env.NEVORA_NEON_RUNTIME_PROFILE==='staging-v1'?'staging':null;
 }
 if(env.NEVORA_NEON_RUNTIME_PROFILE!=='production-signup-v1'||role!=='provisioner'||env.NEVORA_COMMERCE_ENVIRONMENT!=='production'||env.NEVORA_ONBOARDING_ENVIRONMENT!=='production')return null;
 if(env.NEVORA_SIGNUP_ORIGIN!=='https://signup.nevora.team'||env.NEVORA_PORTAL_BASE_DOMAIN!=='portal.nevora.team')return null;
 if((env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED!==undefined&&env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED!=='false')||'NEVORA_WORKFORCE_ENROLLMENT_REQUESTS'in env)return null;
 return 'production';
}
