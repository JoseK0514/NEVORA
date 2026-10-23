import assert from 'node:assert/strict';
import {test} from 'node:test';
import {waitForOwnedLoginWindow} from './browser-login-window.mjs';

test('a shared client with 60 completed logins waits for the real next window before a 61st native attempt', async()=>{
 let clock=0,reads=0;const waits=[];
 const query=async()=>{reads++;return [{bucket:clock<70?'7':'8',attempts:clock<70?60:0,wait_ms:clock<70?70-clock:900000}];};
 const result=await waitForOwnedLoginWindow(query,{limit:60,now:()=>clock,wait:async ms=>{waits.push(ms);clock+=ms;}});
 assert.deepEqual(waits,[70]);assert.equal(reads,2);assert.equal(result.bucket,'8');assert.equal(result.attempts,0);
});

test('available native login budget proceeds without a delay or an extra admission attempt',async()=>{
 let reads=0;
 const result=await waitForOwnedLoginWindow(async()=>{reads++;return [{bucket:'7',attempts:59,wait_ms:10}];},{limit:60,wait:async()=>assert.fail('No wait while budget remains')});
 assert.equal(reads,1);assert.equal(result.attempts,59);
});

test('an exhausted window is re-read after bounded waits and cannot hang beyond one full window',async()=>{
 let clock=0;const waits=[];
 await assert.rejects(waitForOwnedLoginWindow(async()=>[{bucket:'7',attempts:60,wait_ms:900000}],{limit:60,now:()=>clock,wait:async ms=>{waits.push(ms);clock+=ms;}}),/Login window did not advance/);
 assert(waits.length>1);assert(waits.every(ms=>ms>0&&ms<=30000));assert.equal(clock,901000);
});

test('missing or invalid budget evidence and SQL failures stop before native login',async()=>{
 for(const rows of [[],[{bucket:'7',attempts:-1,wait_ms:10}],[{bucket:'7',attempts:60,wait_ms:900001}]]){
  await assert.rejects(waitForOwnedLoginWindow(async()=>rows,{limit:60}),/Invalid login window/);
 }
 const failure=new Error('Owned read failed');
 await assert.rejects(waitForOwnedLoginWindow(async()=>{throw failure;},{limit:60}),error=>error===failure);
});
