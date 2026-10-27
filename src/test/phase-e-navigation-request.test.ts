import {EventEmitter} from 'node:events';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
const {interceptedInboxResponse,refreshInboxAndWaitForRows,withActorRole}=await import(resolve('scripts/phase-e-navigation-request.mjs'));

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

function refreshPage(view:unknown,status=200){
 let handler: ((route:unknown)=>Promise<void>)|undefined,accept:(response:unknown)=>void;
 const request={method:()=> 'GET',headers:()=>({'x-nevora-employee-view':'notifications'})};
 const response={request:()=>request,status:()=>status,json:async()=>view};
 let release:()=>void,waiting=false,disposed=false;
 const rendered=new Promise<void>(resolve=>{release=resolve;});
 const page={route:async(_path:string,next:typeof handler)=>{handler=next;},unroute:async()=>{handler=undefined;},
  waitForResponse:(predicate:(value:unknown)=>boolean)=>new Promise(resolve=>{accept=value=>{if(predicate(value))resolve(value);};}),
  waitForFunction:async(_predicate:unknown,count:number)=>{expect(count).toBe(1);waiting=true;await rendered;return {dispose:async()=>{disposed=true;}};}};
 return {page,trigger:async()=>{await handler!({request:()=>request,continue:async()=>accept(response)});},render:()=>release!(),waiting:()=>waiting,disposed:()=>disposed};
}

it('does not equate a successful refresh response with its later rendered notification row',async()=>{
 const fixture=refreshPage({state:'ready',items:[{id:'restored-own-notice'}]});let completed=false;
 const read=refreshInboxAndWaitForRows(fixture.page,fixture.trigger,['restored-own-notice']).then((value:{items:{id:string}[]})=>{completed=true;return value;});
 await expect.poll(fixture.waiting).toBe(true);expect(completed).toBe(false);
 fixture.render();expect((await read).items).toEqual([{id:'restored-own-notice'}]);expect(fixture.disposed()).toBe(true);
});

it.each([
 [{state:'unavailable'},503],
 [{state:'unavailable'},200],
 [{state:'ready',items:[]},200],
 [{state:'ready',items:[{id:'another-notice'}]},200],
] as const)('rejects an unavailable or mismatched restoration before rendering is accepted',async(view,status)=>{
 const fixture=refreshPage(view,status);
 await expect(refreshInboxAndWaitForRows(fixture.page,fixture.trigger,['restored-own-notice'])).rejects.toThrow();
 expect(fixture.waiting()).toBe(false);
});

it('shares one bounded deadline across the current response body and its rendered rows',async()=>{
 for(const view of [new Promise(()=>{}),{state:'ready',items:[{id:'restored-own-notice'}]}]){
  const fixture=refreshPage(view);
  await expect(refreshInboxAndWaitForRows(fixture.page,fixture.trigger,['restored-own-notice'],performance.now()+20)).rejects.toThrow(/recovery deadline/);
 }
});
