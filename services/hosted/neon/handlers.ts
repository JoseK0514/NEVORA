import type Stripe from 'stripe';
import {parseTriggerDelivery} from '@neon/functions/triggers';
import {parseStripeWebhook,projectsStripeEvent} from '../../commerce/stripe-webhook';
import {CommerceError} from '../../commerce/model';
import {roleCapabilitiesAllowed,type FunctionRole} from './capabilities';
import {hostedSourceMatches} from './source';
export const UNUSABLE_DATABASE_URL = 'postgresql://disabled.invalid/disabled';
export type HostedRole = 'commercequeue' | 'commercereconcile' | 'provisioner' | 'workforcemonitor';
type Env=Readonly<Record<string,string|undefined>>;
const answer=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(code:string,status:number)=>answer({error:{code}},status);
/** Fixed role/status only: no paths, bodies, IDs, credentials or personal data. */
export function observedFetch(role:FunctionRole,handler:(request:Request)=>Promise<Response>){
 return async(request:Request)=>{const response=await handler(request);console.info(JSON.stringify({event:'nevora_staging_http',role,status:response.status}));return response;};
}
export function hostedEnvironmentBound(env:Env,role:FunctionRole){
 if(!hostedSourceMatches(env.NEVORA_NEON_SOURCE_SHA))return false;
 if(!/^br-[a-z0-9-]+$/.test(env.NEVORA_NEON_BRANCH_ID??'')||env.NEVORA_NEON_BRANCH_ID!==env.NEON_BRANCH_ID||env.NEVORA_COMMERCE_ENVIRONMENT!=='staging'||env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||env.NEVORA_WORKSPACE_MODE!=='isolated')return false;
 // Neon automatically injects a default database capability. It must be overridden
 // in every deployment, even when disabled; only named role-specific DSNs are used.
 if(env.DATABASE_URL!==UNUSABLE_DATABASE_URL||env.DATABASE_URL_UNPOOLED!==UNUSABLE_DATABASE_URL)return false;
 if(env.NEVORA_NEON_HOST_ENABLED!=='true'&&env.NEVORA_NEON_HOST_ENABLED!=='false')return false;
 return roleCapabilitiesAllowed(role,env);
}
export async function readHostedBody(request:Pick<Request,'body'>,max:number){
 const reader=request.body?.getReader();if(!reader)return '';
 const chunks:Uint8Array[]=[];let bytes=0;
 let timer:ReturnType<typeof setTimeout>;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new CommerceError('request_timeout',408));void reader.cancel().catch(()=>{});},5000);});
 try{
  for(;;){const part=await Promise.race([reader.read(),deadline]);if(part.done)break;bytes+=part.value.byteLength;if(bytes>max){void reader.cancel().catch(()=>{});throw new CommerceError('body_too_large',413);}chunks.push(part.value);}
  try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks));}catch{throw new CommerceError('invalid_encoding',400);}
 }finally{clearTimeout(timer!);}
}
export function createWebhookHandler(env:Env,enqueue:(event:Stripe.Event)=>Promise<void>){
 return async(request:Request):Promise<Response>=>{
  const path=new URL(request.url).pathname;
  if(request.method!=='POST'||path!=='/webhooks/stripe')return fail('not_found',404);
  if(!hostedEnvironmentBound(env,'stripewebhook')||env.NEVORA_NEON_HOST_ENABLED!=='true'||!env.STRIPE_WEBHOOK_SECRET)return fail('not_ready',503);
  const signature=request.headers.get('stripe-signature');if(!signature||signature.length>4096)return fail('invalid_signature',400);
  try{const event=parseStripeWebhook(await readHostedBody(request,262144),signature,env.STRIPE_WEBHOOK_SECRET,false);if(projectsStripeEvent(event))await enqueue(event);return answer({received:true});}
  catch(error){if(error instanceof CommerceError&&['invalid_signature','invalid_event','invalid_encoding','mode_mismatch','body_too_large','request_timeout'].includes(error.code))return fail(error.code,error.status);return fail('temporarily_unavailable',503);}
 };
}
/** Only use behind Neon's native proxy, which strips client x-neon-* headers.
 * Local parser acceptance alone is not proof of platform authentication. */
export function createScheduledHandler(role:HostedRole,env:Env,run:()=>Promise<{state:string}>){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=='POST'||new URL(request.url).pathname!=='/run')return fail('not_found',404);
  if(!request.headers.has('x-neon-trigger-invocation-id'))return fail('unauthorized',401);
  try{
   let data:unknown;try{data=JSON.parse(await readHostedBody(request,16384));}catch(error){if(error instanceof CommerceError)throw error;return fail('invalid_body',400);}
   const parsed=parseTriggerDelivery({headers:request.headers,body:data});
   if(!parsed.ok)return fail('invalid_trigger',parsed.error==='invalid_body'?400:401);
   if(parsed.invocation.type!=='schedule'||parsed.invocation.trigger.name!=='nevora-staging-'+role)return fail('wrong_trigger',403);
   if(!hostedEnvironmentBound(env,role))return fail('not_ready',503);
   if(env.NEVORA_NEON_HOST_ENABLED==='false'){console.info(JSON.stringify({event:'nevora_staging_task',role,state:'disabled'}));return answer({state:'disabled'});}
   const result=await run();
   console.info(JSON.stringify({event:'nevora_staging_task',role,state:['idle','processed','completed','complete'].includes(result.state)?result.state:'retry_required'}));
   if(!['idle','processed','completed','complete'].includes(result.state))return fail('retry_required',503);
   return answer({state:result.state});
  }catch(error){if(error instanceof CommerceError&&['invalid_encoding','body_too_large','request_timeout'].includes(error.code))return fail(error.code,error.status);return fail('temporarily_unavailable',503);}
 };
}
