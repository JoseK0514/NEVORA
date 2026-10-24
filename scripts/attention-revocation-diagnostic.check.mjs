import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {observeRevocationActions,captureRevocationFailure} from './attention-revocation-diagnostic.mjs';

test('session-revocation responses are correlated outside the separate unavailable-retry stage without private fields',()=>{
 const page=new EventEmitter(),frame={},origin='http://127.0.0.1:12345';page.mainFrame=()=>frame;let stage='other';const observer=observeRevocationActions(page,origin,()=>stage,()=>7);
 const request={method:()=> 'POST',url:()=>origin+'/app/schedule?private-value',headers:()=>({'next-action':'private-value',cookie:'private-value'}),isNavigationRequest:()=>false,frame:()=>frame};
 page.emit('request',request);assert.equal(observer.snapshot().events.length,0);stage='session-revocation';page.emit('request',request);
 page.emit('response',{request:()=>request,status:()=>303,headers:()=>({'x-action-redirect':'/login?private-value;push','set-cookie':'private-value'})});page.emit('requestfinished',request);
 const snapshot=observer.snapshot();assert.deepEqual(snapshot.events.map(x=>x.event),['request','response','requestfinished']);assert(snapshot.events.every(x=>x.requestId===1));assert.equal(snapshot.events[1].redirect,'login');assert.equal(snapshot.events[1].status,303);assert(!JSON.stringify(snapshot).includes('private-value'));assert(!JSON.stringify(snapshot).includes('127.0.0.1'));
 observer.close();observer.close();page.emit('request',request);assert.deepEqual(observer.snapshot(),snapshot);assert.equal(page.listenerCount('response'),0);
});
test('revocation action observation is capped and records diagnostic failure without private exception text',()=>{
 const page=new EventEmitter(),frame={};page.mainFrame=()=>frame;const observer=observeRevocationActions(page,'http://127.0.0.1:12345',()=> 'session-revocation',()=>0);
 for(let i=0;i<66;i++)page.emit('request',{method:()=> 'POST',url:()=> 'http://127.0.0.1:12345/app/schedule',headers:()=>({'next-action':'private-value'}),isNavigationRequest:()=>false,frame:()=>frame});
 page.emit('request',{method:()=>{throw Error('private-value');}});const snapshot=observer.snapshot();assert.equal(snapshot.events.length,64);assert.equal(snapshot.omittedEvents,2);assert.equal(snapshot.observationFailures,1);assert(!JSON.stringify(snapshot).includes('private-value'));observer.close();
});
test('failure capture projects route and identity presence, safe database waits and counts without raw data',async()=>{
 const result=await captureRevocationFailure({view:async()=>({route:'schedule',readyState:'complete',focused:true,visibility:'visible',signInVisible:false,confirmPending:true,authorityInputs:1,operationPresent:true,private:'private-value'}),sessions:async()=>[{sessions:0,private:'private-value'}],databaseWaits:async()=>[],serverRequests:async()=> 'private-value',screenshot:async()=> 'private-value'},50);
 assert.equal(result.view.route,'schedule');assert.equal(result.view.authorityInputs,1);assert.equal(result.sessions.remaining,0);assert.deepEqual(result.databaseWaits,[]);assert.deepEqual(result.serverRequests,[]);assert.equal(result.screenshot.captured,true);assert(!JSON.stringify(result).includes('private-value'));
});
test('failure-only observations and screenshot have bounded deadlines and reject late private results',async()=>{
 let release;const held=new Promise(resolve=>{release=resolve;});const result=await captureRevocationFailure({view:()=>held,sessions:()=>held,databaseWaits:()=>held,serverRequests:()=>held,screenshot:()=>held},20);
 for(const key of ['viewFailure','sessionsFailure','databaseWaitsFailure','serverRequestsFailure','screenshotFailure'])assert(result[key]);const before=JSON.stringify(result);release({private:'private-value'});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(JSON.stringify(result),before);assert(!before.includes('private-value'));await assert.rejects(captureRevocationFailure({},5001),/budget/);
});
