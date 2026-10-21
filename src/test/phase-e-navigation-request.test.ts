import {EventEmitter} from 'node:events';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
const {interceptedInboxResponse,withActorRole}=await import(resolve('scripts/phase-e-navigation-request.mjs'));

// Controlled transport ordering: an older valid read finishes after the new
// refusal is intercepted, but before that intercepted request's own response.
it('ignores an unrelated valid 200 when asserting the intercepted refusal',async()=>{
 const responses=new EventEmitter();let handler: ((route:unknown)=>Promise<void>)|undefined;
 const request=()=>({method:()=> 'GET',headers:()=>({'x-nevora-employee-view':'notifications'})});
 const old=request(),current=request();
 const response=(req:unknown,status:number)=>({request:()=>req,status:()=>status,url:()=> 'http://localhost/api/notifications'});
 const page={route:async(_path:string,next:typeof handler)=>{handler=next;},unroute:async()=>{handler=undefined;},
  waitForResponse:(predicate:(value:unknown)=>boolean)=>new Promise(resolve=>{const accept=(value:unknown)=>{if(predicate(value)){responses.off('response',accept);resolve(value);}};responses.on('response',accept);})};
 const result=await interceptedInboxResponse(page,async()=>{
  await handler!({request:()=>current,continue:async({headers}:{headers:Record<string,string>})=>{
   responses.emit('response',response(old,200));
   await Promise.resolve();responses.emit('response',response(current,headers['x-nevora-employee-view']==='profile'?403:200));
  }});
 },(headers:Record<string,string>)=>({...headers,'x-nevora-employee-view':'profile'}));
 expect(result.status()).toBe(403);expect(result.request()).toBe(current);expect(handler).toBeUndefined();
});

it.each(['MANAGER','OWNER'])('restores the original LEAD role after a %s assertion fails',async role=>{
 let storedRole='LEAD';const query=async(_sql:string,values:string[])=>{storedRole=values[0];};
 await expect(withActorRole(query,'fictional',role,'LEAD',async()=>{
  expect(storedRole).toBe(role);throw Error('Deliberate failed read assertion');
 })).rejects.toThrow('Deliberate failed read assertion');
 expect(storedRole).toBe('LEAD');
});

it('returns the management read result and restores the role after success',async()=>{
 let storedRole='LEAD';const query=async(_sql:string,values:string[])=>{storedRole=values[0];};
 expect(await withActorRole(query,'fictional','OWNER','LEAD',async()=>storedRole)).toBe('OWNER');
 expect(storedRole).toBe('LEAD');
});
