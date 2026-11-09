import {createServer} from 'node:http';
import {expect,it} from 'vitest';
import {installOwnedCreationDiagnostics} from './integration/owned-creation-diagnostics.mjs';
it('records native response completion for the owned fictional action without private request content',async()=>{
 const server=createServer((_request,response)=>response.end('fictional-body'));await new Promise<void>(ready=>server.listen(0,'127.0.0.1',ready));const address=server.address();if(!address||typeof address==='string')throw Error('No owned port');const origin='http://127.0.0.1:'+address.port,events:unknown[]=[];
 const close=installOwnedCreationDiagnostics({origin,publish:entry=>events.push(entry)});
 try{
  await(await fetch(origin+'/app/exchange/swap?mode=cover&sourceShiftId=creation-own-cover-0')).text();expect(events).toEqual([]);
  await(await fetch(origin+'/app/exchange/swap?mode=cover&sourceShiftId=creation-own-cover-0&secret=private-query',{method:'POST',headers:{'next-action':'private-action',cookie:'private-cookie'},body:'private-body'})).text();
  expect(events).toEqual(expect.arrayContaining([expect.objectContaining({subject:'creation-own-cover-0',event:'start',complete:false}),expect.objectContaining({subject:'creation-own-cover-0',event:'finish',complete:true,status:200})]));expect(JSON.stringify(events)).not.toMatch(/private-|fictional-body|next-action|cookie/);
 }finally{close();await new Promise<void>((ready,reject)=>server.close(error=>error?reject(error):ready()));}
});
it('refuses an external diagnostic origin',()=>{expect(()=>installOwnedCreationDiagnostics({origin:'https://example.com',publish:()=>{}})).toThrow(/owned loopback/);});
