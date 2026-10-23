import assert from 'node:assert/strict';
import test from 'node:test';
import {finishResponseByDeadline} from './browser-response-deadline.mjs';

test('a response must finish its body before recovery is considered complete',async()=>{
 let release,calls=0,completed=false;const body=new Promise(resolve=>{release=resolve;});
 const result=finishResponseByDeadline({finished(){calls++;return body;}},performance.now()+1000).then(()=>{completed=true;});
 await Promise.resolve();assert.equal(completed,false);assert.equal(calls,1);release(null);await result;assert.equal(completed,true);
});
test('a stalled body fails by the original deadline and a late completion cannot rescue it',async()=>{
 let release;const body=new Promise(resolve=>{release=resolve;});
 const result=finishResponseByDeadline({finished:()=>body},performance.now()+20);
 await assert.rejects(result,/recovery deadline/);release(null);await assert.rejects(result,/recovery deadline/);
});
test('an expired deadline cannot start another body wait',async()=>{
 let calls=0;await assert.rejects(finishResponseByDeadline({finished:async()=>{calls++;return null;}},performance.now()-1),/recovery deadline/);assert.equal(calls,0);
});
test('a failed body remains a failure without copying its arbitrary error payload',async()=>{
 await assert.rejects(finishResponseByDeadline({finished:async()=>Error('password=Violet7')},performance.now()+1000),error=>error.message==='Browser response body failed');
});
