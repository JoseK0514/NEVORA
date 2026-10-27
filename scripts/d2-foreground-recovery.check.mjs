import assert from 'node:assert/strict';
import test from 'node:test';
import {finishD2ForegroundRecovery,waitForD2RscQuiescence} from './d2-foreground-recovery.mjs';

const rsc={status:()=>200,finished:()=>{throw Error('Router stream completion is not the protected correction read');}};
const response=(overrides={})=>({status:()=>200,finished:async()=>null,json:async()=>({state:'ready',requests:[{id:'pending-entry'},{id:'pending-break'}]}),...overrides});
const ids=['pending-entry','pending-break'];

test('foreground recovery verifies a complete protected correction read without waiting on the router stream',async()=>{
 await finishD2ForegroundRecovery(rsc,response(),ids,performance.now()+1000);
});

test('a ready-looking correction payload cannot precede completion of its protected response body',async()=>{
 let release,parsed=false,completed=false;
 const body=new Promise(resolve=>{release=resolve;});
 const read=response({finished:()=>body,json:async()=>{parsed=true;return {state:'ready',requests:ids.map(id=>({id}))};}});
 const result=finishD2ForegroundRecovery(rsc,read,ids,performance.now()+1000).then(()=>{completed=true;});
 await Promise.resolve();await Promise.resolve();assert.equal(parsed,false);assert.equal(completed,false);
 release(null);await result;assert.equal(parsed,true);assert.equal(completed,true);
});

test('unavailable, incomplete and non-200 recovery responses remain fatal',async()=>{
 for(const read of [response({status:()=>503}),response({json:async()=>({state:'unavailable'})}),response({json:async()=>({state:'ready',requests:[{id:ids[0]}]})})]){
  await assert.rejects(finishD2ForegroundRecovery(rsc,read,ids,performance.now()+1000));
 }
 await assert.rejects(finishD2ForegroundRecovery({status:()=>500},response(),ids,performance.now()+1000));
});

test('a hung correction body fails within the original recovery deadline',async()=>{
 const read=response({finished:()=>new Promise(()=>{})});
 await assert.rejects(finishD2ForegroundRecovery(rsc,read,ids,performance.now()+20),/recovery deadline/);
});

test('payload extraction shares the original deadline and late ready data cannot rescue a timeout',async()=>{
 let release;
 const payload=new Promise(resolve=>{release=resolve;});
 const result=finishD2ForegroundRecovery(rsc,response({json:()=>payload}),ids,performance.now()+20);
 await assert.rejects(result,/recovery deadline/);
 release({state:'ready',requests:ids.map(id=>({id}))});
 await assert.rejects(result,/recovery deadline/);
});

test('a momentarily drained RSC set cannot permit reload before a queued follow-up recovery finishes',async()=>{
 let pending=0,version=1,completed=false,first=true,startedAgain;
 const followUp=new Promise(resolve=>{startedAgain=resolve;});
 const started=performance.now();
 const recovery=waitForD2RscQuiescence(()=>{const current={pending,version};if(first){first=false;queueMicrotask(()=>{pending=1;version++;startedAgain();});}return current;},started+2000,{quietMs:30,pollMs:2}).then(value=>{completed=true;return value;});
 await followUp;await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,false,'A later RSC must hold the reload boundary');
 pending=0;const finishedAt=performance.now(),result=await recovery;
 assert.equal(result.version,2);assert(performance.now()-finishedAt>=29,'Quiet interval starts after the follow-up finishes');
});

test('a new request that starts and finishes between polls still restarts the RSC quiet interval',async()=>{
 let version=1,startedAgain,first=true;
 const started=performance.now();
 const recovery=waitForD2RscQuiescence(()=>{const current={pending:0,version};if(first){first=false;queueMicrotask(()=>{version++;startedAgain=performance.now();});}return current;},started+2000,{quietMs:40,pollMs:10});
 const result=await recovery;assert.equal(result.version,2);assert(performance.now()-startedAgain>=39);
});

test('RSC quiescence shares the existing deadline and cannot turn an unfinished recovery into success',async()=>{
 await assert.rejects(waitForD2RscQuiescence(()=>({pending:1,version:1}),performance.now()+25,{quietMs:5,pollMs:2}),/recovery deadline/);
 await assert.rejects(waitForD2RscQuiescence(()=>({pending:0,version:1}),performance.now()+15,{quietMs:40,pollMs:2}),/recovery deadline/);
});
