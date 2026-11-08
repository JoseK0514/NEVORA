import {createRuntime} from '../../commerce/runtime';
import {workerOnce} from '../../commerce/worker';
export async function runCommerceTask(mode:'queue'|'reconcile',open:()=>ReturnType<typeof createRuntime>=()=>createRuntime(process.env,'worker')):Promise<{state:string}>{
 const runtime=open();
 try{
  if(mode==='queue')return await workerOnce(runtime.store,runtime.billing,async message=>{if(message.email!=='support@thevelani.com')throw Error('staging_recipient_not_approved');await runtime.sendMail(message);});
  if(!runtime.billing)throw Error('billing_not_configured');
  const result=await runtime.billing.reconcile({limit:1});
  return {state:result.failed?'retry_required':'completed'};
 }finally{await runtime.pool.end();}
}
