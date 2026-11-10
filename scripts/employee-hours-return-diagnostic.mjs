import {writeFile} from 'node:fs/promises';

const states=['ready','loading','paused','unavailable','denied','missing','other'];
const kinds=['initial','state','online','offline','focus','blur','pagehide','pageshow','visibilitychange'];
const category=error=>/timeout|timed out|deadline/i.test(error?.message??'')?'timeout':/aborted|cancelled|canceled/i.test(error?.message??'')?'aborted':/offline|internet.disconnected/i.test(error?.message??'')?'offline':'other';
const elapsed=value=>Number.isFinite(value)?Math.max(0,Math.round(value)):0;
function flags(value){
 const result={};if(!value||typeof value!=='object')return result;
 for(const key of ['focused','online','periodMatch','cardPresent'])if(typeof value[key]==='boolean')result[key]=value[key];
 result.visibility=['visible','hidden'].includes(value.visibility)?value.visibility:'other';
 result.route=value.route==='my-time'?'my-time':'other';
 result.view=['cards','missing'].includes(value.view)?value.view:'other';
 result.state=states.includes(value.state)?value.state:'other';
 return result;
}
async function bounded(task){
 let timer;try{return await Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('diagnostic deadline')),1000);})]);}finally{clearTimeout(timer);}
}

// Serialized into the explicitly selected Employee page. No text, values, body,
// authority, headers or URL strings leave that page. Finish also leaves a tombstone
// so an already-dispatched, late install cannot attach listeners after disposal.
export function employeeHoursReturnPage({action,selection,deadline}){
 const key='__nevoraEmployeeHoursReturn';
 if(action==='finish'){
  const current=window[key];window[key]={retired:true};
  return current?.finish?.()??null;
 }
 if(Date.now()>=deadline||window[key]?.retired)return {expired:true};
 if(window[key])return null;
 const started=performance.now(),events=[],listeners=[];let active=true,omitted=0,last='';
 const read=()=>{
  const hours=document.querySelector('.c-hours'),state=hours?.getAttribute('data-hours-state'),view=hours?.getAttribute('data-hours-view'),params=new URLSearchParams(location.search);
  return {route:location.pathname==='/app/my-time'?'my-time':'other',view:!hours?'missing':view==='cards'?'cards':'other',state:!hours?'missing':['ready','loading','paused','unavailable','denied'].includes(state)?state:'other',
   periodMatch:location.pathname==='/app/my-time'&&params.get('view')==='cards'&&params.get('start')+'_'+params.get('end')===selection&&hours?.getAttribute('data-hours-context')?.startsWith('cards|'+selection+'|')===true,
   cardPresent:!!document.querySelector('#hours-timecard'),focused:document.hasFocus(),online:navigator.onLine,visibility:['visible','hidden'].includes(document.visibilityState)?document.visibilityState:'other'};
 };
 const note=kind=>{if(!active)return;const state=read(),signature=JSON.stringify(state);if(kind==='state'&&signature===last)return;last=signature;if(events.length===64){omitted++;return;}events.push({kind,elapsedMs:Math.max(0,Math.round(performance.now()-started)),...state});};
 const on=(target,name)=>{const listener=event=>{if(target===window&&event.target!==window)return;note(name);};target.addEventListener(name,listener,true);listeners.push(()=>target.removeEventListener(name,listener,true));};
 const observer=new MutationObserver(()=>note('state'));
 window[key]={finish(){active=false;observer.disconnect();for(const remove of listeners)remove();return {lifecycle:events,omittedLifecycle:omitted,final:read()};}};
 for(const name of ['online','offline','focus','blur','pagehide','pageshow'])on(window,name);
 on(document,'visibilitychange');
 observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-hours-state','data-hours-view','data-hours-context']});
 note('initial');return {installed:true};
}

/** Bounded test-only witness for one exact Employee cards return. Network outcomes
 * remain available if the renderer dies; lifecycle omissions are unknown until
 * the final browser read succeeds, rather than being falsely reported as zero. */
export function observeEmployeeHoursReturn({page,origin,selection,engine,source,artifactPath}){
 const started=performance.now(),network=[],listeners=[],requests=new WeakMap();let sequence=0,omittedNetwork=0,closing=false,closed=false,closingPromise;
 let lifecycle=[],omittedLifecycle=null,final=null,installFailure=null,finalFailure=null,writeFailure=null,outcome='unreached';
 const binding={target:'employee-hours-return',engine:['chromium','webkit'].includes(engine)?engine:'other',checkpoint:/^[a-f0-9]{40}$/.test(source?.checkpoint)?source.checkpoint:null,tree:/^[a-f0-9]{40}$/.test(source?.tree)?source.tree:null,sourceClean:source?.sourceClean===true};
 const snapshot=()=>({...binding,outcome,network:network.map(value=>({...value})),lifecycle:lifecycle.map(value=>({...value})),omittedNetwork,omittedLifecycle,final:final?{...final}:null,installFailure,finalFailure,writeFailure});
 const matches=request=>{try{const url=new URL(request.url());return request.frame()===page.mainFrame()&&request.frame().page()===page&&request.method()==='GET'&&url.origin===origin&&url.pathname==='/api/employee/hours/cards/'+selection&&!url.search;}catch{return false;}};
 const record=(kind,request,status)=>{
  if(closing||closed||!matches(request))return;
  if(kind==='request')requests.set(request,++sequence);
  const requestId=requests.get(request);if(!requestId)return;
  if(network.length===128){omittedNetwork++;return;}
  const event={kind,requestId,elapsedMs:elapsed(performance.now()-started)};
  if(kind==='response'&&Number.isInteger(status)&&status>=100&&status<=599)event.status=status;
  if(kind==='requestfailed'){let message='';try{message=request.failure()?.errorText??'';}catch{}event.category=category({message});}
  network.push(event);
 };
 const on=(name,fn)=>{page.on(name,fn);listeners.push(()=>page.off(name,fn));};
 on('request',request=>record('request',request));
 on('response',response=>record('response',response.request(),response.status()));
 for(const name of ['requestfinished','requestfailed'])on(name,request=>record(name,request));
 return {
  snapshot,
  async install(){
   if(closing||closed)return;
   try{const result=await bounded(()=>page.evaluate(employeeHoursReturnPage,{action:'install',selection,deadline:Date.now()+1000}));if(!closing&&!closed&&!result?.installed)installFailure=result?.expired?'timeout':'other';}
   catch(error){if(!closing&&!closed)installFailure=category(error);}
  },
  close(result){
   if(closingPromise)return closingPromise;
   closing=true;outcome=['success','failure'].includes(result)?result:'unreached';for(const remove of listeners)remove();
   closingPromise=(async()=>{
    try{
     const value=await bounded(()=>page.evaluate(employeeHoursReturnPage,{action:'finish'}));
     if(!value?.final)finalFailure='unavailable';
     else{
      final=flags(value.final);
      lifecycle=Array.isArray(value.lifecycle)?value.lifecycle.slice(0,64).filter(item=>kinds.includes(item?.kind)).map(item=>({kind:item.kind,elapsedMs:elapsed(item.elapsedMs),...flags(item)})):[];
      omittedLifecycle=Number.isSafeInteger(value.omittedLifecycle)&&value.omittedLifecycle>=0?value.omittedLifecycle:null;
     }
    }catch(error){finalFailure=category(error);}
    if(artifactPath){const writes=new AbortController();try{await bounded(()=>writeFile(artifactPath,JSON.stringify(snapshot(),null,2),{signal:writes.signal}));}catch(error){writeFailure=category(error);}finally{writes.abort();}}
    closed=true;
   })();return closingPromise;
  },
 };
}
