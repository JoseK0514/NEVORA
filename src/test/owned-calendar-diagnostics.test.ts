import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { calendarTrace, pendingReads } from './integration/calendar-request-monitor';
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

it('fails closed after the actual 1024-request observer capacity rather than inferring no server receipt',async()=>{
  let received=0;
  const server=createServer((_request,response)=>{received++;response.end('fictional');});
  await new Promise<void>(ready=>server.listen(0,'127.0.0.1',ready));
  const address=server.address();if(!address||typeof address==='string')throw Error('No owned port');
  const origin='http://127.0.0.1:'+address.port,events:unknown[]=[];
  const close=installOwnedCalendarDiagnostics({origin,publish:event=>events.push(event)});
  try{
    const ids=Array.from({length:1025},()=>randomUUID());
    for(let offset=0;offset<ids.length;offset+=16)await Promise.all(ids.slice(offset,offset+16).map(async id=>{
      await (await fetch(origin+'/api/employee/calendar-subscriptions',{headers:{'x-nevora-qa-calendar-read':id}})).text();
    }));
    expect(received).toBe(1025);
    const trace=calendarTrace(events.map(event=>'[Owned calendar read] '+JSON.stringify(event)).join('\n'));
    const row={path:'/api/employee/calendar-subscriptions',method:'GET',id:ids[1024],response:false};
    expect(pendingReads([row],[ids[1024]],trace,new Set([ids[0]]))).toEqual([row]);
    expect(events.filter(event=>(event as {event:string}).event==='unavailable')).toHaveLength(1);
    // Both storage and the unavailability signal stay bounded even as more matching reads arrive.
    const count=events.length;
    await (await fetch(origin+'/api/employee/calendar-subscriptions',{headers:{'x-nevora-qa-calendar-read':randomUUID()}})).text();
    expect(events).toHaveLength(count);
  }finally{close();await new Promise<void>((ready,reject)=>server.close(error=>error?reject(error):ready()));}
});
it('does not interpret a received POST excluded by the GET observer as an orphaned read',async()=>{
  const received:string[]=[];
  let acknowledgePost!:()=>void;
  const postReceived=new Promise<void>(resolve=>{acknowledgePost=resolve;});
  const server=createServer((request,response)=>{received.push(request.method!);if(request.method==='POST')acknowledgePost();else response.end('fictional');});
  await new Promise<void>(ready=>server.listen(0,'127.0.0.1',ready));
  const address=server.address();if(!address||typeof address==='string')throw Error('No owned port');
  const origin='http://127.0.0.1:'+address.port,events:unknown[]=[];
  const close=installOwnedCalendarDiagnostics({origin,publish:event=>events.push(event)});
  try{
    const control=randomUUID(),mutation=randomUUID();
    await (await fetch(origin+'/api/employee/calendar-subscriptions',{headers:{'x-nevora-qa-calendar-read':control}})).text();
    const abort=new AbortController();
    const mutationRequest=fetch(origin+'/api/employee/calendar-subscriptions',{method:'POST',signal:abort.signal,headers:{'x-nevora-qa-calendar-read':mutation}});
    const rejected=expect(mutationRequest).rejects.toMatchObject({name:'AbortError'});
    await postReceived;abort.abort();await rejected;
    expect(received).toEqual(['GET','POST']);
    expect(events.some(event=>(event as {id?:string}).id===mutation)).toBe(false);
    const trace=calendarTrace(events.map(event=>'[Owned calendar read] '+JSON.stringify(event)).join('\n'));
    const row={path:'/api/employee/calendar-subscriptions',method:'POST',id:mutation,response:false};
    expect(pendingReads([row],[mutation],trace,new Set([control]))).toEqual([row]);
  }finally{close();await new Promise<void>((ready,reject)=>server.close(error=>error?reject(error):ready()));}
});
