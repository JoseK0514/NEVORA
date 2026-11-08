import {cleanupOnboardingControl} from '../src/lib/onboarding/cleanup.server';
import {readOnboardingOperatorConfig} from '../src/lib/onboarding/operator-config.server';
import {runtimeControlStore} from '../src/lib/onboarding/control-store.server';
import {suspendOnboardingWorkspace,retireRestoredCompany} from '../src/lib/onboarding/operations.server';
import {isOperationId} from '../src/lib/onboarding/contracts';
const config=readOnboardingOperatorConfig();
if(!config){process.stdout.write('{"state":"disabled"}\n');}
else{
 const [action,workspaceId,first,second]=process.argv.slice(2),store=runtimeControlStore(config);let result:unknown;
 if(action==='status'&&isOperationId(workspaceId)&&first===undefined){const rows=await store.query('SELECT lifecycle,revision::text,incarnation::text FROM nevora_onboarding.workspace_registry WHERE id=$1 AND environment=$2',[workspaceId,config.environment]);result=rows.rows.length===1?{state:'status',...rows.rows[0]}:{state:'unavailable'};}
 else if(action==='cleanup'&&workspaceId===undefined&&process.env.NEVORA_ONBOARDING_OPERATOR_MODE==='maintenance')result=await cleanupOnboardingControl(store,config);
 else if(action==='suspend'&&second===undefined&&process.env.NEVORA_ONBOARDING_OPERATOR_MODE==='restore')result=await suspendOnboardingWorkspace(store,config,{workspaceId,expectedRevision:first});
 else if(action==='retire-restored'&&process.env.NEVORA_ONBOARDING_OPERATOR_MODE==='restore')result=await retireRestoredCompany(store,config,{workspaceId,fromIncarnation:first,operationId:second});
 else throw Error('Use status WORKSPACE_UUID, suspend WORKSPACE_UUID EXPECTED_REVISION, or retire-restored WORKSPACE_UUID FROM_INCARNATION ORIGINAL_OPERATION_UUID.');
 process.stdout.write(JSON.stringify(result)+'\n');
}
