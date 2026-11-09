import 'server-only';
import {readOnboardingConfig,type EnabledConfig} from './config.server';
/** Explicit private operator command; independent of new-signup admission.
 * No fallback to application/provisioner principals or DATABASE_URL. */
export function readOnboardingOperatorConfig(env:Readonly<Record<string,string|undefined>>=process.env):EnabledConfig|null{
 try{if(!['restore','maintenance'].includes(env.NEVORA_ONBOARDING_OPERATOR_MODE??'')||env.NEVORA_WORKSPACE_MODE!=='isolated')return null;
  const app=new URL(env.NEVORA_CONTROL_DATABASE_URL??''),operator=new URL(env.NEVORA_OPERATOR_CONTROL_DATABASE_URL??'');
  if(!['postgres:','postgresql:'].includes(operator.protocol)||app.hostname!==operator.hostname||(app.port||'5432')!==(operator.port||'5432')||app.pathname!==operator.pathname||!app.username||!operator.username||decodeURIComponent(app.username)===decodeURIComponent(operator.username))return null;
  const c=readOnboardingConfig({...env,NEVORA_ONBOARDING_ENABLED:'true',NEVORA_ONBOARDING_PROVIDER_ENABLED:'false',NEVORA_CONTROL_DATABASE_URL:operator.href});return c.enabled?c:null;
 }catch{return null;}
}
