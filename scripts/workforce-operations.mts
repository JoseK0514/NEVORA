import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {parseOperationsConfig,runSupervisedWorker,workerInvocation,readInvocationHealth,assertWorkerCommandEnvironment,type WorkerCommand,type OperationsConfig} from '../src/lib/operations/supervisor';
import {readQueueHealth,assessQueueHealth} from '../src/lib/operations/queue-health';
import {withWorkerWorkspace,assertWorkerWorkspace} from '../src/lib/workspace-routing/worker.server';
import {workspaceMode} from '../src/lib/workspace-routing/config.server';
import {currentWorkspaceBinding} from '../src/lib/workspace-routing/context.server';
import {assertWorkspaceBindingCurrent} from '../src/lib/workspace-routing/resolver.server';
import {getWorkspaceDb} from '../src/lib/workspace-routing/transport.server';

function threshold(value:string|undefined){
 if(!value||!/^[1-9][0-9]{0,4}$/.test(value)||Number(value)>86400)throw Error('operations_configuration_invalid');return Number(value);
}
async function health(config:OperationsConfig,command:WorkerCommand){
 const maxGap=threshold(process.env.NEVORA_OPERATIONS_MAX_HEARTBEAT_GAP_SECONDS),maxAge=threshold(process.env.NEVORA_OPERATIONS_MAX_QUEUE_AGE_SECONDS);
 if(workspaceMode()!=='isolated')throw Error('operations_configuration_invalid');
 // This standalone path performs only file reads and SELECTs. A stuck control
 // connection must not keep the private observation process alive indefinitely.
 const watchdog=setTimeout(()=>{console.error('operations_health_unavailable');process.exit(1);},10000);
 try{return await withWorkerWorkspace(process.env.NEVORA_WORKER_WORKSPACE_ORIGIN,async()=>{
  await assertWorkerWorkspace();const binding=await currentWorkspaceBinding(),facts=await assertWorkspaceBindingCurrent(binding);
  if(facts.record.id!==config.scopeId||facts.record.environment!==config.environment||facts.role!=='WORKER')throw Error('operations_health_unavailable');
  const queues=await readQueueHealth(getWorkspaceDb(binding),config.environment);
  await assertWorkspaceBindingCurrent(binding);
  if(queues.workspaceId!==config.scopeId)throw Error('operations_health_unavailable');
  const heartbeat=await readInvocationHealth(config,command,Date.now(),maxGap),queueStatus=assessQueueHealth(queues,maxAge,command==='payroll'?'payroll':'notifications');
  return {schemaVersion:1,command,environment:config.environment,scopeId:config.scopeId,sourceSha:config.sourceSha,sourceIdentity:'operator-declared',healthy:heartbeat.healthy&&queueStatus.healthy,heartbeat,queueStatus,queues};
 },{workspaceId:config.scopeId,environment:config.environment});}finally{clearTimeout(watchdog);}
}

/** Private operator CLI only. No HTTP ingress, arbitrary executable or scheduler
 * registration. Existing worker auth/feature/commerce/lease guards remain inside. */
async function main(args:readonly string[]){
 if(args.length===1&&args[0]==='--help'){
  console.log('Usage: operations:worker run|health payroll|notifications-dispatch|notifications-reminders');return;
 }
 if(args.length!==2||!['run','health'].includes(args[0]))throw Error('operations_command_invalid');
 workerInvocation(args[1]);
 const config=parseOperationsConfig(process.env),controller=new AbortController(),stop=()=>controller.abort();
 assertWorkerCommandEnvironment(config,args[1] as WorkerCommand);
 if(args[0]==='health'){const report=await health(config,args[1] as WorkerCommand);console.log(JSON.stringify(report));if(!report.healthy)process.exitCode=1;return;}
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
 try{const receipt=await runSupervisedWorker(config,args[1] as WorkerCommand,controller.signal);console.log(JSON.stringify(receipt));if(receipt.status!=='succeeded')process.exitCode=1;}
 finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 process.chdir(fileURLToPath(new URL('../',import.meta.url)));
 main(process.argv.slice(2)).catch(error=>{
  const safe=['operations_command_invalid','operations_configuration_invalid','operations_state_unavailable','operations_disabled','operations_overlap','operations_health_unavailable'];
  console.error(error instanceof Error&&safe.includes(error.message)?error.message:'operations_failed');process.exitCode=1;
 });
}
