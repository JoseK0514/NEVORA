import 'server-only';
import {currentWorkspaceBinding} from './context.server';
import {workspaceIdentity} from './binding.server';
import {workspaceMode,readWorkspaceRoutingConfig,parseWorkspaceOrigin} from './config.server';
/** Per-operation copy only. Never mutate global environment or keep active company state. */
export async function workspaceRuntimeEnvironment(env:Readonly<Record<string,string|undefined>>=process.env):Promise<Record<string,string|undefined>>{
 if(workspaceMode(env)==='single_company')return {...env};
 const origin=workspaceIdentity(await currentWorkspaceBinding()).canonicalOrigin;
 return {...env,FUEL_PORTAL_ORIGIN:origin,NEVORA_CLOCKER_ORIGIN:origin,NATIVE_PUSH_ORIGIN:origin,NEVORA_PASSKEY_ORIGIN:origin,NEVORA_PASSKEY_RP_ID:new URL(origin).hostname};
}
/** Synchronous CSRF admission only; actual registry/session/domain authority is
 * checked before any business data access. A host here confers no authority. */
export function workspaceRequestOrigin(request:Request):string|null{
 try{const c=readWorkspaceRoutingConfig(),host=request.headers.get('host');if(!host||!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(host))return null;
  const protocol=c.environment!=='production'&&host.split(':')[0].endsWith('.localhost')?'http':'https';
  const forwarded=request.headers.get('x-forwarded-host'),proto=request.headers.get('x-forwarded-proto');
  if((forwarded&&forwarded.toLowerCase()!==host.toLowerCase())||(proto&&proto!==protocol))return null;
  return parseWorkspaceOrigin(protocol+'://'+host,c);
 }catch{return null;}
}
