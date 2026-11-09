import 'server-only';
import {AsyncLocalStorage} from 'node:async_hooks';
import {cache} from 'react';
import {headers} from 'next/headers';
import {runtimeControlStore} from '../onboarding/control-store.server';
import {readWorkspaceRoutingConfig,WorkspaceRoutingError,workspaceMode} from './config.server';
import {resolveWorkspaceBinding,workspaceBindingFacts,type WorkspaceBinding} from './resolver.server';

// Routing only. Business authorization always comes from the original domain guards.
const context=new AsyncLocalStorage<WorkspaceBinding>();
export async function withWorkspaceBinding<T>(binding:WorkspaceBinding,work:()=>Promise<T>):Promise<T>{
 workspaceBindingFacts(binding);return context.run(binding,work);
}
const requestBinding=cache(async()=>{
 const config=readWorkspaceRoutingConfig(),h=await headers(),host=h.get('host');
 if(!host||!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(host))throw new WorkspaceRoutingError();
 const protocol=config.environment!=='production'&&host.split(':')[0].endsWith('.localhost')?'http':'https';
 if(h.get('x-forwarded-proto')&&h.get('x-forwarded-proto')!==protocol)throw new WorkspaceRoutingError();
 const forwardedHost=h.get('x-forwarded-host');
 return resolveWorkspaceBinding({origin:protocol+'://'+host,...(forwardedHost?{forwardedHost}:{})},runtimeControlStore(config),config);
});
export async function currentWorkspaceBinding():Promise<WorkspaceBinding>{
 if(workspaceMode()!=='isolated')throw new WorkspaceRoutingError();
 return context.getStore()??requestBinding();
}
