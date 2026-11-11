import assert from 'node:assert/strict';
import test from 'node:test';
import {pressFocusedD2Retry} from './d2-native-retry-focus.mjs';

const ready=()=>({documentFocused:true,visible:true,buttonPresent:true,buttonFocused:true,enabled:true,notice:'unconfirmed',eventCount:0,truncated:false,events:[],tainted:false});
function fixture(read=async()=>ready()){
 const receipt={phases:[]},calls={focus:0,key:0},retry={focus:async()=>{calls.focus++;}},page={evaluate:read,keyboard:{press:async key=>{assert.equal(key,'Enter');calls.key++;}}};
 return {receipt,calls,retry,page,run:deadline=>pressFocusedD2Retry(retry,page,receipt,1,deadline,{pollMs:1})};
}
test('reacquires focus after enabled-to-disabled renewal before sending one Enter',async()=>{
 let reads=0;const f=fixture(async()=>++reads===1?{...ready(),enabled:false,buttonFocused:false}:ready());
 await f.run(performance.now()+1000);
 assert.equal(f.calls.focus,2);assert.equal(f.calls.key,1);assert.equal(f.receipt.phases.length,1);
 assert.equal(f.receipt.phases[0].phase,'focused');assert.equal(f.receipt.phases[0].enabled,true);assert.equal(f.receipt.phases[0].buttonFocused,true);
});
for(const flag of ['enabled','buttonFocused','documentFocused','visible','buttonPresent'])test(`persistent ${flag}=false never sends input`,async()=>{
 const f=fixture(async()=>({...ready(),[flag]:false}));
 await assert.rejects(f.run(performance.now()+25),/recovery deadline/);assert.equal(f.calls.key,0);assert.deepEqual(f.receipt.phases,[]);
});
test('a late ready witness cannot send Enter or append a focused phase after the deadline',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));
 await assert.rejects(f.run(performance.now()+25),/recovery deadline/);
 finish(ready());await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.key,0);assert.deepEqual(f.receipt.phases,[]);
});
test('an expired deadline does not attempt focus or input',async()=>{
 const f=fixture();await assert.rejects(f.run(performance.now()-1),/recovery deadline/);assert.deepEqual(f.calls,{focus:0,key:0});
});
test('a tainted witness fails closed without input or private metadata',async()=>{
 const f=fixture(async()=>({...ready(),privateValue:'PRIVATE'}));
 await assert.rejects(f.run(performance.now()+1000),/untainted/);assert.equal(f.calls.key,0);assert(!JSON.stringify(f.receipt).includes('PRIVATE'));
});
test('an unknown keyboard completion remains a failure after exactly one input attempt',async()=>{
 const f=fixture(),failure=Error('owned keyboard delivery unknown');f.page.keyboard.press=async()=>{f.calls.key++;throw failure;};
 await assert.rejects(f.run(performance.now()+1000),error=>error===failure);assert.deepEqual(f.calls,{focus:1,key:1});
});
test('a keyboard timeout cannot re-enter acquisition or resend after late completion',async()=>{
 let finish;const f=fixture();f.page.keyboard.press=()=>{f.calls.key++;return new Promise(resolve=>{finish=resolve;});};
 await assert.rejects(f.run(performance.now()+25),/recovery deadline/);const retained=JSON.stringify(f.receipt);
 finish();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls,{focus:1,key:1});assert.equal(JSON.stringify(f.receipt),retained);
});
