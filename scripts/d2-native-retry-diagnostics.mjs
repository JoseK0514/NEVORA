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
 // Project before serialization: page code can replace this visible state.
 // Never spread/map an untrusted event or return arbitrary property values.
 let tainted=!state||typeof state!=='object';
 if(state&&Object.keys(state).some(key=>!['events','eventCount'].includes(key)))tainted=true;
 const flag=value=>{if(typeof value==='boolean')return value;tainted=true;return null;};
 const count=value=>{if(Number.isInteger(value)&&value>=0&&value<=10000)return value;tainted=true;return null;};
 const raw=Array.isArray(state?.events)?state.events:[],rawSize=raw.length,size=Number.isInteger(rawSize)&&rawSize>=0&&rawSize<=4294967295?rawSize:0;if(!Array.isArray(state?.events)||size!==rawSize||size>32)tainted=true;
 const events=[],keys=['type','trusted','targetIsRetry','documentFocused','buttonFocused','enabled','visible','atMs'];
 for(let index=Math.max(0,size-32);index<size;index++){
  const value=raw[index];if(!value||typeof value!=='object'||Array.isArray(value)){tainted=true;continue;}
  if(Object.keys(value).some(key=>!keys.includes(key)))tainted=true;
  const type=['focus','blur','visibilitychange','keydown','keyup','click'].includes(value.type)?value.type:'other';if(type==='other')tainted=true;
  const atMs=Number.isInteger(value.atMs)&&value.atMs>=0&&value.atMs<=86400000?value.atMs:null;if(atMs===null)tainted=true;
  events.push({type,trusted:flag(value.trusted),targetIsRetry:flag(value.targetIsRetry),documentFocused:flag(value.documentFocused),buttonFocused:flag(value.buttonFocused),enabled:flag(value.enabled),visible:flag(value.visible),atMs});
 }
 const eventCount=count(state?.eventCount);
 if(eventCount!==null&&eventCount<size)tainted=true;
 return {documentFocused:document.hasFocus(),visible:document.visibilityState==='visible',buttonPresent:!!button,buttonFocused:!!button&&document.activeElement===button,enabled:!!button&&!button.disabled,notice,eventCount,truncated:eventCount!==null&&eventCount>32,events,tainted};
}

/** Independently validate the serialized browser result before persistence. */
export function sanitizeD2RetrySnapshot(input){
 const value=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 let tainted=value.tainted===true;
 if(typeof value.tainted!=='boolean')tainted=true;
 const allowed=['documentFocused','visible','buttonPresent','buttonFocused','enabled','notice','eventCount','truncated','events','tainted'];
 if(Object.keys(value).some(key=>!allowed.includes(key)))tainted=true;
 const flag=raw=>{if(typeof raw==='boolean')return raw;tainted=true;return null;};
 const count=raw=>{if(Number.isInteger(raw)&&raw>=0&&raw<=10000)return raw;tainted=true;return null;};
 const result={documentFocused:flag(value.documentFocused),visible:flag(value.visible),buttonPresent:flag(value.buttonPresent),buttonFocused:flag(value.buttonFocused),enabled:flag(value.enabled)};
 result.notice=[null,'approved','rejected','unconfirmed','other'].includes(value.notice)?value.notice:null;if(result.notice!==value.notice)tainted=true;
 result.eventCount=count(value.eventCount);result.truncated=flag(value.truncated);
 const events=Array.isArray(value.events)?value.events:[],rawSize=events.length,size=Number.isInteger(rawSize)&&rawSize>=0&&rawSize<=4294967295?rawSize:0;if(!Array.isArray(value.events)||size!==rawSize||size>32)tainted=true;
 result.events=[];
 for(let index=Math.max(0,size-32);index<size;index++){
  const event=events[index];
  if(!event||typeof event!=='object'||Array.isArray(event)){tainted=true;continue;}
  const keys=['type','trusted','targetIsRetry','documentFocused','buttonFocused','enabled','visible','atMs'];
  if(Object.keys(event).some(key=>!keys.includes(key)))tainted=true;
  const type=['focus','blur','visibilitychange','keydown','keyup','click'].includes(event.type)?event.type:'other';if(type==='other')tainted=true;
  const atMs=Number.isInteger(event.atMs)&&event.atMs>=0&&event.atMs<=86400000?event.atMs:null;if(atMs===null)tainted=true;
  result.events.push({type,trusted:flag(event.trusted),targetIsRetry:flag(event.targetIsRetry),documentFocused:flag(event.documentFocused),buttonFocused:flag(event.buttonFocused),enabled:flag(event.enabled),visible:flag(event.visible),atMs});
 }
 if(result.eventCount!==null&&result.eventCount<size)tainted=true;
 if((result.eventCount!==null&&result.eventCount>32)||size>32)result.truncated=true;
 result.tainted=tainted;return result;
}

export async function captureD2NativeRetry(receipt,page,phase,postCalls,budgetMs=500){
 if(receipt.phases.length>=8)return;
 try{
  const snapshot=await runBeforeRecoveryDeadline(()=>page.evaluate(readD2NativeRetryTrace),performance.now()+budgetMs);
  receipt.phases.push({phase,postCalls,...sanitizeD2RetrySnapshot(snapshot)});
 }catch{receipt.phases.push({phase,postCalls,diagnosticFailed:true});}
}

export function observeD2ManagerPostOutcomes(page,receipt,origin){
 const expectedOrigin=new URL(origin).origin;
 const relevant=request=>{
  try{const url=new URL(request.url());return request.method()==='POST'&&url.origin===expectedOrigin&&url.pathname==='/api/manager/time-corrections'&&url.search==='';}catch{return false;}
 };
 const response=value=>{if(relevant(value.request())&&receipt.transport.length<8){const status=value.status();receipt.transport.push(Number.isInteger(status)&&status>=100&&status<=599?{kind:'response',status}:{kind:'response',status:null,tainted:true});}};
 const failed=request=>{if(relevant(request)&&receipt.transport.length<8)receipt.transport.push({kind:'failed'});};
 page.on('response',response);page.on('requestfailed',failed);
 return ()=>{page.off('response',response);page.off('requestfailed',failed);};
}
