import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {verifyD2SessionAuthority} from './d2-session-authority.mjs';

const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??new URL('../tools/ci-browser-runtime/package.json',import.meta.url));
assert.equal(runtime('playwright/package.json').version,'1.62.1');
const {request}=runtime('playwright');
async function fixture(respond,work){
 const calls=[];
 const server=createServer((incoming,outgoing)=>{calls.push({method:incoming.method,header:incoming.headers['x-nevora-time-correction']});respond(incoming,outgoing,calls.length);});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const api=await request.newContext({timeout:3000});
 try{await work(api,`http://127.0.0.1:${server.address().port}/authority`,calls);}
 finally{await api.dispose();server.closeAllConnections();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
}

test('default pinned GET exposes a single reset without retry',{timeout:5000},async()=>{
 await fixture(incoming=>incoming.socket.resetAndDestroy(),async(api,url,calls)=>{
  await assert.rejects(api.get(url),/ECONNRESET/);assert.equal(calls.length,1);
 });
});
test('session authority reconnects once and returns the fresh successful GET',{timeout:5000},async()=>{
 await fixture((incoming,outgoing,count)=>{if(count===1)return incoming.socket.resetAndDestroy();outgoing.writeHead(200,{'content-type':'application/json'});outgoing.end('{"fresh":true}');},async(api,url,calls)=>{
  const response=await verifyD2SessionAuthority(api,url);assert.deepEqual(await response.json(),{fresh:true});
  assert.deepEqual(calls,[{method:'GET',header:'1'},{method:'GET',header:'1'}]);
 });
});
test('persistent reset fails after exactly two GET attempts',{timeout:5000},async()=>{
 await fixture(incoming=>incoming.socket.resetAndDestroy(),async(api,url,calls)=>{
  await assert.rejects(verifyD2SessionAuthority(api,url),/ECONNRESET/);assert.equal(calls.length,2);assert(calls.every(call=>call.method==='GET'));
 });
});
for(const status of [401,403,500])test(`session authority rejects HTTP ${status} without retry`,{timeout:5000},async()=>{
 await fixture((_incoming,outgoing)=>{outgoing.writeHead(status);outgoing.end('refused');},async(api,url,calls)=>{
  await assert.rejects(verifyD2SessionAuthority(api,url),error=>error.code==='ERR_ASSERTION'&&error.actual===status&&error.expected===200);
  assert.deepEqual(calls,[{method:'GET',header:'1'}]);
 });
});
test('successful GET preflight leaves a reset POST at one attempt',{timeout:5000},async()=>{
 await fixture((incoming,outgoing)=>{if(incoming.method==='POST')return incoming.socket.resetAndDestroy();outgoing.writeHead(200);outgoing.end('current');},async(api,url,calls)=>{
  await verifyD2SessionAuthority(api,url);await assert.rejects(api.post(url,{data:{operation:'fictional'}}),/ECONNRESET/);
  assert.deepEqual(calls.map(call=>call.method),['GET','POST']);
 });
});
