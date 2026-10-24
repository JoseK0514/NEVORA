import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {installRscCaughtErrorObserver,observeRscCaughtErrors,projectRscCaughtError,requestFailureCategory} from './rsc-caught-error-observer.mjs';
import {verifyRscCaughtErrorDiagnostic} from './rsc-caught-error-diagnostic.mjs';

test('caught metadata distinguishes network wording from processing failures without retaining private values',()=>{
 const native=new TypeError('Load failed');native.stack='TypeError: Load failed\n at createFetch (private-sentinel)';
 const projection=projectRscCaughtError(native);assert.equal(projection.error.name,'TypeError');assert.equal(projection.error.messageKind,'load-failed');assert(projection.error.createFetch);assert(!JSON.stringify(projection).includes('private-sentinel'));
 const processing=new SyntaxError('private-sentinel');processing.cause=new Error('private-sentinel');
 const other=projectRscCaughtError(processing);assert.equal(other.error.name,'SyntaxError');assert.equal(other.error.messageKind,'other');assert.equal(other.cause.messageKind,'other');assert(!JSON.stringify(other).includes('private-sentinel'));
 assert.deepEqual(projectRscCaughtError({get name(){throw Error('private-sentinel');}}),{error:null,cause:null,projectionUnavailable:true});
 assert.equal(projectRscCaughtError({name:'Error',message:'constructor'}).error.messageKind,'other');
});

test('console observation preserves the original receiver, arguments, return and exception',()=>{
 const calls=[],observed=[],receiver={};const failure=new Error('private-sentinel');
 const sandbox={console:{error:function(...args){calls.push({receiver:this,args});if(args[0]==='throw')throw failure;return 17;}},performance:{timeOrigin:100,now:()=>12},document:{readyState:'complete'},__nevoraQaRscCaughtError:value=>{observed.push(value);return Promise.resolve();}};
 vm.runInNewContext('('+installRscCaughtErrorObserver.toString()+')('+projectRscCaughtError.toString()+');',sandbox);
 const error=new TypeError('Load failed'),message='Failed to fetch RSC payload for private-sentinel. Falling back to browser navigation.';
 assert.equal(sandbox.console.error.call(receiver,message,error),17);assert.equal(calls[0].receiver,receiver);assert.deepEqual(calls[0].args,[message,error]);assert.equal(observed.length,1);assert.equal(observed[0].error.messageKind,'load-failed');assert(!JSON.stringify(observed).includes('private-sentinel'));
 assert.equal(sandbox.console.error('ordinary',failure),17);assert.equal(observed.length,1);assert.throws(()=>sandbox.console.error('throw'),error=>error===failure);
});

test('binding persistence accepts only bounded fixed fields even for an arbitrary caller',async()=>{
 let binding,script;const page={},records=[];
 await observeRscCaughtErrors({exposeBinding:async(_name,fn)=>{binding=fn;},addInitScript:async value=>{script=value.content;}},(source,value)=>records.push({source,value}));
 binding({page},{error:{name:'private-sentinel',messageKind:'private-sentinel',createFetch:true,stack:'private-sentinel'},cause:{name:'Error',messageKind:'other',message:'private-sentinel'},timeOrigin:Infinity,elapsedMs:-1,readyState:'private-sentinel'});
 assert.equal(records[0].source,page);assert.equal(records[0].value.error.name,'other');assert.equal(records[0].value.timeOrigin,null);assert.equal(records[0].value.elapsedMs,null);assert(!JSON.stringify(records).includes('private-sentinel'));assert(script.includes('Reflect.apply'));
});

test('request failure categories retain cancellation evidence without arbitrary network text',()=>{
 for(const value of ['net::ERR_ABORTED','cancelled','canceled','The operation was aborted.'])assert.equal(requestFailureCategory(value),'aborted');
 assert.equal(requestFailureCategory('net::ERR_CONNECTION_RESET'),'connection-failed');assert.equal(requestFailureCategory('private-sentinel'),'other');assert.equal(requestFailureCategory(undefined),'unavailable');
});

for(const stage of ['navigation','read'])test('stalled '+stage+' control hits its deadline and closes its context',{timeout:8000},async()=>{
 let closed=false,cancel,reads=0,lateReadResolved=false;
 const pending=new Promise((_,reject)=>{cancel=reject;});
 const handle={evaluate:async()=>{reads++;if(reads===1)return;if(reads===2)return 'fictional';await pending;lateReadResolved=true;return {};}};
 const page={on:()=>{},setDefaultTimeout:()=>{},goto:async()=>stage==='navigation'?pending:null,evaluateHandle:async()=>handle};
 const context={route:async()=>{},addInitScript:async()=>{},exposeBinding:async()=>{},newPage:async()=>page,close:async()=>{closed=true;cancel(Error('Fictional context closed'));}};
 await assert.rejects(verifyRscCaughtErrorDiagnostic({newContext:async()=>context}),/recovery deadline/);
 assert(closed,'A timed-out control must release the browser context before rejection reaches its caller');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(lateReadResolved,false);if(stage==='read')assert.equal(reads,3,'Exercise the actual fetch/response evaluation after identity setup');
});
