// Test-only process boundary. No real provider API or caller-selected network.
import {Pool} from 'pg';
import {createControlStore} from '../../lib/onboarding/control-store.server';
import {claimProvisioningJob} from '../../lib/onboarding/provisioning/store.server';
import {runProvisioningJob} from '../../lib/onboarding/provisioning/orchestrator.server';
import type {EnabledConfig} from '../../lib/onboarding/config.server';
import type {ProvisioningProvider} from '../../lib/onboarding/provisioning/provider';
let next=0;const pending=new Map<number,{resolve:(value:unknown)=>void;reject:()=>void}>();
function rpc(method:string,args:unknown[]):Promise<unknown>{return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject:()=>reject(Error('Owned provider response unavailable'))});process.send?.({kind:'provider',id,method,args});});}
process.on('message',async (message:unknown)=>{
 const m=message as {kind?:string;id:number;result?:unknown;controlUrl?:string;config?:EnabledConfig};
 if(m.kind==='reply'){const p=pending.get(m.id);if(p){pending.delete(m.id);p.resolve(m.result);}return;}
 if(m.kind!=='start')return;
 let pool:Pool|undefined;
 try{const url=new URL(m.controlUrl??'');if(url.hostname!=='127.0.0.1'||!url.username.startsWith('nv_onboard_')||!url.pathname.startsWith('/nv_onboarding_test_')||m.config?.environment!=='test'||!process.env.NEVORA_ONBOARDING_TEST_CUSTODY)throw Error('Owned child custody unavailable');
  pool=new Pool({connectionString:url.href,max:2});const store=createControlStore(pool),lease=await claimProvisioningJob(store,m.config);if(!lease)throw Error('Owned child job unavailable');
  const provider:ProvisioningProvider={find:(...args)=>rpc('find',args) as ReturnType<ProvisioningProvider['find']>,create:(...args)=>rpc('create',args) as ReturnType<ProvisioningProvider['create']>,bootstrapCredential:(...args)=>rpc('bootstrapCredential',args) as ReturnType<ProvisioningProvider['bootstrapCredential']>};
  await runProvisioningJob(lease,{store,config:m.config,provider,connect:async()=>{throw Error('The owned child must be killed before bootstrap');}});
  process.send?.({kind:'unexpected_completion'});
 }catch{process.send?.({kind:'child_failed'});}
 finally{await pool?.end();}
});
process.send?.({kind:'ready'});
