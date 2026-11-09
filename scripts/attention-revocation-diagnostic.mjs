import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {safeEvaluationFailure,safeDatabaseWaits,safeScheduleServerRequests} from './release-browser-diagnostics.mjs';

export function observeRevocationActions(page,origin,readStage,atMs){
 const requests=new WeakMap(),events=[];let sequence=0,omittedEvents=0,observationFailures=0,closed=false;
 const record=value=>{if(events.length<64)events.push(value);else omittedEvents++;};
 const time=()=>{const value=atMs();return Number.isFinite(value)?Math.max(0,Math.min(60000,Math.round(value))):0;};
 const guarded=fn=>value=>{try{fn(value);}catch{observationFailures++;}};
 const request=guarded(value=>{
  if(readStage()!=='session-revocation'||value.method()!=='POST'||!value.headers()['next-action'])return;
  const url=new URL(value.url());if(url.origin!==origin||url.pathname!=='/app/schedule')return;
  const requestId=++sequence;requests.set(value,requestId);record({event:'request',requestId,atMs:time(),mainFrame:value.frame()===page.mainFrame(),documentNavigation:value.isNavigationRequest()===true});
 });
 const response=guarded(value=>{
  const requestId=requests.get(value.request());if(!requestId)return;
  const status=value.status(),headers=value.headers(),raw=headers['x-action-redirect']??headers.location;let redirect='none';
  if(typeof raw==='string')try{const url=new URL(raw.split(';')[0],origin);redirect=url.origin!==origin?'external':url.pathname==='/login'?'login':'owned-other';}catch{redirect='unavailable';}
  record({event:'response',requestId,atMs:time(),status:Number.isInteger(status)&&status>=100&&status<=599?status:0,redirect});
 });
 const terminal=event=>guarded(value=>{const requestId=requests.get(value);if(requestId)record({event,requestId,atMs:time()});});
 const listeners={request,response,requestfinished:terminal('requestfinished'),requestfailed:terminal('requestfailed')};
 for(const [name,listener]of Object.entries(listeners))page.on(name,listener);
 return {snapshot:()=>({events:events.map(event=>({...event})),omittedEvents,observationFailures}),close:()=>{if(closed)return;closed=true;for(const [name,listener]of Object.entries(listeners))page.off(name,listener);}};
}

function view(value){
 return {route:['login','schedule'].includes(value?.route)?value.route:'other',readyState:['loading','interactive','complete'].includes(value?.readyState)?value.readyState:'other',focused:value?.focused===true,visibility:['visible','hidden'].includes(value?.visibility)?value.visibility:'other',signInVisible:value?.signInVisible===true,confirmPending:value?.confirmPending===true,authorityInputs:Number.isSafeInteger(value?.authorityInputs)&&value.authorityInputs>=0?Math.min(16,value.authorityInputs):null,operationPresent:value?.operationPresent===true};
}
// Called only after the original scenario deadline has already failed. A later
// observation cannot rescue that failure. Persisted projections exclude SQL text
// and payload values.
export async function captureRevocationFailure(tasks,budget=5000){
 if(!Number.isFinite(budget)||budget<=0||budget>5000)throw Error('Invalid diagnostic budget');
 const deadline=performance.now()+budget,names=['view','sessions','databaseWaits','serverRequests'],result={budgetMs:budget};
 const observations=await Promise.allSettled(names.map(name=>runBeforeRecoveryDeadline(()=>tasks[name](),deadline)));
 for(const [index,name]of names.entries()){
  const observation=observations[index];
  if(observation.status==='rejected'){result[name+'Failure']=safeEvaluationFailure(observation.reason);continue;}
  try{
   const value=observation.value;
   if(name==='view')result.view=view(value);
   else if(name==='sessions')result.sessions={remaining:Number.isSafeInteger(value?.[0]?.sessions)&&value[0].sessions>=0?value[0].sessions:null};
   else if(name==='databaseWaits')result.databaseWaits=safeDatabaseWaits(value);
   else result.serverRequests=safeScheduleServerRequests(value);
  }catch(error){result[name+'Failure']=safeEvaluationFailure(error);}
 }
 try{await runBeforeRecoveryDeadline(()=>tasks.screenshot(),performance.now()+budget);result.screenshot={captured:true};}catch(error){result.screenshotFailure=safeEvaluationFailure(error);}
 return result;
}
