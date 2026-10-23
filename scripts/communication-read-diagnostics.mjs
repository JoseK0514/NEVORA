import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

export async function finalizeCommunicationRead({scenarioFailed,diagnostic,persist,close,assertClean}){
 let diagnosticFailed=false,closeError,assertionError;
 try{if(diagnostic)await persist(await diagnostic.finish());}catch{diagnosticFailed=true;}
 finally{
  try{await close();}catch(error){closeError=error;}
  try{assertClean();}catch(error){assertionError=error;}
 }
 if(!scenarioFailed){
  if(assertionError)throw assertionError;
  if(closeError)throw closeError;
  if(diagnosticFailed)throw Error('Communication read diagnostic unavailable');
 }
 return {diagnosticFailed,cleanupFailed:!!(closeError||assertionError)};
}

export function projectCommunicationRead(value,expected){
 const body=value&&typeof value==='object'?value:{};
 const states=['ready','unavailable','unauthorized','withdrawn'];
 const reasons=['read_failed','access_denied','update_unavailable','session_ended','module_off','update_changed'];
 return {
  state:states.includes(body.state)?body.state:'other',
  reason:body.reason===undefined?'none':reasons.includes(body.reason)?body.reason:'other',
  leaseMs:Number.isSafeInteger(body.validForMs)&&body.validForMs>=0&&body.validForMs<=45000?body.validForMs:'invalid',
  resourceMatched:typeof expected.id==='string'&&body.id===expected.id,
  authorityMatched:typeof expected.authority==='string'&&body.authority===expected.authority,
 };
}

export async function readCommunicationResponse(response,expected,deadline){
 try{
  const status=response.status();
  await finishResponseByDeadline(response,deadline);
  const bytes=await runBeforeRecoveryDeadline(()=>response.body(),deadline);
  if(bytes.length>1_000_000)throw Error('Communication diagnostic body exceeds limit');
  return {status:Number.isInteger(status)&&status>=100&&status<=599?status:'invalid',bodyFinished:true,...projectCommunicationRead(JSON.parse(bytes.toString('utf8')),expected)};
 }catch(error){
  if(error instanceof Error&&error.message==='Browser response exceeded the original recovery deadline')throw Error('Browser response exceeded the original recovery deadline');
  throw Error('Communication diagnostic body unavailable');
 }
}

/** Observes existing reads only. Never retries, extends app clocks or retains DTOs. */
export function observeCommunicationRead(page,origin,id){
 const started=performance.now(),events=[],pending=new Set(),identities=new WeakMap();
 let omittedEvents=0,nextId=0,otherRequests=0,frozen=false;
 const event=(kind,detail={})=>{if(frozen)return;if(events.length<64)events.push({kind,elapsedMs:Math.min(60000,Math.max(0,Math.round(performance.now()-started))),...detail});else omittedEvents++;};
 const resource=url=>url.pathname===`/api/employee/communications/${id}`?'employee-detail':url.pathname===`/app/updates/${id}`?'update-route':url.pathname==='/app'?'home-route':url.pathname.startsWith('/api/')?'other-api':'other-route';
 const describe=request=>{
  let url;try{url=new URL(request.url());}catch{return;}
  if(url.origin!==origin)return;
  if(!url.pathname.startsWith('/api/')&&!request.isNavigationRequest?.()&&request.headers().rsc!=='1')return;
  const kind=resource(url);
  if(!identities.has(request)){
   if(nextId>=64||(kind!=='employee-detail'&&otherRequests>=8)){omittedEvents++;return;}
   if(kind!=='employee-detail')otherRequests++;
   identities.set(request,++nextId);
  }
  const method=request.method();
  return {requestId:identities.get(request),resource:kind,method:['GET','POST','HEAD'].includes(method)?method:'other',rsc:request.headers().rsc==='1'};
 };
 const request=r=>{const detail=describe(r);if(detail)event('request',detail);};
 const response=r=>{
  const req=r.request(),detail=describe(req);if(!detail)return;
  const status=r.status();event('response',{...detail,status:Number.isInteger(status)&&status>=100&&status<=599?status:'invalid'});
  if(detail.resource!=='employee-detail'||detail.method!=='GET'||pending.size>=16)return;
  const expected={id,authority:req.headers()['x-nevora-communication-authority']};
  const task=readCommunicationResponse(r,expected,performance.now()+2000).then(body=>event('body',{...detail,...body})).catch(()=>event('body-unavailable',detail));
  pending.add(task);void task.finally(()=>pending.delete(task));
 };
 const finished=r=>{const detail=describe(r);if(detail)event('finished',detail);};
 const failed=r=>{const detail=describe(r);if(detail){const failure=r.failure()?.errorText??'';event('failed',{...detail,failure:/cancelled|canceled|aborted/i.test(failure)?'cancelled':'other'});}};
 const frame=f=>{if(f!==page.mainFrame())return;try{const url=new URL(f.url());event('commit',{destination:url.origin===origin?resource(url):'other-origin'});}catch{event('commit',{destination:'other'});}};
 const consoleError=m=>{if(m.type()==='error')event('console-error',{code:m.text().includes('Failed to fetch RSC payload for ')&&m.text().includes('Falling back to browser navigation.')?'rsc-fallback':'other'});};
 const listeners={request,response,requestfinished:finished,requestfailed:failed,framenavigated:frame,console:consoleError};
 for(const [name,listener] of Object.entries(listeners))page.on(name,listener);
 return {async finish(){
  for(const [name,listener] of Object.entries(listeners))page.off(name,listener);
  try{await runBeforeRecoveryDeadline(()=>Promise.allSettled([...pending]),performance.now()+2100);}catch{event('body-diagnostics-pending');}
  let documentState={available:false};
  try{
   const state=await runBeforeRecoveryDeadline(()=>page.evaluate(()=>{
    const heading=text=>[...document.querySelectorAll('h1')].some(node=>node.textContent===text);
    return {focused:document.hasFocus(),visible:document.visibilityState==='visible',online:navigator.onLine,bodyPresent:!!document.querySelector('.wb-update-body'),unavailable:heading('Couldn’t load this update'),loading:heading('Loading update…'),paused:heading('Paused while you were away'),accessChanged:heading('Access changed')};
   }),performance.now()+2000);
   documentState={available:true,...Object.fromEntries(['focused','visible','online','bodyPresent','unavailable','loading','paused','accessChanged'].map(key=>[key,state[key]===true]))};
  }catch{ /* A closed page cannot hide the original scenario result. */ }
  frozen=true;return {events,omittedEvents,documentState,pendingBodies:pending.size};
 }};
}
