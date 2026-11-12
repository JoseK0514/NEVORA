import type Stripe from 'stripe';
import type {CommerceStore} from './store';
import {CommerceError} from './model';
import {stripeObjectId} from './stripe-identity';

type RiskType='charge.refunded'|'charge.dispute.created'|'radar.early_fraud_warning.created';
export function isStripeRiskType(value:unknown):value is RiskType {
  return value==='charge.refunded'||value==='charge.dispute.created'||value==='radar.early_fraud_warning.created';
}
const id=(value:unknown,prefix:string):value is string=>typeof value==='string'&&value.length<=255&&new RegExp('^'+prefix+'[A-Za-z0-9_]+$').test(value);

/** Preserve only bounded provider references from an already verified event. */
export function stripeRiskJob(event:Stripe.Event):Record<string,string>|null {
  if(!isStripeRiskType(event.type))return null;
  const object=event.data.object as unknown as Record<string,unknown>;
  const refund=event.type==='charge.refunded';
  const objectType=refund?'charge':event.type==='charge.dispute.created'?'dispute':'radar.early_fraud_warning';
  const prefix=refund?'ch_':event.type==='charge.dispute.created'?'dp_':'issfr_';
  const chargeId=refund?stripeObjectId(object):stripeObjectId(object.charge);
  const paymentIntentId=object.payment_intent==null?'':stripeObjectId(object.payment_intent);
  if(object.object!==objectType||!id(object.id,prefix)||!id(chargeId,'ch_')||(paymentIntentId!==''&&!id(paymentIntentId,'pi_')))
    throw new CommerceError('invalid_event');
  return {riskType:event.type,eventId:event.id,chargeId,paymentIntentId:paymentIntentId??''};
}

/** Risk events require operator decisions, never automatic refunds or access
 * changes. Resolve current-version InvoicePayments before attaching a review to
 * a workplace; retain unresolved legacy/one-off charges at merchant scope. */
export async function reviewStripeRisk(store:CommerceStore,stripe:Stripe,payload:Record<string,string>,live:boolean) {
  if(!isStripeRiskType(payload.riskType)||!id(payload.eventId,'evt_')||!id(payload.chargeId,'ch_')||
    (payload.paymentIntentId!==''&&!id(payload.paymentIntentId,'pi_')))throw new CommerceError('invalid_stripe_risk_job',503);
  let paymentIntentId=payload.paymentIntentId;
  if(!paymentIntentId){
    const charge=await stripe.charges.retrieve(payload.chargeId);
    if(charge.id!==payload.chargeId||charge.livemode!==live)throw new CommerceError('stripe_risk_identity_mismatch',503);
    const incoming=stripeObjectId(charge.payment_intent);
    if(incoming&&!id(incoming,'pi_'))throw new CommerceError('stripe_risk_identity_mismatch',503);
    paymentIntentId=incoming??'';
  }
  const bindings=new Map<string,string>();
  const invoices=new Set<string>();
  if(paymentIntentId)for await(const payment of stripe.invoicePayments.list({
    payment:{type:'payment_intent',payment_intent:paymentIntentId},status:'paid',limit:100,
  })){
    if(payment.livemode!==live||payment.status!=='paid'||payment.payment.type!=='payment_intent'||
      stripeObjectId(payment.payment.payment_intent)!==paymentIntentId)throw new CommerceError('stripe_risk_identity_mismatch',503);
    const invoiceId=stripeObjectId(payment.invoice);
    if(!id(invoiceId,'in_'))throw new CommerceError('stripe_risk_identity_mismatch',503);
    if(invoices.has(invoiceId))continue;
    invoices.add(invoiceId);
    const invoice=await stripe.invoices.retrieve(invoiceId);
    if(invoice.id!==invoiceId||invoice.livemode!==live)throw new CommerceError('stripe_risk_identity_mismatch',503);
    if(invoice.parent?.type!=='subscription_details')continue;
    const subscriptionId=stripeObjectId(invoice.parent.subscription_details?.subscription);
    if(!id(subscriptionId,'sub_'))throw new CommerceError('stripe_risk_identity_mismatch',503);
    const subscription=await stripe.subscriptions.retrieve(subscriptionId);
    const customerId=stripeObjectId(invoice.customer),businessId=subscription.metadata.nevora_business_id;
    if(subscription.id!==subscriptionId||subscription.livemode!==live||!id(customerId,'cus_')||
      stripeObjectId(subscription.customer)!==customerId)throw new CommerceError('stripe_risk_identity_mismatch',503);
    if(!businessId||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(businessId))
      throw new CommerceError('stripe_risk_identity_mismatch',503);
    const owned=await store.pool.query('SELECT id FROM commerce.businesses WHERE id=$1 AND stripe_customer_id=$2',[businessId,customerId]);
    if(owned.rowCount===1)bindings.set(businessId,customerId);
  }
  await store.transaction(async client=>{
    const targets:([string,string]|[null,null])[]=bindings.size?[...bindings]:[[null,null]];
    for(const [businessId,customerId] of targets){
      if(businessId){
        const current=await client.query('SELECT id FROM commerce.businesses WHERE id=$1 AND stripe_customer_id=$2 FOR SHARE',[businessId,customerId]);
        if(current.rowCount!==1)throw new CommerceError('stripe_risk_identity_mismatch',503);
      }
      const receipt=await client.query('INSERT INTO commerce.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',[
        `risk-review:${payload.eventId}:${businessId??'unresolved'}`,
      ]);
      if(receipt.rowCount)await client.query('INSERT INTO commerce.audit(business_id,event) VALUES($1,$2)',[
        businessId,`stripe_risk_${businessId?'review':'unresolved'}:${payload.riskType}:${payload.eventId}:${payload.chargeId}`,
      ]);
    }
  });
}
