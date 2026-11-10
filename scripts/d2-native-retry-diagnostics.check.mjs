import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {installD2NativeRetryTrace,readD2NativeRetryTrace,captureD2NativeRetry,observeD2ManagerPostOutcomes} from './d2-native-retry-diagnostics.mjs';

function surface(){
 const listeners=new Map(),button={disabled:false,closest:()=>button},body={closest:()=>null};
 const document={hasFocus:()=>true,visibilityState:'visible',activeElement:button,querySelector:selector=>selector==='.manager-corrections-retry'?button:null,addEventListener:(name,fn)=>listeners.set(name,fn)};
 const window={addEventListener:(name,fn)=>listeners.set(name,fn)};
 const context=vm.createContext({window,document,performance:{now:()=>123},Object});
 vm.runInContext('('+installD2NativeRetryTrace.toString()+')()',context);
 return {button,body,document,window,context,emit:(type,target=button,trusted=true)=>listeners.get(type)?.({type,key:'Enter',target,isTrusted:trusted}),read:()=>JSON.parse(JSON.stringify(vm.runInContext('('+readD2NativeRetryTrace.toString()+')()',context)))};
}

test('distinguishes trusted retry input from a lost-focus key and never invokes a click',()=>{
 const s=surface();s.emit('keydown');s.emit('click');s.document.activeElement=s.body;s.emit('keydown',s.body);
 const receipt=s.read();assert.equal(receipt.buttonFocused,false);assert.deepEqual(receipt.events.map(e=>[e.type,e.targetIsRetry,e.trusted]),[['keydown',true,true],['click',true,true],['keydown',false,true]]);
});
test('retains pause/disabled state and distinguishes synthetic input without private text',()=>{
 const s=surface();s.button.disabled=true;s.document.hasFocus=()=>false;s.emit('blur',s.body);s.emit('keydown',s.button,false);
 s.document.querySelector=selector=>selector==='.manager-corrections-retry'?s.button:{textContent:'PRIVATE profile and credential'};
 const receipt=s.read();assert.equal(receipt.documentFocused,false);assert.equal(receipt.enabled,false);assert.equal(receipt.events[1].trusted,false);assert(!JSON.stringify(receipt).includes('PRIVATE'));
});
test('bounds event history while retaining total count and no arbitrary event properties',()=>{
 const s=surface();for(let i=0;i<100;i++)s.emit('keydown');const receipt=s.read();assert.equal(receipt.events.length,32);assert.equal(receipt.eventCount,100);assert.equal(receipt.truncated,true);
});
test('a stuck diagnostic read is bounded and cannot replace the caller failure',async()=>{
 const receipt={phases:[]},failure=Error('original action failure');
 await assert.rejects((async()=>{try{throw failure;}catch(error){await captureD2NativeRetry(receipt,{evaluate:()=>new Promise(()=>{})},'failed',1,20);throw error;}})(),error=>error===failure);
 assert.deepEqual(receipt.phases,[{phase:'failed',postCalls:1,diagnosticFailed:true}]);
});
test('counts only exact owned POST outcomes, bounds history and removes listeners',()=>{
 const page=new EventEmitter(),receipt={transport:[]},stop=observeD2ManagerPostOutcomes(page,receipt,'http://127.0.0.1:5000');
 const request=(url,method='POST')=>({url:()=>url,method:()=>method});
 const owned=request('http://127.0.0.1:5000/api/manager/time-corrections');
 for(const unrelated of [request('http://other.test/api/manager/time-corrections'),request('http://127.0.0.1:5000/api/manager/time-corrections?PRIVATE'),request('http://127.0.0.1:5000/api/manager/time-corrections','GET')])page.emit('requestfailed',unrelated);
 assert.deepEqual(receipt.transport,[]);
 page.emit('response',{request:()=>owned,status:()=>200});for(let i=0;i<20;i++)page.emit('requestfailed',owned);
 assert.equal(receipt.transport.length,8);assert.deepEqual(receipt.transport[0],{kind:'response',status:200});assert(!JSON.stringify(receipt).includes('PRIVATE'));
 stop();assert.equal(page.listenerCount('response'),0);assert.equal(page.listenerCount('requestfailed'),0);
});
