import assert from 'node:assert/strict';
import test from 'node:test';
import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {finishPeriodReportResponse,observeReportNavigation} from './phase-d-report-navigation.mjs';
import {EventEmitter} from 'node:events';
import {projectCommunicationRead,observeCommunicationRead,readCommunicationResponse,finalizeCommunicationRead} from './communication-read-diagnostics.mjs';
import {projectCommunicationPreview,readCommunicationPreviewResponse,previewEventBuffer,projectPreviewDom,observeCommunicationPreview} from './communication-preview-diagnostics.mjs';

test('preview diagnostics project safe enums and DOM identity without private content or authority',()=>{
 const privateValue='private-preview-sentinel';
 assert.deepEqual(projectCommunicationPreview({state:'ready',authority:privateValue,fingerprint:privateValue,title:privateValue}),{state:'ready'});
 assert.deepEqual(projectCommunicationPreview({state:privateValue}),{state:'other'});
 const dom=projectPreviewDom({documentId:123,formId:2,route:'compose',previewPresent:true,busy:true,title:privateValue,authority:privateValue,html:privateValue});
 assert.equal(dom.documentId,123);assert.equal(dom.formId,2);assert.equal(dom.previewPresent,true);assert.equal(dom.busy,true);
 assert(!JSON.stringify(dom).includes(privateValue));
 assert.equal(projectPreviewDom({formId:Infinity,documentId:-1,route:privateValue}).formId,0);
});
test('preview event bounds retain an explicit omission count',()=>{
 const buffer=previewEventBuffer(2);for(let id=0;id<5;id++)buffer.record({id});
 assert.deepEqual(buffer.snapshot(),{events:[{id:0},{id:1}],omittedEvents:3});
 assert.throws(()=>previewEventBuffer(129));assert.throws(()=>previewEventBuffer(0));
});
test('preview response diagnostics require a complete bounded body and exclude arbitrary error text',async()=>{
 const response={status:()=>200,finished:async()=>null,body:async()=>Buffer.from(JSON.stringify({state:'ready',authority:'private-preview-sentinel'}))};
 assert.deepEqual(await readCommunicationPreviewResponse(response,performance.now()+1000),{status:200,bodyFinished:true,state:'ready'});
 for(const body of [async()=>Buffer.alloc(1_000_001),async()=>Buffer.from('not-json-private-preview-sentinel'),async()=>{throw Error('private-preview-sentinel');}]){
  await assert.rejects(readCommunicationPreviewResponse({...response,body},performance.now()+1000),error=>error.message==='Communication preview diagnostic body unavailable');
 }
 let release;const stalled=new Promise(resolve=>{release=resolve;});
 const pending=readCommunicationPreviewResponse({...response,finished:()=>stalled},performance.now()+20);
 await assert.rejects(pending,/preview diagnostic body unavailable/);release(null);await assert.rejects(pending,/preview diagnostic body unavailable/);
});
test('preview observations keep their own buffer, exact locator and idempotent listener cleanup',async()=>{
 const page=new EventEmitter();let binding,init,roleCalls=0,documentReads=0;
 page.exposeBinding=async(_name,callback)=>{binding=callback;};page.addInitScript=async callback=>{init=callback;};
 page.evaluate=async()=>{documentReads++;return {documentId:1,formId:2,route:'compose',previewPresent:true,publishCandidate:false,windowOmittedEvents:0,authority:'private-preview-sentinel'};};
 page.getByRole=(role,options)=>{roleCalls++;assert.equal(role,'button');assert.deepEqual(options,{name:'Publish update',exact:true});return {count:async()=>1,isVisible:async()=>true};};
 const observer=await observeCommunicationPreview(page,'http://127.0.0.1:1');assert.equal(typeof init,'function');
 const request={url:()=> 'http://127.0.0.1:1/api/employee/communications/preview?private-preview-sentinel',method:()=> 'POST'};
 binding({}, {event:'dom',documentId:1,formId:1,route:'compose',authority:'private-preview-sentinel'});
 page.emit('request',request);page.emit('response',{request:()=>request,status:()=>200,finished:async()=>null,body:async()=>Buffer.from('{"state":"ready","authority":"private-preview-sentinel"}')});page.emit('requestfinished',request);
 const first=observer.finish(),second=observer.finish();assert.equal(first,second);const report=await first;
 assert.equal(documentReads,1);assert.equal(roleCalls,1);assert.equal(report.publishButton.visible,true);assert.equal(report.documentState.publishCandidate,false);
 assert(report.events.some(row=>row.kind==='body'&&row.state==='ready'&&row.bodyFinished));assert.equal(report.pendingBodies,0);
 assert(!JSON.stringify(report).includes('private-preview-sentinel'));
 for(const event of ['request','response','requestfinished','requestfailed'])assert.equal(page.listenerCount(event),0);
 const before=JSON.stringify(report);binding({}, {event:'dom',formId:9});assert.equal(JSON.stringify(report),before);
});
test('an unavailable preview document does not leak its failure and still removes request listeners',async()=>{
 const page=new EventEmitter();page.exposeBinding=async()=>{};page.addInitScript=async()=>{};page.evaluate=async()=>{throw Error('private-preview-sentinel');};page.getByRole=()=>{throw Error('private-preview-sentinel');};
 const observer=await observeCommunicationPreview(page,'http://127.0.0.1:1'),report=await observer.finish();
 assert.equal(report.documentState.available,false);assert.equal(report.publishButton.available,false);assert(!JSON.stringify(report).includes('private-preview-sentinel'));
 for(const event of ['request','response','requestfinished','requestfailed'])assert.equal(page.listenerCount(event),0);
});

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
test('same-address document evidence stays bound to its request across address changes and excludes child frames',()=>{
 let address='http://127.0.0.1:1/app/reports?private-sentinel';
 const page=new EventEmitter(),frame={url:()=>address};page.mainFrame=()=>frame;page.url=()=>address;
 const request={url:()=> 'http://127.0.0.1:1/app/reports?private-sentinel',isNavigationRequest:()=>true,frame:()=>frame,headers:()=>({})};
 const trace={events:[],omittedEvents:0},stop=observeReportNavigation(page,'http://127.0.0.1:1',trace,()=>assert.fail('Unexpected fallback'));
 page.emit('request',request);address='http://127.0.0.1:1/app';
 page.emit('response',{request:()=>request,status:()=>200});page.emit('requestfinished',request);
 assert.deepEqual(trace.events.map(event=>event.sameAddress),[true,true,true]);
 assert.equal(new Set(trace.events.map(event=>event.requestId)).size,1);
 page.emit('request',{...request,frame:()=>({})});assert.equal(trace.events.length,3);
 assert(!JSON.stringify(trace).includes('private-sentinel'));stop();
});
test('failed navigation requests retain only bounded failure categories',()=>{
 const page=new EventEmitter(),trace={events:[],omittedEvents:0};
 const stop=observeReportNavigation(page,'http://127.0.0.1:1',trace,()=>assert.fail('Unexpected fallback'));
 const request={url:()=> 'http://127.0.0.1:1/app?private-sentinel',isNavigationRequest:()=>false,headers:()=>({rsc:'1'})};
 for(const errorText of ['net::ERR_ABORTED','private-sentinel'])page.emit('requestfailed',{...request,failure:()=>({errorText})});
 page.emit('requestfailed',{...request,failure:()=>{throw Error('private-sentinel');}});
 assert.deepEqual(trace.events.map(event=>event.failureCategory),['aborted','other','unavailable']);
 assert(!JSON.stringify(trace).includes('private-sentinel'));stop();
});

test('communication diagnostics project only fixed public states and identity booleans',()=>{
 const secret='private-sentinel';
 const result=projectCommunicationRead({state:'ready',reason:secret,id:secret,authority:secret,validForMs:45000,title:secret,body:secret,revisionId:secret},{id:secret,authority:secret});
 assert.deepEqual(result,{state:'ready',reason:'other',leaseMs:45000,resourceMatched:true,authorityMatched:true});
 assert(!JSON.stringify(result).includes(secret));
 assert.deepEqual(projectCommunicationRead({state:secret,reason:secret,validForMs:Infinity},{}),{state:'other',reason:'other',leaseMs:'invalid',resourceMatched:false,authorityMatched:false});
});
test('communication response diagnostics finish the body and retain unavailable status without private data',async()=>{
 let release;const finished=new Promise(resolve=>{release=resolve;});let bodyRead=false;
 const response={status:()=>503,finished:()=>finished,body:async()=>{bodyRead=true;return Buffer.from(JSON.stringify({state:'unavailable',reason:'read_failed',body:'private-sentinel'}));}};
 const result=readCommunicationResponse(response,{},performance.now()+1000);
 await Promise.resolve();assert.equal(bodyRead,false);release(null);
 const diagnostic=await result;assert.equal(diagnostic.status,503);assert.equal(diagnostic.bodyFinished,true);assert.equal(diagnostic.state,'unavailable');assert.equal(diagnostic.reason,'read_failed');assert(!JSON.stringify(diagnostic).includes('private-sentinel'));
});
test('communication diagnostic body timeout stays bounded and a late private body is not read',async()=>{
 let release,reads=0;const finished=new Promise(resolve=>{release=resolve;});
 const result=readCommunicationResponse({status:()=>200,finished:()=>finished,body:async()=>{reads++;return Buffer.from('private-sentinel');}},{},performance.now()+20);
 await assert.rejects(result,/recovery deadline/);release(null);await Promise.resolve();await Promise.resolve();assert.equal(reads,0);
});
test('communication malformed, oversized and failed bodies never expose their private error text',async()=>{
 for(const body of [async()=>Buffer.from('private-sentinel'),async()=>Buffer.alloc(1_000_001),async()=>{throw Error('private-sentinel');}]){
  await assert.rejects(readCommunicationResponse({status:()=>200,finished:async()=>null,body},{},performance.now()+1000),error=>error.message==='Communication diagnostic body unavailable');
 }
});
test('communication network diagnostics correlate requests, cap events and detach without raw URLs or errors',async()=>{
 const page=new EventEmitter();page.mainFrame=()=>({});page.evaluate=async()=>({focused:true,visible:true,online:true,bodyPresent:false,unavailable:true,loading:false,paused:false,accessChanged:false});
 const observer=observeCommunicationRead(page,'http://127.0.0.1:1','private-sentinel');
 for(let i=0;i<80;i++)page.emit('request',{url:()=> 'http://127.0.0.1:1/_next/private-asset.js',headers:()=>({})});
 const request={url:()=> 'http://127.0.0.1:1/api/employee/communications/private-sentinel?private-query',method:()=> 'GET',headers:()=>({'x-nevora-communication-authority':'private-sentinel'}),failure:()=>({errorText:'cancelled private-error'})};
 page.emit('request',request);page.emit('requestfailed',request);for(let i=0;i<80;i++)page.emit('request',request);
 const result=await observer.finish();assert.equal(result.events[0].requestId,result.events[1].requestId);assert.equal(result.events[1].failure,'cancelled');assert.equal(result.events.length,64);assert(result.omittedEvents>0);assert(!JSON.stringify(result).includes('private-'));
 assert.equal(page.listenerCount('request'),0);assert.equal(page.listenerCount('response'),0);assert.equal(page.listenerCount('requestfailed'),0);
 const count=result.events.length;page.emit('request',request);assert.equal(result.events.length,count);
});
test('unrelated API activity cannot exhaust protected communication read diagnostics',async()=>{
 const page=new EventEmitter();page.evaluate=async()=>({});
 const observer=observeCommunicationRead(page,'http://127.0.0.1:1','protected');
 for(let i=0;i<80;i++)page.emit('request',{url:()=>`http://127.0.0.1:1/api/unrelated/${i}`,method:()=> 'GET',headers:()=>({})});
 page.emit('request',{url:()=> 'http://127.0.0.1:1/api/employee/communications/protected',method:()=> 'GET',headers:()=>({})});
 const result=await observer.finish();assert.equal(result.events.filter(x=>x.resource==='employee-detail').length,1);assert(result.events.length<=64);
});
test('diagnostic failure preserves an existing scenario error and still closes and checks runtime',async()=>{
 const original=Error('Original scenario failure'),calls=[];
 await assert.rejects(async()=>{
  try{throw original;}finally{
   const result=await finalizeCommunicationRead({scenarioFailed:true,diagnostic:{finish:async()=>{calls.push('finish');throw Error('private-sentinel');}},persist:async()=>calls.push('persist'),close:async()=>{calls.push('close');throw Error('close failure');},assertClean:()=>{calls.push('assert');throw Error('runtime failure');}});
   assert.deepEqual(result,{diagnosticFailed:true,cleanupFailed:true});
  }
 },error=>error===original);
 assert.deepEqual(calls,['finish','close','assert']);
});
test('failed diagnostic persistence cannot turn a passing scenario into success or skip cleanup',async()=>{
 for(const failFinish of [true,false]){
  const calls=[];
  await assert.rejects(finalizeCommunicationRead({scenarioFailed:false,diagnostic:{finish:async()=>{if(failFinish)throw Error('private-sentinel');return {};}},persist:async()=>{throw Error('private-sentinel');},close:async()=>calls.push('close'),assertClean:()=>calls.push('assert')}),error=>error.message==='Communication read diagnostic unavailable');
  assert.deepEqual(calls,['close','assert']);
 }
});
test('cleanup and runtime failures remain fatal after diagnostic collection',async()=>{
 const closeError=Error('Context closure failed'),runtimeError=Error('Runtime check failed');
 for(const checkFailure of [undefined,runtimeError]){
  let checked=false;
  await assert.rejects(finalizeCommunicationRead({scenarioFailed:false,diagnostic:null,persist:async()=>{},close:async()=>{throw closeError;},assertClean:()=>{checked=true;if(checkFailure)throw checkFailure;}}),error=>error===(checkFailure??closeError));
  assert.equal(checked,true);
 }
});
