import type {BillingOwner} from './owner-authority';
import {createHmac,randomBytes} from 'node:crypto';
import type Stripe from 'stripe';
import type {PoolClient} from 'pg';
import {CommerceStore,type Business} from './store';
import {CommerceError,planFor,type PlanKey} from './model';
import {seal,unseal} from './security';
import {billingPage,type CommerceLanguage} from './language';
import type {StripeTaxConfig} from './stripe-config';
import {assertTaxPrice,readTaxTerms,taxTerms} from './stripe-tax';
import {assertOwnedSubscription,terminalSubscription,stripeObjectId} from './stripe-identity';
export type CheckoutPorts={store:CommerceStore;stripe:Stripe;origin:string;now:()=>number;prices:Record<PlanKey,string>;live:boolean;tax?:StripeTaxConfig;headcount:(business:Business,client:PoolClient)=>Promise<number>;assertCurrent?:(client:PoolClient)=>Promise<void>};
type Ports=CheckoutPorts;
type Intent={business_id:string;operation:string;previous_subscription_id:string|null;params_secret:string;employee_count:number;plan_key:PlanKey;expires_at:Date;session_id:string|null;result_secret:string|null;reconciled_expired_at:Date|null};
type CustomerPlan={kind:'existing';id:string}|{kind:'create';params:Stripe.CustomerCreateParams};
export type CheckoutPlan={state:'prepared';count:number;planKey:PlanKey;previousSubscriptionId:string|null;customer:CustomerPlan;params:Omit<Stripe.Checkout.SessionCreateParams,'customer'>}|{state:'subscription_sync_pending'};
export type PreparedCheckout={operation:string;customerId:string;previousSubscriptionId:string|null;params:Stripe.Checkout.SessionCreateParams};
export type KnownCheckout={url:string|null;sessionId:string;expiresAt:number;code?:'checkout_expired'|'checkout_reconciliation_required'};

async function planCustomer(ports:Ports,business:Business):Promise<CustomerPlan>{
 if(business.customerId){
  const c=await ports.stripe.customers.retrieve(business.customerId);
  if(c.deleted||c.metadata.nevora_business_id!==business.id)throw new CommerceError('customer_identity_mismatch',503);
  return {kind:'existing',id:c.id};
 }
 const listed=await ports.stripe.customers.list({email:business.email,limit:100});
 const matches=listed.data.filter(c=>c.metadata.nevora_business_id===business.id);
 if(listed.has_more||matches.length>1)throw new CommerceError('customer_reconciliation_required',409);
 return matches[0]?{kind:'existing',id:matches[0].id}:{kind:'create',params:{email:business.email,metadata:{nevora_business_id:business.id}}};
}
/** Read-only provider planning. The operation commits this before any customer
 * mutation; each later SDK create has its own durable issued-stage boundary. */
export async function prepareCheckoutPlan(ports:Ports,client:PoolClient,business:Business,operation:string,owner:BillingOwner|null|undefined,lang:CommerceLanguage):Promise<CheckoutPlan>{
 const exact=await client.query('SELECT operation FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2',[business.id,operation]);
 if(exact.rowCount)throw new CommerceError('legacy_operation_reconciliation_required',409);
 const open=await client.query('SELECT operation FROM commerce.checkout_intents WHERE business_id=$1 AND previous_subscription_id IS NOT DISTINCT FROM $2 AND reconciled_expired_at IS NULL AND expires_at>clock_timestamp() ORDER BY created_at DESC LIMIT 1',[business.id,business.subscriptionId]);
 if(open.rowCount)throw new CommerceError('checkout_pending',409);
 if(business.subscriptionId){const current=await ports.stripe.subscriptions.retrieve(business.subscriptionId);assertOwnedSubscription(current,business);if(!terminalSubscription(current.status))throw new CommerceError('use_billing_portal',409);}
 const count=Math.max(1,await ports.headcount(business,client)),plan=planFor(count);
 await ports.assertCurrent?.(client);
 const price=await ports.stripe.prices.retrieve(ports.prices[plan.key]);
 if(!price.active||price.livemode!==ports.live||price.currency!=='usd'||price.unit_amount!==plan.amount||price.recurring?.interval!=='month'||price.recurring.interval_count!==1)throw new CommerceError('invalid_billing_price',503);
 if(ports.tax)await assertTaxPrice(ports.stripe,price,ports.tax);
 const customer=await planCustomer(ports,business);
 if(customer.kind==='existing'){
  const listed=await ports.stripe.subscriptions.list({customer:customer.id,status:'all',limit:100});
  if(listed.has_more)throw new CommerceError('customer_reconciliation_required',409);
  const existing=listed.data.filter(s=>s.metadata.nevora_business_id===business.id&&!terminalSubscription(s.status));
  if(existing.length){for(const sub of existing)await ports.store.enqueue(client,'stripe',`checkout-recover:${sub.id}`,{subscriptionId:sub.id});return {state:'subscription_sync_pending'};}
 }
 const chargeStart=Math.max(business.trialEnd??0,business.paidThrough??0),early=chargeStart>ports.now();
 const proof=createHmac('sha256',ports.store.key).update(`checkout-return:${business.id}:${operation}`).digest('base64url');
 await ports.store.handoff(business.id,proof,ports.now(),client,3600000,owner);
 const metadata={nevora_business_id:business.id,nevora_price:price.id,nevora_checkout_operation:operation,...(ports.tax?{nevora_tax_terms:taxTerms(ports.tax)}:{})};
 const params:Omit<Stripe.Checkout.SessionCreateParams,'customer'>={
  integration_identifier:`nevora-billing-${Array.from(randomBytes(8),value=>String.fromCharCode(97+value%26)).join('')}`,
  mode:early?'setup':'subscription',currency:'usd',
  success_url:`${ports.origin}${billingPage(lang,'return')}#handoff=${proof}`,
  cancel_url:`${ports.origin}${billingPage(lang,'billing')}#handoff=${proof}`,
  locale:lang,client_reference_id:business.id,metadata,expires_at:Math.floor(Date.now()/1000)+2700,
 };
 if(ports.tax){params.billing_address_collection='required';params.customer_update={address:'auto'};}
 if(early){
  params.setup_intent_data={metadata};params.custom_text={submit:{message:lang==='es'
   ?`Autoriza USD ${(plan.amount/100).toFixed(2)} al mes${ports.tax?(ports.tax.behavior==='exclusive'?' más los impuestos aplicables':' con los impuestos aplicables incluidos'):''} a partir del ${new Date(chargeStart).toISOString().slice(0,10)}. Cancela desde la configuración de facturación.`
   :`Authorize USD ${(plan.amount/100).toFixed(2)} per month${ports.tax?(ports.tax.behavior==='exclusive'?' plus applicable tax':' including applicable tax'):''} starting ${new Date(chargeStart).toISOString().slice(0,10)}. Cancel through billing settings.`}};
 }else{
  params.line_items=[{price:price.id,quantity:1}];params.subscription_data={metadata};
  if(ports.tax){params.automatic_tax={enabled:true};params.tax_id_collection={enabled:true};params.customer_update={address:'auto',name:'auto'};}
 }
 return {state:'prepared',count,planKey:plan.key,previousSubscriptionId:business.subscriptionId,customer,params};
}
export async function executeCheckoutCustomer(ports:Ports,client:PoolClient,business:Business,plan:CustomerPlan):Promise<{id:string}>{
 if(plan.kind==='create'&&business.customerId)throw new CommerceError('billing_binding_changed',409);
 if(plan.kind==='existing'&&business.customerId&&business.customerId!==plan.id)throw new CommerceError('billing_binding_changed',409);
 await ports.assertCurrent?.(client);
 const c=plan.kind==='create'?await ports.stripe.customers.create(plan.params,{idempotencyKey:`nevora-customer:${business.id}`}):await ports.stripe.customers.retrieve(plan.id);
 if(c.deleted||c.metadata.nevora_business_id!==business.id)throw new CommerceError('customer_identity_mismatch',503);
 await client.query('UPDATE commerce.businesses SET stripe_customer_id=$2 WHERE id=$1 AND (stripe_customer_id IS NULL OR stripe_customer_id=$2)',[business.id,c.id]);
 return {id:c.id};
}
export async function prepareCheckoutIntent(ports:Ports,client:PoolClient,business:Business,operation:string,plan:Extract<CheckoutPlan,{state:'prepared'}>,customerId:string):Promise<PreparedCheckout>{
 if(business.customerId!==customerId||business.subscriptionId!==plan.previousSubscriptionId)throw new CommerceError('billing_binding_changed',409);
 if((plan.params.expires_at??0)*1000<=Date.now())throw new CommerceError('checkout_expired',409);
 const params={...plan.params,customer:customerId};
 await client.query('INSERT INTO commerce.checkout_intents(business_id,operation,previous_subscription_id,params_secret,employee_count,plan_key,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
  [business.id,operation,plan.previousSubscriptionId,seal(JSON.stringify(params),ports.store.key,`intent:${business.id}:${operation}`),plan.count,plan.planKey,new Date(params.expires_at!*1000)]);
 return {operation,customerId,previousSubscriptionId:plan.previousSubscriptionId,params};
}
async function record(
  ports: Ports,
  client: PoolClient,
  intent: Intent,
  session: Stripe.Checkout.Session,
) {
  if (
    session.metadata?.nevora_business_id !== intent.business_id ||
    session.metadata.nevora_checkout_operation !== intent.operation
  )
    throw Error("checkout_identity_mismatch");
  const params=JSON.parse(unseal(intent.params_secret,ports.store.key,`intent:${intent.business_id}:${intent.operation}`)) as Stripe.Checkout.SessionCreateParams;
  if(stripeObjectId(session.customer)!==params.customer||(intent.session_id!==null&&intent.session_id!==session.id))throw Error('checkout_identity_mismatch');
  await client.query(
    "UPDATE commerce.checkout_intents SET session_id=$3,result_secret=$4,reconciled_expired_at=CASE WHEN $5 THEN COALESCE(reconciled_expired_at,clock_timestamp()) ELSE reconciled_expired_at END WHERE business_id=$1 AND operation=$2",
    [
      intent.business_id,
      intent.operation,
      session.id,
      session.url
        ? seal(session.url, ports.store.key, `checkout:${intent.business_id}`)
        : null,
      session.status==='expired',
    ],
  );
  await client.query(
    "UPDATE commerce.businesses SET employee_count=$2,checkout_id=$3,checkout_url=$4,checkout_expires_at=$5 WHERE id=$1",
    [
      intent.business_id,
      intent.employee_count,
      session.id,
      session.url
        ? seal(session.url, ports.store.key, `checkout:${intent.business_id}`)
        : null,
      new Date(session.expires_at * 1000),
    ],
  );
}

export async function executePreparedCheckout(ports:Ports,client:PoolClient,business:Business,prepared:PreparedCheckout):Promise<KnownCheckout>{
 if(business.customerId!==prepared.customerId)throw new CommerceError('billing_binding_changed',409);
 const intent=(await client.query<Intent>('SELECT * FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2',[business.id,prepared.operation])).rows[0];
 if(!intent)throw new CommerceError('checkout_reconciliation_required',409);
 if(intent.result_secret)return {url:unseal(intent.result_secret,ports.store.key,`checkout:${business.id}`),sessionId:intent.session_id!,expiresAt:intent.expires_at.getTime()};
 const params=JSON.parse(unseal(intent.params_secret,ports.store.key,`intent:${business.id}:${intent.operation}`)) as Stripe.Checkout.SessionCreateParams;
 if(JSON.stringify(params)!==JSON.stringify(prepared.params)||params.customer!==prepared.customerId)throw new CommerceError('checkout_reconciliation_required',409);
 // Read before creating, including after a lost provider reply or intervening
 // subscription change. A returned page is never payment/entitlement evidence.
 const listed=await ports.stripe.checkout.sessions.list({customer:prepared.customerId,created:{gte:Math.floor(intent.expires_at.getTime()/1000)-2760},limit:100});
 const matches=listed.data.filter(s=>s.metadata?.nevora_business_id===business.id&&s.metadata.nevora_checkout_operation===intent.operation);
 if(listed.has_more||matches.length>1)throw new CommerceError('checkout_reconciliation_required',409);
 if(matches[0]){
  const session=matches[0];if(stripeObjectId(session.customer)!==prepared.customerId)throw new CommerceError('checkout_identity_mismatch',503);
  await record(ports,client,intent,session);
  const code=session.status==='expired'||session.expires_at*1000<=Date.now()?'checkout_expired' as const:!session.url?'checkout_reconciliation_required' as const:undefined;
  return {url:code?null:session.url,sessionId:session.id,expiresAt:session.expires_at*1000,...(code?{code}:{})};
 }
 if(business.subscriptionId!==prepared.previousSubscriptionId)throw new CommerceError('billing_binding_changed',409);
 if(intent.expires_at.getTime()<=Date.now())throw new CommerceError('checkout_expired',409);
 const tax=readTaxTerms(params);
 if(tax){
  const savedPrice=typeof params.metadata==='object'?params.metadata?.nevora_price:undefined;
  if(savedPrice!==ports.prices[intent.plan_key])throw new CommerceError('invalid_billing_price',503);
  const price=await ports.stripe.prices.retrieve(savedPrice);
  if(!price.active||price.livemode!==ports.live||price.currency!=='usd'||price.unit_amount!==(intent.plan_key==='small'?1900:2900)||price.recurring?.interval!=='month'||price.recurring.interval_count!==1)throw new CommerceError('invalid_billing_price',503);
  await assertTaxPrice(ports.stripe,price,tax);
 }
 await ports.assertCurrent?.(client);
 const session=await ports.stripe.checkout.sessions.create(params,{idempotencyKey:`nevora-checkout:${business.id}:${intent.operation}`});
 if(stripeObjectId(session.customer)!==prepared.customerId)throw new CommerceError('checkout_identity_mismatch',503);
 await record(ports,client,intent,session);
 return {url:session.url,sessionId:session.id,expiresAt:session.expires_at*1000,...(!session.url?{code:'checkout_reconciliation_required' as const}:{})};
}
/** Recover provider-created checkouts when an acknowledged creation was lost before catalog commit. */
export async function recoverCheckouts(ports: Ports, business: Business) {
  if (!business.customerId) return;
  const intents = await ports.store.pool.query<Intent>(
    `SELECT * FROM (SELECT i.* FROM commerce.checkout_intents i
      JOIN commerce.businesses b ON b.id=i.business_id
      LEFT JOIN commerce.billing_operation_stages s ON s.business_id=i.business_id AND s.operation::text=i.operation AND s.stage='checkout'
      LEFT JOIN commerce.billing_operations o ON o.business_id=s.business_id AND o.operation=s.operation AND o.action='checkout'
      WHERE i.business_id=$1 AND ((i.session_id IS NULL AND o.operation IS NOT NULL) OR
        (o.operation IS NULL AND i.reconciled_expired_at IS NULL AND i.previous_subscription_id IS NOT DISTINCT FROM b.stripe_subscription_id))
      ORDER BY i.created_at DESC LIMIT 100) recent ORDER BY created_at`,
    [business.id],
  );
  if (!intents.rowCount) return;
  const sessions = await ports.stripe.checkout.sessions.list({
    customer: business.customerId,
    limit: 100,
  });
  if(sessions.has_more)throw Error('checkout_reconciliation_required');
  for (const intent of intents.rows) {
    const matches = sessions.data.filter(
      (s) =>
        s.metadata?.nevora_business_id === business.id &&
        s.metadata.nevora_checkout_operation === intent.operation,
    );
    if (matches.length > 1) throw Error("checkout_reconciliation_required");
    if (matches[0])
      await ports.store.withBusinessLock(
        business.id,
        async (client, current) => {
          if (
            current.subscriptionId === intent.previous_subscription_id ||
            !current.subscriptionId
          )
            await record(ports, client, intent, matches[0]);
        },
      );
  }
}
