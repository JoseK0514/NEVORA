import {createRuntime} from '../../commerce/runtime';
import {workerOnce} from '../../commerce/worker';
export async function runCommerceTask(mode:'queue'|'reconcile',open:()=>ReturnType<typeof createRuntime>=createRuntime):Promise<{state:string}>{
 const runtime=open();
 try{
  if(mode==='queue')return await workerOnce(runtime.store,runtime.billing,runtime.sendMail);
  if(!runtime.billing)throw Error('billing_not_configured');
  const result=await runtime.billing.reconcile();
  return {state:result.failed?'retry_required':'completed'};
 }finally{await runtime.pool.end();}
}
