import 'server-only';
import {workspaceMode,readWorkspaceRoutingConfig,readWorkerRoutingConfig,WorkspaceRoutingError} from './config.server';
import {runtimeControlStore} from '../onboarding/control-store.server';
import {resolveWorkspaceBinding,workspaceBindingFacts} from './resolver.server';
import {withWorkspaceBinding,currentWorkspaceBinding} from './context.server';
import {isOperationId} from '../onboarding/contracts';
/** The caller still enforces its original worker credential, feature gates,
 * claim/lease checks and budgets. This helper supplies routing, never authority. */
export async function withWorkerWorkspace<T>(origin:string|undefined,work:()=>Promise<T>,expected?:{workspaceId:string;environment:'test'|'production'}):Promise<T>{
 const expectedId=expected?.workspaceId??process.env.NEVORA_WORKER_EXPECTED_WORKSPACE_ID,expectedEnvironment=expected?.environment??process.env.NEVORA_WORKER_EXPECTED_ENVIRONMENT;
 const scoped=expectedId!==undefined||expectedEnvironment!==undefined;
 if(scoped&&(!isOperationId(expectedId)||!['test','production'].includes(expectedEnvironment??'')))throw new WorkspaceRoutingError();
 if(workspaceMode()==='single_company'){if(scoped)throw new WorkspaceRoutingError();return work();}
 if(!origin)throw new WorkspaceRoutingError();const config=scoped?readWorkerRoutingConfig():readWorkspaceRoutingConfig();
 const binding=await resolveWorkspaceBinding({origin},runtimeControlStore(config),config,'WORKER');
 if(scoped){const {record}=workspaceBindingFacts(binding);if(record.id!==expectedId||record.environment!==expectedEnvironment)throw new WorkspaceRoutingError();}
 return withWorkspaceBinding(binding,work);
}
export async function assertWorkerWorkspace():Promise<void>{
 if(workspaceMode()==='isolated'&&workspaceBindingFacts(await currentWorkspaceBinding()).role!=='WORKER')throw new WorkspaceRoutingError();
}
