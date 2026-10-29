import { createServer } from 'node:http';
import { expect, it } from 'vitest';
import { installOwnedCalendarDiagnostics } from './integration/owned-calendar-diagnostics.mjs';

it('accounts for real marked loopback Calendar requests without recording private headers, bodies or query values',async()=>{
  const server=createServer((_request,response)=>response.end('fictional'));
  await new Promise<void>(ready=>server.listen(0,'127.0.0.1',ready));
  const address=server.address();if(!address||typeof address==='string')throw Error('No owned port');
  const origin='http://127.0.0.1:'+address.port,events:unknown[]=[];
  const close=installOwnedCalendarDiagnostics({origin,publish:event=>events.push(event)});
  try{
    await (await fetch(origin+'/api/employee/calendar-subscriptions')).text();expect(events).toEqual([]);
    const id='11111111-1111-4111-8111-111111111111';
    await (await fetch(origin+'/api/employee/calendar-subscriptions?token=private-query',{headers:{'x-nevora-qa-calendar-read':id,cookie:'private-cookie'}})).text();
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({id,event:'start',complete:false}),expect.objectContaining({id,event:'finish',complete:true})]));
    expect(JSON.stringify(events)).not.toMatch(/private-query|private-cookie|fictional/);
  }finally{close();await new Promise<void>((ready,reject)=>server.close(error=>error?reject(error):ready()));}
});

it('refuses an external origin for the owned observer',()=>{
  expect(()=>installOwnedCalendarDiagnostics({origin:'https://example.com',publish:()=>{}})).toThrow(/owned loopback/);
});
