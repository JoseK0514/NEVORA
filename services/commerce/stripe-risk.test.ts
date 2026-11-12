import Stripe from 'stripe';
import {expect,it} from 'vitest';
import {parseStripeWebhook,projectsStripeEvent} from './stripe-webhook';
const secret='whsec_fictional_risk_validation';
function read(object:unknown,live=false,type='charge.dispute.created'){
  const raw=JSON.stringify({id:'evt_validation',object:'event',livemode:live,type,data:{object}});
  return parseStripeWebhook(raw,Stripe.webhooks.generateTestHeaderString({payload:raw,secret}),secret,false);
}
const dispute={id:'dp_fixture',object:'dispute',charge:'ch_fixture',payment_intent:'pi_fixture'};
it.each([
  {...dispute,id:'ch_wrong_kind'},
  {...dispute,object:'charge'},
  {...dispute,charge:'cus_wrong_kind'},
  {...dispute,charge:null},
  {...dispute,payment_intent:'sub_wrong_kind'},
  {...dispute,payment_intent:[]},
])('rejects malformed signed risk references before persisting them: %j',object=>{
  expect(()=>read(object)).toThrow('invalid_event');
});
it('recognizes a valid risk event as durable work, including a legacy null PaymentIntent',()=>{
  expect(projectsStripeEvent(read(dispute))).toBe(true);
  expect(projectsStripeEvent(read({...dispute,payment_intent:null}))).toBe(true);
});
it('rejects a live risk event at a test-mode receiver',()=>{
  expect(()=>read(dispute,true)).toThrow('mode_mismatch');
});
