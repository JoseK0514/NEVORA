import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {waitForPrivateIntentClear} from './browser-render-readiness.mjs';

/** Exercise the actual component through SSR and hydration. Only the router and
 * action boundaries are fictional; no command is submitted. Scheduler delivery
 * is explicitly held so readiness cannot accidentally depend on machine speed. */
export async function runAttentionSsrReadinessControl(){
 const source=resolve(process.cwd()),project=createRequire(join(source,'package.json'));
 const runtime=createRequire(join(source,'tools/ci-browser-runtime/package.json')),pw=runtime('playwright'),{build}=project('esbuild');
 assert.equal(runtime('playwright/package.json').version,'1.62.1');
 const element="<React.StrictMode><EmployeeWeeklyConfirmation weekStart='2026-10-26' expectedRevisionId='fictional-revision' intent={{operationId:'fictional-ssr-operation',authority:'fictional-ssr-authority'}}/></React.StrictMode>";
 const imports="import React from 'react';import{EmployeeWeeklyConfirmation}from'./src/components/employee-weekly-confirmation';";
 const plugin={name:'declared-fictional-framework-boundaries',setup(b){
  b.onResolve({filter:/^next\/navigation$/},()=>({path:'router',namespace:'fixture'}));
  b.onResolve({filter:/^@\/app\/app\/schedule\/acknowledge-actions$/},()=>({path:'action',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='router'
   ?'const router={refresh(){window.fictionalRefreshes=(window.fictionalRefreshes??0)+1;}};export function useRouter(){return typeof window!=="undefined"&&window.fictionalRouter?window.fictionalRouter:router;}'
   :'export async function acknowledgeScheduleAction(){throw Error("No action is submitted in this lifecycle control");}',loader:'js',resolveDir:source}));
 }};
 const options={bundle:true,write:false,jsx:'automatic',loader:{'.css':'empty'},plugins:[plugin]};
 const serverBundle=await build({...options,stdin:{contents:imports+"import{renderToString}from'react-dom/server';export function render(){return renderToString("+element+");}",resolveDir:source,loader:'tsx'},platform:'node',format:'cjs',external:['react','react-dom/server']});
 const fixtureModule={exports:{}};new Function('module','exports','require',serverBundle.outputFiles[0].text)(fixtureModule,fixtureModule.exports,project);
 const markup=fixtureModule.exports.render();
 const clientBundle=await build({...options,stdin:{contents:imports+"import{hydrateRoot}from'react-dom/client';let root;window.startHydration=()=>{root=hydrateRoot(document.getElementById('root'),"+element+");};window.renderConfirmation=()=>root.render("+element+");window.unmountConfirmation=()=>root.render(null);window.replaceRouter=()=>{window.fictionalRouter={refresh(){window.fictionalRefreshes=(window.fictionalRefreshes??0)+1;}};window.renderConfirmation();};",resolveDir:source,loader:'tsx'},platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'}});
 // Preserve native registration/removal, callback arguments and this. This leaf
 // fixture's only window pagehide subscriber is the actual component.
 const controls=`
window.effectRecords=[];window.effectClock=[];window.heldReactTasks=[];window.holdReactTasks=true;
window.fixtureVisibility=new URL(location.href).searchParams.has('hidden')?'hidden':'visible';
Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.fixtureVisibility});
const nativeAdd=window.addEventListener,nativeRemove=window.removeEventListener,records=new WeakMap();
window.addEventListener=function(type,listener,options){
 if(type!=='pagehide'||typeof listener!=='function')return nativeAdd.call(this,type,listener,options);
 let record=records.get(listener);
 if(!record){record={active:false,invocations:0,registrations:0,removals:0};record.wrapped=function(event){record.invocations++;window.effectClock.push({event:'handler',at:performance.now()});return listener.call(this,event);};records.set(listener,record);window.effectRecords.push(record);}
 record.active=true;record.registrations++;window.effectClock.push({event:'install',at:performance.now()});return nativeAdd.call(this,type,record.wrapped,options);
};
window.removeEventListener=function(type,listener,options){
 const record=type==='pagehide'&&typeof listener==='function'?records.get(listener):null;
 if(record){record.active=false;record.removals++;window.effectClock.push({event:'remove',at:performance.now()});return nativeRemove.call(this,type,record.wrapped,options);}
 return nativeRemove.call(this,type,listener,options);
};
const NativeMessageChannel=window.MessageChannel;
window.MessageChannel=class extends NativeMessageChannel{constructor(){super();const port=this.port1;let listener;Object.defineProperty(port,'onmessage',{configurable:true,get:()=>listener,set:value=>{listener=value;port.addEventListener('message',event=>{const run=()=>value(event);if(window.holdReactTasks)window.heldReactTasks.push(run);else run();});port.start();}});}};
window.releaseReactTasks=()=>{window.holdReactTasks=false;for(const run of window.heldReactTasks.splice(0))run();};
window.snapshotLifecycle=()=>({at:performance.now(),authorityFields:document.querySelectorAll('input[name="authority"]').length,sameOperation:document.querySelector('input[name="operationId"]')?.value==='fictional-ssr-operation',activeListeners:window.effectRecords.filter(r=>r.active).length,registrations:window.effectRecords.reduce((n,r)=>n+r.registrations,0),removals:window.effectRecords.reduce((n,r)=>n+r.removals,0),invocations:window.effectRecords.reduce((n,r)=>n+r.invocations,0),heldTasks:window.heldReactTasks.length,preparing:[...document.querySelectorAll('[role="status"]')].some(node=>node.textContent==='Preparing confirmation…'),buttons:document.querySelectorAll('button').length});
window.observeConfirmation=()=>{let present=false;new MutationObserver(()=>{const state=window.snapshotLifecycle();if(state.authorityFields&&!present)window.effectClock.push({event:'form-attached',...state});present=state.authorityFields>0;}).observe(document.getElementById('root'),{childList:true,subtree:true});};`;
 const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(clientBundle.outputFiles[0].contents);return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fictional SSR readiness control</title><script>'+controls+'</script></head><body><main id="root">'+markup+'</main><script>window.observeConfirmation();</script><script src="/bundle.js"></script></body></html>');
 });
 await new Promise(ready=>server.listen(0,'127.0.0.1',ready));
 const origin='http://127.0.0.1:'+server.address().port,results=[];
 try{for(const engine of ['chromium','webkit']){
  const result={engine,status:'failed'};results.push(result);let browser,context,page;
  try{
   browser=await pw[engine].launch({headless:true});result.browserVersion=browser.version();
   context=await browser.newContext({viewport:{width:1024,height:1000}});let external=0;const errors=[];
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external++;return route.abort();}return route.continue();});
   page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push({name:error.name,message:error.message.replace(/https?:\/\/\S+/g,'[URL]')}));
   await page.goto(origin);await page.waitForLoadState('networkidle');
   result.serverRendered=await page.evaluate(()=>window.snapshotLifecycle());assert.equal(result.serverRendered.activeListeners,0);
   await page.evaluate(()=>window.startHydration());await page.waitForFunction(()=>window.heldReactTasks.length>0);
   result.beforeEarlyEvent=await page.evaluate(()=>window.snapshotLifecycle());assert.equal(result.beforeEarlyEvent.activeListeners,0);
   result.earlyEvent=await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));return window.snapshotLifecycle();});assert.equal(result.earlyEvent.invocations,0);
   await page.evaluate(()=>window.releaseReactTasks());await page.waitForFunction(()=>window.effectRecords.filter(r=>r.active).length===1);
   await page.locator('input[name="authority"]').waitFor({state:'attached'});
   result.readyIntent=await page.evaluate(()=>window.snapshotLifecycle());assert.equal(result.readyIntent.sameOperation,true);
   // Retain the original failure mechanism on an uncorrected component, then
   // exercise the armed positive control in that very same document/operation.
   if(result.beforeEarlyEvent.authorityFields){const at=performance.now();await assert.rejects(waitForPrivateIntentClear(page),error=>error?.name==='TimeoutError');result.earlyClearanceTimeoutMs=Math.round(performance.now()-at);}
   const at=performance.now();result.armedEvent=await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));return window.snapshotLifecycle();});assert.equal(result.armedEvent.invocations,1);
   assert.equal(await waitForPrivateIntentClear(page),0);result.armedClearanceMs=Math.round(performance.now()-at);
   await page.getByRole('alert').filter({hasText:'This review is no longer authorized.'}).waitFor();
   result.firstLifetime=await page.evaluate(()=>({state:window.snapshotLifecycle(),clock:window.effectClock}));
   assert.equal(result.serverRendered.authorityFields,0,'SSR must not expose confirmation authority before lifecycle readiness');
   assert.equal(result.serverRendered.preparing,true);assert.equal(result.serverRendered.buttons,0);
   assert.equal(result.beforeEarlyEvent.authorityFields,0);assert.equal(result.beforeEarlyEvent.preparing,true);
   const appearance=result.firstLifetime.clock.find(event=>event.event==='form-attached');
   assert(appearance,'The observer must record the real form commit');assert.equal(appearance.activeListeners,1);
   assert(result.firstLifetime.clock.some(event=>event.event==='install'&&event.at<=appearance.at),'The lifecycle listener must be installed before the form appears');
   assert(result.readyIntent.registrations>=2&&result.readyIntent.removals>=1,'StrictMode must actually replay the lifetime');
   await page.evaluate(()=>window.replaceRouter());await page.waitForFunction(()=>window.effectRecords.reduce((n,r)=>n+r.registrations,0)>2);
   assert.equal(await page.locator('input[name="authority"]').count(),0,'Rearming cannot revive a retired view');
   await page.getByRole('alert').filter({hasText:'This review is no longer authorized.'}).waitFor();
   await page.evaluate(()=>window.unmountConfirmation());await page.waitForFunction(()=>window.effectRecords.every(record=>!record.active));
   result.unmounted=await page.evaluate(()=>window.snapshotLifecycle());assert.equal(result.unmounted.authorityFields,0);
   await page.evaluate(()=>window.renderConfirmation());await page.locator('input[name="authority"]').waitFor({state:'attached'});
   result.remounted=await page.evaluate(()=>({state:window.snapshotLifecycle(),clock:window.effectClock,focusStayedOnBody:document.activeElement===document.body}));
   assert.equal(result.remounted.state.activeListeners,1);assert.equal(result.remounted.state.sameOperation,true);assert.equal(result.remounted.focusStayedOnBody,true);
   assert(result.remounted.clock.filter(event=>event.event==='form-attached').every(event=>event.activeListeners===1));
   // Model a document already hidden at effect setup. This declared visibility
   // boundary is not a physical-device/BFCache certification.
   await page.goto(origin+'/?hidden=1');await page.evaluate(()=>window.startHydration());await page.waitForFunction(()=>window.heldReactTasks.length>0);await page.evaluate(()=>window.releaseReactTasks());
   await page.getByRole('alert').filter({hasText:'This review is no longer authorized.'}).waitFor();
   result.hiddenAtSetup=await page.evaluate(()=>({state:window.snapshotLifecycle(),clock:window.effectClock}));
   assert.equal(result.hiddenAtSetup.state.activeListeners,1);assert.equal(result.hiddenAtSetup.state.authorityFields,0);assert.equal(result.hiddenAtSetup.state.preparing,false);
   assert.equal(result.hiddenAtSetup.clock.filter(event=>event.event==='form-attached').length,0,'An already-hidden view cannot expose the command');
   await page.evaluate(()=>{window.fixtureVisibility='visible';document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>window.fictionalRefreshes===1);
   assert.equal(await page.locator('input[name="authority"]').count(),0,'Focus requests a canonical refresh without reviving this retired intent');
   result.runtimeErrors=errors;result.externalRequests=external;assert.deepEqual(errors,[]);assert.equal(external,0);result.status='passed';
  }catch(error){result.failure={name:error?.name??'Error',summary:error instanceof assert.AssertionError?error.message:'Actual-component SSR readiness control failed'};}
  finally{if(page&&!page.isClosed())await page.evaluate(()=>window.releaseReactTasks?.()).catch(()=>{});await context?.close();await browser?.close();result.browserClosed=browser?!browser.isConnected():true;}
 }}finally{await new Promise(ready=>server.close(ready));}
 return {results,limitations:['Actual component, React SSR/hydrateRoot/StrictMode and native listener observation with declared fictional router/action/visibility boundaries; no Next or PostgreSQL.','Controlled early pagehide is not evidence of historical cloud timing, real pre-hydration navigation or BFCache retirement.','Real application lifecycle, command/retry/fencing and all 14 Attention cells remain mandatory.']};
}
