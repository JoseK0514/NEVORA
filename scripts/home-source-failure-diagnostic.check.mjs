import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {test} from 'node:test';
import {homeFailureProjection,observeHomeFailure,finishHomeFailure,homeSqlEvents} from './home-source-failure-diagnostic.mjs';

test('H09 projection exposes only allowlisted states and presence flags',()=>{
 const raw={state:'partial',password:'PRIVATE',snapshot:{authority:'PRIVATE',publicationState:'unavailable',nextShift:{id:'PRIVATE'},currentShift:null,sources:{schedule:{state:'unavailable',reason:'PRIVATE'},timeOff:{state:'unavailable'}}}};
 assert.deepEqual(homeFailureProjection(raw),{state:'partial',publicationState:'unavailable',schedule:'unavailable',timeOff:'unavailable',nextShift:true,currentShift:false});
 assert(!JSON.stringify(homeFailureProjection(raw)).includes('PRIVATE'));
 assert.equal(homeFailureProjection({state:'PRIVATE'}).state,'other');
});
test('cleanup preserves a primary failure while closing listeners after blocker and capture errors',async()=>{
 const original=Error('original H09 assertion'),steps=[];
 const finish=primaryFailure=>finishHomeFailure({primaryFailure,
  blocker:{query:async()=>{},end:async()=>{steps.push('end');throw Error('PRIVATE');}},
  diagnostic:{started:1,close:async()=>{steps.push('close');return {}; }},
  readLog:async()=>{throw Error('PRIVATE');},writeReceipt:async()=>{steps.push('write');throw Error('PRIVATE');}});
 await finish(original);assert.deepEqual(steps,['end','close','write']);
 await assert.rejects(finish(undefined),/Owned Home diagnostic or cleanup failed/);
});
test('server log capture rejects raw or injected fields and preserves safe phase evidence',()=>{
 const log='[Owned Home SQL] '+JSON.stringify({at:10,event:'failed',batch:4,phase:'assignment',code:'55P03',sql:'PRIVATE',headers:'PRIVATE',fingerprint:'PRIVATE'});
 assert.deepEqual(homeSqlEvents(log,9),[{at:10,event:'failed',batch:4,phase:'assignment',code:'55P03'}]);
 assert.deepEqual(homeSqlEvents(log,11),[]);
});
test('required SQL evidence cannot silently pass empty, and its owned opt-in is always closed',async()=>{
 let closed=false,receipt;
 await assert.rejects(finishHomeFailure({blocker:{query:async()=>{},end:async()=>{}},diagnostic:{started:1,close:async()=>({})},
  closeSql:async()=>{closed=true;},requireSql:true,readLog:async()=>'',writeReceipt:async value=>{receipt=value;}}),/Owned Home diagnostic or cleanup failed/);
 assert.equal(closed,true);assert.deepEqual(receipt.captureFailures,['sql-observation-unavailable']);
});
test('a blocker that never connected cannot queue a rollback ahead of cleanup',async()=>{
 const steps=[];
 await finishHomeFailure({blockerConnected:false,primaryFailure:Error('flag creation failed'),
  blocker:{query:()=>{steps.push('query');throw Error('Unconnected query must not run');},end:async()=>{steps.push('end');}},
  diagnostic:{started:1,close:async()=>{steps.push('close');return {}; }},
  closeSql:async()=>{steps.push('sql-close');},readLog:async()=>'',writeReceipt:async()=>{steps.push('write');}});
 assert.deepEqual(steps,['end','sql-close','close','write']);
});
test('H09 observation preserves request identity, failed bodies, finite capacity and listener cleanup',async()=>{
 const page=new EventEmitter(),diagnostic=observeHomeFailure(page);
 const request={url:()=> 'https://owned.invalid/api/employee/home',method:()=> 'GET'};
 page.emit('request',request);page.emit('response',{request:()=>request,status:()=>200,json:async()=>{throw Error('PRIVATE');}});page.emit('requestfailed',request);
 await new Promise(resolve=>setImmediate(resolve));diagnostic.setPhase('recovery');
 for(let i=0;i<120;i++)page.emit('requestfinished',request);
 const receipt=await diagnostic.close();
 assert(receipt.events.some(e=>e.event==='body-unavailable'&&e.id===1));
 assert.equal(receipt.events.length,96);assert.equal(receipt.saturated,true);assert.equal(receipt.pendingBodies,0);
 assert.equal(page.eventNames().length,0);assert(!JSON.stringify(receipt).includes('PRIVATE'));
});
