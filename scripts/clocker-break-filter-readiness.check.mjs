import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {archiveBreak} from './clocker-break-editor.mjs';
import {schedulerControl} from './attention-intent-readiness.check.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_C_EXPECTED_SHA);
const evidence=externalEvidence(source,process.env.PHASE_C_EVIDENCE_DIR);
const project=createRequire(join(source,'package.json')),runtime=createRequire(join(source,'tools/ci-browser-runtime/package.json'));
const pw=runtime('playwright'),component=await readFile('src/components/clocker-break-types.tsx');
const formStyles=await readFile('src/app/app/premium-wave-c.css');
assert.equal(runtime('playwright/package.json').version,'1.62.1');
const bundle=await project('esbuild').build({
 stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{ClockerBreakTypes}from'./src/components/clocker-break-types';
 const active=new URLSearchParams(location.search).get('active')==='1';
 const type={id:'ui-rest',name:'Fixture rest',category:'REST',targetMinutes:15,active,version:1};
 const other={...type,id:'other-break',name:'Other fictional break'};
 async function action(data){
  window.fixtureInput=Object.fromEntries(data);window.fixtureCalls=(window.fixtureCalls??0)+1;
  const result=await new Promise(resolve=>{window.resolveFictionalAction=resolve;});window.fictionalActionSettled=true;return result;
 }
 createRoot(document.getElementById('root')).render(<ClockerBreakTypes initialTypes={[type,other]} action={action}/>);`,resolveDir:source,loader:'tsx'},
 bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',loader:{'.css':'empty'},
 define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},
 plugins:[{name:'fictional-framework-boundaries',setup(build){
  build.onResolve({filter:/^next\/(link|image|navigation)$/},args=>({path:args.path,namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/navigation'
   ?'export const usePathname=()=>"/fixture";export const useSearchParams=()=>new URLSearchParams();'
   :'import React from "react";export default function Element({children,...props}){return React.createElement('+JSON.stringify(args.path==='next/link'?'a':'img')+',props,children);}',loader:'js',resolveDir:source}));
 }}],
});
const server=createServer((request,response)=>{
 response.setHeader('Cache-Control','no-store');
 if(request.url==='/bundle.js'){response.setHeader('Content-Type','text/javascript');response.end(bundle.outputFiles[0].contents);return;}
 if(request.url==='/form.css'){response.setHeader('Content-Type','text/css; charset=utf-8');response.end(formStyles);return;}
 response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fictional break filter rendering control</title><link rel="stylesheet" href="/form.css"><script>'+schedulerControl+'</script></head><body><div class="app-shell nevora-portal"><main class="page-frame" id="root"></main></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(ready=>server.listen(0,'127.0.0.1',ready));
const origin=`http://127.0.0.1:${server.address().port}`,results=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch({headless:true});
 try{for(const {operation,holdUntilTimeout} of [{operation:'Archive'},{operation:'Reactivate'},{operation:'Reactivate',holdUntilTimeout:true}]){
  const result={engine,operation,holdUntilTimeout:Boolean(holdUntilTimeout),status:'failed',observations:[]};results.push(result);
  let context,page,change,settled=false,outcome;const errors=[];
  try{
   context=await browser.newContext();let externalRequests=0;
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){externalRequests++;return route.abort();}return route.continue();});
   page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/?active='+(operation==='Archive'?'1':'0'));
   await page.locator('button[data-break-type="ui-rest"]').waitFor();
   const frames=()=>page.evaluate(()=>new Promise(ready=>requestAnimationFrame(()=>requestAnimationFrame(ready))));
   result.phase='start actual driver';
   const started=performance.now();
   change=archiveBreak(page,operation,holdUntilTimeout?200:15000).then(()=>{settled=true;outcome={ok:true};},error=>{settled=true;outcome={ok:false,name:error.name,message:error.message};});
   result.phase='await fictional action';
   await page.waitForFunction(()=>typeof window.resolveFictionalAction==='function');await frames();
   const nextActive=operation==='Reactivate';
   await page.evaluate(active=>{
    window.holdReactTasks=true;
    window.resolveFictionalAction({ok:true,breakType:{id:'ui-rest',name:'Fixture rest',category:'REST',targetMinutes:15,active,version:2}});
   },nextActive);
   result.phase='await held React commit after native dialog closure';
   await page.waitForFunction(()=>window.fictionalActionSettled&&window.heldReactTasks.length>0&&!document.querySelector('dialog').open);
   assert(await page.evaluate(()=>window.reactChannels>0));
   await frames();
   const rows=await page.locator('button[data-break-type="ui-rest"]').count();
   assert.equal(rows,1,'The actual component closes its dialog before React commits the new filtered rows');
   result.observations.push({phase:'Action returned, native dialog closed, real React rendering held',rows,settled,outcome});
   assert.deepEqual(await page.evaluate(()=>window.fixtureInput),{id:'ui-rest',expectedVersion:'1',name:'Fixture rest',category:'REST',targetMinutes:'15',active:String(nextActive)});
   assert.equal(await page.evaluate(()=>window.fixtureCalls),1);
   if(holdUntilTimeout){
    await change;
    assert.equal(outcome?.ok,false);assert.equal(outcome?.name,'TimeoutError');assert.match(outcome.message,/detached/);
    assert.equal(await page.locator('button[data-break-type="ui-rest"]').count(),1,'A permanently uncommitted row remains a fatal failure');
    const elapsedMs=Math.round(performance.now()-started);assert(elapsedMs>=200&&elapsedMs<5000);
    assert.equal(externalRequests,0);assert.deepEqual(errors,[]);
    result.observations.push({phase:'A closed dialog with no filtered-row commit fails within its deadline',rowRemovalTimeoutMs:200,elapsedMs,outcome});
    result.status='passed';continue;
   }
   assert.equal(settled,false,'The driver must wait for the real filtered-row commit after native dialog closure');
   await page.evaluate(()=>window.releaseReactTasks());await change;
   assert.deepEqual(outcome,{ok:true});assert.equal(await page.locator('button[data-break-type="ui-rest"]').count(),0);
   assert.equal(await page.locator('button[data-break-type="other-break"]').count(),1,'Another row in the prior filter stays present');
   const nextFilter=nextActive?'Active':'Archived';
   await page.getByRole('button',{name:nextFilter+', 1',exact:true}).click();
   await page.locator('button[data-break-type="ui-rest"]').waitFor();
   assert.equal(await page.locator('button[data-break-type="ui-rest"]').count(),1);
   assert.equal(externalRequests,0);assert.deepEqual(errors,[]);
   result.observations.push({phase:'Actual React commit moves only the changed row to its new filter',rowsInPriorFilter:0,rowsInNewFilter:1,actionCalls:1});
   result.status='passed';
  }catch(error){result.failure={name:error.name,message:error.message};result.diagnostic={settled,outcome,errors,state:page&&!page.isClosed()?await page.evaluate(()=>({actionCalls:window.fixtureCalls,actionSettled:window.fictionalActionSettled,channels:window.reactChannels,held:window.heldReactTasks?.length,dialogOpen:document.querySelector('dialog')?.open,text:document.body.innerText})).catch(()=>null):null};}
  finally{
   if(page&&!page.isClosed())await page.evaluate(()=>window.releaseReactTasks?.()).catch(()=>{});
   await change;await context?.close();
   console.log(JSON.stringify({engine,operation,status:result.status,failure:result.failure,diagnostic:result.diagnostic,observations:result.observations}));
  }
 }}finally{await browser.close();for(const result of results.filter(value=>value.engine===engine))result.browserClosed=!browser.isConnected();}
}}finally{await new Promise(ready=>server.close(ready));}
assertSourceUnchanged(source,custody);
const passed=results.length===6&&results.every(result=>result.status==='passed'&&result.browserClosed);
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,sourceUnchanged:true,status:passed?'passed':'failed',componentSha256:createHash('sha256').update(component).digest('hex'),formStylesSha256:createHash('sha256').update(formStyles).digest('hex'),react:project('react/package.json').version,results,limitations:['Actual component, form stylesheet and React scheduler with fictional action/framework boundaries; not real Next/PostgreSQL acceptance or visual certification.','The full authenticated Clocker browser regression remains mandatory.']};
await writeFile(join(evidence,'clocker-break-filter-readiness-custody.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));if(!passed)process.exitCode=1;
