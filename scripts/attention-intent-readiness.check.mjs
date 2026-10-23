import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {waitForPrivateIntentClear} from './browser-render-readiness.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

/** Hold real React scheduler delivery in a fictional document. Never alter the
 * actual application scenario, component state, generation fence or clocks. */
const schedulerControl=`
window.heldReactTasks=[];window.holdReactTasks=false;window.reactChannels=0;
const NativeMessageChannel=window.MessageChannel;
window.MessageChannel=class extends NativeMessageChannel{
 constructor(){super();window.reactChannels++;let listener;const port=this.port1;
  Object.defineProperty(port,'onmessage',{configurable:true,get:()=>listener,set:value=>{
   listener=value;port.addEventListener('message',event=>{const run=()=>value(event);if(window.holdReactTasks)window.heldReactTasks.push(run);else run();});port.start();
  }});
 }
};
window.releaseReactTasks=()=>{window.holdReactTasks=false;for(const run of window.heldReactTasks.splice(0))run();};`;

export async function runAttentionIntentReadinessControl(){
 const source=resolve(process.cwd()),project=createRequire(join(source,'package.json'));
 const runtime=createRequire(join(source,'tools/ci-browser-runtime/package.json')),pw=runtime('playwright');
 assert.equal(runtime('playwright/package.json').version,'1.62.1');
 const component=await readFile('src/components/employee-weekly-confirmation.tsx');
 const {build}=project('esbuild');
 const bundle=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{EmployeeWeeklyConfirmation}from'./src/components/employee-weekly-confirmation';createRoot(document.getElementById('root')).render(<EmployeeWeeklyConfirmation weekStart='2026-10-26' expectedRevisionId='fictional-revision' intent={{operationId:'fictional-operation',authority:'fictional-authority'}}/>);",resolveDir:source,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'fictional-framework-boundaries',setup(b){
  b.onResolve({filter:/^next\/navigation$/},()=>({path:'router',namespace:'fixture'}));
  b.onResolve({filter:/^@\/app\/app\/schedule\/acknowledge-actions$/},()=>({path:'action',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='router'
   ?'const router={refresh(){window.fictionalRefreshes=(window.fictionalRefreshes??0)+1;}};export function useRouter(){return router;}'
   :'export function acknowledgeScheduleAction(){return new Promise(resolve=>{window.resolveFictionalAction=resolve;}).then(value=>{window.fictionalActionSettled=true;return value;});}',loader:'js',resolveDir:source}));
 }}]});
 const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><title>Fictional private intent rendering control</title><script>'+schedulerControl+'</script></head><body><main id="root"></main><script src="/bundle.js"></script></body></html>');
 });
 await new Promise(ready=>server.listen(0,'127.0.0.1',ready));
 const origin=`http://127.0.0.1:${server.address().port}`,results=[];
 try{for(const engine of ['chromium','webkit']){
  const result={engine,status:'failed',observations:[]};results.push(result);let browser,context,page;
  try{
   browser=await pw[engine].launch({headless:true});result.browserVersion=browser.version();
   context=await browser.newContext({viewport:{width:768,height:1000}});let externalRequests=0;const runtimeErrors=[];
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){externalRequests++;return route.abort();}return route.continue();});
   page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',()=>runtimeErrors.push('Page runtime error'));
   const frames=()=>page.evaluate(()=>new Promise(ready=>requestAnimationFrame(()=>requestAnimationFrame(ready))));
   const ready=async()=>{await page.goto(origin);await page.locator('input[name="authority"]').waitFor({state:'attached'});await frames();};
   const submit=async()=>{await page.getByRole('button',{name:'Confirm schedule',exact:true}).click();await page.waitForFunction(()=>typeof window.resolveFictionalAction==='function');};
   await ready();await submit();await page.evaluate(()=>window.resolveFictionalAction({status:'committed'}));await page.waitForFunction(()=>window.fictionalRefreshes===1);
   const committed=page.getByRole('status').filter({hasText:'Checking the current schedule confirmation'});await committed.waitFor({state:'visible'});assert.equal(await committed.count(),1);
   result.observations.push({phase:'Positive committed action refreshes current canonical view',refreshes:1});
   await ready();await submit();
   const synchronous=await page.evaluate(()=>{window.holdReactTasks=true;window.dispatchEvent(new Event('pagehide'));return {authorityFields:document.querySelectorAll('input[name="authority"]').length,channels:window.reactChannels};});
   assert(synchronous.channels>0,'Actual React MessageChannel scheduler must be observed');
   assert.equal(synchronous.authorityFields,1,'The old immediate DOM snapshot precedes React rendering');
   await page.waitForFunction(()=>window.heldReactTasks.length>0);
   let settled=false;const waiting=waitForPrivateIntentClear(page).then(value=>{settled=true;return value;});
   await frames();assert.equal(settled,false,'Readiness cannot finish before the real React removal commit');
   assert.equal(await page.locator('input[name="authority"]').count(),1);
   result.observations.push({phase:'Pagehide fences the pending command while React rendering is held',authorityFields:1,settled});
   await page.evaluate(()=>window.releaseReactTasks());assert.equal(await waiting,0);
   assert.equal(await page.locator('input[name="authority"]').count(),0);
   await page.evaluate(()=>window.resolveFictionalAction({status:'committed'}));await page.waitForFunction(()=>window.fictionalActionSettled===true);await frames();
   assert.equal(await page.evaluate(()=>window.fictionalRefreshes??0),0,'A late pre-leave result cannot refresh or restore the private intent');
   assert.equal(await page.locator('input[name="authority"]').count(),0);
   assert.equal(await page.getByRole('alert').filter({hasText:'This review is no longer authorized.'}).count(),1);
   assert.equal(externalRequests,0);assert.deepEqual(runtimeErrors,[]);
   result.observations.push({phase:'Actual React commit clears the form; late response stays fenced',authorityFields:0,lateRefreshes:0,settled});result.status='passed';
  }catch(error){result.failure={name:error instanceof assert.AssertionError?'AssertionError':'ControlFailure',summary:error instanceof assert.AssertionError?error.message:'Actual-component private intent control failed'};}
  finally{if(page&&!page.isClosed())await page.evaluate(()=>window.releaseReactTasks?.()).catch(()=>{});await context?.close();await browser?.close();result.browserClosed=browser?!browser.isConnected():true;}
 }}finally{await new Promise(ready=>server.close(ready));}
 return {componentSha256:createHash('sha256').update(component).digest('hex'),react:project('react/package.json').version,esbuild:project('esbuild/package.json').version,results,
  limitations:['Actual confirmation component and React scheduler with fictional action/router boundaries; no Next or PostgreSQL.','Real application pagehide, response-loss, revocation and all 14 Attention cells remain mandatory.']};
}

async function main(){
 const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
 const control=await runAttentionIntentReadinessControl();assertSourceUnchanged(source,custody);
 const passed=control.results.length===2&&control.results.every(r=>r.status==='passed'&&r.browserClosed);
 const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:custody.sourceClean,sourceUnchanged:true,status:passed?'passed':'failed',...control};
 await writeFile(join(evidence,'attention-intent-readiness-custody.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!passed)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
