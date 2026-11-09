import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer,request} from 'node:http';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {installOwnedLoginDiagnostics,readOwnedLoginEvents,OWNED_LOGIN_HEADER,OWNED_LOGIN_PREFIX} from '../src/test/integration/owned-login-diagnostics.mjs';

const attempt='172f078c-24bf-4f9c-a74c-4e598c25fe37';
async function serverFor(handler){const server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');return {server,origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};}

test('real owned HTTP observations preserve the login body/response and correlate only safe metadata',async()=>{
 let received;const fixture=await serverFor(async(req,res)=>{received='';for await(const chunk of req)received+=chunk;res.setHeader('set-cookie','session=Violet7');res.setHeader('x-action-redirect','/app?proof=Violet7;push');res.end('native-response');});
 const events=[],stop=installOwnedLoginDiagnostics({origin:fixture.origin,publish:event=>events.push(event)});
 try{
  const response=await fetch(fixture.origin+'/login?secret=Violet7',{method:'POST',headers:{[OWNED_LOGIN_HEADER]:attempt,'next-action':'private-action','cookie':'private-cookie'},body:'password=Violet7'});
  assert.equal(await response.text(),'native-response');assert.equal(received,'password=Violet7');
  assert.equal(response.headers.get('set-cookie'),'session=Violet7');
  assert.deepEqual(events.map(x=>x.event),['request-start','response-finish','response-close']);
  assert(events.every(x=>x.attempt===attempt&&x.method==='POST'&&x.serverAction===true));
  assert.equal(events[1].status,200);assert.equal(events[1].redirect,'app');assert.equal(events[1].complete,true);
  assert.equal(new Set(events.map(x=>x.requestId)).size,1);
  assert(!/Violet7|private-action|private-cookie|password|secret|proof/.test(JSON.stringify(events)));
 }finally{stop();await fixture.close();}
});

test('unmarked requests, other routes, invalid markers and another server are never observed',async()=>{
 const handler=(_req,res)=>res.end('ok');const fixture=await serverFor(handler),other=await serverFor(handler),events=[];
 const stop=installOwnedLoginDiagnostics({origin:fixture.origin,publish:event=>events.push(event)});
 try{
  for(const [url,marker] of [[fixture.origin+'/login',null],[fixture.origin+'/login','private-secret'],[fixture.origin+'/api/private',attempt],[other.origin+'/login',attempt]]){
   await (await fetch(url,{headers:marker?{[OWNED_LOGIN_HEADER]:marker}:{}})).text();
  }
  assert.deepEqual(events,[]);
 }finally{stop();await fixture.close();await other.close();}
 assert.throws(()=>installOwnedLoginDiagnostics({origin:'https://production.invalid',publish:()=>{}}));
 assert.throws(()=>installOwnedLoginDiagnostics({origin:'http://127.0.0.1:1234/private',publish:()=>{}}));
});

test('a client disconnect records an incomplete response without changing the server handler',async()=>{
 const events=[];let closed;const closedEvent=new Promise(resolve=>{closed=resolve;});
 const fixture=await serverFor((_req,res)=>{res.on('close',closed);res.writeHead(200);res.write('partial');});
 const stop=installOwnedLoginDiagnostics({origin:fixture.origin,publish:event=>events.push(event)});
 try{
  await new Promise((resolve,reject)=>{const req=request(fixture.origin+'/login',{headers:{[OWNED_LOGIN_HEADER]:attempt}},res=>{res.once('data',()=>{res.destroy();resolve();});});req.once('error',reject);req.end();});
  await closedEvent;
  assert(events.some(x=>x.event==='response-close'&&x.complete===false));
  assert(!events.some(x=>x.event==='response-finish'));
 }finally{stop();await fixture.close();}
});

test('receipt parsing selects this attempt and drops arbitrary metadata and malformed records',()=>{
 const event={attempt,processId:42,requestId:1,event:'request-start',method:'POST',serverAction:true,elapsedMs:0,status:null,redirect:null,complete:false};
 const logs=[OWNED_LOGIN_PREFIX+JSON.stringify({...event,private:'Violet7'}),OWNED_LOGIN_PREFIX+JSON.stringify({...event,attempt:'private-secret'}),OWNED_LOGIN_PREFIX+'not json','password=Violet7'];
 assert.deepEqual(readOwnedLoginEvents(logs.join('\n'),attempt),[event]);
 assert(!JSON.stringify(readOwnedLoginEvents(logs.join('\n'),attempt)).includes('Violet7'));
 assert.equal(readOwnedLoginEvents(Array.from({length:50},()=>logs[0]).join('\n'),attempt).length,32);
});

test('the preload refuses production or an unmarked runtime before application code executes',()=>{
 for(const [environment,owner] of [['production','a'.repeat(32)],['development','']]){
  const child=spawnSync(process.execPath,['--import',new URL('../src/test/integration/owned-login-diagnostics.mjs',import.meta.url).href,'-e','console.log("application-started")'],{encoding:'utf8',env:{...process.env,NODE_ENV:environment,NEVORA_OWNED_LOGIN_ORIGIN:'http://127.0.0.1:1234',NEVORA_OWNED_PROCESS_OWNER:owner,NEVORA_OWNED_APP_DATABASE:'fictional-owned-database'}});
  assert.equal(child.status,1);assert(!child.stdout.includes('application-started'));assert.match(child.stderr,/Login diagnostics require the marked owned application/);
 }
});

test('NODE_OPTIONS preloads the source module in a marked child and observes its native HTTP request',async()=>{
 const fixture=await serverFor((_req,res)=>res.end('unused'));await fixture.close();
 const code=`const {createServer}=require('node:http');const server=createServer((_req,res)=>res.end('native-response'));server.listen(${Number(new URL(fixture.origin).port)},'127.0.0.1',async()=>{try{const response=await fetch(${JSON.stringify(fixture.origin+'/login')},{method:'POST',headers:{${JSON.stringify(OWNED_LOGIN_HEADER)}:${JSON.stringify(attempt)}},body:'fictional-only'});if(await response.text()!=='native-response')process.exitCode=1;}finally{server.close();}});`;
 const child=spawnSync(process.execPath,['-e',code],{encoding:'utf8',timeout:5000,env:{...process.env,NODE_OPTIONS:'--import='+new URL('../src/test/integration/owned-login-diagnostics.mjs',import.meta.url).href,NODE_ENV:'development',NEVORA_OWNED_LOGIN_ORIGIN:fixture.origin,NEVORA_OWNED_PROCESS_OWNER:'a'.repeat(32),NEVORA_OWNED_APP_DATABASE:'fictional-owned-database'}});
 assert.equal(child.status,0,child.stderr);const observed=readOwnedLoginEvents(child.stdout,attempt);
 assert(observed.some(event=>event.event==='request-start'&&event.method==='POST'));
 assert(observed.some(event=>event.event==='response-finish'&&event.complete&&event.status===200));
});
