// QA-OWN-3 regression, adapted from the Alerts QA author's preserved probe
// (docs/execution/employee-mobile-device-alerts/evidence/root/reviews/qa/ownership-replacement.test.ts.txt).
// The actual public/fuel-portal-sw.js runs in a VM; only native IDB/PushManager/MessageChannel/fetch are doubles.
// The probe asserted the unsafe outcome to prove reproduction; these tests assert the safe one.
import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {DeviceController,browserRuntime} from './device-client';
const source=readFileSync('public/fuel-portal-sw.js','utf8');
afterEach(()=>{vi.unstubAllGlobals();});
const origin='https://portal.example';const gen='generation-original';const authority='fictional-authority';
// Actual deployed worker source executes. Only native IDB/PushManager/MessageChannel
// boundaries are doubles. Shared IDB data survives worker/controller replacement.
function storage(){
 const data=new Map<string,unknown>();let failed=false;
 return {data,fail(){failed=true},recover(){failed=false},open(){
  const request:any={onupgradeneeded(){},onsuccess(){},onerror(){}};
  queueMicrotask(()=>{if(failed){request.onerror();return;}request.result={createObjectStore(){},close(){},transaction(){
   const tx:any={oncomplete(){},onerror(){},onabort(){},objectStore:()=>({get(key:string){const read:any={onsuccess(){}};queueMicrotask(()=>{read.result=structuredClone(data.get(key));read.onsuccess();queueMicrotask(()=>tx.oncomplete());});return read},put(v:unknown,key:string){data.set(key,structuredClone(v))}})};return tx;
  }};request.onupgradeneeded();request.onsuccess();});return request;
 }};
}
function worker(db:ReturnType<typeof storage>,messages:any[]){
 const handlers=new Map();const client={id:'portal',url:origin+'/app',type:'window',postMessage(){}};
 const self={location:{origin},addEventListener:(name:string,fn:any)=>handlers.set(name,fn),clients:{get:async()=>client},registration:{scope:origin+'/app',getNotifications:async()=>[]}};
 runInNewContext(source,{self,indexedDB:db,URL,Request,Response,Date,Promise,Set,console});
 return {postMessage(message:any,ports:any[]){messages.push(message);handlers.get('message')({source:client,data:message,ports,waitUntil:(p:Promise<unknown>)=>{void p}})}};
}
function fixture(){
 const db=storage(),messages:any[]=[];let active=worker(db,messages);const values=new Map<string,string>();let failLocal=false;
 const subscription={unsubscribe:vi.fn(async()=>{throw Error('native rejected')}),toJSON:()=>({endpoint:'fictional'})};
 const registration={get active(){return active},waiting:null,pushManager:{getSubscription:async()=>subscription},getNotifications:async()=>[]};
 const locks={request:async(_n:string,_o:unknown,action:()=>unknown)=>action()};
 const notification={permission:'granted',requestPermission:vi.fn()};
 vi.stubGlobal('Notification',notification);
 vi.stubGlobal('window',{isSecureContext:true,PushManager:{},Notification:notification,matchMedia:()=>({matches:false}),addEventListener(){},removeEventListener(){}});
 vi.stubGlobal('navigator',{userAgent:'fictional',platform:'fictional',maxTouchPoints:0,locks,serviceWorker:{register:async()=>registration,getRegistration:async()=>registration}});
 vi.stubGlobal('location',{pathname:'/app'});
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(failLocal)throw Error('storage unavailable');values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}});
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/status')?new Response(JSON.stringify({supported:true,enabled:true,configurationAvailable:true,testAllowed:false,ownershipGeneration:gen,vapidPublicKey:'fictional',authority,validForMs:45000}),{status:200}):new Response(JSON.stringify({error:'cleanup_pending'}),{status:503})));
 const controller=()=>new DeviceController(browserRuntime(authority),()=>{});
 return {db,messages,values,subscription,controller,replaceWorker(){active=worker(db,messages)},failLocalStorage(){failLocal=true;}};
}
const setOwner=(messages:any[])=>messages.filter(m=>m.type==='SET_OWNER'&&m.generation===gen).length;

it('QA-OWN-3: after IDB suppression, native unsubscribe and server cleanup all fail, a replacement never re-owns the generation',async()=>{
 const f=fixture();
 const first=f.controller();await first.start();expect(first.snapshot.state).toBe('enabled');
 f.db.fail();await first.turnOff();expect(first.snapshot.state).toBe('error');
 await vi.waitFor(()=>expect(f.subscription.unsubscribe).toHaveBeenCalledOnce());
 expect(f.values.get('fuel-portal-turn-off-pending')).toBe(gen);
 const ownedBefore=setOwner(f.messages);
 first.dispose();f.db.recover();f.replaceWorker();const next=f.controller();await next.start();
 // The safe outcome: cleanup resumes; nothing claims alerts are on; the worker is suppressed, not re-owned.
 expect(next.snapshot.state).not.toBe('enabled');
 expect(next.snapshot.cleanupPending).toBe(true);expect(next.snapshot.cleanupGeneration).toBe(gen);
 expect(next.snapshot.server.localOwned).not.toBe(true);
 expect(setOwner(f.messages)).toBe(ownedBefore);
 expect(f.db.data.get('state')).toEqual({current:null,suppressed:[gen],blocked:false});
 // A passive revisit (visibility/resume) still does not re-own it.
 await next.reconcile();expect(next.snapshot.state).not.toBe('enabled');expect(setOwner(f.messages)).toBe(ownedBefore);
});

it('QA-OWN-3: Retry turn off on the replacement, once confirmed, clears the remembered intent',async()=>{
 const f=fixture();
 const first=f.controller();await first.start();f.db.fail();await first.turnOff();
 await vi.waitFor(()=>expect(f.subscription.unsubscribe).toHaveBeenCalledOnce());
 first.dispose();f.db.recover();f.replaceWorker();const next=f.controller();await next.start();
 expect(next.snapshot.cleanupPending).toBe(true);
 // The server now accepts the cleanup and its fresh status confirms the generation is off.
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/status')
  ?new Response(JSON.stringify({supported:true,enabled:false,configurationAvailable:true,testAllowed:false,vapidPublicKey:'fictional',authority,validForMs:45000}),{status:200,headers:{'Content-Type':'application/json'}})
  :new Response(JSON.stringify({generation:gen,status:'complete'}),{status:200,headers:{'Content-Type':'application/json'}})));
 await next.turnOff(gen);
 expect(next.snapshot.cleanupPending).toBe(false);expect(next.snapshot.message).toBe('Notifications turned off on this device.');
 expect(f.values.has('fuel-portal-turn-off-pending')).toBe(false);
});

it('QA-OWN-3: a remembered turn-off never blocks a different generation (a fresh opt-in or another account)',async()=>{
 const f=fixture();f.values.set('fuel-portal-turn-off-pending','generation-older');
 const c=f.controller();await c.start();
 expect(c.snapshot.state).toBe('enabled');expect(c.snapshot.cleanupPending).toBe(false);
 expect(f.values.get('fuel-portal-turn-off-pending')).toBe('generation-older');
});
