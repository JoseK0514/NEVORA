import 'server-only';
import {workspaceMode,readWorkspaceRoutingConfig,WorkspaceRoutingError} from './config.server';
import {runtimeControlStore} from '../onboarding/control-store.server';
import {resolveWorkspaceBinding,workspaceBindingFacts} from './resolver.server';
import {withWorkspaceBinding,currentWorkspaceBinding} from './context.server';
/** The caller still enforces its original worker credential, feature gates,
 * claim/lease checks and budgets. This helper supplies routing, never authority. */
export async function withWorkerWorkspace<T>(origin:string|undefined,work:()=>Promise<T>):Promise<T>{
 if(workspaceMode()==='single_company')return work();
 if(!origin)throw new WorkspaceRoutingError();const config=readWorkspaceRoutingConfig();
 const binding=await resolveWorkspaceBinding({origin},runtimeControlStore(config),config,'WORKER');
 return withWorkspaceBinding(binding,work);
}
export async function assertWorkerWorkspace():Promise<void>{
 if(workspaceMode()==='isolated'&&workspaceBindingFacts(await currentWorkspaceBinding()).role!=='WORKER')throw new WorkspaceRoutingError();
}
