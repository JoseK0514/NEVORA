import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {runInNewContext} from 'node:vm';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {observePinReadiness,pinFailureCategory,installPinReadinessObserver,runPinDiagnosticObservation} from './clocker-pin-readiness-diagnostic.mjs';

function fixture(options={}){
 const browser=new EventEmitter(),context=new EventEmitter(),page=new EventEmitter(),frame={};let callback,elapsed=0;
 page.mainFrame=()=>frame;page.isClosed=()=>true;page.evaluate=async()=>{throw Error('Execution context was destroyed: private-value');};
 context.exposeBinding=async(name,fn)=>{callback=fn;};context.addInitScript=async()=>{};
 const observer=observePinReadiness({browser,context,page,origin:'http://owned.invalid',engine:'webkit',source:{checkpoint:'a'.repeat(40),tree:'b'.repeat(40),sourceClean:true},now:()=>elapsed++,...options});
 const request=(path='/api/clocker/2/pin?secret=private-value',action='verify')=>({url:()=> 'http://owned.invalid'+path,method:()=> 'POST',postDataJSON:()=>({action,step:action,pin:'private-value',session:'private-value'}),failure:()=>({errorText:'net::ERR_ABORTED private-value'})});
 return {browser,context,page,frame,observer,request,receive:value=>callback({page,frame},value),foreign:value=>callback({page:{},frame},value)};
}

test('orders correlated setup/PIN requests, phases and lifecycle without retaining payloads or URLs',async()=>{
 const f=fixture();await f.observer.install();f.observer.phase('readiness','before');
 const setup=f.request('/api/clocker/2/setup?code=private-value','redeem');f.page.emit('request',setup);f.page.emit('response',{request:()=>setup,status:()=>200});f.page.emit('requestfinished',setup);
 f.observer.phase('readiness','after',{focused:true,visibility:'visible',online:true});
 const pin=f.request();f.page.emit('request',pin);f.page.emit('requestfailed',pin);f.page.emit('crash');f.context.emit('close');f.browser.emit('disconnected');
 const result=f.observer.snapshot();assert.deepEqual(result.events.map(x=>x.kind),['phase','request','response','requestfinished','phase','request','requestfailed','page-crash','context-close','browser-disconnected']);
 assert.deepEqual(result.events.slice(1,4).map(x=>x.requestId),[1,1,1]);assert.equal(result.events[5].requestId,2);assert.equal(result.events[1].action,'redeem');assert.equal(result.events[6].category,'aborted');
 assert(result.events.every((event,i)=>event.sequence===i+1&&event.elapsedMs>=0&&(i===0||event.elapsedMs>result.events[i-1].elapsedMs)));assert.equal(result.checkpoint,'a'.repeat(40));assert.equal(result.sourceClean,true);assert(!JSON.stringify(result).match(/private-value|owned.invalid|session|secret/));await f.observer.close();
});

test('ignores foreign/private boundaries and strips or rejects malformed browser inputs',async()=>{
 const f=fixture();await f.observer.install();
 for(const path of ['/api/clocker/private-value/pin','/api/auth/login','/api/clocker/2/pin/private-value'])f.page.emit('request',f.request(path));
 f.receive({kind:'submit',stage:'after',defaultPrevented:true,focused:true,pin:'private-value',heading:'private-value',visibility:'private-value',enteredDigits:999});
 f.receive({kind:'private-value',private:'private-value'});f.receive({kind:'submit',defaultPrevented:'private-value'});f.foreign({kind:'focus'});
 const result=f.observer.snapshot();assert.equal(result.events.length,1);assert.equal(result.events[0].defaultPrevented,true);assert.equal(result.events[0].stage,'after');assert.equal(result.rejectedInputs,3);assert(!JSON.stringify(result).includes('private-value'));assert(!Object.hasOwn(result.events[0],'enteredDigits'));await f.observer.close();
});

test('caps independent event lanes so network flooding cannot erase lifecycle failure evidence',async()=>{
 const f=fixture();for(let i=0;i<150;i++)f.page.emit('request',f.request());for(let i=0;i<70;i++)f.observer.phase('keypad','before');f.page.emit('crash');f.browser.emit('disconnected');
 const result=f.observer.snapshot();assert.equal(result.events.filter(x=>x.kind==='request').length,128);assert.equal(result.events.filter(x=>x.kind==='phase').length,64);assert.equal(result.omittedEvents,28);assert.deepEqual(result.events.slice(-2).map(x=>x.kind),['page-crash','browser-disconnected']);await f.observer.close();
});

test('retains lifecycle when page evaluation and screenshot fail, with recognized failure categories',async()=>{
 const f=fixture();f.page.emit('crash');await f.observer.captureFailure(async()=>{throw Error('Target page, context or browser has been closed private-value');});
 const result=f.observer.snapshot();assert.equal(result.events[0].kind,'page-crash');assert.deepEqual(result.events.slice(1).map(x=>[x.operation,x.category]),[['snapshot','context-destroyed'],['screenshot','target-closed']]);assert(!JSON.stringify(result).includes('private-value'));await f.observer.close();
});

test('categorizes known failures without persisting raw messages',()=>{
 const cases=[['Timeout 15000ms exceeded','timeout'],['Page crashed private-value','page-crashed'],['Target page, context or browser has been closed','target-closed'],['Execution context was destroyed','context-destroyed'],['net::ERR_ABORTED','aborted'],['net::ERR_CONNECTION_REFUSED','connection-failed'],['private-value','other']];for(const [input,expected]of cases)assert.equal(pinFailureCategory(Error(input)),expected);
});

test('removes listeners and disables exposed callbacks on repeated cleanup',async()=>{
 const f=fixture();await f.observer.install();await f.observer.close();await f.observer.close();const before=f.observer.snapshot();
 f.receive({kind:'focus'});f.page.emit('crash');f.observer.phase('continue','before');assert.deepEqual(f.observer.snapshot(),before);
 for(const emitter of [f.browser,f.context,f.page])assert.equal(emitter.eventNames().length,0);
});

function browserHarness(){
 const handlers=new Map(),timers=new Map(),received=[];let timer=0;
 const target={addEventListener:(name,fn)=>{handlers.set(name,fn);},removeEventListener:(name,fn)=>{if(handlers.get(name)===fn)handlers.delete(name);}};
 const document={...target,hasFocus:()=>true,visibilityState:'visible',readyState:'complete',querySelector:()=>null};
 const window={...target,__nevoraPinDiagnostic:async value=>{received.push(value);}};window.top=window;
 runInNewContext('('+installPinReadinessObserver.toString()+')()',{window,document,navigator:{onLine:true},setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)});
 return {window,handlers,timers,received,dispatch(prevent){const event={target:{matches:()=>true,querySelector:()=>({})},defaultPrevented:false};handlers.get('submit')(event);event.defaultPrevented=prevent;for(const [id,fn] of timers){timers.delete(id);fn();}return event;}};
}

test('native submit observation sees after-dispatch prevention and leaves submitted events unchanged',()=>{
 for(const prevented of [true,false]){const f=browserHarness(),event=f.dispatch(prevented);assert.equal(event.defaultPrevented,prevented);assert.equal(f.received.length,2);assert.deepEqual(f.received.map(x=>x.stage),['before','after']);assert.equal(f.received[0].defaultPrevented,false);assert.equal(f.received[1].defaultPrevented,prevented);f.window.__nevoraPinDiagnosticCleanup();assert.equal(f.handlers.size,0);assert.equal(f.timers.size,0);}
});

test('browser observer bounds pending timers and cancels pending observations during cleanup',()=>{
 const f=browserHarness();for(let i=0;i<200;i++)f.handlers.get('submit')({target:{matches:()=>true,querySelector:()=>({})},defaultPrevented:false});assert(f.timers.size<=64);assert(f.received.length<=64);f.window.__nevoraPinDiagnosticCleanup();assert.equal(f.timers.size,0);assert.equal(f.handlers.size,0);
});

test('flushes redacted incremental JSONL and upload-compatible JSON even with a dead page',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nevora-pin-diagnostic-'));
 try{const base=join(dir,'pin'),f=fixture({artifactBase:base});f.page.emit('crash');await f.observer.captureFailure();await f.observer.close();
 const summary=JSON.parse(await readFile(base+'.json','utf8')),lines=(await readFile(base+'.jsonl','utf8')).trim().split('\n').map(line=>JSON.parse(line));assert.equal(summary.events.length,2);assert.deepEqual(lines,summary.events);assert.equal(summary.events[1].category,'context-destroyed');assert(!JSON.stringify(summary).includes('private-value'));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('records artifact write failures and bounds failed evaluation/cleanup completion',async()=>{
 const f=fixture({persist:async()=>{throw Error('private-value');}});f.page.emit('crash');await f.observer.close();assert.equal(f.observer.snapshot().writeFailure,'other');
 const held=fixture();held.page.evaluate=()=>new Promise(()=>{});const at=performance.now();await held.observer.captureFailure();assert(performance.now()-at<2000);assert.equal(held.observer.snapshot().events[0].category,'timeout');await held.observer.close();
});

test('failure-only observation wrapper bounds an unresponsive page and preserves rejection categories',async()=>{
 await assert.rejects(runPinDiagnosticObservation(()=>new Promise(()=>{})),error=>pinFailureCategory(error)==='timeout');
 await assert.rejects(runPinDiagnosticObservation(()=>{throw Error('Target page closed private-value');}),error=>pinFailureCategory(error)==='target-closed');
});

test('late page and writer rejections cannot mutate disposed evidence',async()=>{
 let rejectWrite,rejectView;const f=fixture({persist:()=>new Promise((_,reject)=>{rejectWrite=reject;})});
 f.page.evaluate=()=>new Promise((_,reject)=>{rejectView=reject;});f.page.emit('crash');await f.observer.captureFailure();await f.observer.close();
 const before=f.observer.snapshot();rejectWrite(Error('private-value'));rejectView(Error('Page crashed private-value'));await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(f.observer.snapshot(),before);assert.equal(before.writeFailure,'timeout');assert(!JSON.stringify(before).includes('private-value'));
});

test('expired installation cannot register init script or accept late binding evidence',async()=>{
 const f=fixture();let releaseBinding,binding,initCalls=0;
 f.context.exposeBinding=async(name,receive)=>{binding=receive;await new Promise(resolve=>{releaseBinding=resolve;});};
 f.context.addInitScript=async()=>{initCalls++;};
 await f.observer.install();const expired=f.observer.snapshot();assert.equal(initCalls,0);assert.deepEqual(expired.events.map(x=>[x.operation,x.category]),[['install','timeout']]);
 releaseBinding();await new Promise(resolve=>setTimeout(resolve,0));
 binding({page:f.page,frame:f.frame},{kind:'focus',focused:true});binding({page:{},frame:{}},{kind:'private-value'});
 assert.equal(initCalls,0);assert.deepEqual(f.observer.snapshot(),expired);await f.observer.close();
});

test('cleanup retires a pending installation before its binding resolves',async()=>{
 const f=fixture();let releaseBinding,binding,initCalls=0;
 f.context.exposeBinding=async(name,receive)=>{binding=receive;await new Promise(resolve=>{releaseBinding=resolve;});};f.context.addInitScript=async()=>{initCalls++;};
 const installing=f.observer.install();await new Promise(resolve=>setTimeout(resolve,0));await f.observer.close();const disposed=f.observer.snapshot();releaseBinding();await installing;
 binding({page:f.page,frame:f.frame},{kind:'focus',focused:true});assert.equal(initCalls,0);assert.deepEqual(f.observer.snapshot(),disposed);
});
