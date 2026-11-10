import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {runInNewContext} from 'node:vm';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import * as diagnostic from './employee-hours-return-diagnostic.mjs';
const selection='2026-09-21_2026-09-27',path='/api/employee/hours/cards/'+selection;
function pageFixture(state='paused'){
 const page=new EventEmitter(),frame={page:()=>page},listeners=new Map();let mutation,disconnected=false;
 const flags={state,online:true,visibility:'visible',focused:true,context:'cards|'+selection+'|||'};
 const target={addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}};
 const window={...target},document={...target,hasFocus:()=>flags.focused,get visibilityState(){return flags.visibility;},querySelector(selector){if(selector==='.c-hours')return {getAttribute:name=>({'data-hours-state':flags.state,'data-hours-view':'cards','data-hours-context':flags.context}[name])};if(selector==='#hours-timecard')return flags.state==='ready'?{}:null;return null;}};
 window.top=window;
 const env={window,document,navigator:{get onLine(){return flags.online;}},location:{pathname:'/app/my-time',search:'?view=cards&start=2026-09-21&end=2026-09-27'},URLSearchParams,Date,performance,MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){disconnected=true;}}};
 page.mainFrame=()=>frame;page.isClosed=()=>false;
 // Playwright transports values across realms rather than returning VM prototypes.
 page.evaluate=async(fn,arg)=>JSON.parse(JSON.stringify(runInNewContext('('+fn.toString()+')(argument)',{...env,argument:arg})));
 const request=(overrides={})=>({url:()=> 'http://owned.invalid'+path,method:()=> 'GET',frame:()=>frame,failure:()=>({errorText:'net::ERR_ABORTED PRIVATE_SENTINEL'}),...overrides});
 return {page,frame,flags,request,dispatch(name){listeners.get(name)?.({target:window});},mutate(){mutation?.();},listeners,disconnected:()=>disconnected};
}
function observer(f,extra={}){
 assert.equal(typeof diagnostic.observeEmployeeHoursReturn,'function','Employee target witness must exist');
 return diagnostic.observeEmployeeHoursReturn({page:f.page,origin:'http://owned.invalid',selection,engine:'webkit',source:{checkpoint:'a'.repeat(40),tree:'b'.repeat(40),sourceClean:true},...extra});
}

test('binds lifecycle, final state and request outcomes to Employee even with Manager created last',async()=>{
 const employee=pageFixture(),manager=pageFixture('ready'),witness=observer(employee);await witness.install();
 manager.page.emit('request',manager.request());
 const request=employee.request();employee.page.emit('request',request);employee.page.emit('response',{request:()=>request,status:()=>503});employee.page.emit('requestfinished',request);
 employee.flags.state='unavailable';employee.mutate();await witness.close('failure');
 const result=witness.snapshot();assert.equal(result.target,'employee-hours-return');assert.equal(result.final.state,'unavailable');assert.equal(result.final.periodMatch,true);assert.equal(result.outcome,'failure');
 assert.deepEqual(result.network.map(x=>x.kind),['request','response','requestfinished']);assert.equal(result.network[1].status,503);assert.equal(new Set(result.network.map(x=>x.requestId)).size,1);
 assert(result.lifecycle.some(x=>x.state==='paused'));assert(result.lifecycle.some(x=>x.state==='unavailable'));assert.equal(result.checkpoint,'a'.repeat(40));
 assert.equal(employee.listeners.size,0);assert.equal(employee.disconnected(),true);
});

test('rejects other pages, subframes, foreign origins, wrong selections, query strings and methods; never serializes private values',async()=>{
 const f=pageFixture(),other=pageFixture(),witness=observer(f);await witness.install();
 for(const overrides of [{frame:()=>other.frame},{frame:()=>({page:()=>f.page})},{url:()=> 'http://foreign.invalid'+path},{url:()=> 'http://owned.invalid'+path+'?PRIVATE_SENTINEL'},{url:()=> 'http://owned.invalid'+path+'/PRIVATE_SENTINEL'},{url:()=> 'http://owned.invalid/api/employee/hours/cards/2026-09-14_2026-09-20'},{method:()=> 'POST'}]){const request=f.request(overrides);f.page.emit('request',request);f.page.emit('response',{request:()=>request,status:()=>200});f.page.emit('requestfinished',request);}
 const request=f.request();f.page.emit('request',request);f.page.emit('requestfailed',request);
 f.flags.state='PRIVATE_SENTINEL';f.flags.context='PRIVATE_SENTINEL';f.mutate();await witness.close('failure');const result=witness.snapshot();
 assert.deepEqual(result.network.map(x=>x.kind),['request','requestfailed']);assert.equal(result.network[1].category,'aborted');assert.equal(result.final.state,'other');assert.equal(result.final.periodMatch,false);
 assert(!JSON.stringify(result).match(/PRIVATE_SENTINEL|owned.invalid|foreign.invalid|errorText|cookie|headers/));
});

test('caps independent lanes, reports exact omissions and reserves the actual final state after saturation',async()=>{
 const f=pageFixture(),witness=observer(f);await witness.install();
 for(let i=0;i<200;i++){f.dispatch('online');const request=f.request();f.page.emit('request',request);f.page.emit('requestfailed',request);}
 f.flags.state='ready';await witness.close('success');const result=witness.snapshot();
 assert.equal(result.lifecycle.length,64);assert.equal(result.omittedLifecycle,137);assert.equal(result.network.length,128);assert.equal(result.omittedNetwork,272);assert.equal(result.final.state,'ready');assert.equal(result.final.cardPresent,true);
});

test('captures hidden/online flags without activation or event changes and removes all observers at shutdown',async()=>{
 const f=pageFixture(),witness=observer(f);await witness.install();f.flags.visibility='hidden';f.flags.focused=false;f.flags.online=false;f.dispatch('offline');
 await witness.close('failure');const before=witness.snapshot();assert.equal(before.final.visibility,'hidden');assert.equal(before.final.online,false);assert.equal(before.final.focused,false);
 f.flags.state='ready';f.dispatch('online');f.mutate();f.page.emit('request',f.request());await witness.close('success');assert.deepEqual(witness.snapshot(),before);assert.equal(f.page.eventNames().length,0);assert.equal(f.listeners.size,0);
});

test('writes source-bound upload-compatible JSON without raw browser data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hours-return-'));
 try{const file=join(dir,'webkit-employee-hours-return.json'),f=pageFixture(),witness=observer(f,{artifactPath:file});await witness.install();await witness.close('failure');const saved=JSON.parse(await readFile(file,'utf8'));assert.deepEqual(saved,witness.snapshot());assert.equal(saved.sourceClean,true);assert.equal(saved.final.state,'paused');}finally{await rm(dir,{recursive:true,force:true});}
});

test('bounded failed final evaluation retains network evidence and late resolution cannot mutate disposed output',async()=>{
 const f=pageFixture(),witness=observer(f);await witness.install();const request=f.request();f.page.emit('request',request);let release;
 f.page.evaluate=()=>new Promise(resolve=>{release=resolve;});const started=performance.now();await witness.close('failure');assert(performance.now()-started<2000);const before=witness.snapshot();assert.equal(before.finalFailure,'timeout');assert.equal(before.network.length,1);
 release({final:{state:'PRIVATE_SENTINEL'},lifecycle:[]});await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(witness.snapshot(),before);
});

test('retiring a pending installation prevents late browser installation and late state changes',async()=>{
 const f=pageFixture(),evaluate=f.page.evaluate;let release,issued;
 f.page.evaluate=(fn,arg)=>new Promise(resolve=>{issued={fn,arg};release=()=>resolve(evaluate(fn,arg));});
 const witness=observer(f),installing=witness.install();await new Promise(resolve=>setTimeout(resolve,0));
 // Let installation expire before its dispatched browser operation actually runs.
 await installing;assert.equal(witness.snapshot().installFailure,'timeout');const pending=release;
 f.page.evaluate=evaluate;await witness.close('failure');const before=witness.snapshot();pending();await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(witness.snapshot(),before);assert.equal(f.listeners.size,0);assert(issued);
});

test('artifact write failure is categorical and cannot replace the original scenario outcome',async()=>{
 const f=pageFixture(),witness=observer(f,{artifactPath:'/nonexistent/PRIVATE_SENTINEL/file.json'});await witness.install();await witness.close('failure');assert.equal(witness.snapshot().writeFailure,'other');assert.equal(witness.snapshot().outcome,'failure');assert(!JSON.stringify(witness.snapshot()).includes('PRIVATE_SENTINEL'));
});

test('cleanup tombstone blocks an installation already dispatched before its deadline',async()=>{
 const f=pageFixture(),evaluate=f.page.evaluate;let release;
 f.page.evaluate=(fn,arg)=>new Promise(resolve=>{release=()=>resolve(evaluate(fn,arg));});
 const witness=observer(f),installing=witness.install();await new Promise(resolve=>setTimeout(resolve,0));
 f.page.evaluate=evaluate;await witness.close('failure');const before=witness.snapshot();release();await installing;
 assert.deepEqual(witness.snapshot(),before);assert.equal(f.listeners.size,0);assert.equal(before.omittedLifecycle,null);
});

test('an unresponsive install/final read is bounded and keeps omissions unknown rather than inventing zero',async()=>{
 const f=pageFixture();f.page.evaluate=()=>new Promise(()=>{});const witness=observer(f),started=performance.now();await witness.install();await witness.close('failure');
 assert(performance.now()-started<3000);const result=witness.snapshot();assert.equal(result.installFailure,'timeout');assert.equal(result.finalFailure,'timeout');assert.equal(result.omittedLifecycle,null);assert.equal(result.final,null);assert.equal(result.outcome,'failure');assert.equal(f.page.eventNames().length,0);
});
