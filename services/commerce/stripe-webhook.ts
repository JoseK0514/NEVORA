import Stripe from 'stripe';
import {CommerceError} from './model';
import type {CommerceStore} from './store';
import {stripeObjectId} from './stripe-identity';
import {isStripeRiskType,stripeRiskJob} from './stripe-risk';

/** Endpoint-specific signing verification needs no Stripe API credential. */
export function parseStripeWebhook(raw:string,signature:string,secret:string,live:boolean):Stripe.Event {
 let event:Stripe.Event;
 try{event=Stripe.webhooks.constructEvent(raw,signature,secret);}catch{throw new CommerceError('invalid_signature');}
 const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const id=(v:unknown,prefix:string)=>typeof v==='string'&&v.length<=255&&new RegExp('^'+prefix+'[A-Za-z0-9_]+$').test(v);
 if(!record(event)||!id(event.id,'evt_')||event.object!=='event'||typeof event.type!=='string'||event.type.length>200||!/^\w+(?:\.\w+)+$/.test(event.type)||typeof event.livemode!=='boolean'||!record(event.data)||!record(event.data.object)||typeof event.data.object.object!=='string')throw new CommerceError('invalid_event');
 if(event.livemode!==live)throw new CommerceError('mode_mismatch');
 const object=event.data.object as unknown as Record<string,unknown>;
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
  if(object.object!=='checkout.session'||!id(object.id,'cs_'))throw new CommerceError('invalid_event');
 }else if(event.type.startsWith('customer.subscription.')){
  if(object.object!=='subscription'||!id(object.id,'sub_'))throw new CommerceError('invalid_event');
 }else if(event.type.startsWith('invoice.')){
  if(object.object!=='invoice'||!id(object.id,'in_'))throw new CommerceError('invalid_event');
  const parent=object.parent;
  if(parent!==undefined&&parent!==null){
   if(!record(parent))throw new CommerceError('invalid_event');
   const details=parent.subscription_details;
   if(details!==undefined&&details!==null&&(!record(details)||(details.subscription!==undefined&&details.subscription!==null&&!id(stripeObjectId(details.subscription),'sub_'))))throw new CommerceError('invalid_event');
  }
 }else if(isStripeRiskType(event.type))stripeRiskJob(event);
 return event;
}
export function projectsStripeEvent(event:Stripe.Event):boolean{
 if(isStripeRiskType(event.type))return true;
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'||event.type.startsWith('customer.subscription.'))return true;
 if(!event.type.startsWith('invoice.'))return false;
 const object=event.data.object as unknown as {parent?:{subscription_details?:{subscription?:unknown}}};
 return !!stripeObjectId(object.parent?.subscription_details?.subscription);
}
/** Preserve existing durable receipt/job semantics; a delivery never grants access. */
export async function enqueueStripeWebhook(store:CommerceStore,event:Stripe.Event):Promise<void>{
 const risk=stripeRiskJob(event);
 if(risk){
  await store.transaction(async client=>{
   const receipt=await client.query('INSERT INTO commerce.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',[event.id]);
   if(receipt.rowCount)await store.enqueue(client,'stripe','stripe:'+event.id,risk);
  });return;
 }
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
