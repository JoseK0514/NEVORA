import assert from 'node:assert/strict';
import test from 'node:test';
import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {finishPeriodReportResponse,observeReportNavigation} from './phase-d-report-navigation.mjs';
import {EventEmitter} from 'node:events';

test('bounded work preserves its result and rejects a late value',async()=>{
 const value={unknown:true,blocked:false};
 assert.deepEqual(await runBeforeRecoveryDeadline(async()=>value,performance.now()+1000),value);
 let release;const work=new Promise(resolve=>{release=resolve;});
 const pending=runBeforeRecoveryDeadline(()=>work,performance.now()+20);
 await assert.rejects(pending,/recovery deadline/);release(value);await assert.rejects(pending,/recovery deadline/);
});

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

const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const reportResponse=(overrides={})=>({status:()=>200,finished:async()=>null,json:async()=>({state:'ready',source:{period},validForMs:15000}),...overrides});
test('the exact protected report body must finish before period readiness is accepted',async()=>{
 let release,parsed=false,settled=false;const body=new Promise(resolve=>{release=resolve;});
 const response=reportResponse({finished:()=>body,json:async()=>{parsed=true;return {state:'ready',source:{period},validForMs:15000};}});
 const result=finishPeriodReportResponse(response,period,performance.now()+1000).then(value=>{settled=true;return value;});
 await Promise.resolve();await Promise.resolve();assert.equal(parsed,false);assert.equal(settled,false);
 release(null);assert.deepEqual(await result,{status:200,bodyFinished:true,periodMatched:true});
});
test('wrong-period, unavailable, expired and denied reports stay fatal without payload diagnostics',async()=>{
 for(const response of [reportResponse({status:()=>403}),reportResponse({json:async()=>null}),reportResponse({json:async()=>({state:'private-sentinel'})}),
  reportResponse({json:async()=>({state:'ready',source:{period:{...period,startDate:'2026-09-22'}},validForMs:15000})}),
  reportResponse({json:async()=>({state:'ready',source:{period},validForMs:0})})]){
  await assert.rejects(finishPeriodReportResponse(response,period,performance.now()+1000),error=>!error.message.includes('private-sentinel'));
 }
});
test('report body parsing cannot extend the original period-read deadline',async()=>{
 let release;const payload=new Promise(resolve=>{release=resolve;});
 const result=finishPeriodReportResponse(reportResponse({json:()=>payload}),period,performance.now()+20);
 await assert.rejects(result,/recovery deadline/);release({state:'ready',source:{period},validForMs:15000});await assert.rejects(result,/recovery deadline/);
});
test('navigation trace is capped, excludes private URL/message values and keeps framework fallback fatal',()=>{
 const page=new EventEmitter(),frame={url:()=> 'http://127.0.0.1:1/app/reports?private-sentinel'};page.mainFrame=()=>frame;
 const trace={events:[],omittedEvents:0};let fatal=0;
 const stop=observeReportNavigation(page,'http://127.0.0.1:1',trace,()=>fatal++);
 const request={url:()=> 'http://127.0.0.1:1/app/payroll-export?private-sentinel',isNavigationRequest:()=>false,headers:()=>({rsc:'1',cookie:'private-sentinel'})};
 page.emit('console',{type:()=> 'error',text:()=> 'Failed to fetch RSC payload for private-sentinel. Falling back to browser navigation.'});
 page.emit('framenavigated',frame);for(let i=0;i<70;i++)page.emit('request',request);
 assert.equal(fatal,1);assert.equal(trace.events.length,64);assert(trace.omittedEvents>0);assert(!JSON.stringify(trace).includes('private-sentinel'));
 stop();const count=trace.omittedEvents;page.emit('request',request);assert.equal(trace.omittedEvents,count);
});
