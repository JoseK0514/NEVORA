import {publicBillingApiOrigin} from './central-billing-config';
export {publicBillingApiOrigin} from './central-billing-config';
import {parseCommerceStatus,type CommerceStatus} from './status';

export type BillingLanguage='en'|'es';
export type BillingAction='checkout'|'portal'|'small'|'team';
export type BillingCatalog={currency:'usd';trialDays:30;plans:{key:'small'|'team';employees:number;amount:number}[]};
export type CentralStatus=CommerceStatus&{subscriptionStatus?:string|null;businessName:string|null;applicationUrl:string|null;timeZone:string|null;billingAction:'checkout'|'portal'|null};
export type CentralRead={state:'ready';observedAt:string;validForMs:number;status:CentralStatus;catalog:BillingCatalog}|{state:'unavailable';reason:'read_failed'|'access_denied'};
/** Refusals the Owner can act on. The codes are the commerce service's; the page holds the words
 * (services/commerce/README.md, "Consumer error copy"). Every other code keeps the general refusal. */
export type BillingRefusal='changed'|'pending'|'review'|'expired'|'quote'|'employees'|'manage'|'syncing';
/** `retired`: the service refused this operation for good and the client let go of its key (a new attempt is new). */
export type BillingResult={kind:'navigate';url:string}|{kind:'unknown'|'denied'|'busy'}|{kind:'refused'|'conflict';refusal?:BillingRefusal;retired?:boolean};
const refusals=new Map<string,BillingRefusal>([['idempotency_conflict','changed'],['billing_operation_pending','pending'],['checkout_pending','pending'],
 ['billing_operation_reconciliation_required','review'],['legacy_operation_reconciliation_required','review'],['checkout_expired','expired'],['billing_operation_expired','expired'],
 ['assisted_quote_required','quote'],['plan_employee_limit','employees'],['use_billing_portal','manage'],['subscription_sync_pending','syncing']]);
type Transport=(input:string,init:RequestInit)=>Promise<Response>;
type Intent={action:BillingAction;lang:BillingLanguage;key:string;path:string;body:Readonly<{lang:BillingLanguage;plan?:'small'|'team'}>};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
/** Reads only the bounded error code of a refusal; nothing else in the body is kept or shown. */
export function billingRefusal(value:unknown):BillingRefusal|null{
 return object(value)&&object(value.error)&&typeof value.error.code==='string'?refusals.get(value.error.code)??null:null;
}
export function takeBillingFragment(location:{hash:string;pathname:string;search:string},scrub:(url:string)=>void):string|null{
 const proof=location.search?'':/^#handoff=([A-Za-z0-9_-]{43})$/.exec(location.hash)?.[1]??null;
 if(location.hash||location.search)scrub(location.pathname);
 return proof||null;
}
export function stripeBillingDestination(value:unknown):string{
 if(!object(value)||typeof value.url!=='string'||value.url.length>8192)throw Error('Invalid billing destination');
 const u=new URL(value.url);
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Invalid billing destination');
 const checkout=u.hostname==='checkout.stripe.com'&&
  (u.pathname.startsWith('/c/')||/^\/g\/pay\/cs_(?:test|live)_[A-Za-z0-9]+$/.test(u.pathname));
 const portal=u.hostname==='billing.stripe.com'&&u.pathname.startsWith('/p/');
 if(!checkout&&!portal)throw Error('Invalid billing destination');
 return u.href;
}
export function parseBillingCatalog(value:unknown):BillingCatalog{
 if(!object(value)||value.currency!=='usd'||value.trialDays!==30||!Array.isArray(value.plans)||value.plans.length!==2)throw Error('Invalid plans');
 const plans=value.plans.map(row=>{if(!object(row)||!['small','team'].includes(String(row.key))||row.employees!==(row.key==='small'?15:30)||!Number.isSafeInteger(row.amount)||Number(row.amount)<=0||Number(row.amount)>10000000)throw Error('Invalid plan');return {key:row.key as 'small'|'team',employees:Number(row.employees),amount:Number(row.amount)};});
 if(new Set(plans.map(p=>p.key)).size!==2)throw Error('Duplicate plans');return {currency:'usd',trialDays:30,plans};
}
export function parseCentralStatus(value:unknown):CentralStatus{
 const status=parseCommerceStatus(value);if(!object(value))throw Error('Invalid status');
 const billingAction=value.billingAction??null;
 const subscriptionStatus=value.subscriptionStatus;
 if(subscriptionStatus!==undefined&&subscriptionStatus!==null){
  if(typeof subscriptionStatus!=='string'||!subscriptionStatus.length||subscriptionStatus.length>100||subscriptionStatus.trim()!==subscriptionStatus||/[\u0000-\u001f\u007f]/.test(subscriptionStatus))throw Error('Invalid subscription status');
  // Preserve an opaque future provider fact only when the authoritative API
  // has disabled financial actions. Never invent a payable state from it.
  if(!['active','trialing','past_due','unpaid','incomplete','incomplete_expired','canceled','paused'].includes(subscriptionStatus)&&billingAction!==null)throw Error('Unknown actionable subscription status');
 }
 if(billingAction!==null&&billingAction!=='checkout'&&billingAction!=='portal')throw Error('Invalid billing action');
 if(value.businessName!==null&&(typeof value.businessName!=='string'||value.businessName.length>200))throw Error('Invalid workplace');
 let applicationUrl:string|null=null;
 if(value.applicationUrl!==null){if(typeof value.applicationUrl!=='string')throw Error('Invalid workplace URL');const u=new URL(value.applicationUrl);if(u.origin!==value.applicationUrl||u.username||u.password||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw Error('Invalid workplace URL');applicationUrl=u.origin;}
 if(value.timeZone!==null){if(typeof value.timeZone!=='string'||value.timeZone.length>100)throw Error('Invalid time zone');new Intl.DateTimeFormat('en',{timeZone:value.timeZone});}
 return {...status,...(value.subscriptionStatus===undefined?{}:{subscriptionStatus:value.subscriptionStatus as string|null}),businessName:value.businessName as string|null,applicationUrl,timeZone:value.timeZone as string|null,billingAction};
}
/** Bearer and original intent stay in this instance's memory. No browser storage,
 * caller customer selector or automatic financial retry is supported. */
export function createCentralBillingClient(origin:string|null,transport:Transport=fetch,key:()=>string=()=>crypto.randomUUID(),now:()=>number=()=>Date.now()){
 const api=publicBillingApiOrigin(origin);let bearer:string|null=null,expires=0,epoch=0,entered=false,disposed=false,intent:Intent|null=null,financial:AbortController|null=null;
 const requests=new Set<AbortController>();
 const current=()=>!disposed&&bearer!==null&&now()<expires;
 const cancel=()=>{epoch++;for(const request of requests)request.abort();requests.clear();};
 const clear=()=>{cancel();bearer=null;expires=0;intent=null;};
 async function call(path:string,method:'GET'|'POST',body:unknown,auth:boolean,signal?:AbortSignal,operation?:string){
  if(!api||disposed||auth&&!current())return {status:401,data:null};
  const generation=epoch,controller=new AbortController(),abort=()=>controller.abort(),detached=path==='/v1/logout';if(!detached)requests.add(controller);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
  let canceled!:()=>void;const cancellation=new Promise<{status:number;data:unknown}>(resolve=>{canceled=()=>resolve({status:0,data:null});controller.signal.addEventListener('abort',canceled,{once:true});});
  const timeout=setTimeout(abort,12000);
  try{return await Promise.race([(async()=>{
   if(controller.signal.aborted)return {status:0,data:null};
   const response=await transport(api+path,{method,credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(auth?{authorization:'Bearer '+bearer}:{}),...(operation?{'idempotency-key':operation}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const text=await response.text();if(controller.signal.aborted||generation!==epoch||disposed||text.length>65536)return {status:0,data:null};
   let data:unknown=null;try{data=JSON.parse(text);}catch{/* Never echo a malformed/private response. */}
   return {status:response.status,data};
  })(),cancellation]);
  }catch{return {status:0,data:null};}
  finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',canceled);signal?.removeEventListener('abort',abort);requests.delete(controller);}
 }
 async function issue(signal?:AbortSignal):Promise<BillingResult>{
  if(financial)return {kind:'busy'};if(!current()||!intent)return {kind:'denied'};
  const original=intent,generation=epoch,controller=new AbortController();financial=controller;
  const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
  try{
   const result=await call(original.path,'POST',original.body,true,controller.signal,original.key);
   if(disposed||generation!==epoch||controller.signal.aborted||result.status===0)return {kind:'unknown'};
   if([401,403].includes(result.status)){clear();return {kind:'denied'};}
   // A final refusal (error.operationState 'refused', backend Nov 15 contract) retires the held intent: the service
   // recorded the refusal durably, so a new attempt starts with a new key. Every other non-2xx (409 conflict, any other
   // 4xx, 5xx) keeps the original key and body for the person's own retry; nothing is retried here.
   if(object(result.data)&&object(result.data.error)&&result.data.error.operationState==='refused'&&typeof result.data.error.code==='string'){
    if(intent===original)intent=null;const refusal=billingRefusal(result.data);return {kind:'refused',retired:true,...(refusal?{refusal}:{})};
   }
   if(result.status<200||result.status>=300){const refusal=billingRefusal(result.data);return {kind:result.status===409?'conflict':'refused',...(refusal?{refusal}:{})};}
   try{return {kind:'navigate',url:stripeBillingDestination(result.data)};}catch{return {kind:'unknown'};}
  }finally{signal?.removeEventListener('abort',abort);if(financial===controller)financial=null;}
 }
 return {
  async enter(proof:string|null):Promise<'ready'|'invalid'|'unavailable'>{
   if(entered||disposed||!proof||!/^[A-Za-z0-9_-]{43}$/.test(proof))return 'invalid';entered=true;
   if(!api)return 'unavailable';const generation=epoch,result=await call('/v1/handoff/exchange','POST',{token:proof},false);
   if(disposed||generation!==epoch||result.status!==200||!object(result.data)||typeof result.data.accessToken!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(result.data.accessToken)||!Number.isSafeInteger(result.data.expiresIn)||Number(result.data.expiresIn)<=0||Number(result.data.expiresIn)>28800)return 'unavailable';
   bearer=result.data.accessToken;expires=now()+Number(result.data.expiresIn)*1000;return 'ready';
  },
  async read(signal:AbortSignal):Promise<CentralRead>{
   if(!current()){clear();return {state:'unavailable',reason:'access_denied'};}
   const started=now(),generation=epoch;
   const [status,catalog]=await Promise.all([call('/v1/status','GET',undefined,true,signal),call('/v1/plans','GET',undefined,false,signal)]);
   if([401,403].includes(status.status)){clear();return {state:'unavailable',reason:'access_denied'};}
   if(generation!==epoch||signal.aborted||!current()||status.status!==200||catalog.status!==200)throw Error('Billing read unavailable');
   return {state:'ready',observedAt:new Date(started).toISOString(),validForMs:15000,status:parseCentralStatus(status.data),catalog:parseBillingCatalog(catalog.data)};
  },
  action(action:BillingAction,lang:BillingLanguage,signal?:AbortSignal):Promise<BillingResult>{
   if(!current())return Promise.resolve({kind:'denied'});
   if(!['checkout','portal','small','team'].includes(action)||!['en','es'].includes(lang))return Promise.resolve({kind:'refused'});
   if(intent&&(intent.action!==action||intent.lang!==lang))return Promise.resolve({kind:'conflict'});
   if(!intent){const operation=key();if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(operation))return Promise.resolve({kind:'refused'});
    intent=Object.freeze({action,lang,key:operation,path:action==='small'||action==='team'?'/v1/plan-change':'/v1/'+action,body:Object.freeze({lang,...(action==='small'||action==='team'?{plan:action}:{})})});
   }
   return issue(signal);
  },
  retry:issue,
  hasSession:current,
  hasPending:()=>intent!==null,
  pause(){cancel();},
  cancelAction(){financial?.abort();},
  async signOut(){const revoke=current()?call('/v1/logout','POST',{},true):undefined;clear();await revoke;},
  dispose(){disposed=true;clear();financial?.abort();},
 };
}
