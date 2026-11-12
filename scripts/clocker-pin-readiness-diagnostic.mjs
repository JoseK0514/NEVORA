import {appendFile,writeFile} from 'node:fs/promises';

const kinds=['browser-disconnected','context-close','page-close','page-crash','visibilitychange','focus','blur','pagehide','pageshow','submit','request','response','requestfinished','requestfailed','phase','diagnostic-failure','browser-saturated'];
const phases=['readiness','keypad','continue'];
const categories=['timeout','page-crashed','target-closed','context-destroyed','aborted','connection-failed','other'];
export function pinFailureCategory(error){
 const message=typeof error==='string'?error:typeof error?.message==='string'?error.message:'';
 if(/crash/i.test(message))return 'page-crashed';
 if(/Target .*closed|page.*closed|context.*closed|browser.*closed/i.test(message))return 'target-closed';
 if(/Execution context was destroyed|Cannot find context/i.test(message))return 'context-destroyed';
 if(/timeout|timed out|deadline/i.test(message)||error?.name==='TimeoutError')return 'timeout';
 if(/ERR_ABORTED|cancelled|canceled|aborted/i.test(message))return 'aborted';
 if(/ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|Could not connect/i.test(message))return 'connection-failed';
 return 'other';
}
function state(value){
 const result={};if(!value||typeof value!=='object')return result;
 for(const key of ['focused','online','pinPresent','pinDisabled','busy','defaultPrevented','persisted'])if(typeof value[key]==='boolean')result[key]=value[key];
 if(['visible','hidden'].includes(value.visibility))result.visibility=value.visibility;
 if(['loading','interactive','complete'].includes(value.readyState))result.readyState=value.readyState;
 if(['entry','verified'].includes(value.pinState))result.pinState=value.pinState;
 if(['photo','review-current','select-break','loading','ready','confirm-out','sending','recovery','retry','other-person','auth','unavailable','storage','success'].includes(value.punchState))result.punchState=value.punchState;
 if(Number.isInteger(value.enteredDigits)&&value.enteredDigits>=0&&value.enteredDigits<=16)result.enteredDigits=value.enteredDigits;
 return result;
}
// This function is serialized into the owned context; it reads flags, never values/text.
export function installPinReadinessObserver(){
 if(window!==window.top||window.__nevoraPinDiagnosticCleanup)return;
 const listeners=[],timers=new Set();let count=0,active=true;
 const bridge=value=>{try{void window.__nevoraPinDiagnostic(value).catch(()=>{});}catch{}};
 // Reaching capacity is conservative saturation, not an exact dropped count.
 // One reserved signal bypasses the ordinary event cap; never bridge each drop.
 const send=value=>{if(!active||count>=64)return;count++;bridge(value);if(count===64)bridge({kind:'browser-saturated',saturated:true});};
 const flags=()=>{const pin=document.querySelector('input[name=pin]'),gate=document.querySelector('[data-clocker-pin]');return {focused:document.hasFocus(),visibility:document.visibilityState,online:navigator.onLine,readyState:document.readyState,pinPresent:!!pin,pinDisabled:!!pin?.disabled,busy:gate?.getAttribute('aria-busy')==='true',pinState:gate?.getAttribute('data-clocker-pin'),punchState:document.querySelector('[data-clocker-state]')?.getAttribute('data-clocker-state')};};
 const on=(target,name,listener)=>{target.addEventListener(name,listener,true);listeners.push(()=>target.removeEventListener(name,listener,true));};
 for(const kind of ['focus','blur','pagehide','pageshow'])on(window,kind,event=>send({kind,...flags(),persisted:event.persisted===true}));
 on(document,'visibilitychange',()=>send({kind:'visibilitychange',...flags()}));
 on(document,'submit',event=>{
  if(!event.target?.matches('form')||!event.target.querySelector('input[name=pin]'))return;
  // The next task observes defaultPrevented after native dispatch, even when
  // an application handler stops propagation. Never alter the event.
  send({kind:'submit',stage:'before',...flags(),defaultPrevented:event.defaultPrevented});
  if(count>=64||timers.size>=64)return;
  const timer=setTimeout(()=>{timers.delete(timer);send({kind:'submit',stage:'after',...flags(),defaultPrevented:event.defaultPrevented});},0);timers.add(timer);
 });
 window.__nevoraPinDiagnosticCleanup=()=>{active=false;for(const timer of timers)clearTimeout(timer);timers.clear();for(const remove of listeners)remove();delete window.__nevoraPinDiagnosticCleanup;};
}
export function readPinReadinessState(){
 const pin=document.querySelector('input[name=pin]'),gate=document.querySelector('[data-clocker-pin]');
 return {focused:document.hasFocus(),visibility:document.visibilityState,online:navigator.onLine,readyState:document.readyState,pinPresent:!!pin,pinDisabled:!!pin?.disabled,busy:gate?.getAttribute('aria-busy')==='true',pinState:gate?.getAttribute('data-clocker-pin'),punchState:document.querySelector('[data-clocker-state]')?.getAttribute('data-clocker-state')};
}
export async function runPinDiagnosticObservation(task){
 return bounded(task);
}
async function bounded(task,budget=1000,onExpired=()=>{}){
 let timer;try{return await Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{timer=setTimeout(()=>{onExpired();reject(new Error('diagnostic deadline'));},budget);})]);}finally{clearTimeout(timer);}
}
export function observePinReadiness({browser,context,page,origin,engine,source,artifactBase,now=()=>performance.now(),persist}){
 const started=now(),events=[],listeners=[],requests=new WeakMap();let requestSequence=0,sequence=0,omittedEvents=0,rejectedInputs=0,closed=false,queue=Promise.resolve(),writeFailure=null,disposed=false,browserLocalSaturated=false;
 const writes=new AbortController();let installation;
 const counts={network:0,browser:0,phase:0,metadata:0},limits={network:128,browser:64,phase:64,metadata:1};
 const binding={engine:['chromium','webkit'].includes(engine)?engine:'other',checkpoint:/^[a-f0-9]{40}$/.test(source?.checkpoint)?source.checkpoint:null,tree:/^[a-f0-9]{40}$/.test(source?.tree)?source.tree:null,sourceClean:source?.sourceClean===true};
 const snapshot=()=>({...binding,events:events.map(event=>({...event})),omittedEvents,rejectedInputs,writeFailure,browserLocalSaturated});
 const writer=persist??(artifactBase?async(event,summary)=>{await appendFile(artifactBase+'.jsonl',JSON.stringify(event)+'\n',{signal:writes.signal});await writeFile(artifactBase+'.json',JSON.stringify(summary,null,2),{signal:writes.signal});}:null);
 const record=input=>{
  if(closed)return;
  if(!input||!kinds.includes(input.kind)){rejectedInputs++;return;}
  if(input.kind==='browser-saturated'){if(input.saturated!==true){rejectedInputs++;return;}if(browserLocalSaturated)return;browserLocalSaturated=true;}
  const lane=input.kind==='browser-saturated'?'metadata':['request','response','requestfinished','requestfailed'].includes(input.kind)?'network':['phase','diagnostic-failure'].includes(input.kind)?'phase':'browser';
  if(counts[lane]++>=limits[lane]){omittedEvents++;return;}
  const elapsed=now()-started,event={sequence:++sequence,elapsedMs:Number.isFinite(elapsed)?Math.max(0,Math.round(elapsed)):0,kind:input.kind,...state(input)};
  if(['setup','pin'].includes(input.boundary))event.boundary=input.boundary;
  if(['clear','verify','status','prepare','redeem','other'].includes(input.action))event.action=input.action;
  if(Number.isSafeInteger(input.requestId)&&input.requestId>0)event.requestId=input.requestId;
  if(Number.isInteger(input.status)&&input.status>=100&&input.status<=599)event.status=input.status;
  if(phases.includes(input.phase))event.phase=input.phase;
  if(['before','after','failure'].includes(input.stage))event.stage=input.stage;
  if(categories.includes(input.category))event.category=input.category;
  if(['install','evaluation','snapshot','screenshot','cleanup','artifact'].includes(input.operation))event.operation=input.operation;
  events.push(event);
  if(writer){const summary=snapshot();queue=queue.then(()=>disposed?undefined:writer(event,summary)).catch(error=>{if(!disposed)writeFailure=pinFailureCategory(error);});}
 };
 const failure=(operation,error)=>record({kind:'diagnostic-failure',operation,category:pinFailureCategory(error)});
 const on=(emitter,name,listener)=>{emitter.on(name,listener);listeners.push(()=>emitter.off(name,listener));};
 const guard=fn=>value=>{try{fn(value);}catch(error){failure('evaluation',error);}};
 on(browser,'disconnected',()=>record({kind:'browser-disconnected'}));on(context,'close',()=>record({kind:'context-close'}));
 on(page,'close',()=>record({kind:'page-close'}));on(page,'crash',()=>record({kind:'page-crash'}));
 on(page,'request',guard(request=>{
  const url=new URL(request.url());if(url.origin!==origin||request.method()!=='POST')return;
  const boundary=url.pathname==='/api/clocker/2/pin'?'pin':url.pathname==='/api/clocker/2/setup'?'setup':null;if(!boundary)return;
  let action='other';try{const candidate=request.postDataJSON()?.[boundary==='setup'?'step':'action'];if((boundary==='setup'?['status','prepare','redeem']:['clear','verify','status']).includes(candidate))action=candidate;}catch{}
  const entry={requestId:++requestSequence,boundary,action};requests.set(request,entry);record({kind:'request',...entry});
 }));
 on(page,'response',guard(response=>{const entry=requests.get(response.request());if(entry)record({kind:'response',...entry,status:response.status()});}));
 for(const kind of ['requestfinished','requestfailed'])on(page,kind,guard(request=>{const entry=requests.get(request);if(entry)record({kind,...entry,...(kind==='requestfailed'?{category:pinFailureCategory(request.failure()?.errorText)}:{})});}));
 return {
  snapshot,record,failure,
  phase:(phase,stage,flags={})=>record({kind:'phase',phase,stage,...state(flags)}),
  async install(){
   if(closed||installation)return;
   const token={active:true,installing:true,deadline:performance.now()+1000,retired:null};installation=token;
   const expire=()=>{if(!token.active)return;token.active=false;token.retired='timeout';failure('install',new Error('diagnostic deadline'));};
   const live=()=>{if(token.active&&token.installing&&performance.now()>=token.deadline)expire();return token.active&&!closed;};
   // Playwright work already dispatched cannot be cancelled. Retire its token
   // at the deadline so a late resolution cannot schedule further mutations,
   // and any binding installed by that work remains inert.
   try{await bounded(async()=>{
    if(!live())return;
    await context.exposeBinding('__nevoraPinDiagnostic',(source,value)=>{
     if(!live())return;
     if(source.page!==page||source.frame!==page.mainFrame()||!value||!['visibilitychange','focus','blur','pagehide','pageshow','submit','browser-saturated'].includes(value.kind)){rejectedInputs++;return;}
     if(value.kind==='browser-saturated'){record({kind:value.kind,saturated:value.saturated===true});return;}
     if(value.kind==='submit'&&typeof value.defaultPrevented!=='boolean'){rejectedInputs++;return;}
     record({kind:value.kind,...(['before','after'].includes(value.stage)?{stage:value.stage}:{}),...state(value)});
    });
    if(!live())return;
    await context.addInitScript(installPinReadinessObserver);
    if(!live())return;
    token.installing=false;
   },1000,expire);}catch(error){if(!token.retired){token.active=false;token.retired='failure';failure('install',error);}}
  },
  async captureFailure(screenshot){
   // Only after the original scenario has failed. Retained events are independent
   // of page JS, so a dead renderer cannot erase earlier boundary evidence.
   await Promise.all([
    bounded(()=>page.evaluate(readPinReadinessState)).then(value=>record({kind:'phase',phase:'continue',stage:'failure',...state(value)}),error=>failure('snapshot',error)),
    screenshot?bounded(screenshot).catch(error=>failure('screenshot',error)):Promise.resolve(),
   ]);
  },
  async close(){
   if(closed)return;if(installation){installation.active=false;installation.retired??='cleanup';}for(const remove of listeners)remove();
   if(!page.isClosed())try{await bounded(()=>page.evaluate(()=>window.__nevoraPinDiagnosticCleanup?.()));}catch(error){failure('cleanup',error);}
   closed=true;try{await bounded(()=>queue);}catch(error){writeFailure=pinFailureCategory(error);}
   // Includes omissions/write categories after the last accepted event.
   if(artifactBase&&!writeFailure){queue=queue.then(()=>disposed?undefined:writeFile(artifactBase+'.json',JSON.stringify(snapshot(),null,2),{signal:writes.signal})).catch(error=>{if(!disposed)writeFailure=pinFailureCategory(error);});try{await bounded(()=>queue);}catch(error){writeFailure=pinFailureCategory(error);}}
   disposed=true;writes.abort();
  },
 };
}
