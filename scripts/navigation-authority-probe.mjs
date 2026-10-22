import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp} from '../src/test/integration/owned-app-fixture.ts';
import {runScenario} from './phase-e-navigation-browser-scenarios.mjs';
import {observeBrowserCell} from './phase-e-browser-qa.mjs';
import {verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright'),axeFile=runtime.resolve('axe-core/axe.min.js');
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,cases:[],limitations:['Focused Navigation WebKit390 authority-read diagnosis; not full development acceptance.']};
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
const browser=await pw.webkit.launch({headless:true});
try{
 const navigationDiagnosticVerified=(await verifyNavigationFetchDiagnostic(browser)).verified;
 for(let index=0;index<3;index++){
  const directory=join(evidence,'case-'+index);await mkdir(directory,{recursive:true});
  const record={suite:'navigation',engine:'webkit',width:390,index,status:'failed',checks:[],errors:[],trace:[]};report.cases.push(record);
  const observer=observeBrowserCell(record,record.errors,{navigationDiagnosticVerified});let app,context,page,readStage=()=>null;
  const observed={...observer,setStageReader(fn){readStage=fn;observer.setStageReader(fn);}};
  const trace=sample=>{if(record.trace.length===300)record.trace.shift();record.trace.push({at:Date.now(),stage:readStage(),...sample});};
  try{
   app=await createOwnedNextApp(join(directory,'app'),{pinDevTypeReferences:true});await seedOwnedApp(app.database.executor);
   context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true,isMobile:true,serviceWorkers:'block'});
   await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){record.errors.push('External request refused');return route.abort();}return route.continue();});
   await observer.observeContext(context,'primary');page=await context.newPage();page.setDefaultTimeout(15000);
   await page.exposeBinding('__authorityLifecycle',(_source,sample)=>trace(sample));
   await page.addInitScript(()=>{
    const documentId=crypto.randomUUID();
    const sample=(event,extra={})=>void globalThis.__authorityLifecycle({event,documentId,route:location.pathname,focus:document.hasFocus(),visibility:document.visibilityState,readyState:document.readyState,...extra}).catch(()=>{});
    for(const event of ['focus','blur','pagehide','pageshow'])addEventListener(event,()=>sample(event));
    for(const event of ['DOMContentLoaded','visibilitychange'])document.addEventListener(event,()=>sample(event));
    sample('document-created');
    const original=window.fetch;
    window.fetch=function(input,init){
     try{const path=new URL(input instanceof Request?input.url:String(input),location.href).pathname;if(path==='/api/company-access/operational-authority')sample('authority-fetch',{aborted:(init?.signal??(input instanceof Request?input.signal:null))?.aborted??false});}catch{}
     return Reflect.apply(original,this,[input,init]);
    };
   });
   for(const event of ['request','requestfinished','requestfailed'])page.on(event,request=>{if(new URL(request.url()).pathname==='/api/company-access/operational-authority')trace({event,framePath:new URL(request.frame().url()).pathname});});
   page.on('pageerror',()=>trace({event:'pageerror'}));
   const result=await runScenario({app,browser,context,page,engine:'webkit',width:390,evidenceDirectory:directory,axeFile,runtimeErrors:observed});observer.assertClean();record.checks=result.checks;record.status='passed';
  }catch(error){record.failure=safeBrowserFailure(error,record);}finally{
   observer.setPhase('context-close');try{await context?.close();observer.assertClean();}catch(error){record.status='failed';record.contextFailure=safeBrowserFailure(error,record);}
   if(app){await app.close();record.closed=true;}
   await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({index,status:record.status,errors:record.errors.length}));
  }
 }
}finally{
 await browser.close();report.browserClosed=true;assertSourceUnchanged(source,custody);report.sourceUnchanged=true;
 report.status=report.cases.length===3&&report.cases.every(item=>item.status==='passed'&&item.closed)?'passed':'failed';
 await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}
