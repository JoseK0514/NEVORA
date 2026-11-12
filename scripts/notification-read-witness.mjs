import {randomUUID} from 'node:crypto';

/** Test-only, per-document evidence captured before the native fetch executes.
 * Only fixed classifications cross the binding; request data never does. */
export const observeNotificationReadWitness=(context,onUnproved)=>observeOwnGetReadWitness(context,onUnproved,'notifications');
export const observeAuthorityReadWitness=(context,onUnproved)=>observeOwnGetReadWitness(context,onUnproved,'authority');
async function observeOwnGetReadWitness(context,onUnproved,resource){
 // Fixed, separate bindings let both witnesses coexist without sharing a
 // document token or accepting an attempt made for the other resource.
 const path=resource==='authority'?'/api/company-access/operational-authority':'/api/notifications';
 const binding=resource==='authority'?'__nevoraQaAuthorityAttempt':'__nevoraQaNotificationAttempt';
 const documents=new WeakMap();
 const snapshot=page=>{
  const state=documents.get(page);
  return {verified:!!state&&state.pending.size===1&&state.unproved===0,attempts:state?.attempts??0,unproved:state?.unproved??0,pending:state?.pending.size??0};
 };
 context.on('page',page=>page.on('request',request=>{
  try{if(request.isNavigationRequest()&&request.frame()===page.mainFrame()){
   const state=documents.get(page);if(state){state.attempts=0;state.pending.clear();}
  }}catch{/* A missing frame cannot establish a new witness interval. */}
 }));
 await context.exposeBinding(binding,(source,kind,token,attempt)=>{
  const page=source.page;
  if(source.frame!==page.mainFrame()){if(kind!=='document')onUnproved(page);return null;}
  if(kind==='document'){
   const id=randomUUID();documents.set(page,{id,attempts:0,unproved:0,next:0,pending:new Set()});return id;
  }
  const state=documents.get(page);
  if(kind==='settled'){if(state?.id===token)state.pending.delete(attempt);return null;}
  if(!state||state.id!==token){onUnproved(page);return null;}
  if(kind==='own-get'){state.attempts++;const id=++state.next;state.pending.add(id);return id;}
  else{state.unproved++;onUnproved(page);}
  return null;
 });
 await context.addInitScript(({path,binding})=>{
  const nativeFetch=globalThis.fetch,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,descriptors=Object.getOwnPropertyDescriptors,prototype=Object.getPrototypeOf;
  const NativeRequest=Request,objectPrototype=Object.prototype,urlHref=descriptor(URL.prototype,'href').get,requestUrl=descriptor(Request.prototype,'url').get;
  const requestMethod=descriptor(Request.prototype,'method').get,requestBody=descriptor(Request.prototype,'body').get;
  const aborted=descriptor(AbortSignal.prototype,'aborted').get;
  const report=globalThis[binding];
  const documentToken=report('document');
  const fields=['method','body','headers','signal','cache','credentials','redirect','mode','referrer','referrerPolicy','integrity','keepalive','duplex','priority','window'];
  const plain=value=>value&&typeof value==='object'&&(prototype(value)===objectPrototype||prototype(value)===null);
  function classify(input,options){
   try{
    let href;
    if(typeof input==='string')href=input;
    else{try{href=apply(urlHref,input,[]);}catch{try{href=apply(requestUrl,input,[]);}catch{return 'unproved';}}}
    const url=new URL(href,document.baseURI);
    if(url.pathname!==path)return 'other';
    if(typeof input!=='string'||url.origin!==location.origin||url.search||url.hash||url.username||url.password)return 'unproved';
    if(options===undefined)return fields.some(key=>descriptor(objectPrototype,key))?'unproved':'own-get';
    if(!plain(options))return 'unproved';
    const own=descriptors(options);
    if(Object.values(own).some(item=>!Object.hasOwn(item,'value'))||fields.some(key=>!own[key]&&descriptor(objectPrototype,key)))return 'unproved';
    const method=own.method?.value,body=own.body?.value;
    if(method!==undefined&&(typeof method!=='string'||method.toUpperCase()!=='GET')||body!=null)return 'unproved';
    for(const [key,item] of Object.entries(own)){
     const value=item.value;
     if(key==='headers'&&value!==undefined){
      if(!plain(value)||Object.values(descriptors(value)).some(header=>!Object.hasOwn(header,'value')||typeof header.value!=='string'))return 'unproved';
     }else if(key==='signal'&&value!=null){apply(aborted,value,[]);}
     else if(value!==null&&typeof value==='object'||typeof value==='function'||typeof value==='symbol')return 'unproved';
    }
    return 'own-get';
   }catch{return 'unproved';}
  }
  globalThis.fetch=async function(input,options){
   let kind=classify(input,options),request;
   if(kind==='other')return apply(nativeFetch,this,[input,options]);
   // Native conversion fixes the actual method/body before yielding. Descriptor
   // inspection alone cannot prove what a Proxy will return to native fetch.
   if(kind==='own-get'){
    try{request=new NativeRequest(input,options);const url=new URL(apply(requestUrl,request,[]));if(url.origin!==location.origin||url.pathname!==path||url.search||url.hash||apply(requestMethod,request,[])!=='GET'||apply(requestBody,request,[])!==null)kind='unproved';}
    catch{kind='unproved';}
   }
   const token=await documentToken;
   const attempt=await report(kind,token);
   // The original options remain observable to their caller while IPC awaits.
   // Recheck synchronously, then dispatch without yielding if still proven.
   if(kind==='own-get'&&classify(input,options)!=='own-get')await report('unproved',token);
   try{return await (request?apply(nativeFetch,this,[request]):apply(nativeFetch,this,[input,options]));}
   finally{if(attempt!==null)await report('settled',token,attempt);}
  };
 },{path,binding});
 return {snapshot,consume(page){if(!snapshot(page).verified)return false;const state=documents.get(page);state.pending.clear();return true;}};
}
