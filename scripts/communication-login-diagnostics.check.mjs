import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {diagnoseCommunicationLogin} from './communication-login-diagnostics.mjs';
import {OWNED_LOGIN_HEADER,OWNED_LOGIN_PREFIX} from '../src/test/integration/owned-login-diagnostics.mjs';

const secret='private-person@example.test-password-cookie-session-token';
function fixture(){
 const target=new EventEmitter(),calls=[];let marker;
 target.setExtraHTTPHeaders=async headers=>{calls.push(Object.keys(headers).length?'mark':'unmark');marker=headers[OWNED_LOGIN_HEADER]??marker;};
 target.url=()=>`http://127.0.0.1:1234/login?error=${secret}`;
 target.evaluate=async()=>({route:'/login',readyState:'complete',focused:true,visibility:'visible',busy:'true',disabled:'true',shell:false});
 const frame={url:target.url};target.mainFrame=()=>frame;
 const request={url:target.url,method:()=> 'POST',isNavigationRequest:()=>false,resourceType:()=> 'fetch',headers:()=>({'next-action':secret,cookie:secret}),failure:()=>({errorText:'net::ERR_ABORTED '+secret})};
 const app={url:'http://127.0.0.1:1234',root:'/unused',database:{connectionString:secret}};
 const client={connect:async()=>calls.push('connect'),query:async(sql,values)=>{
  if(values){assert.equal(values[0],secret);assert(Number.isFinite(values[1]));return {rows:[{createdSinceAttempt:true,sessionId:secret}]};}
  return {rows:[{state:'active',wait_event_type:'Lock',wait_event:'transactionid',connections:1,query:secret},{state:secret,wait_event_type:secret,wait_event:secret,connections:secret}]};
 },end:async()=>calls.push('end')};
 const readLog=async()=>OWNED_LOGIN_PREFIX+JSON.stringify({attempt:marker,processId:42,requestId:1,event:'request-start',method:'POST',serverAction:true,elapsedMs:0,status:null,redirect:null,complete:false,password:secret})+`\nPOST /login?${secret} 200 in 3ms\n${secret}`;
 const createClient=options=>{assert.equal(options.connectionTimeoutMillis,1000);assert.equal(options.statement_timeout,1000);assert.equal(options.query_timeout,1000);return client;};
 return {target,request,app,client,calls,readLog,createClient,frame};
}
const observedEvents=['request','response','requestfailed','requestfinished','framenavigated'];
function detached(target){for(const event of observedEvents)assert.equal(target.listenerCount(event),0,event);}

test('failed navigation persists correlated sanitized evidence before rethrowing the identical failure',async()=>{
 const f=fixture(),directory=await mkdtemp(join(tmpdir(),'nevora-login-diagnostic-')),path=join(directory,'failure.json');
 const original=Object.assign(Error('page.waitForURL timeout '+secret),{name:'TimeoutError'});let written=false;
 try{
  await assert.rejects(diagnoseCommunicationLogin({...f,id:secret,login:async()=>{
   f.calls.push('login');f.target.emit('request',f.request);
   f.target.emit('response',{request:()=>f.request,status:()=>200,headers:()=>({'x-action-redirect':'/app?session='+secret+';push','set-cookie':secret})});
   f.target.emit('requestfailed',f.request);f.target.emit('framenavigated',f.frame);throw original;
  },persist:async attempt=>{await writeFile(path,JSON.stringify(attempt));written=true;}}),error=>{assert(written);return error===original;});
  const text=await readFile(path,'utf8'),report=JSON.parse(text);
  assert.equal(report.status,'failed');assert.deepEqual(report.failure,{route:'/login',error:'other',category:{name:'TimeoutError',kind:'timeout'}});
  assert.deepEqual(report.trace.map(event=>event.event),['request','response','request-failed','document']);
  assert.equal(report.trace[1].redirect,'/app');assert.equal(report.trace[1].status,200);assert.equal(report.trace[2].reason,'aborted');
  assert(report.trace.every(event=>Number.isFinite(event.afterMs)&&event.afterMs>=0));assert.equal(report.trace[0].id,report.trace[1].id);
  assert.equal(report.serverTrace[0].event,'request-start');assert.deepEqual(report.serverRequests,[{method:'POST',route:'/login',status:200,elapsedMs:3}]);
  assert.equal(report.pageState.busy,'true');assert.equal(report.databaseWaits[0].waitType,'Lock');assert.equal(report.databaseWaits[1].waitEvent,'other');assert.deepEqual(report.sessionOutcome,{createdSinceAttempt:true});
  assert(!text.includes(secret));assert(!/sessionId|set-cookie|next-action|connectionString/.test(text));
  assert.deepEqual(f.calls,['mark','login','connect','end','unmark']);detached(f.target);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('unavailable diagnostics and failed persistence cannot replace the original navigation failure',async()=>{
 const f=fixture(),original=Error('navigation '+secret);let attempted=false;
 f.target.evaluate=async()=>{throw Error(secret);};f.client.connect=async()=>{throw Error(secret);};
 const originalLog=console.error;const logs=[];console.error=value=>logs.push(value);
 try{await assert.rejects(diagnoseCommunicationLogin({...f,id:secret,readLog:async()=>{throw Error(secret);},login:async()=>{throw original;},persist:async report=>{
  attempted=true;assert.equal(report.databaseWaits,'unavailable');assert.equal(report.sessionOutcome,'unavailable');assert.equal(report.serverTrace,'unavailable');assert(!JSON.stringify(report).includes(secret));throw Error(secret);
 }}),error=>error===original);}finally{console.error=originalLog;}
 assert(attempted);assert.equal(logs.length,1);assert(!logs.join('').includes(secret));assert(f.calls.includes('end'));detached(f.target);
});

test('successful login runs exactly once without database probes and keeps trace bounded',async()=>{
 const f=fixture();let count=0,report;
 await diagnoseCommunicationLogin({...f,id:secret,login:async()=>{count++;for(let i=0;i<55;i++)f.target.emit('request',f.request);},persist:async value=>{report=value;}});
 assert.equal(count,1);assert.equal(report.status,'ready');assert.equal(report.trace.length,40);assert.equal(report.omittedEvents,15);assert.equal(report.databaseWaits,undefined);assert.deepEqual(f.calls,['mark','unmark']);detached(f.target);
 const saved=JSON.stringify(report);f.target.emit('request',f.request);assert.equal(JSON.stringify(report),saved);
});

test('a passing login cannot silently pass missing diagnostic persistence',async()=>{
 const f=fixture();await assert.rejects(diagnoseCommunicationLogin({...f,id:secret,login:async()=>{},persist:async()=>{throw Error(secret);}}),error=>error.message==='Communication login diagnostic persistence failed');detached(f.target);
});

test('stalled diagnostic database work is bounded and cleaned up after login failure',async()=>{
 const f=fixture(),original=Error('navigation failure');let report;
 f.client.connect=()=>new Promise(()=>{});
 const started=performance.now();await assert.rejects(diagnoseCommunicationLogin({...f,id:secret,login:async()=>{throw original;},persist:async value=>{report=value;}}),error=>error===original);
 assert(performance.now()-started<2500);assert.equal(report.databaseWaits,'unavailable');assert.equal(report.sessionOutcome,'unavailable');assert(f.calls.includes('end'));detached(f.target);
});
