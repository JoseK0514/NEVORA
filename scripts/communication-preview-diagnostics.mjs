import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {safeEvaluationFailure} from './release-browser-diagnostics.mjs';

export function projectCommunicationPreview(value){
 const body=value&&typeof value==='object'?value:{};
 return {state:['ready','unavailable','unauthorized'].includes(body.state)?body.state:'other'};
}

export async function readCommunicationPreviewResponse(response,deadline){
 try{
  const status=response.status();
  await finishResponseByDeadline(response,deadline);
  const bytes=await runBeforeRecoveryDeadline(()=>response.body(),deadline);
  if(bytes.length>1_000_000)throw Error('Oversized diagnostic response');
  return {status:Number.isInteger(status)&&status>=100&&status<=599?status:'invalid',bodyFinished:true,...projectCommunicationPreview(JSON.parse(bytes.toString('utf8')))};
 }catch{throw Error('Communication preview diagnostic body unavailable');}
}

export function previewEventBuffer(limit=128){
 if(!Number.isSafeInteger(limit)||limit<1||limit>128)throw Error('Invalid preview diagnostic bound');
 const events=[];let omittedEvents=0;
 return {record(event){if(events.length<limit)events.push(event);else omittedEvents++;},snapshot:()=>({events:[...events],omittedEvents})};
}

export function installCommunicationPreviewWindowObserver(){
 const ids=new WeakMap();let nextId=0,last='',sent=0,omitted=0,stopped=false;
 const snapshot=()=>{
  const form=document.querySelector('.wb-compose form');if(form&&!ids.has(form))ids.set(form,++nextId);
  const compose=document.querySelector('.wb-compose'),text=compose?.textContent??'';
  const preview=compose?.querySelector('.compose-reviewed');
  const candidate=preview?.querySelector('button');
  const bounds=candidate?.getBoundingClientRect(),style=candidate?getComputedStyle(candidate):null;
  return {documentId:Math.round(performance.timeOrigin),formId:form?ids.get(form):0,route:location.pathname==='/app/updates/compose'?'compose':'other',
   previewPresent:!!preview,publishCandidate:!!candidate,publishCandidateVisible:!!bounds&&bounds.width>0&&bounds.height>0&&style.visibility!=='hidden'&&style.display!=='none',
   busy:!!form?.querySelector('[aria-busy="true"]'),errorPresent:!!document.querySelector('#communication-form-error')?.textContent?.trim(),
   paused:text.includes('Paused while you were away'),loading:text.includes('Loading the form'),audienceError:text.includes('Audience couldn’t be checked'),
   focused:document.hasFocus(),visible:document.visibilityState==='visible',online:navigator.onLine};
 };
 const send=event=>{
  if(stopped)return;
  if(sent>=128){omitted++;if(omitted===1)void globalThis.__nevoraCommunicationPreviewObservation({event:'window-limit',...snapshot()}).catch(()=>{});return;}sent++;
  void globalThis.__nevoraCommunicationPreviewObservation({event,...snapshot()}).catch(()=>{});
 };
 const changed=()=>{const key=JSON.stringify(snapshot());if(key!==last){last=key;send('dom');}};
 const listeners=['focus','blur','pagehide','pageshow','online','offline'].map(name=>{const handler=()=>send(name);addEventListener(name,handler);return [name,handler];});
 const visibility=()=>send('visibilitychange');document.addEventListener('visibilitychange',visibility);
 const observer=new MutationObserver(changed);observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-busy','disabled']});
 globalThis.__nevoraCommunicationPreviewStop=()=>{
  stopped=true;observer.disconnect();for(const[name,handler]of listeners)removeEventListener(name,handler);
  document.removeEventListener('visibilitychange',visibility);return {...snapshot(),windowOmittedEvents:omitted};
 };
 changed();
}

const booleans=['previewPresent','publishCandidate','publishCandidateVisible','busy','errorPresent','paused','loading','audienceError','focused','visible','online'];
export function projectPreviewDom(value){
 const body=value&&typeof value==='object'?value:{};
 const integer=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:0;
 return {documentId:integer(body.documentId,Number.MAX_SAFE_INTEGER),formId:integer(body.formId,10000),route:body.route==='compose'?'compose':'other',
  ...Object.fromEntries(booleans.map(key=>[key,body[key]===true]))};
}

export async function observeCommunicationPreview(page,origin){
 const buffer=previewEventBuffer(),started=performance.now(),pending=new Set(),identities=new WeakMap();let serial=0,frozen=false,finishing;
 const event=(kind,detail={})=>{if(!frozen)buffer.record({kind,elapsedMs:Math.min(60000,Math.max(0,Math.round(performance.now()-started))),...detail});};
 await page.exposeBinding('__nevoraCommunicationPreviewObservation',(_source,value)=>{
  const kind=['dom','focus','blur','pagehide','pageshow','online','offline','visibilitychange','window-limit'].includes(value?.event)?value.event:'other';
  event(kind,projectPreviewDom(value));
 });
 await page.addInitScript(installCommunicationPreviewWindowObserver);
 const describe=request=>{
  let url;try{url=new URL(request.url());}catch{return;}
  const method=request.method(),resource=url.pathname==='/api/employee/communications/preview'&&method==='POST'?'preview':url.pathname==='/api/employee/communications/context'&&method==='GET'?'context':null;
  if(url.origin!==origin||!resource)return;
  if(!identities.has(request))identities.set(request,++serial);
  return {requestId:identities.get(request),resource,method};
 };
 const request=value=>{const detail=describe(value);if(detail)event('request',detail);};
 const response=value=>{
  const detail=describe(value.request());if(!detail)return;
  const status=value.status();event('response',{...detail,status:Number.isInteger(status)&&status>=100&&status<=599?status:'invalid'});
  if(pending.size>=4){event('body-capacity',detail);return;}
  const task=readCommunicationPreviewResponse(value,performance.now()+2000).then(body=>event('body',{...detail,...body}),()=>event('body-unavailable',detail));
  pending.add(task);void task.finally(()=>pending.delete(task));
 };
 const finished=value=>{const detail=describe(value);if(detail)event('finished',detail);};
 const failed=value=>{const detail=describe(value);if(detail)event('failed',detail);};
 const listeners={request,response,requestfinished:finished,requestfailed:failed};
 for(const[name,listener]of Object.entries(listeners))page.on(name,listener);
 return {finish(){
  if(finishing)return finishing;
  finishing=(async()=>{
   for(const[name,listener]of Object.entries(listeners))page.off(name,listener);
   try{await runBeforeRecoveryDeadline(()=>Promise.allSettled([...pending]),performance.now()+2100);}catch{event('body-diagnostics-pending');}
   let documentState={available:false},publishButton={available:false};
   try{
    const state=await runBeforeRecoveryDeadline(()=>page.evaluate(()=>globalThis.__nevoraCommunicationPreviewStop?.()),performance.now()+1000);
    if(state)documentState={available:true,...projectPreviewDom(state),windowOmittedEvents:Number.isSafeInteger(state.windowOmittedEvents)&&state.windowOmittedEvents>=0?state.windowOmittedEvents:0};
   }catch(error){documentState.failure=safeEvaluationFailure(error);}
   try{
    publishButton=await runBeforeRecoveryDeadline(async()=>{
     const locator=page.getByRole('button',{name:'Publish update',exact:true}),count=await locator.count();
     return {available:true,count:Math.min(100,Math.max(0,count)),visible:count===1?await locator.isVisible():false};
    },performance.now()+1000);
   }catch(error){publishButton.failure=safeEvaluationFailure(error);}
   frozen=true;
   return {...buffer.snapshot(),documentState,publishButton,pendingBodies:pending.size,limitations:['DOM form identity is a node-lifetime proxy, not a React generation observation.','publishCandidate is a DOM proxy; publishButton uses the original exact accessible-role locator.','Window state and its omission count cover the final available document; earlier document limits emit window-limit events.','The exposed binding lives until the owned page closes; its callback is frozen at finish.']};
  })();return finishing;
 }};
}
