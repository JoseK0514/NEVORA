import {EventEmitter} from 'node:events';
import {runInNewContext} from 'node:vm';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
const {observeNotificationReadWitness}=await import(resolve('scripts/notification-read-witness.mjs'));
async function fixture(){
 let binding:(...args:unknown[])=>unknown=()=>{},script:()=>void=()=>{};
 const violations:unknown[]=[],attempts:unknown[][]=[],calls:unknown[]=[],frame={},page=Object.assign(new EventEmitter(),{mainFrame:()=>frame});
 const context=Object.assign(new EventEmitter(),{exposeBinding:async(_name:string,fn:typeof binding)=>{binding=fn;},addInitScript:async(fn:typeof script)=>{script=fn;}});
 const witness=await observeNotificationReadWitness(context,(p:unknown)=>violations.push(p));context.emit('page',page);
 const sandbox={URL,Request,Headers,AbortSignal,AbortController,queueMicrotask,location:{href:'http://fictional.invalid/app',origin:'http://fictional.invalid'},fetch:async(input:unknown,options:unknown)=>{calls.push({input,options});return {status:200};},__nevoraQaNotificationAttempt:(...args:unknown[])=>{attempts.push(args);return Promise.resolve(binding({page,frame},...args));}};
 // Node's Request does not resolve relative URLs as the browser does.
 runInNewContext('('+script.toString()+')()',sandbox);
 return {witness,page,frame,violations,attempts,calls,run:(source:string)=>runInNewContext(source,sandbox),binding};
}
it('acknowledges only static metadata and fixes native GET semantics before dispatch',async()=>{
 const f=await fixture();await f.run("fetch('http://fictional.invalid/api/notifications',{method:'GET',headers:{Authorization:'PRIVATE_SENTINEL'}})");
 expect(f.witness.snapshot(f.page)).toEqual({verified:true,attempts:1,unproved:0});expect(f.calls).toHaveLength(1);expect(f.violations).toEqual([]);
 expect(JSON.stringify(f.attempts)).not.toMatch(/PRIVATE|http|fictional|Authorization/);
 expect((f.calls[0] as {input:Request}).input.method).toBe('GET');
});
it.each([
 "{method:'POST'}","{method:'GET',body:'PRIVATE_BODY'}","{get method(){return 'POST';}}","Object.create({method:'POST'})",
 "{method:'GET',headers:new Headers()}","{method:'GET',signal:{}}",
])('unsupported notification options are fatal before native execution: %s',async options=>{
 const f=await fixture();try{await f.run("fetch('http://fictional.invalid/api/notifications',"+options+")");}catch{/* Native conversion may reject unsupported input. */}
 expect(f.violations).toHaveLength(1);expect(f.witness.snapshot(f.page).verified).toBe(false);expect(f.attempts[1]?.[0]).toBe('unproved');
});
it('a Proxy cannot report descriptor GET while supplying native POST',async()=>{
 const f=await fixture();await f.run("fetch('http://fictional.invalid/api/notifications',new Proxy({method:'GET'},{get(target,key){return key==='method'?'POST':target[key];}}))");
 expect(f.violations).toHaveLength(1);expect(f.witness.snapshot(f.page).verified).toBe(false);
 expect((f.calls[0] as {input:Request}).input.method).toBe('POST');
});
it('mutation while awaiting acknowledgement is fatal and cannot change the captured native request',async()=>{
 const f=await fixture();await f.run("(()=>{const options={method:'GET'};queueMicrotask(()=>options.method='POST');return fetch('http://fictional.invalid/api/notifications',options);})()");
 expect(f.violations).toHaveLength(1);expect(f.witness.snapshot(f.page).verified).toBe(false);expect((f.calls[0] as {input:Request}).input.method).toBe('GET');
});
it('a non-GET taints the document even after another proven GET',async()=>{
 const f=await fixture();await f.run("fetch('http://fictional.invalid/api/notifications')");await f.run("fetch('http://fictional.invalid/api/notifications',{method:'POST'})");await f.run("fetch('http://fictional.invalid/api/notifications')");
 expect(f.witness.snapshot(f.page)).toEqual({verified:false,attempts:2,unproved:1});
});
it('a new document request cannot reuse an earlier completed GET witness',async()=>{
 const f=await fixture();await f.run("fetch('http://fictional.invalid/api/notifications')");f.page.emit('request',{isNavigationRequest:()=>true,frame:()=>f.frame});
 expect(f.witness.snapshot(f.page)).toEqual({verified:false,attempts:0,unproved:0});await f.run("fetch('http://fictional.invalid/api/notifications')");expect(f.witness.snapshot(f.page).verified).toBe(true);
});
it('subframes and stale document tokens cannot establish evidence',async()=>{
 const f=await fixture();f.binding({page:f.page,frame:{}},'notification-get','stale');f.binding({page:f.page,frame:f.frame},'notification-get','stale');expect(f.violations).toHaveLength(2);expect(f.witness.snapshot(f.page).verified).toBe(false);
});
it('known unrelated fetches bypass notification instrumentation and preserve native arguments',async()=>{
 const f=await fixture();await f.run("fetch('http://fictional.invalid/api/employee/home',{method:'POST'})");expect(f.violations).toHaveLength(0);expect(f.calls).toHaveLength(1);expect(f.witness.snapshot(f.page).verified).toBe(false);expect(f.attempts).toHaveLength(1);
});
it('unknown request representations cannot establish GET evidence',async()=>{
 const f=await fixture();await f.run("fetch(new Request('http://fictional.invalid/api/notifications'))");expect(f.violations).toHaveLength(1);expect(f.witness.snapshot(f.page).verified).toBe(false);
});
