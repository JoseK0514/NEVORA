import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

/** Passive fixture-page instrumentation. Never focus, dispatch, enable or click. */
export function installD2NativeRetryTrace(){
 const state={events:[],eventCount:0};
 Object.defineProperty(window,'__nevoraD2RetryTrace',{value:state,configurable:true});
 const record=event=>{
  if((event.type==='keydown'||event.type==='keyup')&&event.key!=='Enter')return;
  const button=document.querySelector('.manager-corrections-retry');
  state.eventCount++;
  if(state.events.length===32)state.events.shift();
  state.events.push({type:event.type,trusted:event.isTrusted===true,targetIsRetry:!!button&&event.target?.closest?.('.manager-corrections-retry')===button,documentFocused:document.hasFocus(),buttonFocused:!!button&&document.activeElement===button,enabled:!!button&&!button.disabled,visible:document.visibilityState==='visible',atMs:Math.round(performance.now())});
 };
 for(const name of ['keydown','keyup','click','visibilitychange'])document.addEventListener(name,record,{capture:true,passive:true});
 for(const name of ['focus','blur'])window.addEventListener(name,record,{capture:true,passive:true});
}

export function readD2NativeRetryTrace(){
 const button=document.querySelector('.manager-corrections-retry');
 const text=document.querySelector('.manager-corrections-notice')?.textContent;
 const notice=text==='Correction approved. The original recorded punch remains unchanged.'?'approved':text==='Correction declined. The original recorded punch remains unchanged.'?'rejected':text==='The server outcome could not be confirmed. Retry the same decision safely.'?'unconfirmed':text?'other':null;
 const state=window.__nevoraD2RetryTrace;
 return {documentFocused:document.hasFocus(),visible:document.visibilityState==='visible',buttonPresent:!!button,buttonFocused:!!button&&document.activeElement===button,enabled:!!button&&!button.disabled,notice,eventCount:state?.eventCount??0,truncated:(state?.eventCount??0)>32,events:state?.events.map(event=>({...event}))??[]};
}

export async function captureD2NativeRetry(receipt,page,phase,postCalls,budgetMs=500){
 if(receipt.phases.length>=8)return;
 try{
  const snapshot=await runBeforeRecoveryDeadline(()=>page.evaluate(readD2NativeRetryTrace),performance.now()+budgetMs);
  receipt.phases.push({phase,postCalls,...snapshot});
 }catch{receipt.phases.push({phase,postCalls,diagnosticFailed:true});}
}

export function observeD2ManagerPostOutcomes(page,receipt,origin){
 const expectedOrigin=new URL(origin).origin;
 const relevant=request=>{
  try{const url=new URL(request.url());return request.method()==='POST'&&url.origin===expectedOrigin&&url.pathname==='/api/manager/time-corrections'&&url.search==='';}catch{return false;}
 };
 const response=value=>{if(relevant(value.request())&&receipt.transport.length<8)receipt.transport.push({kind:'response',status:value.status()});};
 const failed=request=>{if(relevant(request)&&receipt.transport.length<8)receipt.transport.push({kind:'failed'});};
 page.on('response',response);page.on('requestfailed',failed);
 return ()=>{page.off('response',response);page.off('requestfailed',failed);};
}
