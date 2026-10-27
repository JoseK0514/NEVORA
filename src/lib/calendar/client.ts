import type {CalendarCommand,CalendarManagementResult,CalendarSubscriptionStatus} from './types';

type Ready=Extract<CalendarSubscriptionStatus,{authority:string}>;
export type CalendarClientState={status:CalendarSubscriptionStatus|null;url:string|null;paused:boolean;busy:boolean;notice:string;pendingKind:CalendarCommand['kind']|null};
import {parseCalendarStatus,parseCalendarResult} from './contract';
const unknown='The result is unknown. Retry the original request to finish checking it. No new request will be created.';
const failure:CalendarSubscriptionStatus={state:'unavailable',reason:'read_failed'};
class AccessDenied extends Error{}
/** One mounted link owner. No credential or pending intent is persisted. */
export function createCalendarClient(authority:string,changed:(state:CalendarClientState)=>void){
 let state:CalendarClientState={status:null,url:null,paused:true,busy:false,notice:'',pendingKind:null};
 let stopped=false,ended=false,sequence=0,pending:CalendarCommand|null=null,active:AbortController|undefined;
 let poll:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
 let lastObserved=0,validUntil=0;
 const publish=(patch:Partial<CalendarClientState>)=>{state={...state,...patch,pendingKind:pending?.kind??null};if(!stopped)changed(state);};
 const cancel=()=>{validUntil=0;sequence++;active?.abort();active=undefined;clearTimeout(poll);clearTimeout(expiry);};
 const current=(at:number)=>!stopped&&!ended&&!state.paused&&at===sequence;
 const headers={'X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':authority,Accept:'application/json'};
 async function request(command?:CalendarCommand){
  const controller=new AbortController();active=controller;let timeout:ReturnType<typeof setTimeout>|undefined;
  const abort=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('Calendar request stopped')),{once:true});timeout=setTimeout(()=>controller.abort(),10000);});
  try{return await Promise.race([abort,(async()=>{
   const response=await fetch('/api/employee/calendar-subscriptions',{method:command?'POST':'GET',headers:command?{...headers,'Content-Type':'application/json'}:headers,body:command?JSON.stringify(command):undefined,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
   if(controller.signal.aborted){void response.body?.cancel().catch(()=>{});throw Error('Late calendar response');}
   if(response.status===401||response.status===403){void response.body?.cancel().catch(()=>{});throw new AccessDenied();}
   const value:unknown=await response.json();
   if(command){const result=parseCalendarResult(value,command,location.origin);if(response.status!==(result.status==='conflict'?409:result.status==='unavailable'||result.status==='outcome_unknown'?503:200))throw Error('Unexpected calendar HTTP result');return result;}
   if(!response.ok)throw Error('Calendar read failed');return parseCalendarStatus(value,authority);
  })()]);}finally{clearTimeout(timeout);if(active===controller)active=undefined;}
 }
 const schedule=()=>{if(!stopped&&!ended&&!state.paused&&state.status?.state!=='unauthorized')poll=setTimeout(()=>void refresh(),30000);};
 function expire(){cancel();publish({status:failure,url:null});schedule();}
 function hasCurrentLease(){if(performance.now()<validUntil)return true;expire();return false;}
 async function refresh(reveal?:Extract<CalendarManagementResult,{status:'created'}>){
  if(stopped||ended||state.paused||state.busy&&!reveal)return;
  cancel();const at=sequence,started=performance.now();publish({status:null,url:null});
  try{
   const result=await request() as Ready;if(!current(at))return;
   const deadline=started+result.validForMs,remaining=deadline-performance.now(),observed=Date.parse(result.observedAt);
   if(remaining<=0||observed<lastObserved)throw Error('Expired calendar read');lastObserved=observed;validUntil=deadline;
   const url=reveal&&result.state==='active'&&result.id===reveal.id&&result.generation===reveal.generation?reveal.url:null;
   publish({status:result,url,...(reveal?{notice:url?'Link created. Copy it now to use it in your calendar app.':'The link changed before it could be shown. Review its current status.'}:{})});
   expiry=setTimeout(()=>{if(current(at))expire();},remaining);
   schedule();
  }catch(error){if(!current(at))return;publish({status:error instanceof AccessDenied?{state:'unauthorized',reason:'access_denied'}:failure,url:null});schedule();}
 }
 async function submit(kind:CalendarCommand['kind'],retry=false){
  if(stopped||ended||state.paused||state.busy||!state.status||!('authority'in state.status)||pending&&!retry)return;
  if(!hasCurrentLease())return;
  const status=state.status;
  if(!retry&&(kind==='REVOKE'?status.state!=='active':!status.canIssue||kind==='ISSUE'&&status.state==='active'||kind==='ROTATE'&&status.state!=='active'))return;
  const command=retry?pending:{kind,operationId:crypto.randomUUID(),authority,expectedGeneration:status.generation};if(!command)return;
  pending=command;cancel();const at=sequence;publish({status:null,url:null,busy:true,notice:''});
  let created:Extract<CalendarManagementResult,{status:'created'}>|undefined;
  try{
   const result=await request(command) as CalendarManagementResult;if(!current(at))return;
   if(result.status==='unavailable'||result.status==='outcome_unknown')publish({notice:unknown});
   else{
    pending=null;
    if(result.status==='created')created=result;
    publish({notice:result.status==='created'?'Checking the new link…':result.status==='revoked'?'Link revoked. Future access through this link has stopped.':result.status==='active_url_unavailable'?'The original request finished. Its private URL cannot be retrieved. Replace the link if you still need to copy it.':'The link or your access changed. Review the current status before continuing.'});
   }
  }catch(error){if(!current(at))return;if(error instanceof AccessDenied){publish({status:{state:'unauthorized',reason:'access_denied'},notice:'Your access could not be confirmed. Sign in again to check your calendar settings.',busy:false});return;}publish({notice:unknown});}
  if(!current(at))return;publish({busy:false});await refresh(created);
 }
 return {
  start(){if(stopped||ended||!state.paused)return;publish({paused:false,notice:pending?unknown:''});void refresh();},
  refresh:()=>void refresh(),
  command:(kind:CalendarCommand['kind'])=>void submit(kind),
  retry:()=>{if(pending&&state.status&&'authority'in state.status)void submit(pending.kind,true);else void refresh();},
  async copy(){const url=state.url,at=sequence;if(!url||state.paused||ended||!hasCurrentLease())return;try{await navigator.clipboard.writeText(url);if(current(at)&&state.url===url&&hasCurrentLease())publish({notice:'Link copied.'});}catch{if(current(at)&&state.url===url&&hasCurrentLease())publish({notice:'Copy was unavailable. Use Select link, then copy it manually.'});}},
  pause(){if(stopped)return;cancel();publish({status:null,url:null,paused:true,busy:false,notice:''});},
  end(){ended=true;pending=null;cancel();publish({status:null,url:null,paused:true,busy:false,notice:''});},
  stop(){stopped=true;pending=null;cancel();state={...state,status:null,url:null,paused:true,busy:false};},
 };
}
