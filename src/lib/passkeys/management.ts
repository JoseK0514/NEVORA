import {creationOptions,credentialJSON,deviceName,type Passkey} from './client';

type Phase='loading'|'ready'|'paused'|'unavailable'|'denied'|'disabled'|'ended';
type Busy='options'|'device'|'verifying'|'removing'|null;
export type PasskeyState={phase:Phase;busy:Busy;passkeys:Passkey[]|null;notice:string;needsRefresh:boolean};
type Snapshot={authority:string;validForMs:number;passkeys:Passkey[]};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).sort().join(',')===keys.sort().join(',');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function parseKey(value:unknown):Passkey {
 if(!record(value)||!exact(value,['id','name','createdAt','lastUsedAt'])||typeof value.id!=='string'||!uuid.test(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||/[\u0000-\u001f\u007f]/.test(value.name)||typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt))||value.lastUsedAt!==null&&(typeof value.lastUsedAt!=='string'||!Number.isFinite(Date.parse(value.lastUsedAt))))throw Error('Invalid passkey metadata');
 return value as Passkey;
}
export function parsePasskeySnapshot(value:unknown,authority:string):Snapshot {
 if(!record(value)||!exact(value,['authority','validForMs','passkeys'])||value.authority!==authority||typeof value.validForMs!=='number'||!Number.isInteger(value.validForMs)||value.validForMs<=0||value.validForMs>45000||!Array.isArray(value.passkeys))throw Error('Invalid passkey snapshot');
 const passkeys=value.passkeys.map(parseKey);if(new Set(passkeys.map(key=>key.id)).size!==passkeys.length)throw Error('Duplicate passkey');
 return {authority,validForMs:value.validForMs,passkeys};
}
class Denied extends Error {}
class Disabled extends Error {}
class Refused extends Error {}
const uncertain='We could not confirm the result. Refresh your saved passkeys before trying again.';

/** A mounted own-account owner. Native credentials never enter state/storage;
 * every command uses the original session binding and canonical server guards. */
export function createPasskeyManager(authority:string,changed:()=>void){
 let state:PasskeyState={phase:'loading',busy:null,passkeys:null,notice:'',needsRefresh:false};
 let version=0,ended=false,deadline=0,expiry:ReturnType<typeof setTimeout>|undefined;
 let active:AbortController|undefined,reading=false;
 const publish=(next:Partial<PasskeyState>)=>{state={...state,...next};changed();};
 const clearLease=()=>{clearTimeout(expiry);deadline=0;};
 const expire=()=>{clearLease();publish({phase:'unavailable',passkeys:null,notice:'Refresh to check your current passkeys.'});};
 const valid=()=>{if(deadline<=performance.now()){expire();return false;}return state.phase==='ready'&&!state.busy&&!state.needsRefresh;};
 const isLive=(v:number)=>!ended&&v===version;
 function invalidate(){version++;active?.abort();active=undefined;reading=false;clearLease();}
 async function request(path:string,method:string,signal:AbortSignal,body?:unknown):Promise<unknown>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)controller.abort();
  const stopped=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('Request stopped')),{once:true});if(controller.signal.aborted)reject(Error('Request stopped'));});
  timer=setTimeout(()=>controller.abort(),10000);
  try{return await Promise.race([stopped,(async()=>{
   const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-Nevora-Passkey-Authority':authority},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(controller.signal.aborted){await response.body?.cancel().catch(()=>{});throw Error('Late reply');}
   if(response.status===401||response.status===403){await response.body?.cancel();throw new Denied();}
   if(response.status===204&&method==='DELETE')return null;
   const value:unknown=await response.json();
   if(!response.ok){if(record(value)&&value.error==='not_supported')throw new Disabled();throw new Refused();}
   return value;
  })()]);}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
 }
 function failure(error:unknown){clearLease();publish({phase:error instanceof Denied?'denied':error instanceof Disabled?'disabled':'unavailable',passkeys:null,busy:null});}
 async function read(v:number,signal:AbortSignal):Promise<boolean>{
  clearLease();publish({phase:'loading',passkeys:null});const started=performance.now();
  try{
   const result=parsePasskeySnapshot(await request('/api/auth/passkeys','GET',signal),authority);
   if(!isLive(v))return false;
   deadline=started+result.validForMs;const remaining=deadline-performance.now();
   if(remaining<=0){expire();return false;}
   publish({phase:'ready',passkeys:result.passkeys,needsRefresh:false});expiry=setTimeout(expire,remaining);return true;
  }catch(error){if(isLive(v))failure(error);return false;}
 }
 async function refresh(){
  if(ended||state.busy||reading||state.phase==='denied'||state.phase==='disabled')return;
  invalidate();reading=true;const v=version,controller=active=new AbortController();
  await read(v,controller.signal);if(isLive(v))reading=false;
 }
 async function afterMutation(v:number,signal:AbortSignal,check:(keys:Passkey[])=>boolean,notice:string){
  const current=await read(v,signal);if(!isLive(v))return;
  if(current)publish({notice:check(state.passkeys??[])?notice:uncertain,busy:null});
  else if(state.phase!=='denied'&&state.phase!=='disabled')publish({notice:uncertain,needsRefresh:true,busy:null});
 }
 async function add(){
  if(ended||!valid())return;
  const v=version,controller=active=new AbortController();publish({busy:'options',notice:''});let sent=false;
  try{
   const options=await request('/api/auth/passkey/register/options','POST',controller.signal,{});
   if(!isLive(v))return;if(deadline<=performance.now()){expire();publish({busy:null});return;}
   if(!record(options))throw Error('Invalid options');publish({busy:'device'});
   // Blur from an OS credential sheet is expected. Explicit cancellation,
   // navigation, offline and signout still abort/fence this single ceremony.
   let nativeTimer:ReturnType<typeof setTimeout>|undefined;
   const credential=await Promise.race([
    navigator.credentials.create({publicKey:creationOptions(options),signal:controller.signal}),
    new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});nativeTimer=setTimeout(()=>{controller.abort();reject(new DOMException('Cancelled','AbortError'));},300000);}),
   ]).finally(()=>clearTimeout(nativeTimer));
   if(!isLive(v))return;
   if(!credential){publish({busy:null});await read(v,controller.signal);if(isLive(v))publish({notice:'Setup cancelled. No passkey was added to your account.'});return;}
   publish({busy:'verifying'});
   if(!await read(v,controller.signal)||!isLive(v))return;
   if(deadline<=performance.now()){expire();publish({busy:null});return;}
   sent=true;
   const receipt=await request('/api/auth/passkey/register/verify','POST',controller.signal,{response:credentialJSON(credential as PublicKeyCredential),name:deviceName()});
   if(!isLive(v))return;
   if(!record(receipt)||!exact(receipt,['passkey']))throw Error('Invalid receipt');const key=parseKey(receipt.passkey);
   await afterMutation(v,controller.signal,keys=>keys.some(saved=>saved.id===key.id),'Passkey added. You can use it the next time you sign in.');
  }catch(error){
   if(!isLive(v))return;
   if(error instanceof Denied||error instanceof Disabled){failure(error);return;}
   if(sent){clearLease();publish({phase:'unavailable',passkeys:null,busy:null,needsRefresh:true,notice:uncertain});return;}
   publish({busy:null});await read(v,controller.signal.aborted?(active=new AbortController()).signal:controller.signal);
   if(isLive(v))publish({notice:error instanceof DOMException&&['AbortError','NotAllowedError'].includes(error.name)?'Setup cancelled. No passkey was added to your account.':'Setup did not finish. Check your connection and try again.'});
  }finally{if(isLive(v)&&state.busy)publish({busy:null});}
 }
 async function remove(id:string){
  if(ended||!valid()||!state.passkeys?.some(key=>key.id===id))return;
  const v=version,controller=active=new AbortController();publish({busy:'removing',notice:''});
  try{
   await request('/api/auth/passkeys/'+encodeURIComponent(id),'DELETE',controller.signal);
   if(isLive(v))await afterMutation(v,controller.signal,keys=>!keys.some(key=>key.id===id),'Passkey removed.');
  }catch(error){if(isLive(v)){if(error instanceof Denied||error instanceof Disabled)failure(error);else{clearLease();publish({phase:'unavailable',passkeys:null,busy:null,needsRefresh:true,notice:uncertain});}}}
  finally{if(isLive(v)&&state.busy)publish({busy:null});}
 }
 function pause(expectedNativeBlur=false){
  if(ended)return;
  if(expectedNativeBlur&&state.busy==='device'){clearLease();publish({phase:'paused',passkeys:null});return;}
  const unknown=state.busy==='verifying'||state.busy==='removing';invalidate();publish({phase:'paused',passkeys:null,busy:null,needsRefresh:state.needsRefresh||unknown,notice:unknown?uncertain:state.notice});
 }
 async function resume(){if(!ended&&state.busy!=='device')await refresh();}
 function cancel(){if(state.busy!=='device'&&state.busy!=='options')return;pause();publish({notice:'Setup cancelled. No passkey was added to your account.'});void refresh();}
 function end(){if(ended)return;ended=true;invalidate();publish({phase:'ended',passkeys:null,busy:null,notice:'',needsRefresh:false});}
 return {get state(){return state;},refresh,add,remove,pause,resume,cancel,end};
}
