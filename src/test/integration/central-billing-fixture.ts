import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {Socket} from 'node:net';
import {Pool} from 'pg';
import {CommerceStore} from '../../../services/commerce/store';
import {StripeFixture} from '../../../services/commerce/stripe-fixture';
import {StripeBilling} from '../../../services/commerce/stripe';
import {createCommerce} from '../../../services/commerce/service';
import {dropTestDatabase} from '../../../services/commerce/test-database';

/** Canonical SQL/API/SDK fixture, with controlled legacy installation facts.
 * Normal company Owner authority is exercised by the separate Step4 journey.
 * No external Stripe request, SMTP, current tenant or hosted process is used. */
export async function centralBillingFixture(){
 if(process.env.NODE_ENV!=='test'||process.env.DATABASE_URL||process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN!=='yes')throw Error('Owned billing fixture required');
 const target=new URL(process.env.FUEL_TEST_DATABASE_URL??'');
 if(target.protocol!=='postgresql:'&&target.protocol!=='postgres:'||target.hostname!=='127.0.0.1'||target.search||!/^nevora_exchange_test_[a-z0-9_]{1,40}$/.test(target.pathname.slice(1)))throw Error('Owned billing database required');
 const parent=new URL(target);parent.pathname='/postgres';
 const admin=new Pool({connectionString:parent.href,max:1,connectionTimeoutMillis:3000}),name='commerce_test_'+randomUUID().replaceAll('-','');
 target.pathname='/'+name;
 const pool=new Pool({connectionString:target.href,max:3,connectionTimeoutMillis:3000,statement_timeout:5000});
 const provider=new StripeFixture(),sockets=new Set<Socket>(),requests:{path:string;method:string;status:number;cookie:boolean;operation:string|null;lang:string|null}[]=[],unexpected:string[]=[];
 let listener:ReturnType<typeof createServer>|undefined,created=false;
 let uiOrigin='',apiOrigin='';const id=randomUUID(),businessName='Fictional Central <script>untrusted</script> Long Company';
 try{
  await admin.query(`CREATE DATABASE "${name}"`);created=true;
  await pool.query(await readFile(new URL('../../../services/commerce/schema.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO commerce.accounts(id,email,profile,verified_at) VALUES($1,$2,$3,clock_timestamp())',[id,'central-owner@example.invalid',{businessName,email:'central-owner@example.invalid'}]);
  await pool.query("INSERT INTO commerce.businesses(id,state,employee_count,trial_started_at,trial_ends_at) VALUES($1,'ready',4,$2,$3)",[id,new Date(),new Date(Date.now()+30*86400000)]);
  const store=new CommerceStore(pool,Buffer.alloc(32,37));
  const customerId='cus_central_original',subscriptionId='sub_central_original';
  async function coverage(){return (await pool.query('SELECT stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at, paid_through FROM commerce.businesses WHERE id=$1',[id])).rows[0];}
  async function subscriptionScenario(status:string){
   if(!provider.customers.has(customerId)){
    provider.customers.set(customerId,{id:customerId,object:'customer',email:'central-owner@example.invalid',metadata:{nevora_business_id:id}});
    const subscription=provider.createSubscription(customerId,'price_small',{nevora_business_id:id});
    provider.subscriptions.delete(subscription.id);subscription.id=subscriptionId;provider.subscriptions.set(subscriptionId,subscription);
    await pool.query("UPDATE commerce.businesses SET stripe_customer_id=$2, stripe_subscription_id=$3, plan_key='small', trial_ends_at=$4, paid_through=$5 WHERE id=$1",[id,customerId,subscriptionId,new Date(Date.now()+15*86400000),new Date(Date.now()+16*86400000)]);
   }
   provider.subscriptions.get(subscriptionId)!.status=status;
   await pool.query('UPDATE commerce.businesses SET subscription_status=$2 WHERE id=$1',[id,status]);
   return coverage();
  }
  const allowed=new Set(['/v1/plans','/v1/handoff/exchange','/v1/status','/v1/checkout','/v1/portal','/v1/plan-change','/v1/logout']);
  const server=createServer(async(incoming,outgoing)=>{
   try{
    const url=new URL(incoming.url??'/',apiOrigin);if(!allowed.has(url.pathname)||url.search||!['GET','POST','OPTIONS'].includes(incoming.method??'')){outgoing.writeHead(404).end();return;}
    const chunks:Buffer[]=[];let bytes=0;for await(const chunk of incoming){bytes+=chunk.length;if(bytes>4096)throw Error('Owned request exceeded bound');chunks.push(chunk);}
    const body=Buffer.concat(chunks).toString(),headers=new Headers();for(const [key,value] of Object.entries(incoming.headers))if(value!==undefined)for(const entry of Array.isArray(value)?value:[value])headers.append(key,entry);
    const request=new Request(url,{method:incoming.method,headers,...(body?{body}:{})});
    const billing=new StripeBilling(store,provider.client,{origin:uiOrigin,prices:{small:'price_small',team:'price_team'},live:false,facts:async()=>4,policy:async()=>{}});
    const handle=createCommerce({store,origin:apiOrigin,uiOrigin,allowedOrigins:[uiOrigin],provisioningMode:'onboarding',headcount:async()=>4,billing});
    const response=await handle(request,'127.0.0.1');let lang:string|null=null;if(body&&url.pathname!=='/v1/handoff/exchange'){try{lang=JSON.parse(body).lang??null;}catch{/* bounded canonical parser owns rejection */}}
    if(requests.length<128)requests.push({path:url.pathname,method:incoming.method??'GET',status:response.status,cookie:headers.has('cookie'),operation:headers.get('idempotency-key'),lang});else throw Error('Owned observation bound exceeded');
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
   }catch{unexpected.push('owned_public_api_failure');if(!outgoing.headersSent)outgoing.writeHead(500,{'content-type':'application/json'});outgoing.end('{"error":{"code":"owned_public_api_failure"}}');}
  });
  listener=server;
  server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Owned billing listener unavailable');apiOrigin='http://127.0.0.1:'+address.port;
  return {apiOrigin,businessName,provider,pool,requests,unexpected,subscriptionScenario,coverage,
   setUiOrigin(value:string){const url=new URL(value);if(url.origin!==value||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port)throw Error('Owned UI origin required');uiOrigin=value;},
   async handoff(){const proof=randomBytes(32).toString('base64url');await store.handoff(id,proof,Date.now());return proof;},
   async revoke(){await pool.query("DELETE FROM commerce.tokens WHERE purpose='session'");},
   async counts(){return (await pool.query('SELECT (SELECT count(*)::int FROM commerce.billing_operations) operations,(SELECT count(*)::int FROM commerce.checkout_intents) intents')).rows[0] as {operations:number;intents:number};},
   async close(){for(const socket of sockets)socket.destroy();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await pool.end();await dropTestDatabase(admin,name);await admin.end();},
  };
 }catch(error){for(const socket of sockets)socket.destroy();if(listener?.listening)await new Promise<void>(resolve=>listener!.close(()=>resolve()));await pool.end();if(created)await dropTestDatabase(admin,name);await admin.end();throw error;}
}
