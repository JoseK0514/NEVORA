import {expect,it,vi} from 'vitest';
import {createServer} from 'node:http';
import {financeBridgeEnvironment,ownedHttpRequest,startOwnedFinanceBridge,readOwnedFinancialClock,installOwnedFinancialFetch,createOwnedFinancialClock,type OwnedFinanceBridge} from './owned-isolated-finance';
const example=():OwnedFinanceBridge=>({origin:'https://billing.step4.example.invalid',upstream:'http://127.0.0.1:54321',capability:'a'.repeat(64)});
it('omits ambient financial connections and accepts only explicit owned bridge options',()=>{vi.stubEnv('NEVORA_COMMERCE_API_ORIGIN','https://real.example.com');try{expect(financeBridgeEnvironment()).toEqual({});expect(financeBridgeEnvironment(example()).NEVORA_COMMERCE_ENABLED).toBe('true');}finally{vi.unstubAllEnvs();}});
it.each(['foreign-origin','http-origin','remote-upstream','https-upstream','upstream-path','invalid-capability'] as const)('refuses invalid financial transport: %s',change=>{const options=example();if(change==='foreign-origin')options.origin='https://billing.example.com';if(change==='http-origin')options.origin=options.origin.replace('https:','http:');if(change==='remote-upstream')options.upstream='http://provider.example.invalid';if(change==='https-upstream')options.upstream='https://127.0.0.1:54321';if(change==='upstream-path')options.upstream+='/unexpected';if(change==='invalid-capability')options.capability='x'.repeat(64);expect(()=>financeBridgeEnvironment(options)).toThrow('Unowned finance bridge');});
it('preserves actual HTTP service bodies and failure status while authenticating clock custody and refusing clock reversal',async()=>{
 vi.stubEnv('NODE_ENV','test');let calls=0,received='';const service=await startOwnedFinanceBridge(async request=>{calls++;received=await request.text();expect(request.headers.get('x-owned-finance-capability')).toBeNull();return Response.json({originalReceipt:'owned-delegate',body:received},{status:409});});
 const company='https://alpha.portal.example.invalid';service.register(company);const restore=installOwnedFinancialFetch(service.bridge);
 try{
  expect(await readOwnedFinancialClock(service.bridge,company)).toBe(0);service.advance(company,30*86400000);expect(await readOwnedFinancialClock(service.bridge,company)).toBe(30*86400000);expect(()=>service.advance(company,0)).toThrow();expect(()=>service.advance(company,46*86400000)).toThrow();expect(()=>service.register('https://real.example.com')).toThrow();
  await expect(readOwnedFinancialClock({...service.bridge,capability:'0'.repeat(64)},company)).rejects.toThrow('Owned financial clock unavailable');
  const reply=await fetch(service.bridge.origin+'/internal/handoff',{method:'POST',headers:{authorization:'Bearer fictional-owned-instance'},body:'original-request'});expect(reply.status).toBe(409);expect(await reply.json()).toEqual({originalReceipt:'owned-delegate',body:'original-request'});expect(calls).toBe(1);
  const denied=await ownedHttpRequest(service.bridge.upstream,'/internal/access',service.bridge.origin,{headers:{'x-owned-finance-capability':'bad'}});expect(denied.status).toBe(403);expect(calls).toBe(1);
  await expect(ownedHttpRequest('https://external.example.invalid','/internal/access',service.bridge.origin)).rejects.toThrow();await expect(ownedHttpRequest(service.bridge.upstream,'//external.example.invalid',service.bridge.origin)).rejects.toThrow();
 }finally{restore();await service.close();vi.unstubAllEnvs();}
});
it('retains an advanced application clock when an earlier HTTP clock read arrives last',async()=>{
 const company='https://alpha.portal.example.invalid',day=86400000;
 let releaseFirst=()=>{},observeFirst=()=>{},calls=0;
 const firstObserved=new Promise<void>(resolve=>{observeFirst=resolve;});
 const server=createServer((_request,response)=>{
  response.writeHead(200,{'content-type':'application/json'});
  if(++calls===1){releaseFirst=()=>{response.end(JSON.stringify({origin:company,offsetMs:0}));};observeFirst();}
  else response.end(JSON.stringify({origin:company,offsetMs:day}));
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();if(!address||typeof address==='string')throw Error('Owned clock test did not bind');
 const clock=createOwnedFinancialClock({...example(),upstream:'http://127.0.0.1:'+address.port},company);
 const before=Date.now(),first=clock.refresh();
 try{
  await firstObserved;await clock.refresh();releaseFirst();await first;
  expect(calls).toBe(2);expect(clock.now()).toBeGreaterThanOrEqual(before+day);
 }finally{
  releaseFirst();await first.catch(()=>{});server.closeAllConnections();
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }
});
