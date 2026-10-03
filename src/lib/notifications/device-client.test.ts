import { expect, it, vi } from 'vitest';
import { DeviceController, type DeviceRuntime, sendOwnerMessage, bounded } from './device-client';
const status={supported:true,enabled:false,configurationAvailable:true,testAllowed:false,dismissalScope:'scope',vapidPublicKey:'public'};
function fixture(overrides: Partial<DeviceRuntime>={}) {
 let permission: NotificationPermission='default';
 const runtime:DeviceRuntime={ capabilities:{secure:true,serviceWorker:true,push:true,notifications:true,requiresStandalone:false,installPrompt:false}, standalone:false,
 permission:()=>permission, requestPermission:()=>{permission='granted';return Promise.resolve(permission);},
 api:async operation=>operation==='subscribe'?{...status,enabled:true,ownershipGeneration:'new-generation'}:status,
 beginOwnershipChange:()=>{},withEnrollment:action=>action(),cleanupFence:current=>current,prepare:async()=>{}, hasSubscription:async()=>true, subscribe:async()=>({endpoint:'fictional'}), own:async()=>true,suppress:async()=>{},unsubscribe:async()=>{},
 readOwner:()=>undefined,writeOwner:()=>{},readDismissal:()=>false,saveDismissal:()=>true,...overrides};
 return {runtime,controller:new DeviceController(runtime,()=>{})};
}
it('permission_is_requested_only_from_enable_gesture and before any awaited work',async()=>{
 const order:string[]=[];let permission:NotificationPermission='default';const request=vi.fn(()=>{order.push('permission');permission='granted';return Promise.resolve(permission);});
 const {controller}=fixture({permission:()=>permission,requestPermission:request,subscribe:async()=>{order.push('subscribe');return {};}});
 await controller.start();expect(request).not.toHaveBeenCalled();
 const result=controller.enable();expect(order).toEqual(['permission']);await result;
 expect(order).toEqual(['permission','subscribe']);expect(controller.snapshot.state).toBe('enabled');
});
it('denial_is_not_reprompted and loading cannot enable',async()=>{
 const request=vi.fn();const {controller}=fixture({permission:()=> 'denied',requestPermission:request});
 await controller.enable();await controller.start();await controller.enable();expect(request).not.toHaveBeenCalled();expect(controller.snapshot.state).toBe('denied');
});
it('server enrollment without active matching acknowledgment never enables',async()=>{
 const {controller}=fixture({own:async()=>false});await controller.start();await controller.enable();expect(controller.snapshot.state).toBe('error');
});
it('stale enrollment completion after dispose cannot SET ownership',async()=>{
 let finish!:(value:object)=>void;const own=vi.fn(async()=>true),suppress=vi.fn(async()=>{});
 const {controller}=fixture({api:async operation=>operation==='subscribe'?await new Promise(resolve=>{finish=resolve;}):status,own,suppress});
 await controller.start();const operation=controller.enable();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 controller.dispose();finish({...status,enabled:true,ownershipGeneration:'old-generation'});await operation;
 expect(own).not.toHaveBeenCalled();expect(suppress).toHaveBeenCalledWith('old-generation');
});
it('stale status never restores owner after signout/dispose',async()=>{
 let finish!:(value:object)=>void;const own=vi.fn(async()=>true);
 const {controller}=fixture({permission:()=> 'granted',api:()=>new Promise(resolve=>{finish=resolve;}),own});
 const operation=controller.start();controller.dispose();finish({...status,enabled:true,ownershipGeneration:'old'});await operation;expect(own).not.toHaveBeenCalled();
});
it('turn off reports pending server cleanup, suppresses first and never resets recovery',async()=>{
 const order:string[]=[];const {controller}=fixture({permission:()=> 'granted',api:async op=>op==='unsubscribe'?{status:'pending'}:{...status,enabled:true,ownershipGeneration:'old'},suppress:async()=>{order.push('suppress');},unsubscribe:async()=>{order.push('unsubscribe');}});
 await controller.start();await controller.turnOff();expect(order).toEqual(['suppress','unsubscribe']);expect(controller.snapshot.state).toBe('error');expect(controller.snapshot.message).toContain('cleanup');
});
it('Not Now persistence failure is explicit and does not pretend durable dismissal',async()=>{
 const {controller}=fixture({saveDismissal:()=>false});await controller.start();controller.dismiss();expect(controller.snapshot.message).toContain('remember');
});
it('test endpoint is only called for enabled authorized device and queued copy is honest',async()=>{
 const api=vi.fn(async(op:string)=>op==='test'?{status:'queued'}:{...status,enabled:true,testAllowed:true,ownershipGeneration:'old'});
 const {controller}=fixture({permission:()=> 'granted',api});await controller.test();expect(api).not.toHaveBeenCalled();await controller.start();await controller.test();expect(controller.snapshot.message).toContain('does not confirm receipt');expect(controller.snapshot.server.testAllowed).toBe(false);
});
it('bounded never-resolving operations terminate',async()=>{
 vi.useFakeTimers();const promise=bounded(new Promise(()=>{}),10);const assertion=expect(promise).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(11);await assertion;vi.useRealTimers();
});
it('worker acknowledgment must have matching type, version, generation and active status',async()=>{
 const worker={postMessage:(_msg:unknown,ports:Transferable[])=>{(ports[0] as MessagePort).postMessage({version:1,type:'OWNER_STATE',generation:'different',status:'active'});}};
 expect(await sendOwnerMessage(worker as ServiceWorker,'SET_OWNER','generation')).toBe(false);
});

it('permission revoked between preload and click never prompts again',async()=>{
 let permission:NotificationPermission='default';const request=vi.fn(async()=> 'granted' as const);
 const {controller}=fixture({permission:()=>permission,requestPermission:request});await controller.start();permission='denied';await controller.enable();expect(request).not.toHaveBeenCalled();expect(controller.snapshot.state).toBe('denied');
});
it('a dismissed controller can reopen manually without deleting persistent Not Now',async()=>{
 const save=vi.fn(()=>true);const {controller}=fixture({saveDismissal:save});await controller.start();controller.dismiss();expect(controller.snapshot.state).toBe('dismissed');controller.reopen();expect(controller.snapshot.state).toBe('ready');expect(save).toHaveBeenCalledOnce();
});
it('signout broadcasts suppression to both prepared active and waiting workers even without local storage',async()=>{
 const {browserRuntime,cleanupForSignout,observeController}=await import('./device-client');
 const posted:string[]=[];
 const makeWorker=(name:string)=>({postMessage:(message:{type:string;generation:string},ports:Transferable[])=>{posted.push(`${name}:${message.type}:${message.generation}`);(ports[0] as MessagePort).postMessage({version:1,type:'OWNER_STATE',generation:message.generation,status:message.type==='SUPPRESS_OWNER'?'suppressed':'active'});}});
 const registration={active:makeWorker('active'),waiting:makeWorker('waiting'),getNotifications:async()=>[],pushManager:{getSubscription:async()=>null}};
 vi.stubGlobal('window',{isSecureContext:true,matchMedia:()=>({matches:false}),addEventListener:()=>{},removeEventListener:()=>{}});
 vi.stubGlobal('navigator',{userAgent:'fictional',platform:'fictional',maxTouchPoints:0,locks:browserLocksFixture(),serviceWorker:{register:async()=>registration,getRegistration:async()=>registration}});
 vi.stubGlobal('location',{pathname:'/app'});vi.stubGlobal('localStorage',{getItem:()=>{throw Error('storage unavailable');},setItem:()=>{throw Error('storage unavailable');}});
 try {
  const runtime=browserRuntime();await runtime.prepare();
  const {controller}=fixture({permission:()=> 'granted',api:async()=>({...status,enabled:true,ownershipGeneration:'memory-generation'})});await controller.start();const stop=observeController(controller);
  cleanupForSignout();expect(posted).toContain('active:SUPPRESS_OWNER:memory-generation');expect(posted).toContain('waiting:SUPPRESS_OWNER:memory-generation');stop();
 } finally {vi.unstubAllGlobals();}
});
it('missing browser subscription is revoked even when OS permission remains granted',async()=>{
 const own=vi.fn(async()=>true),suppress=vi.fn(async()=>{});
 const {controller}=fixture({permission:()=> 'granted',hasSubscription:async()=>false,own,suppress,api:async()=>({...status,enabled:true,ownershipGeneration:'old'})});
 await controller.start();expect(controller.snapshot.state).toBe('revoked');expect(own).not.toHaveBeenCalled();expect(suppress).toHaveBeenCalledWith('old');
});

function deferred<T>() {
 let resolve!: (value:T)=>void;
 const promise=new Promise<T>(done=>{resolve=done;});
 return {promise,resolve};
}
async function drainBrowserTasks() { for(let n=0;n<6;n++) await new Promise<void>(resolve=>setImmediate(resolve)); }
function browserLocksFixture() {
 let tail=Promise.resolve();
 const request=vi.fn((_name:string,options:{signal?:AbortSignal},action:()=>Promise<unknown>)=>{
  const ready=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});
  return new Promise<unknown>((resolve,reject)=>{
   let acquired=false;
   const abort=()=>{if(!acquired)reject(new DOMException('Aborted','AbortError'));};
   options.signal?.addEventListener('abort',abort,{once:true});
   void ready.then(async()=>{
    if(options.signal?.aborted){release();return;}
    acquired=true;options.signal?.removeEventListener('abort',abort);
    try{resolve(await action());}catch(error){reject(error);}finally{release();}
   });
  });
 });
 return {request};
}
async function cleanupBrowserFixture(storageAvailable=true) {
 const {browserRuntime,cleanupForSignout,observeController}=await import('./device-client');
 const posted:{type:string;generation:string}[]=[];
 const values=new Map<string,string>([['fuel-portal-owner-generation','old-generation']]);
 const storage={read:storageAvailable,write:storageAvailable};const locks=browserLocksFixture();
 const subscription={unsubscribe:vi.fn(async()=>true),toJSON:()=>({endpoint:'fictional-shared'})};
 const active={postMessage:(message:{type:string;generation:string},ports:Transferable[])=>{
  posted.push(message);(ports[0] as MessagePort).postMessage({version:1,type:'OWNER_STATE',generation:message.generation,status:message.type==='SUPPRESS_OWNER'?'suppressed':'active'});
 }};
 let browserSubscription:typeof subscription|null=subscription;
 const registration={active,waiting:null,getNotifications:async()=>[],pushManager:{getSubscription:vi.fn(async()=>browserSubscription),subscribe:vi.fn(async()=>({...subscription,toJSON:()=>({endpoint:'fictional-fresh'})}))}};
 const discovery=vi.fn(async()=>registration);
 vi.stubGlobal('window',{isSecureContext:true,matchMedia:()=>({matches:false}),addEventListener:()=>{},removeEventListener:()=>{}});
 vi.stubGlobal('navigator',{userAgent:'fictional',platform:'fictional',maxTouchPoints:0,locks,serviceWorker:{register:async()=>registration,getRegistration:discovery}});
 vi.stubGlobal('location',{pathname:'/app'});
 vi.stubGlobal('localStorage',{getItem:(key:string)=>{if(!storage.read)throw Error('storage unavailable');return values.get(key)??null;},setItem:(key:string,value:string)=>{if(!storage.write)throw new DOMException('Quota exceeded','QuotaExceededError');values.set(key,value);}});
 const runtime=browserRuntime();await runtime.prepare();if(storageAvailable)runtime.beginOwnershipChange();
 return {browserRuntime,cleanupForSignout,observeController,posted,values,storage,locks,subscription,registration,discovery,runtime,setSubscription:(value:typeof subscription|null)=>{browserSubscription=value;}};
}
it.each([true,false])('old logout discovery cannot unsubscribe a new owner with storage=%s, including reused subscription',async storageAvailable=>{
 const b=await cleanupBrowserFixture(storageAvailable);
 const discovery=deferred<typeof b.registration>();b.discovery.mockImplementationOnce(()=>discovery.promise);
 const {controller}=fixture({permission:()=> 'granted',api:async()=>({...status,enabled:true,ownershipGeneration:'old-generation'})});await controller.start();const stop=b.observeController(controller);
 try {
  expect(b.cleanupForSignout()).toBeUndefined();
  const fresh=b.browserRuntime();await fresh.prepare();if(storageAvailable)fresh.writeOwner('new-generation');else expect(()=>fresh.writeOwner('new-generation')).toThrow('Ownership coordination write failed');
  discovery.resolve(b.registration);await drainBrowserTasks();
  expect(b.subscription.unsubscribe).not.toHaveBeenCalled();
  expect(b.posted.filter(m=>m.type==='SUPPRESS_OWNER').every(m=>m.generation==='old-generation')).toBe(true);
 } finally {stop();vi.unstubAllGlobals();}
});
it('old logout subscription read cannot unsubscribe a replacement subscription after ownership changes',async()=>{
 const b=await cleanupBrowserFixture();const read=deferred<typeof b.subscription>();b.registration.pushManager.getSubscription.mockImplementationOnce(()=>read.promise);
 const {controller}=fixture({permission:()=> 'granted',api:async()=>({...status,enabled:true,ownershipGeneration:'old-generation'})});await controller.start();const stop=b.observeController(controller);
 try {
  b.cleanupForSignout();await vi.waitFor(()=>expect(b.registration.pushManager.getSubscription).toHaveBeenCalled());
  const fresh=b.browserRuntime();fresh.writeOwner('new-generation');
  const replacement={...b.subscription,unsubscribe:vi.fn(async()=>true)};read.resolve(replacement);await drainBrowserTasks();
  expect(replacement.unsubscribe).not.toHaveBeenCalled();
 } finally {stop();vi.unstubAllGlobals();}
});
it('delayed Turn Off suppression cannot enter unsubscribe after its controller is disposed',async()=>{
 const suppression=deferred<void>();const unsubscribe=vi.fn(async()=>{});
 const {controller}=fixture({permission:()=> 'granted',api:async op=>op==='unsubscribe'?{status:'complete'}:{...status,enabled:true,ownershipGeneration:'old-generation'},suppress:()=>suppression.promise,unsubscribe});
 await controller.start();const pending=controller.turnOff();controller.dispose();suppression.resolve();await pending;
 expect(unsubscribe).not.toHaveBeenCalled();
});
it.each([true,false])('delayed Turn Off preserves a newly owned reused subscription with storage=%s',async storageAvailable=>{
 const b=await cleanupBrowserFixture(storageAvailable);const suppression=deferred<void>();
 const {controller}=fixture({...b.runtime,permission:()=> 'granted',api:async op=>op==='unsubscribe'?{status:'complete'}:{...status,enabled:true,ownershipGeneration:'old-generation'},suppress:()=>suppression.promise});
 try {
  await controller.start();const pending=controller.turnOff();
  const fresh=b.browserRuntime();await fresh.prepare();if(storageAvailable)fresh.writeOwner('new-generation');else expect(()=>fresh.writeOwner('new-generation')).toThrow('Ownership coordination write failed');
  suppression.resolve();await pending;
  expect(b.subscription.unsubscribe).not.toHaveBeenCalled();
  expect(b.posted).not.toContainEqual({version:1,type:'SUPPRESS_OWNER',generation:'new-generation'});
 } finally {controller.dispose();vi.unstubAllGlobals();}
});
it.each(['fuel-portal-owner-generation','fuel-portal-account-fence'])('Turn Off rechecks cross-tab %s after reading the subscription and retains healthy unsubscribe',async key=>{
 const b=await cleanupBrowserFixture();
 const {controller}=fixture({...b.runtime,permission:()=> 'granted',api:async op=>op==='unsubscribe'?{status:'complete'}:{...status,enabled:true,ownershipGeneration:'old-generation'}});
 try {
  await controller.start();const read=deferred<typeof b.subscription>();b.registration.pushManager.getSubscription.mockImplementationOnce(()=>read.promise);
  const before=b.registration.pushManager.getSubscription.mock.calls.length;const pending=controller.turnOff();await vi.waitFor(()=>expect(b.registration.pushManager.getSubscription.mock.calls.length).toBeGreaterThan(before));
  b.values.set(key,'other-tab-transition');read.resolve(b.subscription);await pending;
  expect(b.subscription.unsubscribe).not.toHaveBeenCalled();
  const fresh=b.browserRuntime();await fresh.prepare();fresh.writeOwner('current-generation');
  const healthy=fixture({...fresh,permission:()=> 'granted',api:async op=>op==='unsubscribe'?{status:'complete'}:{...status,enabled:true,ownershipGeneration:'current-generation'}}).controller;
  await healthy.start();await healthy.turnOff();expect(b.subscription.unsubscribe).toHaveBeenCalledOnce();healthy.dispose();
 } finally {controller.dispose();vi.unstubAllGlobals();}
});
it.each([{version:2},{type:'WRONG'},{status:'suppressed'},{status:'unavailable'}])('rejects mismatched worker ACK %j',async mismatch=>{
 const worker={postMessage:(_msg:unknown,ports:Transferable[])=>{(ports[0] as MessagePort).postMessage({version:1,type:'OWNER_STATE',generation:'generation',status:'active',...mismatch});}};
 expect(await sendOwnerMessage(worker as ServiceWorker,'SET_OWNER','generation')).toBe(false);
});
it('active-worker replacement while acknowledgment is delayed never establishes ownership',async()=>{
 const b=await cleanupBrowserFixture();const ack=deferred<MessagePort>();
 b.registration.active={postMessage:(_message,ports)=>{ack.resolve(ports[0] as MessagePort);}};
 try {
  const pending=b.runtime.own('generation');const port=await ack.promise;
  b.registration.active={postMessage:()=>{}};
  port.postMessage({version:1,type:'OWNER_STATE',generation:'generation',status:'active'});
  expect(await pending).toBe(false);
 } finally {vi.unstubAllGlobals();}
});

it('new enrollment invalidates cleanup before awaiting the explicit permission result',async()=>{
 const b=await cleanupBrowserFixture();const permission=deferred<NotificationPermission>();
 const requestPermission=vi.fn(()=>permission.promise);
 const {controller}=fixture({...b.runtime,capabilities:{...b.runtime.capabilities,push:true,notifications:true},permission:()=> 'default',requestPermission,api:async()=>status});
 try {
  await controller.start();const stillOwned=b.runtime.cleanupFence(()=>true);
  expect(stillOwned()).toBe(true);
  const enabling=controller.enable();expect(requestPermission).toHaveBeenCalledOnce();expect(stillOwned()).toBe(false);
  controller.dispose();permission.resolve('granted');await enabling;
 } finally {controller.dispose();vi.unstubAllGlobals();}
});

it.each(['logout','turn-off'])('readable stale keys plus failed writes never authorize %s unsubscribe',async operation=>{
 const b=await cleanupBrowserFixture();b.storage.write=false;
 try {
  if(operation==='logout'){
   const discovery=deferred<typeof b.registration>();b.discovery.mockImplementationOnce(()=>discovery.promise);
   b.cleanupForSignout();
   expect(()=>localStorage.setItem('fuel-portal-account-fence','fresh-account')).toThrow('Quota exceeded');
   discovery.resolve(b.registration);await drainBrowserTasks();
  }else{
   const {controller}=fixture({...b.runtime,permission:()=> 'granted',api:async op=>op==='unsubscribe'?{status:'complete'}:{...status,enabled:true,ownershipGeneration:'old-generation'}});
   await controller.start();await controller.turnOff();controller.dispose();
  }
  expect(b.subscription.unsubscribe).not.toHaveBeenCalled();
 } finally {vi.unstubAllGlobals();}
});
it('fresh enrollment cannot reuse a subscription while an old native unsubscribe is in flight',async()=>{
 const b=await cleanupBrowserFixture();const native=deferred<boolean>();
 b.subscription.unsubscribe.mockImplementationOnce(async()=>{const result=await native.promise;b.setSubscription(null);return result;});
 const cleanup=b.runtime.unsubscribe(b.runtime.cleanupFence(()=>true));
 await vi.waitFor(()=>expect(b.subscription.unsubscribe).toHaveBeenCalledOnce());
 const fresh=b.browserRuntime();
 const {controller}=fixture({...fresh,capabilities:{...fresh.capabilities,push:true,notifications:true},permission:()=> 'granted',api:async op=>op==='subscribe'?{...status,enabled:true,ownershipGeneration:'fresh-generation'}:status});
 await controller.start();const enabling=controller.enable();
 try {
  await drainBrowserTasks();expect(b.registration.pushManager.subscribe).not.toHaveBeenCalled();
 } finally {native.resolve(true);await cleanup;await enabling;controller.dispose();vi.unstubAllGlobals();}
 expect(b.registration.pushManager.subscribe).toHaveBeenCalledOnce();
 expect(b.subscription.unsubscribe).toHaveBeenCalledOnce();
});
it('without browser-wide locks destructive cleanup is skipped and enrollment fails locally',async()=>{
 const b=await cleanupBrowserFixture();Object.defineProperty(navigator,'locks',{value:undefined,configurable:true});
 try {
  await b.runtime.unsubscribe(b.runtime.cleanupFence(()=>true));expect(b.subscription.unsubscribe).not.toHaveBeenCalled();
  const {controller}=fixture({...b.runtime,capabilities:{...b.runtime.capabilities,push:true,notifications:true},permission:()=> 'default',api:async()=>status});
  await controller.start();expect(controller.snapshot.state).toBe('error');controller.dispose();
 }
 finally {vi.unstubAllGlobals();}
});
it('write-failed new ownership cannot request permission or mutate the browser subscription',async()=>{
 const b=await cleanupBrowserFixture();const requestPermission=vi.fn(async()=> 'granted' as const);
 const {controller}=fixture({...b.runtime,capabilities:{...b.runtime.capabilities,push:true,notifications:true},permission:()=> 'default',requestPermission,api:async()=>status});
 try {
  await controller.start();b.storage.write=false;await controller.enable();
  expect(controller.snapshot.state).toBe('error');expect(requestPermission).not.toHaveBeenCalled();expect(b.registration.pushManager.subscribe).not.toHaveBeenCalled();
 }finally{controller.dispose();vi.unstubAllGlobals();}
});

it('hanging native unsubscribe keeps exclusion after the UI wait, while server detach and native logout stay independent',async()=>{
 const b=await cleanupBrowserFixture();const native=deferred<boolean>();b.subscription.unsubscribe.mockImplementationOnce(()=>native.promise);
 const api=vi.fn(async(op:string)=>op==='unsubscribe'?{status:'complete'}:{...status,enabled:true,ownershipGeneration:'old-generation'});
 const {controller}=fixture({...b.runtime,permission:()=> 'granted',api});await controller.start();
 const off=controller.turnOff();await vi.waitFor(()=>expect(b.subscription.unsubscribe).toHaveBeenCalledOnce());
 expect(api).toHaveBeenCalledWith('unsubscribe',{ownershipGeneration:'old-generation'});
 const fresh=b.browserRuntime();const next=fixture({...fresh,capabilities:{...fresh.capabilities,push:true,notifications:true},permission:()=> 'granted',api:async()=>status}).controller;
 try {
  await next.start();const enabling=next.enable();await off;await enabling;
  expect(next.snapshot.state).toBe('error');expect(b.registration.pushManager.subscribe).not.toHaveBeenCalled();
  expect(b.values.get('fuel-portal-subscription-operation')).toBeTruthy();
  native.resolve(true);await drainBrowserTasks();expect(b.registration.pushManager.subscribe).not.toHaveBeenCalled();
  expect(b.values.get('fuel-portal-subscription-operation')).toBe('');
 }finally{native.resolve(true);controller.dispose();next.dispose();vi.unstubAllGlobals();}
},10000);
it('an interrupted native-operation marker prevents fresh enrollment even when browser locks are available again',async()=>{
 const b=await cleanupBrowserFixture();b.values.set('fuel-portal-subscription-operation','opaque-interrupted-operation');
 const fresh=b.browserRuntime();const {controller}=fixture({...fresh,capabilities:{...fresh.capabilities,push:true,notifications:true},permission:()=> 'granted',api:async op=>op==='subscribe'?{...status,enabled:true,ownershipGeneration:'fresh-generation'}:status});
 try {await controller.start();await controller.enable();expect(controller.snapshot.state).toBe('error');expect(b.registration.pushManager.subscribe).not.toHaveBeenCalled();expect(b.values.get('fuel-portal-subscription-operation')).toBe('opaque-interrupted-operation');}
 finally{controller.dispose();vi.unstubAllGlobals();}
});
it('unknown native completion cannot restore enabled ownership from server status alone',async()=>{
 const b=await cleanupBrowserFixture();b.values.set('fuel-portal-subscription-operation','opaque-interrupted-operation');
 const {controller}=fixture({...b.runtime,capabilities:{...b.runtime.capabilities,push:true,notifications:true},permission:()=> 'granted',api:async()=>({...status,enabled:true,ownershipGeneration:'old-generation'})});
 try {await controller.start();expect(controller.snapshot.state).toBe('error');expect(b.posted.some(message=>message.type==='SET_OWNER')).toBe(false);}
 finally{controller.dispose();vi.unstubAllGlobals();}
});

it('failed enrollment guidance does not promise Turn Off resolves an unknown native operation', async () => {
 const {controller}=fixture({withEnrollment:async()=>{throw Error('Unresolved operation');}});
 await controller.start();await controller.enable();
 expect(controller.snapshot.message).toContain('Turn Off stops server delivery');
 expect(controller.snapshot.message).toContain('browser notification setup may need recovery');
});

it('reopening device settings retains actionable error and recovery guidance', async () => {
 const {controller}=fixture({withEnrollment:async()=>{throw Error('Unresolved operation');}});
 await controller.start();await controller.enable();const message=controller.snapshot.message;
 controller.reopen();expect(controller.snapshot.message).toBe(message);
});

it.each(['permission', 'subscription'])('passive reconciliation suppresses a returned enabled device after %s loss', async loss => {
  let permission: NotificationPermission = 'granted';
  let subscribed = true;
  const suppress = vi.fn(async () => {});
  const requestPermission = vi.fn(async () => 'granted' as const);
  const { controller } = fixture({ permission: () => permission, hasSubscription: async () => subscribed,
    api: async () => ({ ...status, enabled: true, ownershipGeneration: 'old' }), suppress, requestPermission });
  await controller.start();
  expect(controller.snapshot.state).toBe('enabled');
  if (loss === 'permission') permission = 'denied'; else subscribed = false;
  await controller.reconcile();
  expect(controller.snapshot.state).toBe(loss === 'permission' ? 'denied' : 'revoked');
  expect(suppress).toHaveBeenCalledWith('old');
  expect(requestPermission).not.toHaveBeenCalled();
});
it('passive checks coalesce, preserve Not Now, and cannot revive a disposed controller', async () => {
  const next = deferred<object>();
  let calls = 0;
  const { controller } = fixture({ api: async () => ++calls === 1 ? status : next.promise });
  await controller.start();
  controller.dismiss();
  const first = controller.reconcile();
  const second = controller.reconcile();
  next.resolve(status);
  await Promise.all([first, second]);
  expect(calls).toBe(2);
  expect(controller.snapshot.state).toBe('dismissed');
  controller.dispose();
  await controller.reconcile();
  await controller.start();
  expect(calls).toBe(2);
});
it('reopening checks the native subscription while retaining the explicitly opened dismissal state', async () => {
  let subscribed = true;
  const { controller } = fixture({ permission: () => 'granted', hasSubscription: async () => subscribed,
    api: async () => ({ ...status, enabled: true, ownershipGeneration: 'old' }) });
  await controller.start(); subscribed = false;
  await controller.reopen();
  expect(controller.snapshot.state).toBe('revoked');
});
it('passive checks do not replace an active enable epoch', async () => {
  const native = deferred<object>();
  const { controller, runtime } = fixture({ subscribe: () => native.promise });
  const api = vi.spyOn(runtime, 'api');
  await controller.start();
  const enabling = controller.enable();
  await drainBrowserTasks();
  await controller.reconcile();
  expect(api).toHaveBeenCalledTimes(1);
  native.resolve({}); await enabling;
  expect(controller.snapshot.state).toBe('enabled');
});
it('passive checks skip native Turn Off even after its UI wait expires', async () => {
  vi.useFakeTimers();
  try {
    const native = deferred<void>();
    const { controller, runtime } = fixture({ permission: () => 'granted', unsubscribe: () => native.promise,
      api: async op => op === 'unsubscribe' ? { status: 'complete' } : { ...status, enabled: true, ownershipGeneration: 'old' } });
    const api = vi.spyOn(runtime, 'api');
    await controller.start();
    const off = controller.turnOff();
    await vi.advanceTimersByTimeAsync(2501); await off;
    await controller.reconcile();
    expect(api).toHaveBeenCalledTimes(2);
    expect(controller.snapshot.server.enabled).toBe(false);
    native.resolve(); await vi.advanceTimersByTimeAsync(0);
  } finally { vi.useRealTimers(); }
});
it('a hung passive status check is bounded and its late result cannot restore ownership', async () => {
  vi.useFakeTimers();
  try {
    const late = deferred<object>(); let calls = 0;
    const own = vi.fn(async () => true);
    const { controller } = fixture({ permission: () => 'granted', own,
      api: async () => ++calls === 1 ? status : late.promise });
    await controller.start();
    const checking = controller.reconcile();
    await vi.advanceTimersByTimeAsync(20001); await checking;
    expect(controller.snapshot.state).toBe('error');
    late.resolve({ ...status, enabled: true, ownershipGeneration: 'late' });
    await vi.advanceTimersByTimeAsync(0);
    expect(own).not.toHaveBeenCalled();
    expect(controller.snapshot.state).toBe('error');
  } finally { vi.useRealTimers(); }
});
