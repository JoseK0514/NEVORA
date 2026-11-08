import Stripe from 'stripe';
import {CommerceError} from './model';
import type {CommerceStore} from './store';
import {stripeObjectId} from './stripe-identity';

/** Endpoint-specific signing verification needs no Stripe API credential. */
export function parseStripeWebhook(raw:string,signature:string,secret:string,live:boolean):Stripe.Event {
 let event:Stripe.Event;
 try{event=Stripe.webhooks.constructEvent(raw,signature,secret);}catch{throw new CommerceError('invalid_signature');}
 if(event.livemode!==live)throw new CommerceError('mode_mismatch');
 return event;
}
/** Preserve existing durable receipt/job semantics; a delivery never grants access. */
export async function enqueueStripeWebhook(store:CommerceStore,event:Stripe.Event):Promise<void>{
 const object=event.data.object as unknown as Record<string,unknown>;
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
  const id=stripeObjectId(object);if(!id)return;
  await store.transaction(async client=>{
   const r=await client.query('INSERT INTO commerce.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',[event.id]);
   if(r.rowCount)await store.enqueue(client,'stripe','stripe:'+event.id,{sessionId:id});
  });return;
 }
 let subscriptionId:string|null=null;
 if(event.type.startsWith('customer.subscription.'))subscriptionId=stripeObjectId(object);
 else if(event.type.startsWith('invoice.')){
  const parent=object.parent as {subscription_details?:{subscription?:unknown}}|undefined;
  subscriptionId=stripeObjectId(parent?.subscription_details?.subscription);
 }
 if(subscriptionId)await store.webhook(event.id,subscriptionId);
}
