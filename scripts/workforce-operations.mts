import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {parseOperationsConfig,runSupervisedWorker,workerInvocation,type WorkerCommand} from '../src/lib/operations/supervisor';

/** Private operator CLI only. No HTTP ingress, arbitrary executable or scheduler
 * registration. Existing worker auth/feature/commerce/lease guards remain inside. */
async function main(args:readonly string[]){
 if(args.length===1&&args[0]==='--help'){
  console.log('Usage: operations:worker run payroll|notifications-dispatch|notifications-reminders');return;
 }
 if(args.length!==2||args[0]!=='run')throw Error('operations_command_invalid');
 workerInvocation(args[1]);
 const config=parseOperationsConfig(process.env),controller=new AbortController(),stop=()=>controller.abort();
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
 try{const receipt=await runSupervisedWorker(config,args[1] as WorkerCommand,controller.signal);console.log(JSON.stringify(receipt));if(receipt.status!=='succeeded')process.exitCode=1;}
 finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 process.chdir(fileURLToPath(new URL('../',import.meta.url)));
 main(process.argv.slice(2)).catch(error=>{
  const safe=['operations_command_invalid','operations_configuration_invalid','operations_state_unavailable','operations_disabled','operations_overlap'];
  console.error(error instanceof Error&&safe.includes(error.message)?error.message:'operations_failed');process.exitCode=1;
 });
}
