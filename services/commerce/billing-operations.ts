import {createHmac} from 'node:crypto';
import type {PoolClient} from 'pg';
import {CommerceStore,type Business} from './store';
import {CommerceError} from './model';
import {seal,unseal} from './security';

export type BillingOperationContext={actor:string;assertCurrent(client?:PoolClient):Promise<void>;bindCustomer?(customerId:string):void};
export type BillingAction='checkout'|'portal'|'plan-change';
type Input={business:Business;operation:string;action:BillingAction;request:{lang:'en'|'es'|null;plan?:'small'|'team'};context:BillingOperationContext;scope?:string};
type Row={business_id:string;operation:string;action:BillingAction;actor_hash:string;request_hash:string;binding_hash:string;expires_at:Date;result_secret:string|null};
type Stage={params_secret:string;issued_at:Date|null;result_secret:string|null};
type Outcome<T>={state:'complete';value:T}|{state:'refused';code:string;status:number};
const hmac=(key:Buffer,value:unknown)=>createHmac('sha256',key).update(JSON.stringify(value)).digest('hex');
const binding=(business:Business)=>[business.id,business.state,business.enrollmentSource,business.slotId,business.incarnation,business.origin];
const stageName=(name:string)=>{if(!/^[a-z][a-z0-9_]{0,31}$/.test(name))throw new CommerceError('invalid_billing_stage',400);};
function encoded(value:unknown){
 const json=JSON.stringify(value);
 if(typeof json!=='string'||Buffer.byteLength(json)>65536)throw new CommerceError('invalid_billing_receipt',503);
 return json;
}

/** Raw bearer/Owner proofs never enter catalog receipts or provider keys. */
export function billingActorHash(key:Buffer,proof:unknown):string{return hmac(key,['nevora-billing-actor-v1',proof]);}

/** Parameters commit before issue; issue custody commits before the callback.
 * Unknown effects never release the business to a replacement operation key. */
export class BillingOperation {
 readonly operation:string;
 private readonly actorHash:string;
 private readonly requestHash:string;
 private readonly bindingHash:string;
 constructor(private readonly store:CommerceStore,private readonly input:Input){
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.operation)||
   !['checkout','portal','plan-change'].includes(input.action)||!/^[a-f0-9]{64}$/.test(input.context.actor)||
   !(input.request.lang==='en'||input.request.lang==='es'||(input.action==='portal'&&input.request.lang===null))||Object.keys(input.request).some(k=>k!=='lang'&&k!=='plan')||
   (input.action==='plan-change'?!['small','team'].includes(input.request.plan??''):input.request.plan!==undefined)||
   (input.scope!==undefined&&!/^[a-f0-9]{64}$/.test(input.scope)))
   throw new CommerceError('invalid_billing_operation',400);
  this.operation=input.operation.toLowerCase();
  this.actorHash=hmac(store.key,['actor',input.context.actor]);
  this.requestHash=hmac(store.key,['request',input.action,input.request.lang,input.request.plan??null,input.scope??null]);
  this.bindingHash=hmac(store.key,['binding',binding(input.business)]);
 }
 private get id(){return this.input.business.id;}
 private get parameters(){return [this.id,this.operation];}
 private context(name:string){return `billing-operation-v1:${this.id}:${this.operation}:${this.input.action}:${this.actorHash}:${this.requestHash}:${name}`;}
 private read<T>(secret:string,name:string):T{return JSON.parse(unseal(secret,this.store.key,this.context(name))) as T;}
 private save(value:unknown,name:string){return seal(encoded(value),this.store.key,this.context(name));}
 private assertBinding(business:Business){
  if(hmac(this.store.key,['binding',binding(business)])!==this.bindingHash)throw new CommerceError('billing_binding_changed',409);
 }
 private async row(client:PoolClient):Promise<Row>{
  const result=await client.query<Row>('SELECT * FROM commerce.billing_operations WHERE business_id=$1 AND operation=$2 FOR UPDATE',this.parameters);
  const row=result.rows[0];
  if(!row||row.action!==this.input.action||row.actor_hash!==this.actorHash||row.request_hash!==this.requestHash)throw new CommerceError('idempotency_conflict',409);
  if(row.binding_hash!==this.bindingHash)throw new CommerceError('billing_binding_changed',409);
  return row;
 }
 private async locked<T>(fn:(client:PoolClient,business:Business,row:Row)=>Promise<T>,authority=true):Promise<T>{
  return this.store.withBusinessLock(this.id,async(client,business)=>{
   if(authority){this.assertBinding(business);await this.input.context.assertCurrent(client);}
   return fn(client,business,await this.row(client));
  });
 }
 private async legacyAvailable(client:PoolClient){
  // Modern intents have their exact canonical Checkout stage. A refused root
  // or a matching UUID alone cannot manufacture ownership of a legacy intent.
  // Only actual provider expiry or a reconciled subscription generation permits
  // replacement; a local expires_at deadline is never outcome evidence.
  const legacy=await client.query(`SELECT i.operation FROM commerce.checkout_intents i
   JOIN commerce.businesses b ON b.id=i.business_id
   WHERE i.business_id=$1 AND i.previous_subscription_id IS NOT DISTINCT FROM b.stripe_subscription_id
    AND i.reconciled_expired_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM commerce.billing_operation_stages s
     JOIN commerce.billing_operations o ON o.business_id=s.business_id AND o.operation=s.operation
     WHERE s.business_id=i.business_id AND s.operation::text=i.operation AND o.action='checkout' AND s.stage='checkout')
   LIMIT 1`,[this.id]);
  if(legacy.rowCount)throw new CommerceError('legacy_operation_reconciliation_required',409);
 }
 private async available(client:PoolClient){
  const other=await client.query('SELECT operation FROM commerce.billing_operations WHERE business_id=$1 AND operation<>$2 AND started_at IS NOT NULL AND resolved_at IS NULL LIMIT 1',this.parameters);
  if(other.rowCount)throw new CommerceError('billing_operation_pending',409);
  await this.legacyAvailable(client);
 }
 private expires(row:Row,issued=false){
  if(row.expires_at.getTime()<=Date.now())throw new CommerceError(issued?'billing_operation_reconciliation_required':'billing_operation_expired',409);
 }
 private async project<T>(row:Row,outcome:Outcome<T>):Promise<T>{
  this.assertBinding(await this.store.business(this.id));
  await this.input.context.assertCurrent();
  this.expires(row);
  if(outcome.state==='refused')throw new CommerceError(outcome.code,outcome.status);
  return outcome.value;
 }
 async admit():Promise<void>{
  await this.store.withBusinessLock(this.id,async(client,business)=>{
   this.assertBinding(business);await this.input.context.assertCurrent(client);
   const old=await client.query<Row>('SELECT * FROM commerce.billing_operations WHERE business_id=$1 AND operation=$2',this.parameters);
   if(old.rowCount){await this.row(client);await this.legacyAvailable(client);return;}
   await this.available(client);
   const created=Date.now();
   await client.query('INSERT INTO commerce.billing_operations(business_id,operation,action,actor_hash,request_hash,binding_hash,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [...this.parameters,this.input.action,this.actorHash,this.requestHash,this.bindingHash,new Date(created),new Date(created+3600000)]);
  });
 }
 async replay<T>():Promise<T|null>{
  const row=await this.locked(async(_client,_business,row)=>row);
  return row.result_secret?this.project(row,this.read<Outcome<T>>(row.result_secret,'result')):null;
 }
 /** Reuse the held client after intervening reads, immediately before the SDK
  * mutation. Never borrow another pool connection while holding this lock. */
 async assertCanIssue(client:PoolClient):Promise<void>{
  await this.input.context.assertCurrent(client);
  this.assertBinding(await this.store.business(this.id,client));
  const row=await this.row(client);
  if(row.result_secret)throw new CommerceError('billing_operation_resolved',409);
  this.expires(row);
 }
 async prepareStage<P>(name:string,prepare:(client:PoolClient,business:Business)=>Promise<P>):Promise<P>{
  stageName(name);
  return this.locked(async(client,business,row)=>{
   const old=await client.query<Stage>('SELECT * FROM commerce.billing_operation_stages WHERE business_id=$1 AND operation=$2 AND stage=$3',[...this.parameters,name]);
   if(old.rowCount)return this.read<P>(old.rows[0].params_secret,'params:'+name);
   if(row.result_secret)throw new CommerceError('billing_operation_resolved',409);
   await this.available(client);this.expires(row);
   const params=await prepare(client,business);
   await this.input.context.assertCurrent(client);this.assertBinding(await this.store.business(this.id,client));this.expires(row);
   await client.query('INSERT INTO commerce.billing_operation_stages(business_id,operation,stage,params_secret) VALUES($1,$2,$3,$4)',[...this.parameters,name,this.save(params,'params:'+name)]);
   await client.query('UPDATE commerce.billing_operations SET started_at=COALESCE(started_at,clock_timestamp()) WHERE business_id=$1 AND operation=$2',this.parameters);
   return params;
  });
 }
 async executeStage<P,R>(name:string,mutate:(client:PoolClient,business:Business,params:P)=>Promise<R>):Promise<R>{
  stageName(name);
  const known=await this.locked(async(client,_business,row):Promise<{known:true;value:R}|{known:false}>=>{
   const stage=(await client.query<Stage>('SELECT * FROM commerce.billing_operation_stages WHERE business_id=$1 AND operation=$2 AND stage=$3 FOR UPDATE',[...this.parameters,name])).rows[0];
   if(!stage)throw new CommerceError('billing_stage_not_prepared',409);
   if(stage.result_secret)return {known:true,value:this.read<R>(stage.result_secret,'result:'+name)};
   if(row.result_secret)throw new CommerceError('billing_operation_resolved',409);
   await this.available(client);this.expires(row,Boolean(stage.issued_at));
   await client.query('UPDATE commerce.billing_operation_stages SET issued_at=COALESCE(issued_at,clock_timestamp()) WHERE business_id=$1 AND operation=$2 AND stage=$3',[...this.parameters,name]);
   return {known:false};
  });
  if(known.known)return known.value;
  // The first transaction's issue marker survives any callback/commit failure.
  return this.locked(async(client,business,row)=>{
   const stage=(await client.query<Stage>('SELECT * FROM commerce.billing_operation_stages WHERE business_id=$1 AND operation=$2 AND stage=$3 FOR UPDATE',[...this.parameters,name])).rows[0];
   if(!stage)throw new CommerceError('billing_stage_not_prepared',409);
   if(stage.result_secret)return this.read<R>(stage.result_secret,'result:'+name);
   if(row.result_secret)throw new CommerceError('billing_operation_resolved',409);
   this.expires(row,true);
   const value=await mutate(client,business,this.read<P>(stage.params_secret,'params:'+name));
   // Do not throw for changed authority/deadline after a provider result: first
   // retain the outcome. finish/project performs the private response check.
   await client.query('UPDATE commerce.billing_operation_stages SET result_secret=$4,resolved_at=clock_timestamp() WHERE business_id=$1 AND operation=$2 AND stage=$3 AND result_secret IS NULL',[...this.parameters,name,this.save(value,'result:'+name)]);
   return value;
  });
 }
 private async unknown(client:PoolClient){
  return Boolean((await client.query('SELECT stage FROM commerce.billing_operation_stages WHERE business_id=$1 AND operation=$2 AND issued_at IS NOT NULL AND result_secret IS NULL LIMIT 1',this.parameters)).rowCount);
 }
 async finish<T>(value:T):Promise<T>{
  const row=await this.locked(async(client,_business,row)=>{
   if(!row.result_secret){
    if(await this.unknown(client))throw new CommerceError('billing_operation_reconciliation_required',409);
    const secret=this.save({state:'complete',value},'result');
    await client.query('UPDATE commerce.billing_operations SET result_secret=$3,resolved_at=clock_timestamp() WHERE business_id=$1 AND operation=$2',[...this.parameters,secret]);
    return {...row,result_secret:secret};
   }
   return row;
  },false);
  return this.project(row,this.read<Outcome<T>>(row.result_secret!,'result'));
 }
 async refusePreflight(error:unknown):Promise<boolean>{
  if(!(error instanceof CommerceError)||error.status>=500||['billing_operation_pending','checkout_pending'].includes(error.code))return false;
  return this.locked(async(client,_business,row)=>{
   if(row.result_secret||await this.unknown(client))return false;
   await client.query('UPDATE commerce.billing_operations SET result_secret=$3,resolved_at=clock_timestamp() WHERE business_id=$1 AND operation=$2',
    [...this.parameters,this.save({state:'refused',code:error.code,status:error.status},'result')]);
   return true;
  },false);
 }
 async fail(error:unknown):Promise<never>{
  try{await this.refusePreflight(error);}
  catch(persistenceError){throw new AggregateError([error,persistenceError],'billing_refusal_persistence_failed',{cause:error});}
  throw error;
 }
}

export async function openBillingOperation(store:CommerceStore,input:Input):Promise<BillingOperation>{
 const operation=new BillingOperation(store,input);await operation.admit();return operation;
}
